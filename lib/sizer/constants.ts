/**
 * Lookup tables and constants for the Sizer calc engine.
 * All numbers reference sizing-math.md §3.
 */

import type { Precision, KvCacheDtype, ServingEngineId, ScenarioName, ScenarioParams } from "./types";

// ──────────────────────────────────────────────────────────────────────────────
// Precision → bytes per element
// ──────────────────────────────────────────────────────────────────────────────

/** Bytes per parameter for weights memory (sizing-math.md §3). */
export const BYTES_PER_PARAM: Record<Precision, number> = {
  FP16: 2,
  BF16: 2,
  FP8: 1,
  INT8: 1,
  INT4: 0.5,
};

/** Bytes per KV element. Mirrors weight bytes but may be overridden via
 *  `kv_cache_dtype` (FP8 KV halves vs FP16 KV). */
export const BYTES_PER_KV: Record<KvCacheDtype, number> = {
  FP16: 2,
  FP8: 1,
};

// ──────────────────────────────────────────────────────────────────────────────
// Confidence margins (Appendix B locked decision #4)
// ──────────────────────────────────────────────────────────────────────────────

export const CONFIDENCE_DENSE_PCT = 15;
export const CONFIDENCE_MOE_PCT = 30;

// ──────────────────────────────────────────────────────────────────────────────
// GPU SKU specs (subset surfaced from catalog.json, used for selection ordering)
// Catalog remains the source of truth — these constants are the *preferred
// ascending search order* and physical attributes the engine compares against.
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Preferred ascending GPU order — sizing-math.md §8:
 *  "Prefer single-GPU when possible; ascending order
 *   L40S → A100-80 → H100 → H200 → MI300X → B200."
 *
 * `id` matches `catalog.json` accelerators[].id.
 */
export const GPU_SEARCH_ORDER: readonly string[] = [
  "nvidia-l40s",
  "nvidia-a100-80gb-sxm",
  "nvidia-h100-sxm",
  "nvidia-h200-sxm",
  "amd-mi300x",
  "nvidia-b200-sxm",
];

// ──────────────────────────────────────────────────────────────────────────────
// TP efficiency table (sizing-math.md §10)
// ──────────────────────────────────────────────────────────────────────────────

/** Tensor-parallel efficiency by N_gpu within node (NVLink-attached). */
export function tpEfficiency(nGpu: number): number {
  if (nGpu <= 1) return 1.0;
  if (nGpu === 2) return 0.92;
  if (nGpu <= 4) return 0.85;
  return 0.75; // 5..8 GPUs (TP=8)
}

/** Cross-node pipeline-parallel efficiency penalty per stage (halve again
 *  per sizing-math.md §10). */
export const PP_EFFICIENCY_PER_STAGE = 0.5;

// ──────────────────────────────────────────────────────────────────────────────
// Per-replica throughput coefficient table (sizing-math.md §3)
// Tokens/sec, FP8, vLLM ~v0.6+. Conservative midpoints of published ranges.
// Engine multipliers applied separately (TRT-LLM +20%, SGLang +5%).
// ──────────────────────────────────────────────────────────────────────────────

type ThroughputKey = {
  /** Bucket of parameter_count_b. */
  size_bucket: "7B" | "13-34B" | "70B" | "405B+";
  gpu_id: string;
  gpu_count: number;
};

type ThroughputEntry = ThroughputKey & {
  tokens_per_sec: number;
  source: string;
};

/** Base throughput table (FP8, vLLM, mixed prompt/output). */
export const THROUGHPUT_TABLE: readonly ThroughputEntry[] = [
  {
    size_bucket: "7B",
    gpu_id: "nvidia-l40s",
    gpu_count: 1,
    tokens_per_sec: 3000,
    source: "https://www.digitalocean.com/community/conceptual-articles/vllm-gpu-sizing-configuration-guide",
  },
  {
    size_bucket: "7B",
    gpu_id: "nvidia-h100-sxm",
    gpu_count: 1,
    tokens_per_sec: 10000,
    source: "https://docs.anyscale.com/llm/serving/benchmarking/metrics",
  },
  {
    size_bucket: "7B",
    gpu_id: "nvidia-h200-sxm",
    gpu_count: 1,
    tokens_per_sec: 12000,
    source: "extrapolated from H100 + H200 BW ratio",
  },
  {
    size_bucket: "13-34B",
    gpu_id: "nvidia-h100-sxm",
    gpu_count: 1,
    tokens_per_sec: 4500,
    source: "NVIDIA NIM bench",
  },
  {
    size_bucket: "13-34B",
    gpu_id: "nvidia-l40s",
    gpu_count: 1,
    tokens_per_sec: 1500,
    source: "DigitalOcean vLLM guide (13B FP8 on L40S)",
  },
  {
    size_bucket: "13-34B",
    gpu_id: "nvidia-h200-sxm",
    gpu_count: 1,
    tokens_per_sec: 5500,
    source: "extrapolated",
  },
  {
    size_bucket: "70B",
    gpu_id: "nvidia-h100-sxm",
    gpu_count: 2,
    tokens_per_sec: 3250,
    source: "https://docs.nvidia.com/nim/benchmarking/llm/latest/metrics.html",
  },
  {
    size_bucket: "70B",
    gpu_id: "nvidia-h200-sxm",
    gpu_count: 2,
    tokens_per_sec: 6500,
    source: "https://developer.nvidia.com/blog/llm-inference-benchmarking-how-much-does-your-llm-inference-cost/",
  },
  {
    size_bucket: "70B",
    gpu_id: "amd-mi300x",
    gpu_count: 1,
    tokens_per_sec: 3500,
    source: "https://newsletter.semianalysis.com/p/mi300x-vs-h100-vs-h200-benchmark-part-1-training",
  },
  {
    size_bucket: "70B",
    gpu_id: "nvidia-b200-sxm",
    gpu_count: 2,
    tokens_per_sec: 15000,
    source: "https://modal.com/blog/h100-and-h200-vs-b100-and-b200",
  },
  {
    size_bucket: "70B",
    gpu_id: "nvidia-h200-sxm",
    gpu_count: 4,
    tokens_per_sec: 9500,
    source: "extrapolated from 2x H200 with TP=4 efficiency",
  },
  {
    size_bucket: "405B+",
    gpu_id: "nvidia-h200-sxm",
    gpu_count: 8,
    tokens_per_sec: 2000,
    source: "extrapolated (sizing-math.md §3)",
  },
  {
    size_bucket: "405B+",
    gpu_id: "nvidia-b200-sxm",
    gpu_count: 8,
    tokens_per_sec: 5000,
    source: "extrapolated (sizing-math.md §3)",
  },
];

/** Engine multipliers (sizing-math.md §3 footnote). */
export const ENGINE_THROUGHPUT_MULTIPLIER: Record<ServingEngineId, number> = {
  vLLM: 1.0,
  "TRT-LLM": 1.2, // +15-25%; midpoint 20%
  Triton: 1.2, // typically hosts TRT-LLM
  SGLang: 1.05, // competitive with vLLM
};

/** Map a parameter count (B) into a throughput-table size bucket. */
export function sizeBucketForParams(paramCountB: number): "7B" | "13-34B" | "70B" | "405B+" {
  if (paramCountB <= 9) return "7B";
  if (paramCountB <= 40) return "13-34B";
  if (paramCountB <= 120) return "70B";
  return "405B+";
}

// ──────────────────────────────────────────────────────────────────────────────
// Per-server power (sizing-math.md §3)
// ──────────────────────────────────────────────────────────────────────────────

/** Approximate non-GPU server overhead (W). CPU/RAM/NIC/fans. */
export const SERVER_OVERHEAD_W_8GPU = 1500;
export const SERVER_OVERHEAD_W_SMALL = 400; // 1–4 GPU PCIe servers

/** Hand-coded fixed totals where the catalog GPU TDP doesn't capture the
 *  whole platform (e.g. DGX B200 quoted as 14.3 kW total). */
export const FIXED_SERVER_POWER_W: Record<string, number> = {
  // 8-GPU server totals from sizing-math.md §3
  // Computed only when N_gpu === 8 with the matching GPU.
};

// ──────────────────────────────────────────────────────────────────────────────
// PUE values by cooling tier (sizing-math.md §14)
// ──────────────────────────────────────────────────────────────────────────────

export const PUE_BY_TIER: Record<string, number> = {
  air_traditional: 1.5,
  air_high_density: 1.5,
  rdhx: 1.25,
  dlc: 1.15,
  gb200_nvl72: 1.1,
};

// ──────────────────────────────────────────────────────────────────────────────
// Cooling tier thresholds (sizing-math.md §15)
// ──────────────────────────────────────────────────────────────────────────────

export type CoolingTierThreshold = {
  id: string;
  /** Display label and rationale. */
  label: string;
  /** Max kW/rack this tier handles (Infinity for top tier). */
  max_kw_per_rack: number;
  rationale: string;
};

export const COOLING_TIERS: readonly CoolingTierThreshold[] = [
  {
    id: "air-traditional",
    label: "Traditional air-cooled",
    max_kw_per_rack: 15,
    rationale: "Standard hot-aisle/cold-aisle CRAC/CRAH. Fits any legacy colo.",
  },
  {
    id: "air-high-density",
    label: "Dense air + containment",
    max_kw_per_rack: 35,
    rationale: "Hot-aisle containment plus high-CFM air handlers.",
  },
  {
    id: "rdhx",
    label: "Rear-door heat exchanger (RDHX)",
    max_kw_per_rack: 80,
    rationale: "Air-to-liquid rear-door coil; server-side air, facility-side water.",
  },
  {
    id: "dlc",
    label: "Direct liquid cooling (cold plate)",
    max_kw_per_rack: 120,
    rationale: "Cold plates on GPU/CPU; required above ~80 kW/rack.",
  },
  {
    id: "gb200-nvl72",
    label: "GB200 NVL72 (mandatory liquid)",
    max_kw_per_rack: Infinity,
    rationale: "Pre-integrated 72-GPU NVLink rack. No air option.",
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Network fabric selection (sizing-math.md §13)
// ──────────────────────────────────────────────────────────────────────────────

export type FabricRule = {
  id: string;
  type: string;
  bandwidth_gbps: number;
  rationale: string;
};

export const FABRIC_FRONTEND: FabricRule = {
  id: "eth-100gbe-frontend",
  type: "100 GbE frontend",
  bandwidth_gbps: 100,
  rationale: "Single-node replicas: client/storage/management traffic only; internal TP stays on NVLink.",
};

export const FABRIC_IB_NDR: FabricRule = {
  id: "ib-ndr-400",
  type: "InfiniBand NDR 400 Gb",
  bandwidth_gbps: 400,
  rationale: "Multi-node TP/PP requires ≥400 Gb low-latency RDMA fabric.",
};

export const FABRIC_IB_XDR: FabricRule = {
  id: "ib-xdr-800",
  type: "InfiniBand XDR 800 Gb",
  bandwidth_gbps: 800,
  rationale: "Very large MoE / disaggregated prefill-decode at scale.",
};

// ──────────────────────────────────────────────────────────────────────────────
// Scenario parameters (sizing-math.md §4)
// ──────────────────────────────────────────────────────────────────────────────

export function scenarioParams(
  scenario: ScenarioName,
  userBurst: number,
  userRedundancy: "N" | "N+1" | "N+2",
): ScenarioParams {
  const redundancyOffset = userRedundancy === "N" ? 0 : userRedundancy === "N+1" ? 1 : 2;
  switch (scenario) {
    case "baseline":
      return {
        name: "baseline",
        burst_factor: 1.0,
        redundancy_offset: 0,
        headroom_fraction: 0.2,
        pair_failure_domains: false,
      };
    case "burst":
      return {
        name: "burst",
        burst_factor: userBurst,
        redundancy_offset: Math.max(1, redundancyOffset),
        headroom_fraction: 0.25,
        pair_failure_domains: false,
      };
    case "resilient":
      return {
        name: "resilient",
        burst_factor: Math.max(userBurst, 3.0),
        redundancy_offset: 2,
        headroom_fraction: 0.3,
        pair_failure_domains: true,
      };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Misc structural constants
// ──────────────────────────────────────────────────────────────────────────────

/** GB per GPU slot in an HGX baseboard. */
export const MAX_GPUS_PER_NODE = 8;

/** Activation floor (sizing-math.md §5). */
export const ACTIVATION_FLOOR_GB = 2;
export const ACTIVATION_FRACTION_OF_WEIGHTS = 0.05;

/** Headroom default (sizing-math.md §6) — overridden by scenario. */
export const HEADROOM_DEFAULT = 0.25;

/** KV-offload memory multiplier (sizing-math.md §4). */
export const KV_OFFLOAD_MULTIPLIER = 0.5;

/** Speculative-decoding throughput multiplier (sizing-math.md §5). */
export const SPECULATIVE_DECODING_MULTIPLIER = 2.0;
export const SPECULATIVE_DECODING_VRAM_OVERHEAD = 0.1;
