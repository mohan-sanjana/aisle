/**
 * Steps 2–4 — KV cache math.
 *
 * Step 2 — Per-request KV cache:    KV_req = 2 × L × H_kv × D_h × S × b_kv
 * Step 3 — In-flight batch:         B_peak = ceil(RPS × E[output_seconds] × burst)
 * Step 4 — Total KV cache budget:   KV_total = B_peak × KV_req(avg_prompt + avg_output)
 *
 * Notes:
 *  - Use AVG sequence length for sizing; max_context is a guardrail (§5).
 *  - kv_offload=true halves KV (cold blocks paged to NVMe/CPU per LMCACHE).
 *  - MLA (DeepSeek-V3) compresses KV roughly 10× vs GQA-equivalent.
 */

import { BYTES_PER_KV, KV_OFFLOAD_MULTIPLIER } from "../constants";
import type { KvCacheDtype, ResolvedModelConfig, SizerInput } from "../types";

/** Bytes-per-KV-element decision: explicit override > model precision. */
export function bytesPerKvElement(input: SizerInput): number {
  const dtype: KvCacheDtype | undefined = input.kv_cache_dtype;
  if (dtype) return BYTES_PER_KV[dtype];
  // Default: match model precision. FP8/INT8 → 1 byte; FP16/BF16 → 2 bytes;
  // INT4 falls back to FP8-equivalent (KV rarely quantized to 4-bit).
  switch (input.precision) {
    case "FP16":
    case "BF16":
      return 2;
    case "FP8":
    case "INT8":
    case "INT4":
      return 1;
  }
}

/**
 * Step 2 — per-request KV in GB for a given sequence length.
 * KV_req = 2 × L × H_kv × D_h × S × b_kv  (bytes), then /1e9 to GB.
 *
 * MLA models (DeepSeek-V3) get a 0.1× multiplier per sizing-math.md §3.
 */
export function kvCachePerRequestGB(
  model: ResolvedModelConfig,
  seqTokens: number,
  bytesPerKv: number,
): number {
  const bytes =
    2 * model.layers * model.kv_heads * model.head_dim * seqTokens * bytesPerKv;
  let gb = bytes / 1e9;
  if (model.uses_mla) gb *= 0.1;
  return gb;
}

/** Step 3 — Requests-per-second from user-facing inputs. */
export function rps(input: SizerInput): number {
  return (input.concurrent_users * input.requests_per_user_per_minute) / 60;
}

/** Step 3 — peak in-flight batch via Little's Law. */
export function peakInFlightBatch(
  input: SizerInput,
  effectiveBurst: number,
): number {
  const reqRate = rps(input);
  const meanOutputSeconds = (input.avg_output_tokens * input.target_TPOT_ms) / 1000;
  return Math.ceil(reqRate * meanOutputSeconds * effectiveBurst);
}

/**
 * Step 4 — total KV budget in GB, using AVG sequence length (not max_context).
 * Applies kv_offload reduction when enabled.
 */
export function totalKvBudgetGB(
  input: SizerInput,
  model: ResolvedModelConfig,
  bPeak: number,
  bytesPerKv: number,
): number {
  const avgSeq = input.avg_prompt_tokens + input.avg_output_tokens;
  let kvTotal = bPeak * kvCachePerRequestGB(model, avgSeq, bytesPerKv);
  if (input.kv_offload) kvTotal *= KV_OFFLOAD_MULTIPLIER;
  return kvTotal;
}

/**
 * Step 5 helper — worst-case KV (max_context per request) for the long-context
 * burst guardrail check.
 */
export function worstCaseKvGB(
  input: SizerInput,
  model: ResolvedModelConfig,
  bPeak: number,
  bytesPerKv: number,
): number {
  return bPeak * kvCachePerRequestGB(model, input.max_context_tokens, bytesPerKv);
}
