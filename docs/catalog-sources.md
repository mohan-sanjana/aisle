# catalog.json companion source list

Sources backing the spec values in `catalog.json`. Where a single page covered many entries (e.g. NVIDIA's tensor-core datasheet, the inferencing-research-notes dossier), it is listed once at the top of the relevant section rather than duplicated per entry.

Last refreshed: 2026-06-15.

## Conventions and caveats

- **Dense vs sparse FLOPS.** NVIDIA and AMD marketing typically quote 2x sparse tensor-core throughput. The `*_tflops_dense` fields in `catalog.json` are the non-sparse (dense) values, which is what matters for LLM inference. Where a vendor page lists only the sparse number, it has been halved.
- **Mid-2026 currency.** Specs are correct as of mid-2026 where vendor pages or datasheets confirm them. Rubin (`nvidia-vera-rubin`) is announced but not shipping in volume; it carries `roadmap: true` and `uncertain: true` and most fields are `null`.
- **No invented numbers.** Where a precision is not natively supported (e.g. FP8 on A100, FP4 on Hopper) the field is `null`, not extrapolated.

## Cross-cutting sources

- Internal research dossier: `inferencing-research-notes.md` (same outputs folder) — GPU snapshot table, KV-cache math, optimization landscape.
- NVIDIA Tensor Core GPU datasheet (covers L4, L40S, A100, H100, H200): https://resources.nvidia.com/en-us-tensor-core/nvidia-tensor-core-gpu-datasheet
- NVIDIA Blackwell architecture brief (B100/B200/GB200, NVFP4): https://resources.nvidia.com/en-us-blackwell-architecture
- Mastering LLM Techniques: Inference Optimization (NVIDIA): https://developer.nvidia.com/blog/mastering-llm-techniques-inference-optimization/

## Accelerators

### nvidia-h100-sxm / nvidia-h100-pcie

- https://www.nvidia.com/en-us/data-center/h100/
- Tensor Core datasheet (cross-cutting source above)
- Spec snapshot in `inferencing-research-notes.md` section 7

### nvidia-h200-sxm

- https://www.nvidia.com/en-us/data-center/h200/
- Tensor Core datasheet (cross-cutting source above)

### nvidia-b100 / nvidia-b200-sxm / nvidia-gb200

- https://www.nvidia.com/en-us/data-center/dgx-b200/
- https://www.nvidia.com/en-us/data-center/gb200-nvl72/
- https://www.nvidia.com/en-us/data-center/hgx/
- Blackwell architecture brief (cross-cutting source above)
- Exxact comparison: https://www.exxactcorp.com/blog/hpc/comparing-nvidia-tensor-core-gpus
- Modal H100/H200 vs B100/B200: https://modal.com/blog/h100-and-h200-vs-b100-and-b200

### nvidia-l40s

- https://www.nvidia.com/en-us/data-center/l40s/
- L40S datasheet: https://resources.nvidia.com/en-us-l40s/l40s-datasheet-28413

### nvidia-l4

- https://www.nvidia.com/en-us/data-center/l4/
- L4 datasheet: https://resources.nvidia.com/en-us-l4/l4-datasheet

### nvidia-a100-80gb-sxm

- https://www.nvidia.com/en-us/data-center/a100/
- Tensor Core datasheet (cross-cutting source above)

### amd-mi300x

- https://www.amd.com/en/products/accelerators/instinct/mi300/mi300x.html
- MI300X datasheet (PDF): https://www.amd.com/content/dam/amd/en/documents/instinct-tech-docs/data-sheets/amd-instinct-mi300x-data-sheet.pdf
- SemiAnalysis MI300X vs H100/H200: https://newsletter.semianalysis.com/p/mi300x-vs-h100-vs-h200-benchmark-part-1-training

### amd-mi325x

- https://www.amd.com/en/products/accelerators/instinct/mi300/mi325x.html
- MI325X datasheet (PDF): https://www.amd.com/content/dam/amd/en/documents/instinct-tech-docs/data-sheets/amd-instinct-mi325x-datasheet.pdf

### nvidia-vera-rubin (roadmap, uncertain)

- NVIDIA Rubin platform announcement (GTC): https://nvidianews.nvidia.com/news/nvidia-announces-rubin-platform
- All numeric fields except announced HBM4 capacity (288 GB) and announced bandwidth (~13 TB/s) are null. Treat as preliminary.

## Networking

NVLink / NVSwitch family and Quantum InfiniBand:
- https://www.nvidia.com/en-us/data-center/nvlink/
- https://www.nvidia.com/en-us/networking/quantum-infiniband/
- ConnectX-7 (NDR-400): https://www.nvidia.com/en-us/networking/ethernet-adapters/
- Quantum-X800 (XDR-800) and ConnectX-8: https://www.nvidia.com/en-us/networking/quantum-x800/

RoCE / Ethernet:
- Spectrum-X: https://www.nvidia.com/en-us/networking/spectrum-x/
- Broadcom Tomahawk 5 (800GbE class): https://www.broadcom.com/products/ethernet-connectivity/switching/strataxgs/bcm78900-series

Inter-node fabric framing in the dossier: `inferencing-research-notes.md` section 6 (TP vs PP).

## Storage

- WEKA AI/ML: https://www.weka.io/solutions/ai-ml/
- VAST Data platform: https://www.vastdata.com/platform
- Pure Storage KV cache + inference: https://blog.purestorage.com/purely-technical/cut-llm-inference-costs-with-kv-caching/
- MinIO (on-prem object): https://min.io/product/overview
- SNIA NVMe form factors reference: https://www.snia.org/sites/default/files/SSSI/NVMe%20Form%20Factors.pdf
- Dossier section 2 (KV cache offload tiers) and section 6 (LMCACHE).

## Power and cooling

- NVIDIA HGX datacenter physical requirements: https://intuitionlabs.ai/articles/nvidia-hgx-data-center-requirements
- NVIDIA H200 power requirements (Sunbird DCIM): https://www.sunbirddcim.com/blog/nvidia-h200-power-requirements-can-your-racks-support-them
- Liquid vs air at 50 kW (Introl): https://introl.com/blog/liquid-cooling-gpu-data-centers-50kw-thermal-limits-guide
- DGX SuperPOD H100 cooling design guide: https://docs.nvidia.com/dgx-superpod/design-guides/dgx-superpod-data-center-design-h100/latest/cooling.html
- AI datacenter cooling 2026 (SLYD): https://slyd.com/guides/cooling-requirements
- Data Center Frontier on rack densities: https://www.datacenterfrontier.com/data-center-cooling/article/33004506/hotter-hardware-rack-densities-test-data-center-cooling-strategies
- GB200 NVL72 rack power (120-140 kW, mandatory liquid): https://www.nvidia.com/en-us/data-center/gb200-nvl72/
- Dossier section 8 (power/cooling tiers).

## Optimizations

- Quantization landscape 2026 (VRLA Tech): https://vrlatech.com/llm-quantization-explained-int4-int8-fp8-awq-and-gptq-in-2026/
- FP8 quantization benchmarks (Baseten): https://www.baseten.co/blog/33-faster-llm-inference-with-fp8-quantization/
- BF16 vs FP8 vs INT4 (AIMultiple): https://research.aimultiple.com/llm-quantization/
- NVIDIA post-training quantization guide: https://developer.nvidia.com/blog/optimizing-llms-for-performance-and-accuracy-with-post-training-quantization/
- NVFP4 (Blackwell): https://resources.nvidia.com/en-us-blackwell-architecture
- Continuous batching (Anyscale): https://www.anyscale.com/blog/continuous-batching-llm-inference
- PagedAttention (Runpod explainer): https://www.runpod.io/articles/guides/vllm-pagedattention-continuous-batching
- vLLM (Red Hat overview): https://www.redhat.com/en/blog/meet-vllm-faster-more-efficient-llm-inference-and-serving
- Speculative decoding (NVIDIA): https://developer.nvidia.com/blog/an-introduction-to-speculative-decoding-for-reducing-latency-in-ai-inference/
- Speculative decoding speedups (BentoML): https://www.bentoml.com/blog/3x-faster-llm-inference-with-speculative-decoding
- Multi-LoRA (vLLM docs): https://docs.vllm.ai/en/stable/features/lora.html
- Automatic prefix caching (vLLM docs): https://docs.vllm.ai/en/stable/features/automatic_prefix_caching.html
- Prefix caching savings (Pure Storage): https://blog.purestorage.com/purely-technical/cut-llm-inference-costs-with-kv-caching/

## Serving engines

- vLLM: https://docs.vllm.ai/ ; repo: https://github.com/vllm-project/vllm
- TensorRT-LLM: https://docs.nvidia.com/tensorrt-llm/ ; repo: https://github.com/NVIDIA/TensorRT-LLM
- Triton Inference Server: https://docs.nvidia.com/deeplearning/triton-inference-server/ ; repo: https://github.com/triton-inference-server/server
- Hugging Face TGI: https://huggingface.co/docs/text-generation-inference ; repo: https://github.com/huggingface/text-generation-inference
- SGLang: https://docs.sglang.ai/ ; repo: https://github.com/sgl-project/sglang
- NVIDIA Dynamo: https://github.com/ai-dynamo/dynamo ; AKS reference deployment: https://blog.aks.azure.com/2025/10/24/dynamo-on-aks
- License notes: Apache-2.0 for vLLM, TensorRT-LLM (with proprietary NVIDIA components), TGI (Apache-2.0; HFOIL applies to some commercial uses), SGLang, Dynamo. Triton is BSD-3-Clause.

## Entries flagged uncertain

- `nvidia-vera-rubin`: roadmap entry. Only announced HBM4 capacity (288 GB) and bandwidth (~13 TB/s) carry values; all other numeric fields are `null`.
- `nvidia-b100` FLOPS values are derived from NVIDIA's public Blackwell positioning that B100 is the lower-TDP (700 W) air-cooled SKU of the same Blackwell die used in B200; the dense FP8 figure (~3,500 TFLOPS, roughly 78% of B200 dense FP8) reflects the published 700/1000 W TDP ratio and matches the Blackwell architecture brief's range, but is below confidence of B200's directly datasheeted number.
- `nvidia-gb200` aggregate figures are per-superchip (2x B200 + 1x Grace). Anyone reading the catalog should be aware these are NOT per-GPU values like the other accelerator rows.
