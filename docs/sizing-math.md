# On-Prem LLM Inference Sizer — Calculation Spec

Scope: on-premises LLM **inference** only (no training, no multimodal, no cloud burst). Output is a **server-spec level** recommendation: per-server CPU class, RAM, GPU SKU + count, NIC, local NVMe, plus replica count, fabric type, and power/cooling envelope.

## 1. Input schema

| Field | Type | Range / enum | Default | What it affects |
|---|---|---|---|---|
| `workload_type` | enum | `interactive_chat`, `code_completion`, `rag`, `batch`, `agentic` | `interactive_chat` | SLO defaults, batching strategy |
| `parameter_count` | int (billions) | 1 – 1000 | 70 | Weight memory |
| `model_architecture` | enum | `dense`, `gqa`, `moe` | `gqa` | KV cache size (kv_heads), active params for MoE |
| `precision` | enum | `FP16`, `BF16`, `FP8`, `INT8`, `INT4` | `FP8` | Bytes/param, decode throughput |
| `max_context_tokens` | int | 2_048 – 1_000_000 | 8_192 | KV per request (linear) |
| `avg_prompt_tokens` | int | 1 – max_context | 2_000 | Prefill cost, KV usage |
| `avg_output_tokens` | int | 1 – 4_096 | 300 | TPOT × output dominates end-to-end |
| `concurrent_users` | int | 1 – 1_000_000 | 500 | Upstream to RPS |
| `requests_per_user_per_minute` | float | 0.1 – 60 | 2 | Upstream to RPS |
| `target_TTFT_ms` | int | 50 – 5_000 | 500 | Prefill GPU + batching policy |
| `target_TPOT_ms` | int | 10 – 200 | 40 | Memory bandwidth requirement |
| `burst_factor` | float | 1.0 – 20 | 2.5 | Headroom + replicas |
| `redundancy_mode` | enum | `N`, `N+1`, `N+2` | `N+1` | Extra replicas |
| `serving_engine` | enum | `vLLM`, `TRT-LLM`, `Triton`, `SGLang` | `vLLM` | Throughput coefficient, KV packing |

Optional advanced inputs (with safe defaults): `kv_offload` (bool, false), `speculative_decoding` (bool, false), `prefix_caching` (bool, true for RAG), `kv_cache_dtype` (defaults to model precision; FP8 KV is allowed).

## 2. Calculation steps

Variables: P = parameter count, b_w = bytes/param, L = layers, H_kv = KV heads, D_h = head dim, S = sequence length, B = in-flight batch (concurrent requests), b_kv = bytes per KV element. All sizes in bytes unless noted.

### Step 1 — Weights memory
```
W = P × b_w
```
b_w from precision: FP16/BF16 = 2, FP8/INT8 = 1, INT4 = 0.5. For MoE, weights memory is full param count (all experts must be resident); active-params only reduces compute, not VRAM.

### Step 2 — KV cache per request
```
KV_req = 2 × L × H_kv × D_h × S × b_kv
```
Defaults by family (see §3 table). b_kv typically matches precision; FP8 KV cuts this in half versus FP16 KV.

### Step 3 — Max concurrent in-flight requests
```
RPS         = concurrent_users × requests_per_user_per_minute ÷ 60
tokens_in_flight ≈ RPS × (avg_prompt + avg_output × TPOT / 1000) × burst_factor
B_peak      = ceil(RPS × E[output_seconds] × burst_factor)
```
Where `E[output_seconds] = avg_output × TPOT / 1000`. This is the [Little's Law](https://bentoml.com/llm/inference-optimization/llm-inference-metrics) form: in-flight requests = arrival rate × mean service time.

### Step 4 — Total KV cache budget
```
KV_total = B_peak × KV_req(avg_prompt + avg_output)
```
Use the **average** sequence length here, not max_context — max_context is a worst-case guardrail (§5), not a sizing target. If `kv_offload = true`, multiply by 0.5 (cold blocks paged to NVMe/CPU per [LMCACHE](https://lmcache.ai/tech_report.pdf)).

### Step 5 — Activations + overhead
```
A = max(2 GB, 0.05 × W)
```
Empirical: vLLM/TRT-LLM runtime + CUDA graphs + workspace ≈ 5% of weights, floor 2 GB.

### Step 6 — Headroom
```
H = 0.25 × (W + KV_total + A)
```
25% is the production midpoint (range 20–30%) — covers fragmentation in PagedAttention pages and absorbs short bursts before HPA reacts.

### Step 7 — Total VRAM required
```
VRAM = W + KV_total + A + H
```

### Step 8 — GPU SKU selection
Two constraints: VRAM feasibility and bandwidth feasibility.

Bandwidth feasibility for decode (memory-bound):
```
required_BW ≈ (W_active + KV_total) / (target_TPOT / 1000)
```
Where `W_active` = weights actually streamed per token (full W for dense, ~active-experts × per-expert for MoE). Compare against GPU HBM BW from §3. Pick the smallest GPU SKU (and count N_gpu) such that:
```
N_gpu × VRAM_per_GPU ≥ VRAM
N_gpu × BW_per_GPU   ≥ required_BW
```
Prefer single-GPU when possible; ascending order L40S → A100-80 → H100 → H200 → MI300X → B200.

### Step 9 — Parallelism strategy
- If `N_gpu = 1`: no parallelism.
- If `1 < N_gpu ≤ 8`: **tensor parallelism (TP)** within node. Requires NVLink/NVSwitch (NVIDIA) or Infinity Fabric (AMD). TP degree should divide the model's attention heads evenly (2, 4, 8).
- If `N_gpu > 8`: **TP=8 within node + pipeline parallelism (PP)** across nodes. PP_degree = ceil(N_gpu / 8). Warn on PP > 4 (bubble overhead degrades TPOT).
- MoE with > 8 GPUs: consider **expert parallelism (EP)** instead of pure PP — see [Meta's scaling notes](https://engineering.fb.com/2025/10/17/ai-research/scaling-llm-inference-innovations-tensor-parallelism-context-parallelism-expert-parallelism/).

### Step 10 — Per-replica throughput estimate
```
throughput_per_replica ≈ throughput_table[model_size, GPU_SKU, engine] × tp_efficiency(N_gpu)
```
Use the table in §3. `tp_efficiency`: 1.0 at TP=1, 0.92 at TP=2, 0.85 at TP=4, 0.75 at TP=8 (NVLink-attached); halve again for cross-node PP per stage.

### Step 11 — Replica count
```
demand_tokens_per_sec = RPS × (avg_prompt + avg_output) × burst_factor
N_replicas_active     = ceil(demand_tokens_per_sec / throughput_per_replica)
N_replicas            = N_replicas_active + redundancy_offset
```
`redundancy_offset`: N → 0, N+1 → 1, N+2 → 2.

### Step 12 — Server-spec recommendation per replica

For an 8-GPU SXM/OAM host (the workhorse form factor):
- **CPU**: dual-socket, 2× Xeon Platinum 8568Y+ / 2× AMD EPYC 9554 class (≥48c/socket). Lower-spec CPUs starve PCIe and tokenizer threads.
- **RAM**: rule of thumb **2× total GPU VRAM**, floor 1 TB, typical 2 TB DDR5 for 8× H100/H200/B200. Higher (3 TB+) if KV offload to host is enabled.
- **Local NVMe**: 2× boot mirror + scratch tier sized as `max(10 TB, 4 × W + 2 × KV_total)`. Holds weights for fast cold-load, KV spill, and shard caching. NVMe Gen4/Gen5, 6–8 drives RAID-10 typical.
- **NIC for compute fabric**: 1× ConnectX-7/8 (400 Gb) **per GPU** for InfiniBand NDR or RoCE (8 NICs per 8-GPU node). Skip if single-node replica.
- **NIC for frontend**: 2× 100 GbE bonded for client traffic, storage, and management.

For 1–4 GPU servers (L40S / single-H100 chassis):
- **CPU**: single Xeon Gold or single EPYC 9354 class. **RAM**: 512 GB – 1 TB. **NVMe**: 4–10 TB. **NIC**: 2× 100 GbE.

### Step 13 — Network fabric
- **Single-node replica**: 100 GbE frontend is enough. Internal traffic stays on NVLink/NVSwitch.
- **Multi-node TP** (rare, avoid): needs ≥ 400 Gb InfiniBand NDR or RoCEv2 with PFC/ECN tuned.
- **Multi-node PP**: 400 Gb per node is sufficient (activations only cross node boundaries between stages); 800 Gb (XDR / next-gen) for very large MoE.
- **Dynamo / disaggregated prefill-decode at scale**: 400 Gb minimum, [NVIDIA Dynamo guidance](https://blog.aks.azure.com/2025/10/24/dynamo-on-aks).

### Step 14 — Power envelope
```
P_server  = sum(TDP_GPU × N_gpu) + 1500 W  (CPU/RAM/NIC/fans for 8-GPU host)
P_cluster_IT = P_server × N_replicas
P_facility   = P_cluster_IT × PUE
```
PUE: 1.5 (legacy air-cooled), 1.25 (rear-door HX), 1.1–1.15 (direct liquid). See [NVIDIA HGX physical requirements](https://intuitionlabs.ai/articles/nvidia-hgx-data-center-requirements).

### Step 15 — Cooling tier
Based on per-rack kW (assume 1 server per 4U slot, max ~10 servers per rack but often fewer due to power):
- **Air**: < 15 kW/rack
- **Dense air / hot-aisle containment**: 15–35 kW/rack
- **Rear-door heat exchangers (RDHX)**: up to ~80 kW/rack
- **Direct-to-chip liquid (DLC)**: > 80 kW/rack, **mandatory** for GB200 NVL72-class

References: [Introl liquid-cooling thresholds](https://introl.com/blog/liquid-cooling-gpu-data-centers-50kw-thermal-limits-guide), [Data Center Frontier on rack density](https://www.datacenterfrontier.com/data-center-cooling/article/33004506/hotter-hardware-rack-densities-test-data-center-cooling-strategies).

## 3. Lookup tables / constants

### Model architecture defaults

| Family | L (layers) | H_kv | D_h | Notes |
|---|---|---|---|---|
| Llama 3.1-8B | 32 | 8 | 128 | GQA |
| Llama 3.1-70B / 3.3-70B | 80 | 8 | 128 | GQA |
| Llama 3.1-405B | 126 | 16 | 128 | GQA, multi-node |
| Mixtral 8x7B | 32 | 8 | 128 | MoE, 2 active experts |
| Mixtral 8x22B | 56 | 8 | 128 | MoE, 2 active |
| Qwen3-32B | 64 | 8 | 128 | GQA |
| Qwen3-235B-A22B | 94 | 4 | 128 | MoE, ~22B active |
| DeepSeek-V3 (671B) | 61 | n/a (MLA) | 128 | MLA → KV ~1/10 of GQA-equivalent |
| GPT-OSS 120B | 80 | 8 | 128 | MoE, dense-equivalent KV |

Sources: published configs / [Pierre Lienhart KV deep-dive](https://medium.com/@plienhar/llm-inference-series-4-kv-caching-a-deeper-look-4ba9a77746c8), [Lyceum KV calculator](https://lyceum.technology/magazine/kv-cache-memory-calculation-llm/).

### Bytes per element by precision
| Precision | bytes |
|---|---|
| FP16 / BF16 | 2 |
| FP8 / INT8 | 1 |
| INT4 (GPTQ/AWQ) | 0.5 |

### GPU spec (from research notes)

| GPU | VRAM | HBM BW | FP8 dense | TDP |
|---|---|---|---|---|
| L40S | 48 GB | 864 GB/s | — | 350 W |
| A100-80 | 80 GB | 2.0 TB/s | — | 400 W |
| H100 SXM | 80 GB | 3.35 TB/s | 1979 TF | 700 W |
| H200 SXM | 141 GB | 4.8 TB/s | 3958 TF | 700 W |
| MI300X | 192 GB | 5.3 TB/s | high | 750 W |
| B200 SXM | 192 GB | 8 TB/s | 4500 TF | 1000–1200 W |

### Per-replica throughput ranges (tokens/sec, FP8, vLLM ~v0.6+, mixed prompt/output)

| Model | GPU config | Tok/s (steady) | Source |
|---|---|---|---|
| 7B | 1× L40S | 2,000 – 4,000 | [DigitalOcean vLLM guide](https://www.digitalocean.com/community/conceptual-articles/vllm-gpu-sizing-configuration-guide) |
| 7B | 1× H100 | 8,000 – 14,000 | [Anyscale benchmarks](https://docs.anyscale.com/llm/serving/benchmarking/metrics) |
| 13B – 34B | 1× H100 | 3,000 – 6,000 | NVIDIA NIM bench |
| 70B FP8 | 2× H100 TP | 2,500 – 4,000 | [NVIDIA NIM bench](https://docs.nvidia.com/nim/benchmarking/llm/latest/metrics.html) |
| 70B FP8 | 2× H200 TP | 5,000 – 8,000 | [NVIDIA inference cost blog](https://developer.nvidia.com/blog/llm-inference-benchmarking-how-much-does-your-llm-inference-cost/) |
| 70B FP8 | 1× MI300X | 2,500 – 4,500 | [SemiAnalysis MI300X](https://newsletter.semianalysis.com/p/mi300x-vs-h100-vs-h200-benchmark-part-1-training) |
| 70B FP8 | 2× B200 TP | 12,000 – 18,000 | [Modal Blackwell post](https://modal.com/blog/h100-and-h200-vs-b100-and-b200) |
| 405B FP8 | 8× H200 TP | 1,500 – 2,500 | extrapolated |
| 405B FP8 | 8× B200 TP | 4,000 – 6,000 | extrapolated |

TRT-LLM adds ~15–25%; SGLang competitive with vLLM on prefix-cache-heavy workloads.

### Per-server power
| Config | Server draw |
|---|---|
| 1× L40S in 2U | ~700 W |
| 4× L40S in 4U | ~2.5 kW |
| 8× H100 SXM (HGX) | 10–11 kW |
| 8× H200 SXM (HGX) | 10–12 kW |
| DGX B200 (8× B200) | 14.3 kW |
| GB200 NVL72 rack | 120–140 kW |

### Cooling threshold by rack kW
| Rack kW | Cooling |
|---|---|
| < 15 | Air, legacy colo |
| 15–35 | Dense air + containment |
| 35–80 | RDHX |
| > 80 | Direct liquid (mandatory above 100) |

## 4. Scenario modeling

Three scenarios run from the same inputs; only multipliers change.

**Baseline** — steady-state planning. `burst_factor = 1.0`, `redundancy_mode = N`, headroom = 20%. Used to establish the floor.

**Burst** — production interactive. `burst_factor = user_input` (default 2.5), `redundancy_mode = N+1`, headroom = 25%. This is the default sizing path.

**Resilient** — mission-critical / regulated. `burst_factor = max(user_input, 3.0)`, `redundancy_mode = N+2`, headroom = 30%, additionally require **two replicas across two failure domains** (different racks, different power feeds). Replica count formula becomes:
```
N_replicas = max(N_replicas_active + 2, 2 × ceil(N_replicas_active / 2))
```

## 5. Edge cases and guardrails

- **Model doesn't fit one GPU** at chosen precision: auto-enable TP within node. Re-check `tp_efficiency` impact on throughput.
- **Model + KV doesn't fit 8 GPUs**: enable PP across nodes; emit warning that TPOT will degrade (~10–20% per pipeline stage).
- **`required_BW > BW_per_GPU × N_gpu`**: TPOT target unreachable on this SKU. Recommend next-tier SKU (H100→H200→B200), or relax TPOT, or quantize further.
- **`max_context_tokens` worst-case check**: compute `KV_worst = KV_req(max_context) × B_peak`. If `KV_worst > 4 × KV_total` (i.e. real users could 4× the average), warn that long-context bursts will evict KV pages; recommend enabling `kv_offload` or capping context server-side.
- **L40S boundary**: only valid for ≤ 13B at FP8 or ≤ 7B at FP16. Reject if `W > 30 GB`.
- **Single-node H100/H200 boundary**: TP up to 8 is fine; PP across nodes is the cliff — push back on input assumptions before recommending multi-node.
- **B200 boundary**: requires liquid cooling and 415V circuits. If the facility is air-only, force H200 SKU instead and recompute replica count.
- **MoE with PP**: warn — pipeline-parallel MoE often has worse load balance than expert-parallel. Recommend EP if N_gpu > 8.
- **Speculative decoding**: if enabled, multiply throughput by 2.0 (conservative) per [BentoML speculative-decoding study](https://www.bentoml.com/blog/3x-faster-llm-inference-with-speculative-decoding); add ~10% VRAM for the draft model.

## 6. Test cases

### TC1 — 7B coding copilot, 1500 engineers
Inputs: `parameter_count=7`, `precision=FP8`, `max_context=8192`, `avg_prompt=1500`, `avg_output=80`, `concurrent_users=300`, `req/user/min=6`, `TTFT=100`, `TPOT=25`, `burst=2.0`, `N+1`, `vLLM`.

Math:
- W = 7 GB. KV_req(1580 tok, FP8) = 2×32×8×128×1580×1 ≈ 0.10 GB.
- RPS = 300×6/60 = 30. E[out_sec] = 80×0.025 = 2 s. B_peak = ceil(30×2×2.0) = 120.
- KV_total = 120 × 0.10 = 12 GB. A = 2 GB. H = 0.25×(7+12+2) = 5.3 GB. **VRAM = 26 GB**.
- Fits **1× L40S** (48 GB). Bandwidth check: required ≈ (7+12)/0.025 = 760 GB/s; L40S = 864 GB/s — tight but OK. Promote to 1× H100 for margin under burst.
- Throughput per replica (7B on H100) ≈ 10k tok/s. Demand = 30×1580×2 = 95k tok/s → 10 replicas. With N+1: **11 replicas**.

Output: 11× 1U/2U servers each with 1× H100 PCIe, dual EPYC 9354, 512 GB RAM, 8 TB NVMe, 2× 100 GbE. Fabric: 100 GbE frontend only. Power: ~1.5 kW/server × 11 ≈ 16.5 kW IT, ~24 kW with PUE 1.5. Cooling: **dense air** (spread across 2 racks at ~12 kW each).

### TC2 — Llama 3.3-70B RAG chatbot, regional bank
Inputs: `param=70`, `arch=gqa`, `precision=FP8`, `max_context=32768`, `avg_prompt=6000`, `avg_output=250`, `users=80 concurrent`, `req/user/min=4`, `TTFT=500`, `TPOT=40`, `burst=2.5`, `N+1`, `vLLM`.

Math:
- W = 70 GB. KV_req(6250 tok, FP8) = 2×80×8×128×6250×1 ≈ 1.0 GB.
- RPS = 80×4/60 = 5.3. E[out_sec] = 250×0.04 = 10 s. B_peak = ceil(5.3×10×2.5) = 133.
- KV_total = 133 GB. A = 3.5 GB. H = 0.25×(70+133+3.5) = 52 GB. **VRAM = 258 GB**.
- 2× H200 = 282 GB — fits with margin. Bandwidth: (70+133)/0.040 = 5.1 TB/s required vs 2×4.8 = 9.6 TB/s — OK.
- Throughput on 2× H200 ≈ 6500 tok/s. Demand = 5.3×6250×2.5 = 83k tok/s → 13 active. With N+1: **14 replicas** of 2× H200 = 28 H200 GPUs across 4 nodes (8 GPUs/node).

Output: 4× 8U HGX H200 servers, dual Xeon Platinum 8568Y+, 2 TB DDR5, 8× 3.84 TB NVMe Gen5 RAID-10, 8× ConnectX-7 400G + 2× 100 GbE frontend. Fabric: 400 Gb InfiniBand NDR (used for failover/sharding, not steady TP). Power: 4× 12 kW = 48 kW IT, ~60 kW facility. Cooling: **RDHX** (12 kW/rack × 4, or 24 kW × 2 racks).

### TC3 — Llama 3.1-405B, multi-node
Inputs: `param=405`, `precision=FP8`, `max_context=8192`, `avg_prompt=2000`, `avg_output=400`, `users=200`, `req/user/min=1`, `TTFT=1500`, `TPOT=50`, `burst=2.0`, `N+1`, `TRT-LLM`.

Math:
- W = 405 GB. KV_req(2400 tok, FP8) = 2×126×16×128×2400×1 ≈ 1.24 GB.
- RPS = 200/60 = 3.3. E[out_sec] = 400×0.05 = 20 s. B_peak = ceil(3.3×20×2.0) = 132.
- KV_total = 132 × 1.24 = 164 GB. A = 20 GB. H = 0.25×(405+164+20) = 147 GB. **VRAM = 736 GB**.
- 8× H200 = 1128 GB — fits, TP=8. Bandwidth: (405+164)/0.050 = 11.4 TB/s required vs 8×4.8 = 38.4 TB/s — fine.
- Throughput per replica ≈ 2000 tok/s (TRT-LLM ~+20%). Demand = 3.3×2400×2 = 16k tok/s → 8 replicas. With N+1: **9 replicas** = 72× H200 across 9 HGX nodes.
- Alternative: 8× B200 per replica, ~5000 tok/s — collapse to 4 replicas (N+1 = 5 nodes). Recommend B200 path if facility supports liquid.

Output (B200 path): 5× DGX B200, dual Xeon Platinum, 2 TB DDR5, 30 TB NVMe, 8× CX-7 400G + 2× 100 GbE. Fabric: **400 Gb InfiniBand NDR rails** non-blocking. Power: 5 × 14.3 kW = 72 kW IT, ~83 kW facility. Cooling: **direct liquid mandatory** (B200 air variant exists but DGX B200 ships liquid-assisted).

### TC4 — Nightly batch 70B summarization
Inputs: `workload=batch`, `param=70`, `precision=FP8`, `max_context=8192`, `avg_prompt=8000`, `avg_output=400`, no SLO; 50k docs in 6 hours; `burst=1.0`, `N+0`, `vLLM`.

Math:
- Demand = 50000×8400 / (6×3600) ≈ 19,400 tok/s.
- VRAM same shape as TC2 but with max batching (B_peak ≈ 256 because we deliberately oversaturate). KV_total ≈ 320 GB. **VRAM ≈ 460 GB** → 4× H200 (564 GB) per replica with TP=4.
- Throughput per replica ≈ 6500 tok/s. **3 replicas** (no redundancy for batch) = 12× H200.

Output: 2× 8U HGX H200 servers (run 1.5 replicas per node via MIG-style partitioning or just 2 replicas/node at TP=4). Use **existing A100 inventory if available** — A100s deliver ~2500 tok/s on 70B FP16, so 8 A100s would also clear the bar. Power: ~22 kW IT. Cooling: **dense air**. No premium fabric; 100 GbE frontend.

### TC5 — Low-concurrency local 13B
Inputs: `param=13`, `precision=FP8`, `max_context=8192`, `avg_prompt=1000`, `avg_output=300`, `users=20`, `req/user/min=2`, `TTFT=300`, `TPOT=30`, `burst=2.0`, `N+1`, `vLLM`.

Math:
- W = 13 GB. KV_req(1300 tok, FP8, Qwen3 8 kv heads) ≈ 0.17 GB.
- RPS = 20×2/60 = 0.67. E[out_sec] = 300×0.03 = 9 s. B_peak = ceil(0.67×9×2.0) = 12.
- KV_total = 2 GB. A = 2 GB. H = 0.25×17 = 4.3 GB. **VRAM = 21 GB**.
- Fits 1× L40S (48 GB) with headroom; bandwidth check (13+2)/0.030 = 500 GB/s vs 864 GB/s — fits.
- Throughput ≈ 1500 tok/s per L40S. Demand = 0.67×1300×2 = 1740 tok/s → 2 replicas. With N+1: **3 replicas** = 3× L40S.

Output: 1× 4U server with 3× L40S (or 2 servers with 2+1), single EPYC 9354, 512 GB RAM, 8 TB NVMe, 2× 100 GbE. Power: ~2 kW. Cooling: **standard air**, any rack.

## 7. Open questions

- **MoE active-bandwidth coefficient** — Step 8 treats MoE as if only active experts stream, but in practice expert routing causes contention and the effective bandwidth multiplier is somewhere between 1× and full-dense; published numbers vary by engine and need a per-engine calibration constant.
- **MLA (DeepSeek-V3) KV ratio** — DeepSeek's multi-head latent attention compresses KV roughly 10× versus equivalent GQA, but exact bytes-per-token depends on rank settings; we use a placeholder until a vendor-published formula stabilizes.
- **Speculative decoding gain in production** — research shows 2–6× speedups, but acceptance rate is workload-dependent; we use a flat 2× until benchmarked per-deployment.
- **Disaggregated prefill/decode sizing** — Dynamo / DistServe split GPU pools by phase. This spec assumes co-located prefill+decode; a disaggregated mode would need separate replica counts per phase.
- **Inter-node TP feasibility** — with 800 Gb XDR InfiniBand, TP across two nodes is increasingly viable but not yet broadly benchmarked; the spec currently caps TP at 8 (single node).
- **Power per rack vs per replica** — large replicas (8× B200) take a full rack each, while small replicas (1× L40S) stack 5–10/rack. The spec gives per-server power but the user still needs a rack-layout pass to translate to facility kW. A future revision should emit rack-level recommendations directly.

---

## Summary

1. Inputs are 14 typed fields (workload, model, precision, context, traffic, SLOs, burst, redundancy, engine) with defaults that work for a 70B GQA chatbot.
2. The algorithm is 15 sequential steps from weights and KV cache through to power and cooling, with VRAM = weights + KV + activations + 25% headroom.
3. Lookup tables cover model-family KV constants, precision bytes, six GPU SKUs, per-replica throughput ranges (cited), per-server power, and cooling thresholds.
4. Three scenarios (Baseline / Burst / Resilient) and seven guardrails handle the boundary cases — single-GPU vs TP vs PP, TPOT-unreachable, long-context bursts, air vs liquid.
5. Five worked test cases (7B copilot, 70B RAG, 405B multi-node, 70B batch, 13B local) verify the math from inputs through server spec, replica count, fabric, and cooling tier.
