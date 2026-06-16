# Raw research notes: AI inferencing infrastructure planning

A working dossier of the facts, formulas, numbers, and source links I gathered. Use this to shape the storyline before the post is rewritten. Each section ends with the source links the claims came from.

---

## 1. How inference actually works (the two-phase mental model)

**Prefill phase:** The model ingests the entire input prompt in a single parallel pass. Output: the first generated token, plus a populated key-value (KV) cache for every token in the prompt. Compute-heavy, benefits from high tensor throughput. This phase determines **Time to First Token (TTFT)**.

**Decode phase:** The model produces output tokens autoregressively, one at a time. Each new token requires reading the entire KV cache, multiplying through model weights, and writing new entries back. For typical batch sizes, decode is **memory-bandwidth bound, not compute bound** — tensor cores often sit partially idle while HBM moves data. This phase determines **Time per Output Token (TPOT)**, also called inter-token latency.

**Why this matters for sizing:** GPUs that look identical on paper can have very different real-world inference performance because memory bandwidth — not flops — is the dominant variable for decode. End-to-end latency ≈ TTFT + (TPOT × number_of_output_tokens).

**Recent infrastructure pattern: disaggregated prefill/decode.** Run prefill on a compute-optimized pool and decode on a memory-bandwidth-optimized pool to improve utilization. NVIDIA Dynamo's SLA-based planner is one production example. Operationally complex; relevant once you scale beyond a handful of nodes.

Sources:
- [Mastering LLM Techniques: Inference Optimization | NVIDIA Technical Blog](https://developer.nvidia.com/blog/mastering-llm-techniques-inference-optimization/)
- [Disaggregated Prefill-Decode: The Architecture Behind Meta's LLM Serving | Jarvislabs.ai](https://docs.jarvislabs.ai/blog/llm-optimization-disaggregated-prefill-decode)
- [Throughput is Not All You Need: Maximizing Goodput in LLM Serving | Hao AI Lab @ UCSD](https://haoailab.com/blogs/distserve/)
- [Scaling multi-node LLM inference with NVIDIA Dynamo | AKS Engineering Blog](https://blog.aks.azure.com/2025/10/24/dynamo-on-aks)

---

## 2. The KV cache (the silent capacity killer)

**Formula (multi-head attention):**
> KV bytes = 2 × layers × heads × head_dim × seq_len × batch_size × bytes_per_element

For grouped-query attention (GQA) — what most modern models use — replace `heads` with `kv_heads` (typically much smaller).

**Concrete numbers:**
- Llama 3.1-70B (80 layers, 8 KV heads, head_dim 128): a single 4K-token prompt at FP16 ≈ **1.34 GB** of KV cache.
- Same model at 128K context: ≈ **40 GB** for a single request — half of an 80 GB H100.
- KV cache grows linearly with sequence length and batch size.

**Why it matters:** "How big is the model?" is the wrong first question. It's "how big is the model AT THE PRECISION WE'LL RUN IT, AT THE CONTEXT LENGTH WE NEED, AT THE CONCURRENCY WE NEED?"

**Optimization strategies:** PagedAttention (vLLM), KV cache offload to CPU/SSD/object storage (Dynamo's KV Block Manager, LMCACHE), KV-cache-aware routing for cache reuse (llm-d), prefix caching for repeated system prompts.

Sources:
- [LLM Inference Series: 4. KV caching, a deeper look | Pierre Lienhart, Medium](https://medium.com/@plienhar/llm-inference-series-4-kv-caching-a-deeper-look-4ba9a77746c8)
- [KV Cache Memory Calculation for LLMs | Lyceum Technology](https://lyceum.technology/magazine/kv-cache-memory-calculation-llm/)
- [How to Cut LLM Inference Costs with KV Caching | Pure Storage](https://blog.purestorage.com/purely-technical/cut-llm-inference-costs-with-kv-caching/)
- [Master KV cache aware routing with llm-d | Red Hat Developer](https://developers.redhat.com/articles/2025/10/07/master-kv-cache-aware-routing-llm-d-efficient-ai-inference)
- [LMCACHE: An efficient KV cache layer for enterprise-scale LLM inference (PDF)](https://lmcache.ai/tech_report.pdf)

---

## 3. Latency SLOs by use case

| Use case | TTFT target | TPOT / inter-token | Notes |
|---|---|---|---|
| Chatbot (conversational) | < 500 ms (P95 < 200 ms is excellent) | 30–50 ms feels smooth when streamed | End-to-end can be longer if streaming |
| Code completion | < 100 ms | tight | User is mid-keystroke; cold-start kills UX |
| Long-form / E2E SLO example | < 500 ms TTFT | < 15 ms TPOT | < 2 s end-to-end in some published targets |
| Goodput target example | P90 TTFT < 200 ms | P90 TPOT < 50 ms | Goodput = throughput at which SLOs still hold |
| Batch (summarization, classification) | n/a | optimize aggregate throughput | No interactive constraint; pack big batches |

**Why "goodput" is a better metric than throughput:** Optimizing raw throughput by inflating batch size can blow your TTFT/TPOT SLOs. Goodput is the request rate at which the system still satisfies P90/P95 latency — it's the only number that maps to user experience.

Sources:
- [Key metrics for LLM inference | BentoML LLM Inference Handbook](https://bentoml.com/llm/inference-optimization/llm-inference-metrics)
- [Understand LLM latency and throughput metrics | Anyscale Docs](https://docs.anyscale.com/llm/serving/benchmarking/metrics)
- [Metrics — NVIDIA NIM LLMs Benchmarking](https://docs.nvidia.com/nim/benchmarking/llm/latest/metrics.html)
- [Metrics That Matter for LLM Inference | Hivenet](https://www.hivenet.com/post/llm-inference-metrics-ttft-tps)

---

## 4. The seven planning parameters (and how they propagate)

| Parameter | Drives | Practical implication |
|---|---|---|
| Model size + architecture (params, MoE, GQA, MLA) | Weights memory; activation memory; FLOPs per token | Confirm architecture, not just headline param count |
| Precision / quantization (FP16, FP8, INT8, INT4) | Bytes per parameter; decode throughput on supported HW | Halving precision ≈ halves memory, ~2× decode throughput |
| Context length (max prompt + completion) | KV cache size (linear) | 128K context can need 10× the memory per request of 8K |
| Concurrent users vs. concurrent requests | Peak in-flight requests | Active users ≠ in-flight requests — most common sizing error |
| RPS / tokens-per-second demand | Aggregate throughput target | RPS = users × req_per_user_per_min ÷ 60; tokens/s = RPS × (in + out) |
| Latency SLOs (TTFT, TPOT, E2E) | Permissible batch size; interconnect | TPOT target sets memory bandwidth requirement |
| Burst factor (peak / avg) | Headroom; overflow strategy | 3× for internal apps, 10×+ for consumer-facing during incidents |

Sources:
- [LLM Inference Sizing and Performance Guidance | VMware Cloud Foundation Blog](https://blogs.vmware.com/cloud-foundation/2024/09/25/llm-inference-sizing-and-performance-guidance/)
- [LLM Inference Sizing: Benchmarking End-to-End Inference Systems | NVIDIA GTC S62797 (PDF)](https://developer-blogs.nvidia.com/wp-content/uploads/2024/08/S62797-LLM-Inference-Sizing_-Benchmarking-End-to-End-Inference-Systems.pdf)
- [Lenovo LLM Sizing Guide](https://lenovopress.lenovo.com/lp2130-lenovo-llm-sizing-guide)
- [LLM Inference Benchmarking: How Much Does Your LLM Inference Cost? | NVIDIA](https://developer.nvidia.com/blog/llm-inference-benchmarking-how-much-does-your-llm-inference-cost/)
- [How to Choose the Right GPU for vLLM Inference | DigitalOcean](https://www.digitalocean.com/community/conceptual-articles/vllm-gpu-sizing-configuration-guide)

---

## 5. Sizing math (rules of thumb and worked formulas)

**VRAM budget:**
> VRAM_needed ≈ weights + (KV_cache_per_request × max_concurrent_requests) + activations_overhead + 20–30% headroom

**Demand math:**
> RPS = concurrent_users × requests_per_user_per_min ÷ 60
> Tokens/s demand = RPS × (avg_prompt + avg_output)

**Worked example (Llama 3.3 70B, FP8, 128K context):**
- Weights: ~70 GB
- Context KV cache (single user, 128K tokens): ~62.5 GB
- Total per single max-context request: ~132 GB
- Implication: long-context support fundamentally constrains concurrency unless KV cache is paged out

**Concurrency math:**
> Total concurrent requests = replicas × concurrent_prompts_per_replica
> Example: 2 replicas × 64 concurrent prompts = 128 concurrent requests

**Common mistake:** sizing on average users rather than peak in-flight requests. Always plan for **peak concurrent in-flight requests**, not "active users."

Sources:
- [LLM Inference Sizing and Performance Guidance | VMware Cloud Foundation Blog](https://blogs.vmware.com/cloud-foundation/2024/09/25/llm-inference-sizing-and-performance-guidance/)
- [LLM Inference TCO Calculator — v2.4 (Accenture)](https://acnicessc.github.io/llmcalc/)
- [GPU for LLM Inferencing Guide | OVHcloud](https://blog.ovhcloud.com/gpu-for-llm-inferencing-guide/)

---

## 6. Optimization techniques the AI team brings

### Quantization
- **FP16/BF16 (2 bytes):** historical default
- **FP8 (1 byte):** **production baseline in 2026**. Near-identical quality to BF16 for most tasks. Roughly 2× decode throughput on H100, H200, B200, MI300X. DeepSeek-V3 trained natively in FP8; Qwen3 ships official FP8 checkpoints
- **INT8:** ~75% size reduction vs FP32, < 1% accuracy drop. The "trusted workhorse"
- **INT4 (GPTQ, AWQ):** 4× compression; noticeable degradation on multi-step reasoning and math
- **Hybrid pattern:** keep activations at BF16/FP16 even when weights are INT8/INT4 (activation ranges are spiky and input-dependent)

### Continuous batching + PagedAttention (vLLM, TensorRT-LLM)
- Static batching wastes GPU because all requests must finish before the batch advances
- **Continuous batching** dynamically adds new requests when one finishes, every forward pass
- **PagedAttention** treats KV cache like OS-managed virtual memory: < 4% waste vs 60–80% in older systems
- Combined effect: vLLM packs ~4× more concurrent requests onto the same GPU, achieves up to 24× higher throughput than HF Transformers

### Speculative decoding
- Small "draft" model proposes tokens; large target model verifies in a single pass
- Real-world: 2–3× speedup at draft acceptance rates ≥ 0.6
- With knowledge distillation (DistillSpec): up to 6–10× speedup
- LoRA + speculative decoding: cumulative latency reduction > 60% vs base model

### LoRA / multi-tenant adapters
- Multiple fine-tuned variants share one base model; small per-tenant adapters loaded on demand
- Lets one cluster serve many tenants instead of one cluster per fine-tune

### Distillation / smaller specialized models
- Don't use the largest model for every task. Route classification/extraction/routing to small distilled models (1B–8B); reserve large model for tasks that need it
- Shifts traffic off top-end fleet onto cheaper GPUs (L40S, L4)

### Disaggregated prefill/decode
- See section 1; relevant at scale

### Tensor parallelism (TP) vs pipeline parallelism (PP)
- **TP:** splits each layer's matrices across GPUs in same node. Heavy communication; needs NVLink (NVIDIA) or Infinity Fabric (AMD). Standard play when model exceeds one GPU's memory but fits in one node
- **PP:** splits layers into sequential stages across nodes. Lower bandwidth requirement but adds latency and pipeline bubbles. Use when even an 8-GPU node isn't enough
- **Hybrid:** TP within node + PP across nodes for very large models

Sources:
- [LLM Quantization Explained: INT4, INT8, FP8, AWQ, GPTQ in 2026 | VRLA Tech](https://vrlatech.com/llm-quantization-explained-int4-int8-fp8-awq-and-gptq-in-2026/)
- [33% faster LLM inference with FP8 quantization | Baseten](https://www.baseten.co/blog/33-faster-llm-inference-with-fp8-quantization/)
- [Optimizing LLMs for Performance and Accuracy with Post-Training Quantization | NVIDIA](https://developer.nvidia.com/blog/optimizing-llms-for-performance-and-accuracy-with-post-training-quantization/)
- [LLM Quantization: BF16 vs FP8 vs INT4 | AIMultiple](https://research.aimultiple.com/llm-quantization/)
- [vLLM Explained: PagedAttention, Continuous Batching | Runpod](https://www.runpod.io/articles/guides/vllm-pagedattention-continuous-batching)
- [Achieve 23x LLM Inference Throughput & Reduce p50 Latency | Anyscale](https://www.anyscale.com/blog/continuous-batching-llm-inference)
- [Meet vLLM | Red Hat](https://www.redhat.com/en/blog/meet-vllm-faster-more-efficient-llm-inference-and-serving)
- [An Introduction to Speculative Decoding | NVIDIA](https://developer.nvidia.com/blog/an-introduction-to-speculative-decoding-for-reducing-latency-in-ai-inference/)
- [Get 3× Faster LLM Inference with Speculative Decoding | BentoML](https://www.bentoml.com/blog/3x-faster-llm-inference-with-speculative-decoding)
- [Parallelism and Scaling | vLLM docs](https://docs.vllm.ai/en/stable/serving/parallelism_scaling/)
- [Data, tensor, pipeline, expert and hybrid parallelisms | BentoML](https://bentoml.com/llm/inference-optimization/data-tensor-pipeline-expert-hybrid-parallelism)
- [Scaling LLM Inference: Tensor, Context, Expert Parallelism | Engineering at Meta](https://engineering.fb.com/2025/10/17/ai-research/scaling-llm-inference-innovations-tensor-parallelism-context-parallelism-expert-parallelism/)

---

## 7. GPU spec snapshot (mid-2026)

| GPU | VRAM | Mem BW | FP8 dense | TDP | Where it fits |
|---|---|---|---|---|---|
| **L40S** | 48 GB GDDR6 | ~864 GB/s | — (Ada gen) | 350 W | 7B–13B models, embeddings, vision/diffusion. Conventional rack power |
| **A100** | 40/80 GB HBM2e | ~2 TB/s | — | 400 W | Legacy fleet; 13B–34B at FP16, 70B at INT4 |
| **H100** | 80 GB HBM3 | 3.35 TB/s | 1,979 TFLOPS | 700 W | Production workhorse. 30B–34B single GPU; 70B with 2-way TP at FP8 |
| **H200** | 141 GB HBM3e | ~4.8 TB/s | 3,958 TFLOPS | 700 W | Same compute envelope as H100; more memory + bandwidth. Sweet spot for long-context 70B |
| **MI300X** | 192 GB HBM3 | ~5.3 TB/s | high (varies by config) | ~750 W | AMD flagship. Fits 70B at FP8 on one GPU with KV room |
| **B200** | 192 GB HBM3e | 8 TB/s | 4,500 TFLOPS | 1,000 W (air) / 1,200 W (liquid) | Blackwell. ~2.3× FP8 vs H100. Often NVL72 rack with mandatory liquid cooling |
| **Vera Rubin** (H2 2026 roadmap) | 288 GB HBM4 | 13 TB/s | — | — | Rubin NVL144 → 3.6 ExaFLOPS dense FP4 per rack |

**Server-level power:**
- HGX H100 8-GPU server: ~10–11 kW total
- DGX B200: ~14.3 kW

Sources:
- [NVIDIA Data Center GPU Specs: Complete Comparison Guide | IntuitionLabs](https://intuitionlabs.ai/articles/nvidia-data-center-gpu-specs)
- [Comparing Blackwell vs Hopper | B200 & B100 vs H200 & H100 | Exxact Blog](https://www.exxactcorp.com/blog/hpc/comparing-nvidia-tensor-core-gpus)
- [NVIDIA B200 Guide | Spheron](https://www.spheron.network/blog/nvidia-b200-complete-guide/)
- [NVIDIA H200 Vs H100 Vs A100 Vs L40S Vs L4 | Acecloud](https://acecloud.ai/blog/nvidia-h200-vs-h100-vs-a100-vs-l40s-vs-l4/)
- [NVIDIA Showdown: H100s and H200s vs B100s and B200s | Modal](https://modal.com/blog/h100-and-h200-vs-b100-and-b200)
- [MI300X vs H100 vs H200 Benchmark | SemiAnalysis](https://newsletter.semianalysis.com/p/mi300x-vs-h100-vs-h200-benchmark-part-1-training)

---

## 8. Power, cooling, rack density

| Configuration | Rack power | Cooling implication |
|---|---|---|
| Traditional colo cabinet | 10–12 kW/rack | Air; what most legacy facilities support |
| 4× H100 servers / rack | > 40 kW/rack | Beyond legacy colo; rear-door HX or similar |
| Liquid-cooling threshold | ~35–50 kW/rack | Above this, air alone is inadequate |
| GB200 NVL72 rack | 120–140 kW/rack | **Mandatory liquid cooling** |
| 80 kW DLC unit | 1 rack of 4–8 DLC servers | Direct-to-chip baseline |

**Practical implications:**
- Plan PDU and busbar capacity, not just rack-level breaker — AI workloads run hot for hours
- Above ~35 kW per rack, plan rear-door heat exchangers or direct-to-chip liquid
- Above ~80 kW per rack, liquid is no longer optional
- Bring facilities into planning early; this is not a pure IT decision

Sources:
- [NVIDIA HGX Platform: Data Center Physical Requirements Guide | IntuitionLabs](https://intuitionlabs.ai/articles/nvidia-hgx-data-center-requirements)
- [NVIDIA H200 Power Requirements | Sunbird DCIM](https://www.sunbirddcim.com/blog/nvidia-h200-power-requirements-can-your-racks-support-them)
- [Liquid Cooling vs Air: The 50kW GPU Rack Guide | Introl](https://introl.com/blog/liquid-cooling-gpu-data-centers-50kw-thermal-limits-guide)
- [AI Server GPU Water Cooling | FormulaMod](https://www.formulamod.net/blogs/new/ai-server-gpu-water-cooling-why-liquid-cooling-matters-for-h100-h200-and-b200)
- [Cooling and Airflow Optimization | NVIDIA DGX SuperPOD H100](https://docs.nvidia.com/dgx-superpod/design-guides/dgx-superpod-data-center-design-h100/latest/cooling.html)
- [How to build an AI Datacentre — Part 1 (Cooling and Power) | Medium](https://medium.com/@Elongated_musk/how-to-build-an-ai-datacentre-part-1-cooling-and-power-5c15ddfc16c9)
- [AI Data Center Cooling Requirements 2026 | SLYD](https://slyd.com/guides/cooling-requirements)
- [Hotter Hardware: Rack Densities Test Data Center Cooling | Data Center Frontier](https://www.datacenterfrontier.com/data-center-cooling/article/33004506/hotter-hardware-rack-densities-test-data-center-cooling-strategies)

---

## 9. Autoscaling, headroom, burst behavior

**The cold-start problem:** loading a 70B model + warming KV cache takes minutes. By the time a new replica is ready, the burst is often over. Reactive autoscale doesn't work for latency-critical inference. Carry steady-state headroom; use elastic capacity only for throughput-critical, latency-tolerant workloads.

**GPU utilization is misleading:** vLLM at 90% GPU util may be underloaded — busy moving memory, not doing math. The signals that actually predict tail-latency degradation:
- KV-cache occupancy (vLLM `/metrics`)
- Request queue depth (leading indicator)
- Batch saturation
- Tail latency itself (P95/P99 TTFT, TPOT)

**Headroom rule of thumb:** Set HPA target around 60% of KV-cache budget so there's room to absorb bursts while new pods come up. 30–40% steady-state headroom for production interactive workloads.

**Burst capacity strategy:**
- Reserved/on-demand for baseline
- Spot or cloud burst for elastic overflow (60–90% cost savings, but handle interruptions)
- Don't rely on cloud burst alone for latency-critical paths

Sources:
- [What are the most effective GPU utilization metrics for autoscaling AI inference workloads? | ResearchGate](https://www.researchgate.net/post/What_are_the_most_effective_GPU_utilization_metrics_for_autoscaling_AI_inference_workloads_vLLM_Triton_in_Kubernetes)
- [Autoscaling self-hosted Llama models | Llama Deployment Guides](https://www.llama.com/docs/deployment/autoscaling/)
- [GPU Autoscaling for AI: From Setup to Cost Optimization | DigitalOcean](https://www.digitalocean.com/resources/articles/gpu-autoscaling)
- [Scaling inference workloads automatically in production | GMI Cloud](https://www.gmicloud.ai/en/blog/scaling-inference-workloads-automatically-on-gmi-cloud)
- [AI Workload Right-Sizing | Introl](https://introl.com/blog/ai-workload-right-sizing-gpu-resource-allocation-2025)
- [How to Build GPU Infrastructure for AI Agents | Spheron](https://www.spheron.network/blog/gpu-infrastructure-ai-agents-2026/)

---

## 10. Three use case shapes (sizing patterns)

### Internal coding copilot (1,500 engineers)
- Model: 7B coder (FP8) for completions, optional 32B for chat
- SLO: TTFT < 100 ms (tight), TPOT < 25 ms
- Concurrency: ~30 in-flight completion requests at peak
- Sizing pattern: 2–4× L40S for completions, 1× H100 for chat path. Single 4U server, < 10 kW
- Levers: continuous batching mandatory; speculative decoding doubles capacity; FP8 doubles capacity again
- Common mistake: sizing on user count rather than in-flight request count

### Customer support RAG chatbot (regional bank)
- Model: Llama 3.3 70B FP8 + small embedding/reranker
- SLO: TTFT < 500 ms, TPOT < 40 ms
- Avg context: 6K tokens (system prompt + retrieved docs + history); ~250 token output
- Concurrency: 80 active conversations, ~25 in-flight model calls/sec at peak; 2.5× burst factor
- Sizing math: 70 GB weights + ~130 GB KV (64 in-flight × 6K tokens) + overhead + headroom ≈ 220 GB needed
- Sizing pattern: 2× H200 with NVLink (282 GB) handles steady state; 4× H200 (two replicas) for burst + zero-downtime ops; small GPUs (L40S/L4) for retrieval
- Footprint: ~4–5 kW in single chassis, single 8 kW circuit
- Levers: prefix/retrieval caching can cut effective prefill cost 40–70%; tune retrieval chunk size — context length dominates KV cost

### Nightly batch document summarization
- Model: 70B FP8
- SLO: no interactive — 50,000 docs (avg 8K in / 400 out) in 6-hour window
- Demand: 50,000 × 8,400 ÷ (6 × 3,600) ≈ 19,400 tokens/sec
- Sizing: 2× H200 vLLM yields ~5–8K tok/s on 70B FP8; 6–8 H200s total
- Pattern: this is the right place to use older inventory (A100s, etc.) — no online SLO, deliberately use "yesterday's GPUs" and reserve newest for interactive
- Levers: continuous batching enabled with one big batch (not 50K individual API calls); checkpoint partial progress

---

## 11. Storyline angles you could take

A few framings the same research can support, depending on what you want the post to do:

1. **"The seven parameters" how-to.** Practical, checklist-driven. Best if the goal is to make IT admins feel equipped to size their first cluster. *(Closest to the draft I started.)*
2. **"What changes when AI shows up in your data center."** Emphasizes the discontinuity — power density, liquid cooling, KV-cache as a new resource class. Best if the audience needs to be convinced that AI infra is a different beast.
3. **"Three workloads, three architectures."** Lead with the use cases; let the parameters fall out of the worked examples. Best if the audience is concrete-thinking and wants pattern recognition.
4. **"The IT-admin / AI-engineer planning conversation."** Frame the whole post around the joint planning checklist — what each side commits to, where they collaborate. Best if the goal is org alignment, not just technical guidance.
5. **"The optimization lever stack."** Lead with what the AI engineer can do (quantization, batching, distillation, speculative decoding) and how each lever changes IT's sizing math. Best if the post is going to an audience that already gets infra but underestimates how much AI-side optimization changes the picture.

Existing draft of the post (using framing #1) is at `planning-on-prem-ai-inferencing.md` — let me know which angle (or hybrid) you want and I'll rework it.
