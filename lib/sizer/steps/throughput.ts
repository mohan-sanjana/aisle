/**
 * Step 10 — Per-replica throughput estimate.
 *
 *   throughput_per_replica ≈ table[size, gpu, engine] × tp_efficiency(N_gpu)
 *                          × pp_efficiency_per_stage^(pp_degree - 1)
 *
 * Override path: if user supplied `throughput_override_tokens_per_sec_per_replica`,
 * skip the table entirely. Speculative decoding multiplies the result by 2.
 */

import {
  ENGINE_THROUGHPUT_MULTIPLIER,
  PP_EFFICIENCY_PER_STAGE,
  SPECULATIVE_DECODING_MULTIPLIER,
  THROUGHPUT_TABLE,
  sizeBucketForParams,
  tpEfficiency,
} from "../constants";
import type { ServingEngineId, SizerInput } from "../types";

export type ThroughputEstimate = {
  tokens_per_sec_per_replica: number;
  source: string;
  /** True if user-supplied override was honored. */
  is_override: boolean;
};

export function estimateThroughput(args: {
  input: SizerInput;
  gpu_id: string;
  tp_degree: number;
  pp_degree: number;
}): ThroughputEstimate {
  const { input, gpu_id, tp_degree, pp_degree } = args;

  if (input.throughput_override_tokens_per_sec_per_replica) {
    return {
      tokens_per_sec_per_replica: input.throughput_override_tokens_per_sec_per_replica,
      source: "user override",
      is_override: true,
    };
  }

  const bucket = sizeBucketForParams(input.parameter_count_b);
  const totalGpus = tp_degree * pp_degree;

  // Prefer exact (bucket, gpu, count) match; fall back to closest count for same GPU.
  let entry = THROUGHPUT_TABLE.find(
    (e) => e.size_bucket === bucket && e.gpu_id === gpu_id && e.gpu_count === totalGpus,
  );
  if (!entry) {
    // Same gpu/bucket, different count — pick closest
    const sameBucket = THROUGHPUT_TABLE.filter(
      (e) => e.size_bucket === bucket && e.gpu_id === gpu_id,
    );
    if (sameBucket.length > 0) {
      entry = sameBucket.sort(
        (a, b) => Math.abs(a.gpu_count - totalGpus) - Math.abs(b.gpu_count - totalGpus),
      )[0];
    }
  }
  if (!entry) {
    // Same bucket on any GPU — used to seed an extrapolation
    entry = THROUGHPUT_TABLE.find((e) => e.size_bucket === bucket);
  }
  if (!entry) {
    // Last-resort floor — pick a small but non-zero value so downstream divisions
    // don't blow up, and emit "extrapolated" as the source.
    return {
      tokens_per_sec_per_replica: 1000,
      source: "extrapolated (no table entry)",
      is_override: false,
    };
  }

  let base = entry.tokens_per_sec;

  // Apply TP efficiency relative to entry's gpu_count when we had to swap counts
  if (entry.gpu_count !== totalGpus) {
    // Scale roughly linearly within the same bucket/GPU, then apply efficiency
    const linearScale = totalGpus / entry.gpu_count;
    const efficiencyFactor =
      tpEfficiency(totalGpus) / Math.max(tpEfficiency(entry.gpu_count), 0.01);
    base = base * linearScale * efficiencyFactor;
  }

  // Engine multiplier (vLLM = 1.0 baseline)
  base *= engineMultiplier(input.serving_engine);

  // Pipeline parallelism penalty: halve again per cross-node stage
  if (pp_degree > 1) {
    base *= Math.pow(PP_EFFICIENCY_PER_STAGE, pp_degree - 1);
  }

  // Speculative decoding
  if (input.speculative_decoding) {
    base *= SPECULATIVE_DECODING_MULTIPLIER;
  }

  return {
    tokens_per_sec_per_replica: base,
    source: entry.source,
    is_override: false,
  };
}

function engineMultiplier(engine: ServingEngineId): number {
  return ENGINE_THROUGHPUT_MULTIPLIER[engine] ?? 1.0;
}
