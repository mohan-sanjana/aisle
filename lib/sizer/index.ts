/**
 * Public API for the Sizer calc engine.
 *
 *   sizeWorkload(input: SizerInput): SizerOutput
 *
 * Pure function. No side effects. Implements the 15-step algorithm from
 * sizing-math.md and produces three scenarios (Baseline / Burst / Resilient).
 *
 * Pipeline (per scenario):
 *   resolve model → weights → KV cache (B_peak using scenario burst)
 *     → VRAM total → GPU pick (catalog, roadmap-filtered)
 *     → parallelism plan → throughput estimate → replica count
 *     → server spec → fabric → power + cooling → guardrails
 */

import {
  CONFIDENCE_DENSE_PCT,
  CONFIDENCE_MOE_PCT,
} from "./constants";
import { detectGuardrails } from "./guardrails";
import { genericArchitectureDefaults, getModelFamily } from "./model-families";
import { buildScenarioParams } from "./steps/scenarios";
import {
  bytesPerKvElement,
  peakInFlightBatch,
  totalKvBudgetGB,
  worstCaseKvGB,
} from "./steps/kv-cache";
import { planConsolidation } from "./steps/consolidation";
import {
  pickGpu,
  prefillTimeMs,
  requiredBandwidthGBps,
} from "./steps/gpu-selection";
import { planParallelism } from "./steps/parallelism";
import { estimateThroughput } from "./steps/throughput";
import { planReplicas } from "./steps/replicas";
import { buildServerSpec } from "./steps/server-spec";
import { pickFabric } from "./steps/network";
import {
  assemblePowerSpec,
  computePower,
  pickCoolingTier,
} from "./steps/power-cooling";
import { bytesPerParam, weightsMemoryGB } from "./steps/weights";
import { totalVramGB } from "./steps/vram";
import type {
  ResolvedModelConfig,
  ScenarioName,
  ScenarioOutput,
  ScenarioParams,
  SizerAssumptions,
  SizerInput,
  SizerOutput,
} from "./types";

// ──────────────────────────────────────────────────────────────────────────────
// Public entry point
// ──────────────────────────────────────────────────────────────────────────────

export function sizeWorkload(input: SizerInput): SizerOutput {
  const model = resolveModel(input);
  const scenarios = buildScenarioParams(input);

  const baseline = runScenario(input, model, scenarios.baseline);
  const burst = runScenario(input, model, scenarios.burst);
  const resilient = runScenario(input, model, scenarios.resilient);

  // Pull assumptions from the burst scenario (default sizing path per spec).
  const assumptions: SizerAssumptions = {
    throughput_tokens_per_sec_per_replica:
      burst._intermediates.throughput.tokens_per_sec_per_replica,
    throughput_source: burst._intermediates.throughput.source,
    layers: model.layers,
    kv_heads: model.kv_heads,
    head_dim: model.head_dim,
    bytes_per_param: bytesPerParam(input.precision),
    bytes_per_kv_element: bytesPerKvElement(input),
  };

  const isMoe = model.architecture === "moe";

  // Union of guardrails across scenarios, de-duplicated and stable-ordered.
  const guardrailsUnion = uniqueOrdered([
    ...baseline.warnings,
    ...burst.warnings,
    ...resilient.warnings,
  ]);

  return {
    scenarios: {
      baseline: stripIntermediates(baseline),
      burst: stripIntermediates(burst),
      resilient: stripIntermediates(resilient),
    },
    confidence: {
      margin_pct: isMoe ? CONFIDENCE_MOE_PCT : CONFIDENCE_DENSE_PCT,
      is_moe: isMoe,
    },
    assumptions,
    guardrails_triggered: guardrailsUnion,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Internal — model resolution
// ──────────────────────────────────────────────────────────────────────────────

function resolveModel(input: SizerInput): ResolvedModelConfig {
  const family = input.model_family ? getModelFamily(input.model_family) : undefined;

  if (family) {
    const activeParamsB =
      input.active_params_b ??
      family.active_params_b ??
      family.parameter_count_b;
    return {
      parameter_count_b: input.parameter_count_b || family.parameter_count_b,
      active_params_b: activeParamsB,
      architecture: family.architecture,
      layers: family.layers,
      kv_heads: family.kv_heads ?? 8,
      head_dim: family.head_dim,
      uses_mla: family.uses_mla ?? false,
      family_id: family.id,
    };
  }

  const generic = genericArchitectureDefaults(input.parameter_count_b, input.model_architecture);
  const activeParamsB =
    input.model_architecture === "moe"
      ? (input.active_params_b ?? input.parameter_count_b)
      : input.parameter_count_b;

  return {
    parameter_count_b: input.parameter_count_b,
    active_params_b: activeParamsB,
    architecture: input.model_architecture,
    layers: generic.layers,
    kv_heads: generic.kv_heads,
    head_dim: generic.head_dim,
    uses_mla: false,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Internal — run one scenario through the full pipeline
// ──────────────────────────────────────────────────────────────────────────────

type ScenarioRunResult = ScenarioOutput & {
  _intermediates: {
    throughput: { tokens_per_sec_per_replica: number; source: string };
  };
};

function runScenario(
  input: SizerInput,
  model: ResolvedModelConfig,
  scenario: ScenarioParams,
): ScenarioRunResult {
  // Step 1 — Weights
  const weights_gb = weightsMemoryGB(model.parameter_count_b, input.precision);

  // Step 2-3 — KV inputs
  const b_kv = bytesPerKvElement(input);
  const b_peak = peakInFlightBatch(input, scenario.burst_factor);

  // Step 4 — KV total
  const kv_total_gb = totalKvBudgetGB(input, model, b_peak, b_kv);

  // Step 5-7 — VRAM total
  const vram = totalVramGB({
    weights_gb,
    kv_total_gb,
    headroom_fraction: scenario.headroom_fraction,
    speculative_decoding: input.speculative_decoding,
  });

  // Step 8 — GPU pick (catalog roadmap-filtered)
  // For MoE bandwidth, active weights stream per token.
  const activeWeightsGB =
    model.architecture === "moe"
      ? model.active_params_b * bytesPerParam(input.precision)
      : weights_gb;

  const required_bw = requiredBandwidthGBps({
    active_weights_gb: activeWeightsGB,
    kv_total_gb,
    target_TPOT_ms: input.target_TPOT_ms,
  });
  const gpu = pickGpu({
    vram_required_gb: vram.vram_gb,
    required_bw_gbps: required_bw,
    weights_gb,
  });

  // Step 9 — Parallelism plan
  const plan = planParallelism({
    gpu_count: gpu.gpu_count,
    architecture: model.architecture,
    exceeded_single_node: gpu.exceeded_single_node,
  });

  // Step 10 — Throughput
  const throughput = estimateThroughput({
    input,
    gpu_id: gpu.accelerator.id,
    tp_degree: plan.tp_degree,
    pp_degree: plan.pp_degree,
  });

  // Step 11 — Replicas
  const replicaPlan = planReplicas({
    input,
    scenario,
    throughput_per_replica: throughput.tokens_per_sec_per_replica,
  });

  // Step 11.5 — Consolidation: map logical replicas → physical servers.
  // Single-GPU replicas pack into a chassis up to SKU capacity, respecting
  // redundancy-mode failure-domain minimums.
  const consolidation = planConsolidation({
    replicas: replicaPlan.total_replicas,
    gpu_count_per_replica: plan.total_gpus_per_replica,
    gpu_id: gpu.accelerator.id,
    redundancy_mode: input.redundancy_mode,
  });

  // Step 12 — Server spec per physical server (post-consolidation).
  const server_spec = buildServerSpec({
    input,
    accelerator: gpu.accelerator,
    gpu_count: consolidation.gpus_per_server,
    weights_gb,
    // KV scales by replicas-per-server when consolidated.
    kv_total_gb: kv_total_gb * consolidation.replicas_per_server,
  });

  // Step 13 — Fabric (decisions still based on logical replica topology)
  const fabric = pickFabric({
    nodes_per_replica: plan.nodes_per_replica,
    replica_count: replicaPlan.total_replicas,
    architecture: model.architecture,
    parameter_count_b: model.parameter_count_b,
  });

  // Step 14-15 — Power + cooling (use SERVER count, not replica count)
  const provisionalPower = computePower({
    accelerator: gpu.accelerator,
    gpu_count_per_replica: consolidation.gpus_per_server,
    replica_count: consolidation.servers_required,
  });
  const isGb200Class = gpu.accelerator.id === "nvidia-gb200";
  const cooling = pickCoolingTier({
    accelerator: gpu.accelerator,
    server_kw: provisionalPower.server_kw,
    replica_count: consolidation.servers_required,
    is_gb200_class: isGb200Class,
  });
  const power = assemblePowerSpec({
    server_kw: provisionalPower.server_kw,
    replica_count: consolidation.servers_required,
    kw_per_rack: cooling.kw_per_rack,
    pue: cooling.pue,
  });

  // Worst-case KV for guardrail
  const worst_case_kv_gb = worstCaseKvGB(input, model, b_peak, b_kv);

  // TTFT feasibility — compute-only prefill on the picked replica
  const expected_prefill_ms = prefillTimeMs({
    prompt_tokens: input.avg_prompt_tokens,
    active_params_b: model.active_params_b,
    precision: input.precision,
    accelerator: gpu.accelerator,
    gpu_count: plan.total_gpus_per_replica,
  });

  // Guardrails
  const guardrailWarnings = detectGuardrails({
    input,
    model,
    weights_gb,
    kv_total_gb,
    vram_required_gb: vram.vram_gb,
    required_bw_gbps: required_bw,
    picked_accelerator: gpu.accelerator,
    picked_gpu_count: plan.total_gpus_per_replica,
    total_bw_gbps: gpu.total_bw_gbps * (plan.pp_degree > 1 ? plan.pp_degree : 1),
    total_vram_gb: gpu.total_vram_gb * (plan.pp_degree > 1 ? plan.pp_degree : 1),
    exceeded_single_node: gpu.exceeded_single_node,
    worst_case_kv_gb,
    expected_prefill_ms,
  });

  // Override-rationale warning
  const overrideNotes: string[] = [];
  if (throughput.is_override) {
    overrideNotes.push(
      `Using user throughput override: ${throughput.tokens_per_sec_per_replica.toFixed(0)} tokens/sec/replica.`,
    );
  }

  const warnings = uniqueOrdered([
    ...plan.warnings,
    ...guardrailWarnings,
    ...overrideNotes,
  ]);

  return {
    name: scenario.name,
    server_spec,
    replica_count: replicaPlan.total_replicas,
    servers_required: consolidation.servers_required,
    replicas_per_server: consolidation.replicas_per_server,
    fabric,
    power,
    cooling: cooling.cooling,
    warnings,
    _intermediates: {
      throughput: {
        tokens_per_sec_per_replica: throughput.tokens_per_sec_per_replica,
        source: throughput.source,
      },
    },
  };
}

function stripIntermediates(r: ScenarioRunResult): ScenarioOutput {
  const { _intermediates: _u, ...rest } = r;
  void _u;
  return rest;
}

function uniqueOrdered<T>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = typeof item === "string" ? item : JSON.stringify(item);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

// Re-exports for consumers
export * from "./types";
export { MODEL_FAMILIES, getModelFamily } from "./model-families";
