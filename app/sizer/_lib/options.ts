import type {
  KvCacheDtype,
  ModelArchitecture,
  Precision,
  RedundancyMode,
  ServingEngineId,
  WorkloadType,
} from "@/lib/sizer/types";

export type Option<T extends string> = {
  value: T;
  label: string;
  description?: string;
};

export const WORKLOAD_OPTIONS: ReadonlyArray<Option<WorkloadType>> = [
  {
    value: "interactive_chat",
    label: "Interactive chat",
    description: "General assistant; latency-sensitive; bursty traffic.",
  },
  {
    value: "code_completion",
    label: "Code completion",
    description: "Latency-critical (TTFT < 200 ms); short context windows.",
  },
  {
    value: "rag",
    label: "RAG (retrieval-augmented)",
    description: "Long prompts (4–16k tokens); shorter answers; KV-heavy.",
  },
  {
    value: "batch",
    label: "Batch / offline",
    description: "Throughput-bound; relaxed TTFT; favour large batches.",
  },
  {
    value: "agentic",
    label: "Agentic / multi-step",
    description: "Multiple tool-calls per turn; long-running sessions.",
  },
];

export const ARCHITECTURE_OPTIONS: ReadonlyArray<Option<ModelArchitecture>> = [
  { value: "dense", label: "Dense", description: "Classic dense transformer." },
  {
    value: "gqa",
    label: "GQA",
    description: "Grouped-query attention (Llama 3, Qwen3).",
  },
  {
    value: "moe",
    label: "MoE",
    description:
      "Mixture-of-experts; active params per token are a fraction of total.",
  },
];

export const PRECISION_OPTIONS: ReadonlyArray<Option<Precision>> = [
  { value: "FP16", label: "FP16", description: "Baseline; 2 bytes per param." },
  { value: "BF16", label: "BF16", description: "Bfloat16; 2 bytes per param." },
  {
    value: "FP8",
    label: "FP8",
    description: "Hopper+ recommended default; 1 byte per param.",
  },
  {
    value: "INT8",
    label: "INT8",
    description: "Aggressive quantization; 1 byte per param.",
  },
  {
    value: "INT4",
    label: "INT4",
    description: "Maximum compression; 0.5 bytes per param. Quality risk.",
  },
];

export const KV_CACHE_DTYPE_OPTIONS: ReadonlyArray<Option<KvCacheDtype>> = [
  { value: "FP16", label: "FP16", description: "Default; preserves accuracy." },
  {
    value: "FP8",
    label: "FP8",
    description: "Halves KV memory at small accuracy cost.",
  },
];

export const REDUNDANCY_OPTIONS: ReadonlyArray<Option<RedundancyMode>> = [
  {
    value: "N",
    label: "N (no spares)",
    description: "Minimum replicas. Single failure → degraded service.",
  },
  {
    value: "N+1",
    label: "N+1",
    description: "One spare; tolerate single replica loss.",
  },
  {
    value: "N+2",
    label: "N+2",
    description: "Two spares; maintenance + failure simultaneously.",
  },
];

export const SERVING_ENGINE_OPTIONS: ReadonlyArray<Option<ServingEngineId>> = [
  {
    value: "vLLM",
    label: "vLLM",
    description:
      "Open-source default. PagedAttention, continuous batching, broad model support.",
  },
  {
    value: "TRT-LLM",
    label: "TensorRT-LLM",
    description:
      "NVIDIA stack; +20% throughput over vLLM on Hopper/Blackwell.",
  },
  {
    value: "Triton",
    label: "Triton (TRT-LLM backend)",
    description: "Production serving; typically hosts TRT-LLM.",
  },
  {
    value: "SGLang",
    label: "SGLang",
    description: "Programmable serving for agentic flows; vLLM-class throughput.",
  },
];

/** Default TPOT (ms) per workload type — tooltip help text. */
export const TPOT_DEFAULTS: Record<WorkloadType, number> = {
  interactive_chat: 40,
  code_completion: 30,
  rag: 50,
  batch: 100,
  agentic: 60,
};

/** Default TTFT (ms) per workload type — tooltip help text. */
export const TTFT_DEFAULTS: Record<WorkloadType, number> = {
  interactive_chat: 500,
  code_completion: 200,
  rag: 800,
  batch: 5000,
  agentic: 1000,
};
