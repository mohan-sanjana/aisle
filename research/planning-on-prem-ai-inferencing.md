# Planning On-Premises Infrastructure for AI Inferencing: A Practical Guide for Data Center and IT Teams

For most of the last decade, capacity planning in the data center followed a predictable rhythm. CPUs, RAM, storage IOPS, and network throughput moved in tidy, well-understood ratios. Then generative AI arrived, and a single workload — inference — started rewriting the rules. A model that fits on one GPU at one precision can need eight at another. A workload that looks like a chat app can quietly consume more memory bandwidth than your entire VDI farm. A use case that "only has 200 users" can demand more burst capacity than a production database.

If you are an IT admin or data center planner being asked to "stand up a few GPUs for the AI team," this guide is for you. The goal is not to turn you into a machine learning engineer; it is to give you the mental model, the parameters, and the math you need to plan on-premises inferencing infrastructure with confidence — and to have a productive conversation with the AI engineers who will share the system with you.

## What inference actually is, in infrastructure terms

A large language model is, at its core, a very large set of weights — billions of floating-point numbers — that define a function from a sequence of input tokens to a probability distribution over the next token. Inference is the act of repeatedly evaluating that function: take some input, produce a token, append it to the input, evaluate again, and so on until the model emits a stop token or hits a length limit.

That repetition is what makes inference unlike any other workload you have run in your facility. Two phases dominate, and they have very different infrastructure profiles.

**Prefill** is the first phase. The model ingests the entire prompt — the user's question, the system instructions, any retrieved documents — in a single parallel pass. This pass is compute-heavy and benefits from high tensor throughput. The output of prefill is the first generated token, plus a populated key-value (KV) cache that holds intermediate state for every token in the prompt.

**Decode** is the second phase, and it usually dominates total time. The model produces output tokens one at a time, autoregressively. Each new token requires reading the full KV cache, multiplying through the model's weights, and writing the new entries back into the cache. For typical batch sizes, decode is memory-bandwidth bound, not compute bound. Your GPU's tensor cores often sit partially idle while the memory subsystem hauls weights and cache entries back and forth from HBM.

Two latency metrics fall out of this split, and they are the SLOs you will be designing against:

- **Time to First Token (TTFT)** — how long the user waits before the first character appears. Driven by prefill, prompt length, and queueing delay.
- **Time per Output Token (TPOT)**, sometimes called inter-token latency — the steady-state speed of the streaming response. Driven by decode and dominated by GPU memory bandwidth.

End-to-end latency is roughly TTFT plus TPOT times the number of output tokens. A chatbot answer of 300 tokens with a 200 ms TTFT and a 30 ms TPOT lands at about 9 seconds — fast enough to feel responsive when streamed, painful if delivered as a single block.

## The KV cache: the silent capacity killer

Every IT admin sizing GPU infrastructure for the first time eventually has the same realization: the model weights are not the whole story. The KV cache is.

The KV cache stores, for every token in every active request, two vectors per attention head per layer. The standard formula is:

> KV cache bytes = 2 × layers × kv_heads × head_dim × sequence_length × batch_size × bytes_per_element

A few concrete numbers make this real. Llama 3.1-70B has 80 layers, 8 grouped-query KV heads, and a head dimension of 128. At FP16 (two bytes per element), a single 4,000-token prompt consumes about 1.34 GB of KV cache. Push the same model to a 128,000-token context and that single request needs roughly 40 GB of HBM — half the memory of an 80 GB H100, just for one user's working state. Multiply by the number of concurrent requests you want to serve, and the math gets uncomfortable quickly.

This is why "How big is the model?" is the wrong first question. The right questions are: how big is the model **at the precision we will run it at**, how long are the contexts, and how many requests do we need to keep in flight at once?

## The seven parameters that drive your sizing

Whether you are deploying one model or fifty, the sizing of any inference cluster comes down to seven parameters. Get these right and the rest of the planning falls into place.

**Model size and architecture.** The headline parameter count (7B, 70B, 405B) is the starting point, but architecture matters. Mixture-of-Experts (MoE) models like the recent open-weight releases activate only a fraction of their parameters per token, which changes the compute-to-memory ratio dramatically. Confirm with your AI team not just the parameter count but whether the model uses grouped-query attention, multi-head latent attention, or MoE — each has different memory implications.

**Precision and quantization.** Memory for the weights is roughly the parameter count times the bytes-per-parameter. FP16/BF16 (2 bytes) is the historical default. FP8 (1 byte) has become the production baseline on supported hardware (H100, H200, B200, MI300X) because quality is nearly indistinguishable from BF16 for most workloads while memory and decode throughput improve materially. INT8 cuts another factor and is the trusted workhorse for accuracy-tolerant production. INT4 packs four times tighter than FP16 but degrades on multi-step reasoning. The AI engineer owns this choice; the IT admin needs to know what was chosen because it changes VRAM requirements by 2× to 4×.

**Context length.** This is the maximum prompt-plus-completion size the deployment will support. Long contexts (32K, 128K, 1M) drive KV cache size linearly. A use case that supports 128K-token contexts may need an order of magnitude more memory per concurrent request than one capped at 8K, even if everything else is identical.

**Concurrent users versus concurrent requests.** These are not the same number. A "concurrent user" is anyone with the application open. A "concurrent request" is a request actively being processed by a GPU. For an internal chatbot with 5,000 daily users, perhaps 500 are active at any given moment, and only 20 to 50 of those have a request in flight on any given second. Sizing on users rather than in-flight requests is the most common over-provisioning mistake; sizing on average requests rather than peak in-flight requests is the most common under-provisioning mistake.

**Requests per second (RPS) and tokens per second.** These translate user behavior into infrastructure load. A useful starting formula:

> RPS = concurrent_users × requests_per_user_per_minute ÷ 60
>
> Token demand per second = RPS × (avg_prompt_tokens + avg_output_tokens)

Tokens per second is the currency of inference economics. Every GPU has a maximum aggregate token throughput at a given model size and precision, and your job is to make sure the deployment's peak token demand does not exceed that ceiling.

**Latency SLOs.** The targets the application owner promises end users. Common reference points: an interactive chatbot wants TTFT under 500 ms (P95 under 200 ms is excellent) and a TPOT smooth enough that streaming feels human, typically 30–50 ms or better. A code-completion tool needs much tighter TTFT — under 100 ms is the bar, because the user is mid-keystroke. A batch summarization job may not care about TTFT at all, only end-to-end completion time, which lets you trade interactive latency for raw throughput.

**Burst factor.** The ratio of peak demand to average demand. An internal HR chatbot might have a 3× burst factor at Monday 9 a.m. A retail support bot during a Black Friday outage can spike 10× or more. Burst factor determines how much headroom you carry, and whether you need overflow capacity (a hybrid path to a public cloud, a queueing layer, or simply more GPUs sitting partially idle).

## Translating parameters into hardware

Once you have those seven inputs, you can build the GPU budget. The mental model has four layers, in order of importance.

**Layer 1 — VRAM budget per GPU (or per parallel group of GPUs).**

```
VRAM needed ≈ (model weights) + (KV cache for max concurrent requests) + (activations and overhead) + (20–30% headroom)
```

Worked example: Llama 3.3 70B at FP8. Weights are about 70 GB. If you support 32 concurrent requests at an average context of 8,000 tokens, KV cache lands around 32 × ~2.7 GB ≈ 86 GB. Add 10 GB for activations and runtime overhead, then 25% headroom. Total comes to about 200 GB. That fits comfortably in two H200s (282 GB combined) connected via NVLink, or two MI300Xs (384 GB combined). It does not fit in two 80 GB H100s without aggressive trade-offs — quantize further, shrink context, or move to four-way tensor parallelism.

**Layer 2 — Memory bandwidth.**

Decode throughput is governed by how fast the GPU can stream weights and KV cache out of HBM. The H100 sits at 3.35 TB/s, the H200 at about 4.8 TB/s, the B200 at roughly 8 TB/s, the MI300X at about 5.3 TB/s, and the L40S at around 864 GB/s. For a memory-bound decode workload, doubling memory bandwidth roughly doubles single-stream tokens per second. This is why an H200 can be markedly faster than an H100 on the same model even when both have enough VRAM — the bottleneck is bandwidth, not capacity.

**Layer 3 — Parallelism strategy.**

When a model does not fit on a single GPU, you have two main options:

- **Tensor parallelism (TP)** splits each layer's matrices across multiple GPUs in the same node. Communication is heavy and frequent, so it requires high-bandwidth interconnect — NVLink for NVIDIA, Infinity Fabric for AMD. TP up to the GPU count of a single node (typically 8) is the standard play for models that exceed one GPU's memory.
- **Pipeline parallelism (PP)** splits the model into sequential layer groups across nodes. Inter-node bandwidth requirements are lower (you ship activations between stages once per token), but it adds latency and creates pipeline bubbles. PP is what you reach for when even an 8-GPU node is not enough.

For very large models you combine them: tensor-parallel within each node, pipeline-parallel across nodes. The IT admin's job is to make sure the network — InfiniBand or RoCE at 400 Gb/s or above for serious deployments — and the rack layout support whichever strategy the AI team chose.

**Layer 4 — Networking, storage, power, and cooling.**

GPU servers are not drop-in replacements for traditional 1U boxes. An HGX H100 8-GPU server pulls roughly 10–11 kW under load. A DGX B200 pulls up to about 14.3 kW. Four H100 servers in a single rack push past 40 kW, well beyond the 10–12 kW most legacy colocation cabinets are designed for. A GB200 NVL72 rack lands at 120–140 kW and requires liquid cooling — air is no longer an option above roughly 35–50 kW per rack.

Practical implications for the data center planner:

- **Power.** Plan circuits for the sustained draw plus an inrush margin. Confirm your PDU and busbar capacity, not just the rack-level breaker. AI workloads run hot for hours; this is not bursty desktop power.
- **Cooling.** Above ~35 kW per rack, get serious about rear-door heat exchangers or direct-to-chip liquid cooling. Above ~80 kW, liquid is no longer optional. Make sure facilities, not just IT, is in the planning loop early.
- **Networking.** For multi-node tensor-parallel inference, you want a non-blocking fabric at 400 Gb/s or 800 Gb/s with RDMA. For single-node serving (which covers most enterprise inference), a 100 Gb/s frontend network is usually sufficient.
- **Storage.** Model weights need to be loaded into GPU memory at startup, which is bursty. A 70B model at FP8 is 70 GB; loading that across 16 replicas pulls 1.1 TB off shared storage. Plan for high read bandwidth on the model registry, even though steady-state I/O during serving is light. Some teams now offload cold KV-cache blocks to NVMe or object storage, which adds a second class of demand.

## Reference: where common GPUs fit

A simple rubric for matching workloads to silicon (snapshot as of mid-2026):

- **L40S (48 GB GDDR6, ~864 GB/s, 350 W).** Hybrid graphics-and-AI card. Good for 7B–13B models, vision transformers, embedding models, smaller diffusion workloads. Friendly power envelope, fits in conventional racks.
- **A100 (40/80 GB HBM2e, ~2 TB/s, 400 W).** Still widely deployed; reasonable for 13B–34B at FP16 or 70B at INT4. Memory bandwidth is its main limitation against newer parts.
- **H100 (80 GB HBM3, 3.35 TB/s, 700 W).** Production workhorse. Native FP8 support. Single-GPU 30B–34B comfortably; 70B with 2-way TP and FP8.
- **H200 (141 GB HBM3e, ~4.8 TB/s, 700 W).** Same compute envelope as H100 with substantially more memory and bandwidth — often the right upgrade for long-context or 70B-class models on a single node.
- **MI300X (192 GB HBM3, ~5.3 TB/s, ~750 W).** AMD's flagship inference part. Memory-rich; lets you fit 70B models on a single GPU at FP8 with room for KV cache.
- **B200 (192 GB HBM3e, 8 TB/s, 1,000 W).** Blackwell generation. Roughly 2.3× the FP8 throughput of an H100. Often deployed in NVL72 rack configurations that demand liquid cooling.

The cards above the L40S are designed to be deployed in 4- or 8-GPU server chassis, with NVLink (or AMD's Infinity Fabric) inside the box providing the high-bandwidth fabric for tensor parallelism. Treat the chassis, not the individual card, as the unit of capacity planning.

## What the AI engineer brings to the planning table

A purely infrastructure-driven plan will leave performance on the table. Several optimization techniques can dramatically reduce the GPUs you need — but they require the AI team and the IT team to plan together.

**Quantization.** Already discussed. Moving from FP16 to FP8 halves memory footprint and roughly doubles decode throughput on supported hardware, with negligible quality loss for most workloads. INT8 weight-only quantization with FP16 activations is another common production sweet spot.

**PagedAttention and continuous batching.** Modern serving engines like vLLM and TensorRT-LLM treat the KV cache like an operating system treats RAM, allocating it in fixed-size pages and packing requests in dynamically. They also use *continuous (in-flight) batching*: as soon as one request finishes, a new one slots into its place, rather than waiting for an entire batch to complete. The combined effect is dramatic — published benchmarks show vLLM packing roughly 4× more concurrent requests onto the same GPU compared to naive serving, and end-to-end throughput gains of an order of magnitude versus a stock Hugging Face Transformers loop. If your AI team is not using a modern serving engine, the single highest-leverage thing they can do is switch.

**Speculative decoding.** A small "draft" model proposes several tokens, and the large target model verifies them in a single pass. When the draft is good, you get multiple tokens per forward pass instead of one. Real-world speedups land in the 2–3× range for chat workloads, and combinations with knowledge distillation push higher. The cost is some extra GPU memory for the draft model and engineering complexity. The implication for the IT admin: ask whether speculative decoding is in the design, because it changes the GPUs-per-throughput-unit math meaningfully.

**LoRA and multi-tenant adapters.** Low-Rank Adaptation lets multiple fine-tuned variants share a single base model, with small per-tenant adapters loaded on demand. If your organization will run many fine-tuned versions of the same base model — one per business unit, one per language, one per product line — LoRA can collapse what would have been many separate deployments into one shared cluster.

**Distillation and smaller specialized models.** The biggest model is rarely the right model for every task. Many production deployments now route classification, extraction, and routing tasks to small distilled models (1B–8B) and reserve the large model for tasks that genuinely need it. From an infrastructure standpoint, this can shift a meaningful fraction of traffic onto cheaper GPUs (L40S, even L4) and free up your top-end fleet for the workloads that need it.

**Disaggregated prefill and decode.** A more recent pattern: run prefill on one pool of GPUs (compute-heavy, longer batches, less latency-sensitive) and decode on another (memory-bandwidth-heavy, smaller batches, latency-sensitive). It is operationally complex but can improve utilization on large clusters. Not the first lever to pull, but worth knowing about as you scale beyond a few nodes.

## Three worked use cases

The cleanest way to internalize the planning model is to walk through it. Below are three realistic patterns. Numbers are illustrative — your actual sizing will depend on the specific model, serving stack, and observed traffic — but the *shape* of the math is what matters.

### Use case 1: Internal coding copilot for 1,500 engineers

**Model and SLO.** A 7B coding model running at FP8 for inline completions, with an optional 32B model for chat and explanation queries. TTFT must be under 100 ms for completions to feel native; TPOT under 25 ms.

**Demand.** Assume 60% of engineers are active in a given day. During peak hours, perhaps 300 are typing simultaneously, but only ~10% have an in-flight completion request at any given second. That's around 30 in-flight requests for completions, with prompts of 500–2,000 tokens (the surrounding code) and outputs of 50–150 tokens. The chat path is much smaller — maybe 5 concurrent requests with longer outputs.

**Sizing.** A 7B model at FP8 fits in well under 10 GB of VRAM, leaving an L40S or a single H100 with abundant room for KV cache and concurrent requests. The bottleneck is TTFT, which means you want fast prefill and a serving engine with priority queuing for short completions over long chats. Two L40S-class GPUs handling completions, plus one H100 handling the chat path, comfortably covers steady state. Add a second pair of L40Ss for redundancy and burst headroom: total of four L40S plus one H100 in a single 4U server, well under 10 kW, fits in any modern rack.

**What to confirm with the AI team.** Are they using vLLM or TensorRT-LLM with continuous batching? Have they enabled FP8? Is speculative decoding in scope? Each of those answers can change the GPU count by a factor of two or more.

### Use case 2: Customer support RAG chatbot for a regional bank

**Model and SLO.** Llama 3.3 70B at FP8 for answer generation, plus a small embedding model and a reranker for retrieval. TTFT under 500 ms; TPOT under 40 ms; answers stream as they generate. Average prompt is 6,000 tokens (system prompt + retrieved policy documents + conversation history); average output is 250 tokens.

**Demand.** 10,000 active customer-facing chats per business day, peaking at 80 concurrent active conversations and roughly 25 in-flight model calls per second during peak hour. Burst factor of about 2.5× during outage events.

**Sizing.** Weights at FP8 are 70 GB. KV cache for 64 concurrent in-flight requests at 6K tokens is roughly 64 × ~2.0 GB ≈ 130 GB. Add overhead and headroom; you need ~220 GB of VRAM available to the model. Two H200s (282 GB combined) with 2-way tensor parallelism and NVLink fits cleanly with KV-cache room to spare. Two MI300Xs (384 GB) fits even more comfortably and gives you more KV cache room for longer contexts. An 8 × H100 node with 4-way TP would also work but uses more silicon than necessary.

For burst, run two replicas of this two-GPU configuration behind a queue and a load balancer — total of four H200s. That gives you about 2× steady-state capacity for surges, plus the ability to drain one replica for upgrades without a service interruption. Add separate, smaller GPUs (L40S or L4) for the embedding and reranker models, which are far less demanding.

A four-GPU H200 footprint plus two L40S for retrieval lands at roughly 4–5 kW in a single chassis — a single 8 kW circuit handles it with margin. Plan rear-door heat exchangers if your facility is at the upper edge of air-cooled density.

**What to confirm with the AI team.** Is the retrieval pipeline producing reasonable-length contexts, or is it ballooning to 30K tokens because nobody has tuned chunking? Long contexts dominate KV cache; getting retrieval right can reduce GPU count meaningfully. Are they caching frequent retrievals so the model is not re-prefilling the same policy document every conversation? Cache reuse can reduce effective prefill cost by 40–70% for support workloads.

### Use case 3: Nightly batch document summarization

**Model and SLO.** 70B model, FP8. No interactive SLO — the only requirement is that 50,000 documents (averaging 8,000 input tokens, 400 output tokens) be summarized between 11 p.m. and 5 a.m.

**Demand.** Total token throughput target = 50,000 × (8,000 + 400) ÷ (6 × 3,600 seconds) ≈ 19,400 tokens/second.

**Sizing.** Without latency constraints, you can pursue maximum throughput. Large batches, aggressive packing, no headroom reserved for bursts. A well-tuned vLLM deployment on 2 × H200 typically delivers 5,000–8,000 tokens/second on a 70B model at FP8 depending on context length and batch size. So three to four such replicas, or 6–8 H200s total, should hit the target with margin. If the budget allows, a single 8 × H100 node configured for high-throughput batch can sometimes match this throughput in a tighter footprint — confirm with benchmarks from the AI team.

Because there is no online SLO, this workload also tolerates running on whatever older inventory you have lying around (A100s, even MI250s) at lower efficiency. Many enterprises deliberately run batch inference on yesterday's GPUs and reserve the latest silicon for interactive workloads. That is a perfectly valid planning strategy.

**What to confirm with the AI team.** Are they running this as one giant batch with continuous batching enabled, or as 50,000 individual requests through an API? The latter is dramatically less efficient. Also, can they checkpoint partial progress so a node failure does not restart the whole job?

## Forecasting and headroom

Inference workloads break the autoscaling instincts you may have developed for stateless web services. Three differences matter most:

**Cold starts are slow.** Loading a 70B model into GPU memory and warming caches takes minutes, not seconds. By the time a new replica is ready, the burst that triggered scale-up is often over. The implication: you cannot rely on reactive scale-up for latency-critical workloads. Carry steady-state headroom — 30–40% above average load is a reasonable starting point — and use elastic capacity (spot, cloud burst, or batch preemption) only for *throughput*-critical, latency-tolerant workloads.

**GPU utilization is a misleading signal.** A vLLM replica at 90% GPU utilization may still be underloaded — the GPU is busy moving memory, not doing math. The signals that actually predict tail-latency degradation are KV-cache occupancy, request queue depth, batch saturation, and TPOT itself. Modern serving engines expose these directly; use them as your primary autoscale and capacity-review signals, not nvidia-smi.

**Plan for one year out, not five.** Models change every few months. Quantization recipes that did not exist a year ago are now production standard. The B200 and MI300X reset the price-performance curve, and Vera Rubin will reset it again. Build your data center commitments — power, cooling, rack density — to support two generations of GPU evolution, but plan your specific GPU purchases on a 12–18 month rolling basis. Over-committing to a specific accelerator generation is the most expensive mistake on the table right now.

A practical capacity-review cadence: monthly review of KV-cache and queue metrics for trend, quarterly review of model and serving-engine versions with the AI team, and an annual reset of the longer-term capacity model.

## A planning checklist for the joint IT-and-AI conversation

Before any inference cluster gets built, the IT admin and the AI engineer should be able to answer these together. If even one is unresolved, the deployment will eventually surprise someone.

The AI side commits to: which model, at which precision, with which serving engine and what optimizations enabled (continuous batching, PagedAttention, speculative decoding, FP8). What the maximum context length will be. What the realistic peak in-flight request count is. Which latency SLOs (TTFT, TPOT, end-to-end) will be promised to end users. Whether multiple fine-tuned variants will share the cluster (LoRA), and whether smaller specialized models can absorb part of the traffic.

The IT side commits to: VRAM headroom (models, KV cache, activations, plus 20–30%) for the maximum in-flight request count, not the average. Memory bandwidth that meets the TPOT target at the chosen batch size. Tensor parallelism within a node and the NVLink/Infinity Fabric to support it; pipeline parallelism across nodes only when truly necessary, with the InfiniBand or RoCE fabric to support it. Power and cooling for the chosen GPU class — including liquid cooling above 35–50 kW per rack. Monitoring on KV-cache occupancy, queue depth, batch saturation, and tail latency, not just GPU utilization.

Both sides commit to: a quarterly review of the workload and the optimizations available, and a willingness to revisit the deployment when the AI team's choices (a smaller distilled model, a new quantization recipe, a serving-engine upgrade) can free up capacity that IT can redeploy.

## Closing thought

The biggest mental shift for IT teams new to inference is that the workload is not static. The model your AI team will run six months from now will be smaller, faster, and cheaper to serve than the one they are running today — but the use cases will have grown, and the demand for context length and concurrency will have grown with them. The planning model you want is not "buy enough GPUs for today's workload." It is "build a facility, a network, and a partnership with the AI team that lets us absorb a 5× change in either direction without a forklift upgrade."

Get the seven parameters right, build VRAM and bandwidth budgets honestly, leave 30% headroom, plan power and cooling for the GPU class you will be running two years from now rather than today, and keep the AI team's optimization roadmap inside your capacity model. Do that, and inference becomes just another well-understood workload in your data center — one that happens to be reshaping the rest of the business.
