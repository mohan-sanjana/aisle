/**
 * Boundary detection and warning messages.
 * Sources: sizing-math.md §5 (edge cases and guardrails).
 */

import type { Accelerator } from "@/lib/catalog";
import type { ResolvedModelConfig, SizerInput } from "./types";

export type GuardrailContext = {
  input: SizerInput;
  model: ResolvedModelConfig;
  weights_gb: number;
  kv_total_gb: number;
  vram_required_gb: number;
  required_bw_gbps: number;
  picked_accelerator: Accelerator;
  picked_gpu_count: number;
  total_bw_gbps: number;
  total_vram_gb: number;
  exceeded_single_node: boolean;
  worst_case_kv_gb: number;
  /** Compute-only prefill latency estimate for the average prompt (ms). */
  expected_prefill_ms: number;
};

export function detectGuardrails(ctx: GuardrailContext): string[] {
  const warnings: string[] = [];

  // L40S boundary (sizing-math.md §5)
  if (ctx.picked_accelerator.id === "nvidia-l40s" && ctx.weights_gb > 30) {
    warnings.push(
      "L40S boundary exceeded: model weights > 30 GB. L40S is only valid for ≤13B FP8 or ≤7B FP16. Engine forcibly promoted to next-tier SKU.",
    );
  }

  // VRAM unfit even at 8-GPU TP → caller fell back to PP
  if (ctx.exceeded_single_node) {
    warnings.push(
      "Model + KV cache does not fit in a single 8-GPU node at any SKU. Pipeline parallelism across nodes required; TPOT will degrade ~10–20% per stage.",
    );
  }

  // Bandwidth feasibility
  if (ctx.required_bw_gbps > ctx.total_bw_gbps) {
    warnings.push(
      `Required HBM bandwidth (${ctx.required_bw_gbps.toFixed(0)} GB/s) exceeds picked replica capacity (${ctx.total_bw_gbps.toFixed(0)} GB/s). TPOT target ${ctx.input.target_TPOT_ms} ms may be unreachable; consider next-tier SKU (H100→H200→B200), relaxing TPOT, or quantizing further.`,
    );
  }

  // Long-context burst guardrail
  if (ctx.worst_case_kv_gb > 4 * ctx.kv_total_gb && ctx.kv_total_gb > 0) {
    warnings.push(
      "Long-context burst risk: worst-case KV (max_context × peak batch) is >4× the average-sized budget. Enable kv_offload or cap context server-side to prevent eviction storms.",
    );
  }

  // B200 + air-only facility (sizing-math.md §5). We can't know facility, but
  // we can warn that B200 in production typically needs liquid.
  if (ctx.picked_accelerator.id === "nvidia-b200-sxm") {
    warnings.push(
      "B200 deployments typically require liquid cooling and 415V circuits. If the facility is air-only, the engine would have to fall back to H200 and re-cost.",
    );
  }

  // MoE with PP > 1 — already covered in parallelism plan, but reinforce here
  if (ctx.model.architecture === "moe" && ctx.picked_gpu_count > 8) {
    warnings.push(
      "MoE > 8 GPUs: pipeline-parallel MoE often has worse load balance than expert parallelism (EP). Recommend EP if your serving engine supports it.",
    );
  }

  // VRAM fit confirmation
  if (ctx.vram_required_gb > ctx.total_vram_gb) {
    warnings.push(
      `Picked replica VRAM (${ctx.total_vram_gb.toFixed(0)} GB) is below requirement (${ctx.vram_required_gb.toFixed(0)} GB). This shouldn't happen — file a bug.`,
    );
  }

  // TTFT feasibility — compute-bound prefill on the picked GPU
  if (
    Number.isFinite(ctx.expected_prefill_ms) &&
    ctx.expected_prefill_ms > ctx.input.target_TTFT_ms
  ) {
    warnings.push(
      `TTFT target ${ctx.input.target_TTFT_ms} ms is likely unreachable: a ${ctx.input.avg_prompt_tokens}-token prefill through this model on ${ctx.picked_gpu_count}× ${ctx.picked_accelerator.model} takes ~${Math.round(ctx.expected_prefill_ms)} ms of compute alone. Options: relax TTFT, shrink prompt (prefix caching), or step up to a larger accelerator.`,
    );
  } else if (ctx.input.target_TTFT_ms < 200 && ctx.input.avg_prompt_tokens > 4000) {
    // Heuristic warning when the picked SKU technically meets TTFT but the
    // request shape is aggressive.
    warnings.push(
      `TTFT target ${ctx.input.target_TTFT_ms} ms is aggressive for an average prompt of ${ctx.input.avg_prompt_tokens} tokens — prefill may exceed budget once attention overhead is included. Consider prefix caching.`,
    );
  }

  return warnings;
}
