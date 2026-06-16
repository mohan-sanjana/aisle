/**
 * Step 8 — GPU SKU selection.
 *
 * Two constraints:
 *   1. N × VRAM_per_GPU  ≥ VRAM_required
 *   2. N × BW_per_GPU    ≥ required_BW (for decode TPOT)
 *
 * Prefer single-GPU; ascending order L40S → A100-80 → H100 → H200 → MI300X → B200.
 * Filters out roadmap silicon (getAccelerators({}) is roadmap-excluded by default).
 */

import { getAccelerators } from "@/lib/catalog";
import type { Accelerator } from "@/lib/catalog";
import { GPU_SEARCH_ORDER, MAX_GPUS_PER_NODE } from "../constants";
import type { Precision } from "../types";

/**
 * Bandwidth-headroom ratio. The engine prefers a SKU + count that delivers at
 * least this multiple of the required memory bandwidth — gives margin for
 * burst, batching, and engine overhead. If no SKU clears the bar, the engine
 * falls back to a minimum-fit pass (1.0×).
 *
 * Rationale: in TC1 of sizing-math.md, the worked example explicitly promotes
 * from L40S to H100 "for margin under burst" — that's a 13% headroom rule. We
 * apply 1.3× here as a defensible default.
 */
const BW_HEADROOM_RATIO = 1.3;

export type GpuPick = {
  accelerator: Accelerator;
  gpu_count: number;
  vram_per_gpu_gb: number;
  bandwidth_per_gpu_gbps: number;
  /** Aggregate VRAM across the picked replica (GB). */
  total_vram_gb: number;
  /** Aggregate HBM BW across the picked replica (GB/s). */
  total_bw_gbps: number;
  /** True if the model wouldn't fit even at 8-GPU TP — caller may add PP. */
  exceeded_single_node: boolean;
};

/**
 * Calculate required bandwidth for decode TPOT (memory-bound):
 *   required_BW ≈ (W_active + KV_total) / (target_TPOT / 1000)
 *
 * For dense models, W_active = full weights. For MoE, W_active ≈ active_params
 * bytes (only experts touched per token stream from memory).
 *
 * Inputs in GB, output in GB/s.
 */
export function requiredBandwidthGBps(args: {
  active_weights_gb: number;
  kv_total_gb: number;
  target_TPOT_ms: number;
}): number {
  const { active_weights_gb, kv_total_gb, target_TPOT_ms } = args;
  return (active_weights_gb + kv_total_gb) / (target_TPOT_ms / 1000);
}

/**
 * Pick the smallest GPU SKU + count meeting both constraints.
 * Walks GPU_SEARCH_ORDER; for each SKU, tries N = 1, 2, 4, 8.
 *
 * If even 8-GPU TP can't fit the model on the largest SKU, returns
 * `exceeded_single_node: true` so the caller can add pipeline parallelism.
 */
export function pickGpu(args: {
  vram_required_gb: number;
  required_bw_gbps: number;
  /** Raw model weights (used for per-SKU eligibility rules — see sizing-math.md §5). */
  weights_gb: number;
}): GpuPick {
  const { vram_required_gb, required_bw_gbps, weights_gb } = args;
  const accelerators = getAccelerators(); // roadmap excluded by default
  const byId = new Map(accelerators.map((a) => [a.id, a]));

  function eligible(a: Accelerator): boolean {
    // L40S boundary (sizing-math.md §5): only valid for ≤30 GB weights.
    // Even multi-GPU L40S can't span a model that big without NVLink, and
    // PCIe-bound TP collapses throughput. Skip entirely.
    if (a.id === "nvidia-l40s" && weights_gb > 30) return false;
    return true;
  }

  function tryPick(bwMultiplier: number): GpuPick | null {
    for (const gpuId of GPU_SEARCH_ORDER) {
      const a = byId.get(gpuId);
      if (!a || !eligible(a)) continue;

      const vramPer = a.memory_gb ?? 0;
      const bwPer = (a.memory_bandwidth_tbps ?? 0) * 1000; // TB/s → GB/s

      for (const count of [1, 2, 4, 8]) {
        const totalVram = count * vramPer;
        const totalBw = count * bwPer;
        if (totalVram >= vram_required_gb && totalBw >= required_bw_gbps * bwMultiplier) {
          return {
            accelerator: a,
            gpu_count: count,
            vram_per_gpu_gb: vramPer,
            bandwidth_per_gpu_gbps: bwPer,
            total_vram_gb: totalVram,
            total_bw_gbps: totalBw,
            exceeded_single_node: false,
          };
        }
      }
    }
    return null;
  }

  // Pass 1: comfortable bandwidth headroom (preferred — gives margin under
  // burst, batching variance, and engine overhead).
  const headroomFit = tryPick(BW_HEADROOM_RATIO);
  if (headroomFit) return headroomFit;

  // Pass 2: minimum fit — accept SKUs that just barely meet bandwidth.
  const minimumFit = tryPick(1.0);
  if (minimumFit) return minimumFit;

  // Nothing in the search order fits at ≤8 GPUs — fall back to the largest
  // SKU and force the caller into pipeline parallelism.
  const fallback = accelerators
    .filter((a) => GPU_SEARCH_ORDER.includes(a.id))
    .sort((a, b) => (b.memory_gb ?? 0) - (a.memory_gb ?? 0))[0];

  if (!fallback) {
    throw new Error("No production accelerators in catalog (roadmap-filtered).");
  }

  const vramPer = fallback.memory_gb ?? 0;
  const bwPer = (fallback.memory_bandwidth_tbps ?? 0) * 1000;

  return {
    accelerator: fallback,
    gpu_count: MAX_GPUS_PER_NODE,
    vram_per_gpu_gb: vramPer,
    bandwidth_per_gpu_gbps: bwPer,
    total_vram_gb: MAX_GPUS_PER_NODE * vramPer,
    total_bw_gbps: MAX_GPUS_PER_NODE * bwPer,
    exceeded_single_node: true,
  };
}

/** Pure helper used by the L40S boundary guardrail (sizing-math.md §5). */
export function isL40sBoundaryViolation(
  pick: GpuPick,
  weightsGB: number,
): boolean {
  if (pick.accelerator.id !== "nvidia-l40s") return false;
  return weightsGB > 30;
}

/**
 * Return per-GPU dense TFLOPS at the user's chosen precision, or `null` if
 * the accelerator doesn't natively support that precision (e.g. FP8 on A100).
 */
export function tflopsAtPrecision(
  accelerator: Accelerator,
  precision: Precision,
): number | null {
  switch (precision) {
    case "FP16":
    case "BF16":
      return accelerator.fp16_tflops_dense ?? null;
    case "FP8":
      return accelerator.fp8_tflops_dense ?? null;
    case "INT8":
      return accelerator.int8_tflops_dense ?? null;
    case "INT4":
      // INT4 is weight-only quantization on most current SKUs; compute still
      // runs at the higher precision. Use INT8 / FP8 as a reasonable proxy.
      return accelerator.int8_tflops_dense ?? accelerator.fp8_tflops_dense ?? null;
    default:
      return null;
  }
}

/**
 * Estimate end-to-end prefill latency (ms) for a single request.
 *
 *   FLOPs_per_token ≈ 2 × active_params
 *   total_FLOPs     ≈ FLOPs_per_token × prompt_tokens
 *   time_s          = total_FLOPs / (N_gpu × TFLOPS × 1e12)
 *
 * Assumes ideal compute utilization. Real prefill includes attention overhead
 * and engine scheduling; this is a lower bound. Returns Infinity if the
 * accelerator doesn't support the precision (so it can't run the model).
 */
export function prefillTimeMs(args: {
  prompt_tokens: number;
  active_params_b: number;
  precision: Precision;
  accelerator: Accelerator;
  gpu_count: number;
}): number {
  const { prompt_tokens, active_params_b, precision, accelerator, gpu_count } = args;
  const tflopsPerGpu = tflopsAtPrecision(accelerator, precision);
  if (tflopsPerGpu === null || tflopsPerGpu <= 0) return Infinity;

  // 2× factor: forward pass FLOPs ≈ 2 × params per token (multiply-add).
  const flopsNeeded = 2 * prompt_tokens * active_params_b * 1e9;
  const flopsAvailable = gpu_count * tflopsPerGpu * 1e12;
  return (flopsNeeded / flopsAvailable) * 1000;
}
