"use client";

import type { SizerInput, SizerOutput, ScenarioOutput } from "@/lib/sizer/types";

/**
 * Educational + planning summary panel.
 *
 * Sits above the three scenario cards. Translates the burst scenario's
 * numbers into plain English, explains *why* the numbers are what they are,
 * and surfaces a small set of sensitivities so a newcomer understands which
 * input levers actually matter.
 *
 * The headline uses the BURST scenario (the canonical sizing path per
 * sizing-math.md §4).
 */
export function SummaryPanel({
  input,
  output,
}: {
  input: SizerInput;
  output: SizerOutput;
}) {
  const burst = output.scenarios.burst;
  const baseline = output.scenarios.baseline;
  const resilient = output.scenarios.resilient;

  const headline = buildHeadline(input, burst);
  const drivers = buildDrivers(input, output);
  const sensitivities = buildSensitivities(input, output, baseline, burst, resilient);

  return (
    <section
      aria-labelledby="summary-heading"
      className="rounded-lg border border-brand-100 bg-brand-50/40 p-5"
    >
      <h3 id="summary-heading" className="text-h3 text-slate-900">
        Summary
      </h3>
      <p className="mt-2 text-base leading-relaxed text-slate-800">
        {headline}
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
            What&rsquo;s driving the sizing
          </h4>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
            {drivers.map((d, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-700" />
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
            What would change the answer
          </h4>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
            {sensitivities.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {output.confidence.is_moe && (
        <p className="mt-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <strong>MoE caveat:</strong> Mixture-of-Experts sizing carries wider
          error bars (±30%) than dense models, because expert routing and
          per-engine load balance are workload-dependent. Treat the numbers
          above as a starting estimate, then benchmark with your serving stack.
        </p>
      )}
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Headline
// ──────────────────────────────────────────────────────────────────────────────

function buildHeadline(input: SizerInput, burst: ScenarioOutput): string {
  const { server_spec, replica_count, servers_required, replicas_per_server } = burst;
  const totalGpus = server_spec.gpu_count * servers_required;
  const gpuShortName = prettyGpuName(server_spec.gpu_id);
  const workloadPhrase = workloadShortPhrase(input);

  if (replicas_per_server > 1) {
    // Consolidated: multiple replicas share a physical chassis.
    return `For ${workloadPhrase}, plan on ${servers_required} servers of ${server_spec.gpu_count}× ${gpuShortName} each — ${totalGpus} GPUs hosting ${replica_count} replicas (~${replicas_per_server} per server).`;
  }
  if (server_spec.gpu_count === 1) {
    return `For ${workloadPhrase}, plan on ${servers_required} servers, each with one ${gpuShortName} — ${totalGpus} GPUs total.`;
  }
  return `For ${workloadPhrase}, plan on ${servers_required} servers of ${server_spec.gpu_count}× ${gpuShortName} each — ${totalGpus} GPUs across ${replica_count} replicas.`;
}

// ──────────────────────────────────────────────────────────────────────────────
// What's driving the sizing (educational)
// ──────────────────────────────────────────────────────────────────────────────

function buildDrivers(input: SizerInput, output: SizerOutput): string[] {
  const drivers: string[] = [];
  const a = output.assumptions;
  const burst = output.scenarios.burst;

  // 1. Where the VRAM is going
  const weightsGB = input.parameter_count_b * a.bytes_per_param;
  // Rough KV estimate at the average prompt; useful for the rationale
  const kvPerReqGB =
    (2 * a.layers * a.kv_heads * a.head_dim * input.avg_prompt_tokens * a.bytes_per_kv_element) /
    1e9;

  if (weightsGB > kvPerReqGB * 50) {
    drivers.push(
      `Model weights (${weightsGB.toFixed(0)} GB at ${input.precision}) dominate VRAM. Context size matters less here than it would for a longer-context workload.`,
    );
  } else if (kvPerReqGB > weightsGB) {
    drivers.push(
      `KV cache dominates VRAM — each in-flight request needs ~${kvPerReqGB.toFixed(1)} GB just for context state. The model weights are only ${weightsGB.toFixed(0)} GB by comparison.`,
    );
  } else {
    drivers.push(
      `Weights (${weightsGB.toFixed(0)} GB) and KV cache (~${kvPerReqGB.toFixed(1)} GB per request) both contribute meaningfully to VRAM. Neither one alone dictates the SKU choice.`,
    );
  }

  // 2. Decode bandwidth / TPOT
  if (input.target_TPOT_ms <= 30) {
    drivers.push(
      `Tight TPOT target (${input.target_TPOT_ms} ms/token) means decode is memory-bandwidth-bound. The picked accelerator was chosen for its HBM bandwidth, not just capacity.`,
    );
  } else if (input.target_TPOT_ms >= 80) {
    drivers.push(
      `Relaxed TPOT (${input.target_TPOT_ms} ms/token) gives you headroom — the engine could batch more aggressively and saturate more of the GPU's compute.`,
    );
  } else {
    drivers.push(
      `TPOT target of ${input.target_TPOT_ms} ms/token is the typical interactive-chat zone; memory bandwidth and compute are roughly balanced.`,
    );
  }

  // 3. Concurrency → batch → replicas
  const rps = (input.concurrent_users * input.requests_per_user_per_minute) / 60;
  drivers.push(
    `Demand: ${input.concurrent_users.toLocaleString()} concurrent users × ${input.requests_per_user_per_minute} req/min ≈ ${rps.toFixed(1)} requests/sec. Each replica delivers ~${Math.round(a.throughput_tokens_per_sec_per_replica).toLocaleString()} tokens/sec; replica count falls out of that ratio plus the ${input.burst_factor}× burst factor.`,
  );

  // 4. Networking — what fabric and why
  const fabric = burst.fabric.type.toLowerCase();
  if (fabric.includes("infiniband") || fabric.includes("ndr") || fabric.includes("xdr") || fabric.includes("roce")) {
    drivers.push(
      `Networking: this model spans multiple nodes (pipeline parallelism), so 400 Gb InfiniBand (or RoCE) is required for the inter-node activation exchange on every token.`,
    );
  } else if (burst.server_spec.gpu_count > 1) {
    drivers.push(
      `Networking: tensor parallelism inside each server uses NVLink (or Infinity Fabric on AMD) — built into the chassis, not network gear. Between replicas, 100 GbE is enough since replicas are independent.`,
    );
  } else {
    drivers.push(
      `Networking: 100 GbE frontend is sufficient. Each replica runs on a single GPU, so there's no tensor or pipeline parallelism — replicas only talk to clients, not to each other.`,
    );
  }

  // 5. Consolidation (when single-GPU replicas pack into chassis)
  if (burst.replicas_per_server > 1) {
    drivers.push(
      `Consolidation: ${burst.replicas_per_server} single-GPU replicas share each physical chassis (${burst.servers_required} server${burst.servers_required === 1 ? "" : "s"} total) — denser packing trades some physical redundancy for floor space and cost. Switch redundancy to N+2 if you need more failure-domain separation.`,
    );
  }

  // 6. Cooling / power note
  if (burst.power.sustained_kw_total > 30) {
    drivers.push(
      `Total sustained power (${burst.power.sustained_kw_total.toFixed(0)} kW) pushes you into ${burst.cooling.tier.toLowerCase()} territory — facilities planning becomes a real conversation alongside IT.`,
    );
  } else if (burst.power.sustained_kw_total < 10) {
    drivers.push(
      `Light power footprint (${burst.power.sustained_kw_total.toFixed(1)} kW sustained). Fits in any standard rack on traditional air cooling.`,
    );
  }

  return drivers;
}

// ──────────────────────────────────────────────────────────────────────────────
// Sensitivities — "what would change the answer"
// ──────────────────────────────────────────────────────────────────────────────

function buildSensitivities(
  input: SizerInput,
  output: SizerOutput,
  baseline: ScenarioOutput,
  burst: ScenarioOutput,
  resilient: ScenarioOutput,
): string[] {
  const s: string[] = [];

  // Baseline vs burst delta
  if (burst.replica_count > baseline.replica_count) {
    const extra = burst.replica_count - baseline.replica_count;
    s.push(
      `Steady-state needs only ${baseline.replica_count} replicas; the ${input.burst_factor}× burst factor adds ${extra}. Lower burst → fewer replicas.`,
    );
  }

  // Resilient delta
  if (resilient.replica_count > burst.replica_count) {
    const extra = resilient.replica_count - burst.replica_count;
    s.push(
      `Resilient mode (N+2 with failure-domain pairing) adds ${extra} extra replica${extra === 1 ? "" : "s"} above burst sizing.`,
    );
  }

  // Precision lever (if not already at FP8/INT8)
  if (input.precision === "FP16" || input.precision === "BF16") {
    s.push(
      `Quantizing to FP8 would roughly halve the weight memory and typically ~2× decode throughput on Hopper / Blackwell — usually with near-identical quality.`,
    );
  } else if (input.precision === "FP8") {
    s.push(
      `Going further to INT8 would shave another ~25% of weight memory; quality cost is small for most workloads but noticeable on multi-step reasoning.`,
    );
  }

  // Speculative decoding lever
  if (!input.speculative_decoding) {
    s.push(
      `Enabling speculative decoding (Advanced step) typically ~2× decode throughput, which roughly halves the replica count — at the cost of running a small draft model alongside.`,
    );
  }

  // TPOT lever
  if (input.target_TPOT_ms < 60) {
    const relaxed = Math.min(60, input.target_TPOT_ms + 20);
    s.push(
      `Relaxing TPOT from ${input.target_TPOT_ms} ms to ${relaxed} ms would let the engine batch more aggressively — generally trimming replicas by 20–40%.`,
    );
  }

  // Context length lever — only if long
  if (input.max_context_tokens > 16000) {
    s.push(
      `Max context of ${input.max_context_tokens.toLocaleString()} tokens drives KV cache budget. Capping context at 16k or enabling KV offload (Advanced step) frees significant memory.`,
    );
  }

  // Throughput override hint, if not already overridden
  if (!input.throughput_override_tokens_per_sec_per_replica) {
    s.push(
      `If you’ve benchmarked this model on this hardware, plug your tokens/sec into the throughput override (Advanced step) — the sizing assumes a published reference value.`,
    );
  }

  return s;
}

// ──────────────────────────────────────────────────────────────────────────────
// Small formatting helpers
// ──────────────────────────────────────────────────────────────────────────────

function workloadShortPhrase(input: SizerInput): string {
  const map: Record<string, string> = {
    interactive_chat: "an interactive chat workload",
    code_completion: "a code-completion workload",
    rag: "a RAG (retrieval-augmented) workload",
    batch: "a batch / offline workload",
    agentic: "an agentic multi-step workload",
  };
  const base = map[input.workload_type] ?? input.workload_type;
  if (input.model_family) {
    return `${base} on ${prettyFamilyName(input.model_family)}`;
  }
  return `a ${input.parameter_count_b}B ${input.model_architecture.toUpperCase()} model — ${base}`;
}

function prettyGpuName(id: string): string {
  // Drop "nvidia-" / "amd-" prefix and tidy casing
  const cleaned = id
    .replace(/^nvidia-/, "")
    .replace(/^amd-/, "")
    .replace(/-/g, " ")
    .toUpperCase();
  return cleaned;
}

function prettyFamilyName(id: string): string {
  // "llama-3.1-70b" -> "Llama 3.1-70B"
  return id
    .split("-")
    .map((part) => (/^\d/.test(part) ? part.toUpperCase() : capitalize(part)))
    .join(" ")
    .replace(/(\d) (\d)/g, "$1.$2") // re-knit version numbers
    .replace(/B$/, "B");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
