/**
 * Steps 5–7 — Activations, headroom, total VRAM.
 *
 * Step 5: A = max(2 GB, 0.05 × W)
 * Step 6: H = headroom_fraction × (W + KV_total + A)
 * Step 7: VRAM = W + KV_total + A + H
 *
 * Speculative decoding adds ~10% VRAM overhead (§5).
 */

import {
  ACTIVATION_FLOOR_GB,
  ACTIVATION_FRACTION_OF_WEIGHTS,
  SPECULATIVE_DECODING_VRAM_OVERHEAD,
} from "../constants";

export type VramBreakdown = {
  weights_gb: number;
  kv_total_gb: number;
  activations_gb: number;
  headroom_gb: number;
  vram_gb: number;
};

export function activationsGB(weightsGB: number): number {
  return Math.max(ACTIVATION_FLOOR_GB, ACTIVATION_FRACTION_OF_WEIGHTS * weightsGB);
}

export function totalVramGB(args: {
  weights_gb: number;
  kv_total_gb: number;
  headroom_fraction: number;
  speculative_decoding?: boolean;
}): VramBreakdown {
  const { weights_gb, kv_total_gb, headroom_fraction, speculative_decoding } = args;
  const activations_gb = activationsGB(weights_gb);
  const subtotal = weights_gb + kv_total_gb + activations_gb;
  const headroom_gb = headroom_fraction * subtotal;
  let vram_gb = subtotal + headroom_gb;
  if (speculative_decoding) vram_gb *= 1 + SPECULATIVE_DECODING_VRAM_OVERHEAD;
  return { weights_gb, kv_total_gb, activations_gb, headroom_gb, vram_gb };
}
