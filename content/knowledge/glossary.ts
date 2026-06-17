/**
 * Glossary of terms used throughout the Knowledge curriculum.
 * Surface via the `<GlossaryTerm>` component for hover tooltips on first
 * occurrence per module.
 */

export type GlossaryEntry = {
  term: string;
  definition: string;
};

export const GLOSSARY: Record<string, GlossaryEntry> = {
  inference: {
    term: "Inference",
    definition:
      "Running a trained model against new inputs to produce outputs. Distinct from training (which builds the model in the first place).",
  },
  training: {
    term: "Training",
    definition:
      "The process of teaching a model from data — gradient descent over a very large dataset. Compute- and time-intensive; usually done once per model release.",
  },
  fine_tuning: {
    term: "Fine-tuning",
    definition:
      "Continuing to train a pre-trained model on a smaller, task-specific dataset to specialize it. Lighter than training from scratch but still requires gradient compute.",
  },
  prefill: {
    term: "Prefill",
    definition:
      "The first phase of inference. The model reads the entire prompt in parallel and builds its working memory (the KV cache) before generating any output tokens.",
  },
  decode: {
    term: "Decode",
    definition:
      "The second phase of inference. The model generates output tokens one at a time, each one depending on all the previous ones. Dominates total latency for long responses.",
  },
  kv_cache: {
    term: "KV cache",
    definition:
      "Key-value cache. The model's working memory for an in-flight request — intermediate state for every token seen so far. Grows linearly with context length and lives in GPU memory.",
  },
  ttft: {
    term: "TTFT",
    definition:
      "Time to First Token. The wait between sending a prompt and seeing the first character of the response. Driven by prefill speed plus queueing.",
  },
  tpot: {
    term: "TPOT",
    definition:
      "Time per Output Token. The steady-state pace at which tokens stream out of the model after prefill. Governs how smooth a streamed response feels.",
  },
  hbm: {
    term: "HBM",
    definition:
      "High-Bandwidth Memory. The memory technology used on data-center GPUs. Far faster than DDR5 but limited in capacity per stack — typically 80–192 GB per GPU today.",
  },
  vram: {
    term: "VRAM",
    definition:
      "Video RAM — used informally to mean the memory on a GPU. On data-center accelerators, VRAM is HBM.",
  },
  fp8: {
    term: "FP8",
    definition:
      "An 8-bit floating-point number format. Half the memory footprint of FP16 and roughly twice the decode throughput on Hopper / Blackwell, with negligible quality loss for most workloads. The 2026 production baseline.",
  },
  quantization: {
    term: "Quantization",
    definition:
      "Storing a model's weights (and sometimes activations) in lower precision than they were trained in. Trades a small amount of quality for major savings in memory and bandwidth.",
  },
  gqa: {
    term: "GQA",
    definition:
      "Grouped-Query Attention. A memory-efficient attention variant used in Llama 3, Qwen3, and most modern open-weight models. Reduces the KV cache footprint by sharing keys/values across query heads.",
  },
  moe: {
    term: "MoE",
    definition:
      "Mixture-of-Experts. A model architecture where each token activates only a fraction of the total parameters (e.g., DeepSeek-V3 has 671B total params but only 37B active per token). Full weights still need to be resident in memory, but compute is much lighter.",
  },
  mla: {
    term: "MLA",
    definition:
      "Multi-head Latent Attention. DeepSeek-V3's attention variant. Compresses the KV cache by roughly 10× compared to equivalent GQA.",
  },
  tensor_parallelism: {
    term: "Tensor parallelism",
    definition:
      "Splitting individual model layers across multiple GPUs inside one chassis. Heavy inter-GPU traffic, so it requires NVLink (NVIDIA) or Infinity Fabric (AMD). Standard when the model is too large for a single GPU.",
  },
  pipeline_parallelism: {
    term: "Pipeline parallelism",
    definition:
      "Splitting the model into sequential layer groups across multiple servers. Lower bandwidth requirements than tensor parallelism, but adds latency. Used when even an 8-GPU chassis isn't enough.",
  },
  vllm: {
    term: "vLLM",
    definition:
      "An open-source inference server. Pioneered PagedAttention (treating GPU memory like virtual memory) and continuous batching (replacing finished requests in-flight). The de-facto baseline for high-throughput LLM serving.",
  },
  throughput: {
    term: "Throughput",
    definition:
      "Tokens generated per second, either per request or aggregate across the cluster. The key economic metric — more throughput per dollar means more users served per GPU.",
  },
  burst_factor: {
    term: "Burst factor",
    definition:
      "Peak load divided by average load. A factor of 2.5× means peak demand is two-and-a-half times the steady-state. Drives how much headroom you carry above baseline capacity.",
  },
  continuous_batching: {
    term: "Continuous batching",
    definition:
      "Replacing finished requests with new ones inside a running batch instead of waiting for the whole batch to finish. Originated in vLLM; now standard in TensorRT-LLM, TGI, SGLang, and others.",
  },
  paged_attention: {
    term: "PagedAttention",
    definition:
      "Allocating the KV cache in fixed-size pages and packing requests in dynamically — like an OS treats RAM. Eliminates fragmentation; lets you fit roughly 4× more concurrent requests on the same GPU.",
  },
  speculative_decoding: {
    term: "Speculative decoding",
    definition:
      "Running a small draft model to propose several tokens, then having the large target model verify them in a single pass. Typically 2–3× faster decode for chat workloads.",
  },
};
