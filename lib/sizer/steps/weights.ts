/**
 * Step 1 — Weights memory.
 *
 * W = P × b_w  (in GB; P is billions, b_w is bytes/param)
 *
 * For MoE: full param count counts (all experts resident in VRAM);
 * active params only reduce compute, not memory.
 */

import { BYTES_PER_PARAM } from "../constants";
import type { Precision } from "../types";

/**
 * Returns weights memory in GB.
 *
 * Trick: P×1e9 params × b_w bytes/param / 1e9 = P × b_w (GB), so we can skip
 * the conversion entirely.
 */
export function weightsMemoryGB(paramCountB: number, precision: Precision): number {
  const bytesPerParam = BYTES_PER_PARAM[precision];
  return paramCountB * bytesPerParam;
}

/** Bytes-per-param exposed for `assumptions` reporting. */
export function bytesPerParam(precision: Precision): number {
  return BYTES_PER_PARAM[precision];
}
