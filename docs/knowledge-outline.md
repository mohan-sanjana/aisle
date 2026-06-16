# Knowledge Section — Content Outlines (MVP, Phase 1)

Audience: IT admins and data center planners standing up on-prem LLM inference. Voice: warm, technical, no marketing. Scope: on-prem only, inference only.

The four pages below form a linear learning path: **Overview → What is Inferencing → Parameters → Checklist**. Each page is self-contained but assumes the reader will or has walked the others.

---

## Topic 1 — Overview

### Page metadata
- **id:** `knowledge.overview`
- **slug:** `/knowledge/overview`
- **title:** "AI Infrastructure for IT Admins: Start Here"
- **description:** A one-page orientation to why AI workloads behave unlike anything else in your data center, and why this site focuses on inference.
- **target word count:** ~1,000
- **primary learning objective:** The reader can explain, in their own words, why an LLM inference workload is a new infrastructure class and what the model-in-memory / context-in / tokens-out mental model means in practice.
- **secondary objectives:**
  - Distinguish the five major AI workload categories and name which one this site covers.
  - Recognize that inference, not training, is what most enterprises will run on-prem first.
  - Know what they will learn on the next three pages.

### Section-by-section outline

#### H2: "Why this is not just another workload"
- **Job to be done:** Convince a skeptical IT planner that AI inference doesn't fit existing capacity-planning templates.
- **Key points:**
  - For a decade, CPU, RAM, IOPS, and network scaled in predictable ratios. Generative AI breaks those ratios.
  - A single model can need one GPU at one precision and eight at another — the workload definition itself is fluid.
  - A "200-user" inference app can demand more burst capacity than a production database, because each user holds gigabytes of GPU memory while their conversation is live.
  - Power density per rack jumps from ~10 kW to 40–140 kW; cooling assumptions break above ~35 kW/rack.
  - "Buy GPUs and rack them" is the wrong instinct. The right one is "size memory, bandwidth, power, cooling, and the AI team's optimization roadmap together."
- **Suggested diagrams:** None — this is the framing section. Keep it prose.
- **Cross-links:** Topic 2 ("What inferencing actually does"), Topic 3 ("The seven parameters").
- **External references:**
  - [LLM Inference Sizing and Performance Guidance | VMware Cloud Foundation Blog](https://blogs.vmware.com/cloud-foundation/2024/09/25/llm-inference-sizing-and-performance-guidance/)
  - [How to build an AI Datacentre — Part 1 (Cooling and Power) | Medium](https://medium.com/@Elongated_musk/how-to-build-an-ai-datacentre-part-1-cooling-and-power-5c15ddfc16c9)

#### H2: "The five AI workload categories — and which one this site is about"
- **Job to be done:** Place "inference" inside the larger AI workload landscape so the reader knows what is in scope and what is not.
- **Key points:**
  - **Pre-training:** building a base model from scratch. Tens of thousands of GPUs, months of wall-clock, hyperscaler-class facilities. Not what enterprises do.
  - **Fine-tuning:** adapting an existing model with new data. Bursty, schedulable, fits on tens of GPUs for a few hours to a few days. Storage-heavy.
  - **Inference:** running a trained model to answer requests. Steady-state, latency-sensitive, what end users actually touch. The focus of this site.
  - **Embeddings:** turning text into vectors for search or retrieval. Tiny by comparison — runs on L4 / L40S-class hardware.
  - **RAG retrieval:** the vector search, reranking, and document fetch that feeds context into inference. CPU- and storage-heavy more than GPU-heavy.
  - Most enterprise on-prem AI starts with inference plus retrieval. Fine-tuning shows up later; pre-training rarely shows up at all.
- **Suggested diagram (Mermaid):**
  ```mermaid
  flowchart LR
      A[Pre-training] -.->|hyperscale only| X[ ]
      B[Fine-tuning] --> M[Trained model]
      M --> C[Inference]
      D[Documents] --> E[Embeddings]
      E --> F[(Vector store)]
      F --> G[RAG retrieval]
      G --> C
      C --> U[End user]
      style C fill:#e8f0ff,stroke:#3366cc,stroke-width:2px
  ```
- **Cross-links:** Topic 2 (deeper dive on inference itself).
- **External references:**
  - [Mastering LLM Techniques: Inference Optimization | NVIDIA Technical Blog](https://developer.nvidia.com/blog/mastering-llm-techniques-inference-optimization/)

#### H2: "The mental model: model in memory, context in, tokens out"
- **Job to be done:** Give the reader a one-paragraph picture they can hold in their head before they read any sizing math.
- **Key points:**
  - An LLM is a large set of numbers (weights) that sit in GPU memory.
  - A request brings in some text (the *context*: system prompt + user prompt + retrieved documents + history).
  - The GPU repeatedly multiplies the context through the weights to produce one output token at a time, streaming them back to the user.
  - Two things compete for GPU memory: the weights (fixed once loaded) and the working state for every in-flight request (the **KV cache**, which scales with context length and concurrent users).
  - This is why three apparently simple questions — *how big is the model, how long is the context, how many users at once* — are the only questions that matter for first-pass sizing.
- **Suggested diagram (Mermaid):**
  ```mermaid
  flowchart LR
      W[(Weights<br/>~fixed)] --> G((GPU))
      C[Context tokens<br/>per request] --> G
      G --> K[(KV cache<br/>grows with users x context)]
      K --> G
      G --> T[Tokens streamed out]
  ```
- **Cross-links:** Topic 2 (prefill / decode), Topic 3 (KV cache parameter).
- **External references:**
  - [LLM Inference Series: 4. KV caching, a deeper look | Pierre Lienhart, Medium](https://medium.com/@plienhar/llm-inference-series-4-kv-caching-a-deeper-look-4ba9a77746c8)

#### H2: "Why on-prem, why inference, why now"
- **Job to be done:** Justify the scope of this site so the reader doesn't waste time looking for training or cloud guidance.
- **Key points:**
  - Enterprises move inference on-prem for data residency, latency, predictable cost, and integration with existing systems — not because cloud is broken.
  - Inference is the workload that actually touches end users every day. Training failures cost time; inference failures cost trust.
  - Open-weight models (Llama, Qwen, Mistral, DeepSeek) now match or approach closed-model quality at sizes that fit on one to eight GPUs.
  - FP8 and modern serving stacks (vLLM, TensorRT-LLM) have made single-node 70B serving genuinely practical in 2026.
  - Phase 1 of this site covers inference only. Fine-tuning and embeddings will follow.

#### H2: "What's next"
- **Job to be done:** Hand the reader to the next page with momentum.
- **Key points:**
  - Topic 2 explains the two-phase mechanics (prefill, decode) and the KV cache — the physics behind everything that follows.
  - Topic 3 walks the seven parameters that drive every sizing decision.
  - Topic 4 is the one-page checklist you can take into a planning meeting.
  - Each page has a "Try in the Sizer" link that pre-loads the relevant assumptions.

### Glossary terms introduced
- Inference, training, fine-tuning, embeddings, RAG, weights, context, token, KV cache (foreshadowed), on-prem.

### Callouts / CTAs
- Side callout, top: *"New here? Read this page top to bottom. Each idea below it builds on the last."*
- Bottom CTA: **"Open the Sizer with default assumptions"** — pre-populated 70B FP8 chatbot example so the reader can see the shape of the tool before they understand the parameters.

### Scope guardrails — what this page deliberately does NOT cover
- No pricing or TCO modeling.
- No cloud comparison.
- No model recommendations by use case.
- No vendor scoring.
- No discussion of agents, multi-modal, or tool use — Phase 1 is text-only LLM inference.

---

## Topic 2 — What is Inferencing

### Page metadata
- **id:** `knowledge.what-is-inferencing`
- **slug:** `/knowledge/what-is-inferencing`
- **title:** "What Inferencing Actually Does (and Why It Sizes Differently)"
- **description:** The two-phase mechanics of LLM inference — prefill, decode, KV cache, TTFT, TPOT — explained the way an IT admin needs to hear it.
- **target word count:** ~1,500 (the meatiest page)
- **primary learning objective:** The reader can explain prefill vs. decode, why decode is memory-bandwidth-bound, and how the KV cache turns context length and concurrency into VRAM.
- **secondary objectives:**
  - Define TTFT and TPOT and identify which phase produces each.
  - Compute, at order-of-magnitude, the KV cache footprint of a single request.
  - Recognize end-to-end latency as TTFT + (TPOT × output tokens).
  - Understand why GPU utilization can read 90% on a GPU that is barely doing math.

### Section-by-section outline

#### H2: "A single request, end to end"
- **Job to be done:** Set up the worked example that will thread through the rest of the page.
- **Key points:**
  - Walk through what happens when a user sends a 4,000-token prompt to a 70B model and gets a 300-token answer back.
  - Identify the moments the user perceives: the wait before any text appears (TTFT) and the speed at which text streams (TPOT).
  - Name the two phases that produce those moments: prefill and decode.
  - Foreshadow the KV cache — the data structure the GPU builds in prefill and consumes in decode.
- **Suggested diagram (Mermaid sequence):**
  ```mermaid
  sequenceDiagram
      participant U as User
      participant S as Serving engine
      participant G as GPU
      U->>S: Prompt (4000 tokens)
      S->>G: Prefill (parallel pass)
      G->>G: Build KV cache for all 4000 tokens
      G-->>U: First token (TTFT measured here)
      loop For each output token
          G->>G: Read KV cache, multiply weights, write new entry
          G-->>U: Next token (TPOT measured here)
      end
      G-->>U: Stop token
  ```
- **Cross-links:** Topic 1 (mental model), Topic 3 (context length parameter).

#### H2: "Prefill: ingesting the prompt"
- **Job to be done:** Explain why prefill is compute-heavy and short.
- **Key points:**
  - In prefill, every token in the prompt is processed in parallel through every layer of the model — one big matrix-multiply pass.
  - Tensor cores light up; this phase is **compute-bound**. FLOPS matter here.
  - Output: the first generated token, plus a populated KV cache holding intermediate key/value tensors for every token in the prompt.
  - Prefill time scales roughly linearly with prompt length on modern attention implementations; very long prompts (32K+) start to feel it.
  - This is the phase that determines **TTFT**. If TTFT is missing your SLO, look at prompt length, batching, and prefill compute headroom — not memory bandwidth.
- **External references:**
  - [Throughput is Not All You Need: Maximizing Goodput in LLM Serving | Hao AI Lab @ UCSD](https://haoailab.com/blogs/distserve/)
  - [Mastering LLM Techniques: Inference Optimization | NVIDIA Technical Blog](https://developer.nvidia.com/blog/mastering-llm-techniques-inference-optimization/)

#### H2: "Decode: producing tokens one at a time"
- **Job to be done:** Explain why decode dominates total time and why memory bandwidth — not FLOPS — is the bottleneck.
- **Key points:**
  - Decode is autoregressive: produce a token, append it, produce the next token. Each step is a small matrix-vector multiply, not a big matrix-matrix multiply.
  - Every step has to *read the entire KV cache and the entire weight set* out of HBM. The arithmetic intensity is low.
  - The result: tensor cores sit partially idle while the memory subsystem moves data. This phase is **memory-bandwidth-bound**.
  - Doubling memory bandwidth roughly doubles single-stream tokens-per-second on a memory-bound decode workload. This is why an H200 (~4.8 TB/s) is markedly faster than an H100 (~3.35 TB/s) on the same 70B model, even when both have enough VRAM.
  - The B200 at ~8 TB/s and MI300X at ~5.3 TB/s sit on the same axis. L40S at ~864 GB/s is in a different league and is appropriate for smaller models, not 70B serving.
  - This phase determines **TPOT**. If TPOT is missing your SLO, look at memory bandwidth, KV-cache size, and batch composition — not FLOPS.
- **Suggested diagram (Mermaid):**
  ```mermaid
  flowchart LR
      subgraph Prefill
          P1[Compute-bound]
          P2[Big parallel matmul]
          P3[Builds KV cache]
          P4[Sets TTFT]
      end
      subgraph Decode
          D1[Memory-bandwidth-bound]
          D2[Many small ops]
          D3[Reads KV + weights each step]
          D4[Sets TPOT]
      end
      Prefill --> Decode
  ```
- **External references:**
  - [Key metrics for LLM inference | BentoML LLM Inference Handbook](https://bentoml.com/llm/inference-optimization/llm-inference-metrics)
  - [Understand LLM latency and throughput metrics | Anyscale Docs](https://docs.anyscale.com/llm/serving/benchmarking/metrics)

#### H2: "The KV cache: the silent capacity killer"
- **Job to be done:** Make the reader internalize that the KV cache, not the weights, often sets the concurrency ceiling.
- **Key points:**
  - The KV cache stores two vectors (a key and a value) per attention head per layer, for every token in every active request.
  - Formula (grouped-query attention): `KV bytes = 2 × layers × kv_heads × head_dim × seq_len × batch × bytes_per_element`.
  - Llama 3.1-70B (80 layers, 8 KV heads, head_dim 128), FP16: a single 4K-token request ≈ **1.34 GB**. A single 128K-token request ≈ **~40 GB** — half of an 80 GB H100, for one user.
  - KV cache scales **linearly** in both sequence length and batch size. Twenty concurrent 8K-token requests at FP16 on the same model land near 50 GB before you've added any output tokens.
  - "How big is the model" is the wrong first question. The right one is "how big is the model at the precision we'll run, at the context we need, at the concurrency we need."
  - Modern serving engines (vLLM's PagedAttention) treat the KV cache like virtual memory, allocating it in fixed-size pages. Older systems wasted 60–80% of KV memory to fragmentation; PagedAttention brings that to under 4%.
  - At scale, KV cache offload (to CPU memory, NVMe, or object storage) becomes a real architectural concern. KV-cache-aware routing (llm-d) and prefix caching for shared system prompts are common Phase 2 optimizations.
- **Suggested diagram (Mermaid):**
  ```mermaid
  flowchart TB
      subgraph "VRAM budget on one 80 GB H100"
          W[Weights ~70 GB FP8]
          K1[KV: 1 user @ 4K ~1.3 GB]
          K2[KV: 1 user @ 128K ~40 GB]
          K3[KV: 20 users @ 8K ~50 GB]
          H[Activations + headroom]
      end
      W --- K1
      W --- K2
      W --- K3
  ```
- **External references:**
  - [LLM Inference Series: 4. KV caching, a deeper look | Pierre Lienhart, Medium](https://medium.com/@plienhar/llm-inference-series-4-kv-caching-a-deeper-look-4ba9a77746c8)
  - [KV Cache Memory Calculation for LLMs | Lyceum Technology](https://lyceum.technology/magazine/kv-cache-memory-calculation-llm/)
  - [How to Cut LLM Inference Costs with KV Caching | Pure Storage](https://blog.purestorage.com/purely-technical/cut-llm-inference-costs-with-kv-caching/)
  - [Master KV cache aware routing with llm-d | Red Hat Developer](https://developers.redhat.com/articles/2025/10/07/master-kv-cache-aware-routing-llm-d-efficient-ai-inference)

#### H2: "TTFT, TPOT, and end-to-end latency"
- **Job to be done:** Tie the two phases back to the SLO numbers an IT admin will see in tickets and design docs.
- **Key points:**
  - **TTFT (Time To First Token):** wall-clock from request submission to the first streamed character. Driven by queueing, prefill, and prompt length.
  - **TPOT (Time Per Output Token):** steady-state inter-token latency. Driven by decode and dominated by memory bandwidth.
  - **End-to-end latency ≈ TTFT + (TPOT × output_tokens).** A 300-token answer with 200 ms TTFT and 30 ms TPOT lands near 9 seconds total — fast enough to feel responsive when streamed, painful as a single block.
  - Reference SLOs (cover these as a table on the live page):
    - Chatbot: TTFT < 500 ms (P95 < 200 ms is excellent), TPOT 30–50 ms.
    - Code completion: TTFT < 100 ms, TPOT tight; the user is mid-keystroke.
    - Batch summarization: TTFT and TPOT don't matter; only aggregate completion time does.
  - "Goodput" — the request rate at which the system still satisfies P90/P95 SLOs — is a better operational metric than raw throughput. Optimizing throughput by inflating batch size will blow your TTFT.
- **External references:**
  - [Key metrics for LLM inference | BentoML LLM Inference Handbook](https://bentoml.com/llm/inference-optimization/llm-inference-metrics)
  - [Metrics — NVIDIA NIM LLMs Benchmarking](https://docs.nvidia.com/nim/benchmarking/llm/latest/metrics.html)
  - [Throughput is Not All You Need | Hao AI Lab @ UCSD](https://haoailab.com/blogs/distserve/)

#### H2: "A worked example: one request through one H100"
- **Job to be done:** Close the page with a single, concrete trace that proves the reader has the picture.
- **Key points:**
  - Setup: Llama 3.3 70B at FP8 on 2× H100 with NVLink (160 GB combined). System prompt + retrieval = 6,000 input tokens. User wants a 250-token streamed answer.
  - Step 1: prompt arrives, serving engine slots it into the next continuous-batching step. Queue wait: ~10 ms.
  - Step 2: prefill across 6,000 tokens. ~250 ms of compute. KV cache for this request: ~12 GB allocated as paged blocks.
  - Step 3: first token streamed. **TTFT ≈ 260 ms** — within the 500 ms SLO.
  - Step 4: decode loop, 250 iterations. Each iteration reads ~70 GB of weights + the request's KV pages from HBM. At ~3.35 TB/s, each iteration lands near 30 ms. **TPOT ≈ 30 ms**.
  - Step 5: stop token, total end-to-end ≈ 260 ms + (30 ms × 250) ≈ **7.8 seconds**.
  - Punchline: the reader can now look at any inference design doc and ask the right three questions — *what's the prefill cost, what's the per-token decode cost, and how much KV does each request hold open?*

### Glossary terms introduced
- Prefill, decode, autoregressive, attention head, KV cache, PagedAttention, TTFT, TPOT, goodput, memory bandwidth, HBM, arithmetic intensity, continuous batching (foreshadowed).

### Callouts / CTAs
- Side callout next to the KV cache section: *"In the Sizer, change context length from 8K to 32K and watch the VRAM bar redistribute. Same model, same users — different machine."*
- Bottom CTA: **"See how the seven parameters use these mechanics →"** linking to Topic 3.

### Scope guardrails — what this page deliberately does NOT cover
- No deep dive on attention math (Q, K, V projections, softmax, RoPE).
- No quantization mechanics — that lands in Topic 3.
- No serving engine comparison — vLLM, TensorRT-LLM, SGLang are mentioned by name only.
- No multi-node parallelism diagrams. TP and PP get a sentence at most; they belong on a Phase 2 page.
- No training, fine-tuning, or LoRA adapter mechanics.

---

## Topic 3 — Parameters Impacting Infra Decisions

### Page metadata
- **id:** `knowledge.parameters`
- **slug:** `/knowledge/parameters`
- **title:** "The Seven Parameters That Drive Your Sizing"
- **description:** The seven inputs every inference deployment requires, what they mean, what good values look like, and how each one propagates into hardware.
- **target word count:** ~1,300
- **primary learning objective:** The reader can list the seven parameters, give a typical value range for each, and predict (qualitatively) what happens to GPU count when any one of them doubles.
- **secondary objectives:**
  - Identify which parameters the AI team owns, which IT owns, and which are jointly negotiated.
  - Spot the common sizing mistakes (users vs. in-flight requests; average vs. peak).
  - Use the Sizer to test parameter sensitivity before committing to hardware.

### Section-by-section outline

#### H2: "Why seven, and why these seven"
- **Job to be done:** Frame the rest of the page so the reader knows what they're getting.
- **Key points:**
  - Every sizing exercise eventually reduces to the same set of inputs. Naming them up front turns a fuzzy planning meeting into a structured one.
  - Three of the seven are properties of the model (size, precision, context). Three are properties of the workload (concurrency, RPS, latency SLOs). One is a property of the *day*: burst factor.
  - Get these right and the GPU math is mechanical. Get them wrong — usually by sizing on average users instead of peak in-flight requests — and the cluster ships under-provisioned or over-provisioned by a factor of two or more.
- **Suggested diagram (Mermaid — parameter dependency map):**
  ```mermaid
  flowchart TB
      MS[Model size & architecture] --> WT[Weights VRAM]
      Q[Precision / quantization] --> WT
      Q --> BW[Decode throughput]
      CL[Context length] --> KV[KV cache per request]
      CC[Concurrent in-flight requests] --> KV
      CC --> BS[Batch saturation]
      RPS[RPS / tokens-per-second] --> TP[Aggregate throughput]
      SLO[Latency SLOs TTFT/TPOT] --> BS
      SLO --> BW
      BF[Burst factor] --> HR[Headroom & replicas]
      WT --> GPU[GPU count]
      KV --> GPU
      TP --> GPU
      BW --> GPU
      HR --> GPU
  ```

#### H2: "1. Model size and architecture"
- **Job to be done:** Get the reader past the headline parameter count to the architecture details that actually matter.
- **Key points:**
  - The headline number (7B, 70B, 405B) sets the *order of magnitude* of weights memory, not the exact number.
  - Architecture changes the picture: **Mixture-of-Experts (MoE)** models like recent open-weight releases activate only a fraction of params per token, so a 235B MoE can serve like a 22B dense model on compute but still needs the full weight footprint in memory.
  - **Grouped-query attention (GQA)** and **multi-head latent attention (MLA)** dramatically shrink the KV cache compared to vanilla multi-head attention. Most modern models use one or the other; confirm which.
  - Typical ranges: 1B–8B for embedding/classification/routing; 7B–14B for general assistants on a single L40S or H100; 32B–70B as the modern "smart" sweet spot; 100B+ MoE for the highest-quality production use cases.
  - Propagation: weights VRAM = params × bytes_per_param (set by quantization, below). Activation memory adds ~10–20% on top.
- **Sizer link CTA:** *"Try this in the Sizer →"* — opens the Sizer with model dropdown highlighted.
- **External references:**
  - [LLM Inference Sizing and Performance Guidance | VMware Cloud Foundation Blog](https://blogs.vmware.com/cloud-foundation/2024/09/25/llm-inference-sizing-and-performance-guidance/)
  - [Data, tensor, pipeline, expert and hybrid parallelisms | BentoML](https://bentoml.com/llm/inference-optimization/data-tensor-pipeline-expert-hybrid-parallelism)

#### H2: "2. Precision and quantization"
- **Job to be done:** Explain why the same model can need very different amounts of VRAM depending on a choice the AI team makes.
- **Key points:**
  - Precision is the bytes-per-parameter the model runs at. FP16/BF16 = 2 bytes; FP8 = 1 byte; INT4 = 0.5 bytes.
  - **FP8 is the production baseline in 2026.** Near-identical quality to BF16 for most workloads, ~2× decode throughput on H100/H200/B200/MI300X. DeepSeek-V3 was trained natively in FP8; Qwen3 ships official FP8 checkpoints.
  - INT8 is the "trusted workhorse" — about 75% size reduction vs. FP32, under 1% accuracy drop on most benchmarks.
  - INT4 (GPTQ, AWQ) cuts memory 4× vs. FP16 but degrades on multi-step reasoning and math. Fine for chat and summarization; risky for code and analysis.
  - Hybrid pattern is common: weights INT8 or INT4, activations BF16/FP16, KV cache FP16 or FP8.
  - Propagation: halving precision halves weights memory and roughly doubles decode throughput on supported hardware. The AI team owns this choice; IT needs to know what was picked because it changes VRAM by 2× to 4×.
- **Sizer link CTA:** *"Try this in the Sizer →"* — opens the Sizer with the precision toggle.
- **External references:**
  - [LLM Quantization Explained: INT4, INT8, FP8, AWQ, GPTQ in 2026 | VRLA Tech](https://vrlatech.com/llm-quantization-explained-int4-int8-fp8-awq-and-gptq-in-2026/)
  - [33% faster LLM inference with FP8 quantization | Baseten](https://www.baseten.co/blog/33-faster-llm-inference-with-fp8-quantization/)
  - [Optimizing LLMs for Performance and Accuracy with Post-Training Quantization | NVIDIA](https://developer.nvidia.com/blog/optimizing-llms-for-performance-and-accuracy-with-post-training-quantization/)

#### H2: "3. Context length"
- **Job to be done:** Make context length feel like a hardware parameter, not just an API setting.
- **Key points:**
  - Context length = maximum prompt + completion size the deployment will support.
  - KV cache scales **linearly** in context length. 128K context can need 10× the per-request VRAM of 8K.
  - Typical ranges: 4K–8K for early chatbots; 32K standard in 2026; 128K becoming common; 1M for niche document-analysis workloads.
  - On Llama 3.1-70B at FP16: 4K context ≈ 1.34 GB KV per request; 128K context ≈ ~40 GB per request.
  - Practical lever: shorter contexts let more users share one GPU. A retrieval pipeline that ballooned to 30K tokens by accident is often the single biggest cost a customer can find.
  - Propagation: context length × concurrent in-flight requests = total KV cache budget. That number, plus weights, plus activations, sets the VRAM floor.
- **Sizer link CTA:** *"Try this in the Sizer →"* — opens the Sizer with the context slider highlighted.

#### H2: "4. Concurrent users vs. concurrent requests"
- **Job to be done:** Stop the #1 over-provisioning mistake before it happens.
- **Key points:**
  - **Concurrent users** = anyone with the application open. **In-flight requests** = requests actively being processed by a GPU at a given second.
  - For an internal chatbot with 5,000 daily users, maybe 500 are active in a window, and only 20–50 have a request in flight on any given second.
  - Active users ≠ in-flight requests. This is the most common sizing error.
  - Typical ratios (sanity check, not gospel): for chat, in-flight ≈ 1–5% of active users; for code completion, in-flight ≈ 5–10% of typing users; for batch, in-flight = batch size by definition.
  - Propagation: in-flight requests × KV per request = KV budget. Always plan for **peak in-flight**, not average.
- **Sizer link CTA:** *"See concurrency translate to GPUs in the Sizer →"*
- **External references:**
  - [Lenovo LLM Sizing Guide](https://lenovopress.lenovo.com/lp2130-lenovo-llm-sizing-guide)

#### H2: "5. RPS and tokens per second"
- **Job to be done:** Convert user behavior into the load number GPUs actually understand.
- **Key points:**
  - **RPS = concurrent_users × requests_per_user_per_minute ÷ 60.**
  - **Tokens-per-second demand = RPS × (avg_prompt_tokens + avg_output_tokens).**
  - Tokens-per-second is the currency of inference economics — every GPU has a maximum aggregate token throughput at a given model and precision.
  - Typical published throughputs (vLLM, 70B FP8): ~5,000–8,000 tokens/sec on a 2× H200 deployment, varying with context length and batch composition.
  - Propagation: deployment must serve peak tokens/sec demand. Divide demand by per-replica throughput → minimum replica count.
- **Sizer link CTA:** *"Try this in the Sizer →"*
- **External references:**
  - [LLM Inference Benchmarking: How Much Does Your LLM Inference Cost? | NVIDIA](https://developer.nvidia.com/blog/llm-inference-benchmarking-how-much-does-your-llm-inference-cost/)
  - [How to Choose the Right GPU for vLLM Inference | DigitalOcean](https://www.digitalocean.com/community/conceptual-articles/vllm-gpu-sizing-configuration-guide)

#### H2: "6. Latency SLOs (TTFT, TPOT, end-to-end)"
- **Job to be done:** Connect the SLO conversation to the bandwidth and batch-size knobs IT actually controls.
- **Key points:**
  - TTFT target sets prefill compute and queue depth budget.
  - TPOT target sets memory bandwidth and batch-size ceiling — larger batches share weight reads but slow each request's decode.
  - Typical SLOs:
    - Interactive chat: TTFT < 500 ms (P95 < 200 ms ideal), TPOT 30–50 ms.
    - Code completion: TTFT < 100 ms, TPOT tight.
    - Voice/agent loops: TTFT < 300 ms, TPOT < 30 ms (because chained calls compound).
    - Batch: no interactive SLO; only end-to-end completion deadline.
  - Tighter SLOs → smaller batches → more replicas. There is no free lunch.
- **Sizer link CTA:** *"Try this in the Sizer →"*

#### H2: "7. Burst factor"
- **Job to be done:** Force the planner to think about the worst minute of the worst day.
- **Key points:**
  - Burst factor = peak demand ÷ average demand.
  - Typical ranges: 2–3× for internal HR/IT chatbots; 3–5× for customer support; 10×+ for consumer-facing apps during incidents.
  - Inference cold starts are slow — minutes to load 70B weights and warm caches. Reactive autoscale does not work for latency-critical inference.
  - Practical headroom rules: 30–40% steady-state headroom on production interactive workloads; HPA target around 60% of KV-cache budget.
  - Burst overflow options: reserved baseline + spot/cloud burst for throughput-tolerant traffic; queueing layer for short spikes; degradation strategy (e.g., serve from a smaller model) for extreme bursts.
- **Sizer link CTA:** *"Set a burst factor in the Sizer →"*
- **External references:**
  - [Autoscaling self-hosted Llama models | Llama Deployment Guides](https://www.llama.com/docs/deployment/autoscaling/)
  - [AI Workload Right-Sizing | Introl](https://introl.com/blog/ai-workload-right-sizing-gpu-resource-allocation-2025)

#### H2: "Summary table"
- **Job to be done:** Give the reader a printable cheat-sheet.
- **Content:** Table with columns *Parameter | What it is | Typical range | Drives | Owner (AI / IT / joint)*. Rows are the seven parameters above. (The live page renders this as a real table; the outline references it.)
- **External references:**
  - [LLM Inference Sizing: Benchmarking End-to-End Inference Systems | NVIDIA GTC S62797 (PDF)](https://developer-blogs.nvidia.com/wp-content/uploads/2024/08/S62797-LLM-Inference-Sizing_-Benchmarking-End-to-End-Inference-Systems.pdf)

### Glossary terms introduced
- Mixture of Experts (MoE), grouped-query attention (GQA), multi-head latent attention (MLA), FP8, INT8, INT4, GPTQ, AWQ, RPS, tokens-per-second, burst factor, headroom, HPA target.

### Callouts / CTAs
- Inline *"Try this in the Sizer →"* link inside each parameter section (seven total).
- Side callout near concurrency section: *"The most common sizing mistake on this page. Read twice."*
- Bottom CTA: **"Take this into your planning meeting →"** linking to Topic 4 (checklist).

### Scope guardrails — what this page deliberately does NOT cover
- No deep math on KV cache (lives in Topic 2).
- No GPU-by-GPU recommendations — that belongs in a future Hardware page.
- No serving engine config (vLLM flags, etc.).
- No fine-tuning, LoRA, or training parameters.
- No mention of pricing — parameters drive *capacity*, not cost, on this page.

---

## Topic 4 — Checklist

### Page metadata
- **id:** `knowledge.checklist`
- **slug:** `/knowledge/checklist`
- **title:** "The On-Prem Inference Planning Checklist"
- **description:** A one-page reference IT admins can take into a planning meeting with the AI team. Print it.
- **target word count:** ~600
- **primary learning objective:** Walk away with a structured agenda for the first joint IT-and-AI planning meeting.
- **secondary objectives:**
  - Know which decisions are owned by which side.
  - Recognize the five red flags that predict trouble.

### Section-by-section outline

#### H2: "How to use this page"
- **Job to be done:** Set expectations in two sentences.
- **Key points:**
  - This is a scannable checklist, not a tutorial. If a line doesn't make sense, the linked Knowledge pages explain it.
  - Bring this to your first joint planning meeting. By the end of the meeting, every line should have an answer or an owner.

#### H2: "Before you size — confirm these inputs exist"
- **Job to be done:** Stop the meeting from starting until the AI team has actually picked a workload.
- **Key points (each is a single line):**
  - The model (name, size, architecture) is chosen and the AI team has run it at the target precision at least once.
  - Precision (FP16, FP8, INT8, INT4) is decided and benchmarked against quality requirements.
  - Maximum context length is committed in writing. ("It might be 128K someday" is not a commitment.)
  - Expected peak in-flight requests — not active users — has a number.
  - Latency SLOs (TTFT, TPOT, end-to-end) have target numbers and percentiles (P50, P95).
  - Burst factor (peak ÷ average) has a number and a source (historical data, comparable app, or a stated assumption).
  - At least one realistic prompt + expected output length sample exists.

#### H2: "Decisions IT owns"
- **Key points (each is a single line):**
  - GPU class and quantity per replica (drives VRAM, bandwidth, NVLink/Infinity Fabric).
  - Tensor parallelism within a node and the interconnect to support it.
  - Inter-node fabric if pipeline parallelism is needed (InfiniBand or RoCE at 400 Gb/s+).
  - Rack-level power budget and PDU/busbar provisioning (not just the breaker).
  - Cooling strategy — air, rear-door heat exchanger, or direct-to-chip liquid — based on kW/rack.
  - Storage for model weights: high read bandwidth at startup, modest steady-state I/O.
  - Monitoring stack that captures KV-cache occupancy, queue depth, batch saturation, P95/P99 latency — not just GPU utilization.
  - Headroom policy (30–40% on interactive workloads; HPA target ~60% of KV budget).
  - Replica count and zero-downtime upgrade strategy.

#### H2: "Decisions the AI team owns"
- **Key points (each is a single line):**
  - Serving engine (vLLM, TensorRT-LLM, SGLang) and version.
  - Continuous batching and PagedAttention enabled.
  - Quantization choice and KV cache precision.
  - Speculative decoding in scope or out.
  - LoRA / multi-tenant adapter strategy if more than one fine-tune will be served.
  - Distillation and routing strategy — which traffic goes to small models instead of the flagship.
  - Prefix and retrieval cache strategy.
  - Model evaluation harness so quality regressions from quantization or distillation are caught.

#### H2: "Decisions you make together"
- **Key points (each is a single line):**
  - Final concurrency target (in-flight requests at peak).
  - SLO trade-offs — if TPOT must tighten by 20%, what gives?
  - Burst overflow path — queue, smaller model, cloud burst, or graceful degradation.
  - Capacity review cadence (monthly metrics, quarterly model/engine review, annual capacity reset).
  - Owner for the rollback decision when a new model or engine version regresses.
  - Communication plan for end-user-visible incidents.

#### H2: "Red flags to watch for"
- **Job to be done:** Give the reader a sniff test for trouble before it ships.
- **Key points (each is a single line):**
  - "We'll figure out context length later." (Translation: KV cache hasn't been thought about.)
  - Sizing on active users instead of in-flight requests.
  - GPU utilization is the only autoscale signal.
  - No published TTFT/TPOT SLOs — only "fast."
  - 70B at FP16 with no FP8 plan on H100-class hardware.
  - Reactive autoscale planned for latency-critical workloads.
  - No facility involvement above 30 kW/rack.
  - One model serving all use cases (no smaller-model routing).
  - No quality regression harness alongside the perf benchmark.

### Glossary terms introduced
- None new — this page consolidates terms introduced in Topics 1–3.

### Callouts / CTAs
- Top of page: **"Print this page"** button.
- Bottom CTA: **"Open the Sizer with your numbers →"** so the reader can turn the checklist outputs into a draft hardware plan in one click.

### Scope guardrails — what this page deliberately does NOT cover
- Not a tutorial — each line links back to its explanation in Topics 1–3.
- No vendor recommendations.
- No financial or procurement guidance.
- No security, compliance, or audit checklist — those will be separate pages.

---

## Cross-page conventions

- **Glossary.** Every glossary term linked from any page resolves to a single shared `/knowledge/glossary` entry. Terms are introduced in the first page that uses them and reused thereafter.
- **Sizer links.** Every "Try in the Sizer" link carries a pre-filled query string for the example under discussion. The Sizer opens in a side panel where possible so the reader doesn't lose their place in the article.
- **Diagrams.** Mermaid is the default. Anything too dense for Mermaid (the GPU spec table, the SLO table, the parameter summary table) renders as a styled HTML table.
- **Citations.** External references appear as a numbered list at the bottom of each page; inline mentions use the short title. The link list above each is the canonical source for the page's claims.
- **Voice.** Second person ("you"), present tense, no exclamation points. Acronyms expanded on first use per page. No words like "seamless," "powerful," "revolutionary."
