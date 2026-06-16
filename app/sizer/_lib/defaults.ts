import type { SizerInput } from "@/lib/sizer/types";

/**
 * Default Sizer input — a "RAG bot on Llama 70B" sized for a mid-size org.
 * Used as the starting point when no URL params are present.
 */
export const DEFAULT_SIZER_INPUT: SizerInput = {
  workload_type: "rag",

  parameter_count_b: 70,
  model_family: "llama-3.3-70b",
  model_architecture: "gqa",
  precision: "FP8",

  max_context_tokens: 8000,
  avg_prompt_tokens: 2000,
  avg_output_tokens: 500,
  concurrent_users: 80,
  requests_per_user_per_minute: 2,

  target_TTFT_ms: 800,
  target_TPOT_ms: 50,

  burst_factor: 3,
  redundancy_mode: "N+1",

  serving_engine: "vLLM",

  kv_offload: false,
  speculative_decoding: false,
  prefix_caching: true,
  kv_cache_dtype: "FP16",
};
