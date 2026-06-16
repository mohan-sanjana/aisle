/**
 * Sizer calc engine — typed input/output interfaces.
 *
 * Pure TypeScript module. No UI deps. Implements the 15-step algorithm
 * from `docs/sizing-math.md`. Public entry point: `sizeWorkload`.
 */

export type WorkloadType =
  | "interactive_chat"
  | "code_completion"
  | "rag"
  | "batch"
  | "agentic";

export type ModelArchitecture = "dense" | "gqa" | "moe";

export type Precision = "FP16" | "BF16" | "FP8" | "INT8" | "INT4";

export type KvCacheDtype = "FP16" | "FP8";

export type RedundancyMode = "N" | "N+1" | "N+2";

export type ServingEngineId = "vLLM" | "TRT-LLM" | "Triton" | "SGLang";

export type ScenarioName = "baseline" | "burst" | "resilient";

/** Sizer input — see sizing-math.md Section 1 for the canonical schema. */
export type SizerInput = {
  // Workload
  workload_type: WorkloadType;

  // Model
  parameter_count_b: number; // billions
  /** Optional family id — looks up defaults from model_families.ts. */
  model_family?: string;
  model_architecture: ModelArchitecture;
  /** Required when architecture === "moe"; ignored otherwise. */
  active_params_b?: number;
  precision: Precision;

  // Context + traffic
  max_context_tokens: number;
  avg_prompt_tokens: number;
  avg_output_tokens: number;
  concurrent_users: number;
  requests_per_user_per_minute: number;

  // SLOs (ms)
  target_TTFT_ms: number;
  target_TPOT_ms: number;

  // Reliability
  burst_factor: number;
  redundancy_mode: RedundancyMode;

  // Serving
  serving_engine: ServingEngineId;

  // Optional throughput override (tokens/sec/replica). When set, replaces
  // the default coefficient for this session.
  throughput_override_tokens_per_sec_per_replica?: number;

  // Optional advanced toggles
  kv_offload?: boolean;
  speculative_decoding?: boolean;
  prefix_caching?: boolean;
  kv_cache_dtype?: KvCacheDtype;
};

/** Per-replica server hardware recommendation. */
export type ServerSpec = {
  cpu_class: string;
  ram_gb: number;
  gpu_id: string;
  gpu_count: number;
  nic: string;
  local_nvme_tb: number;
};

export type FabricSpec = {
  type: string;
  bandwidth_gbps: number;
  rationale: string;
};

export type PowerSpec = {
  sustained_kw_total: number;
  kw_per_rack: number;
  pue: number;
  facility_kw_total: number;
};

export type CoolingSpec = {
  tier: string;
  rationale: string;
};

export type ScenarioOutput = {
  name: ScenarioName;
  server_spec: ServerSpec;
  /** Logical serving units. May exceed `servers_required` when consolidated. */
  replica_count: number;
  /** Physical server count after consolidation. */
  servers_required: number;
  /** Logical replicas hosted per physical server. 1 unless consolidated. */
  replicas_per_server: number;
  fabric: FabricSpec;
  power: PowerSpec;
  cooling: CoolingSpec;
  warnings: string[];
};

export type SizerConfidence = {
  /** ±15 for dense/GQA; ±30 for MoE. */
  margin_pct: number;
  is_moe: boolean;
};

export type SizerAssumptions = {
  throughput_tokens_per_sec_per_replica: number;
  throughput_source: string;
  layers: number;
  kv_heads: number;
  head_dim: number;
  bytes_per_param: number;
  bytes_per_kv_element: number;
};

export type SizerOutput = {
  scenarios: {
    baseline: ScenarioOutput;
    burst: ScenarioOutput;
    resilient: ScenarioOutput;
  };
  confidence: SizerConfidence;
  assumptions: SizerAssumptions;
  guardrails_triggered: string[];
};

/** Internal — the resolved model configuration after family lookup. */
export type ResolvedModelConfig = {
  parameter_count_b: number;
  active_params_b: number; // equals parameter_count_b for dense/gqa
  architecture: ModelArchitecture;
  layers: number;
  kv_heads: number;
  head_dim: number;
  uses_mla: boolean;
  family_id?: string;
};

/** Scenario-specific multipliers applied per sizing-math.md §4. */
export type ScenarioParams = {
  name: ScenarioName;
  burst_factor: number;
  redundancy_offset: number;
  headroom_fraction: number;
  /** Resilient mode imposes a pair-of-failure-domains constraint. */
  pair_failure_domains: boolean;
};
