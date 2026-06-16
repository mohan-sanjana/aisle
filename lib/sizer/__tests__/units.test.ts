/**
 * Small unit tests for individual step functions.
 * Verifies the math in isolation so failures in test-cases.test.ts can
 * be triaged to a specific step.
 */

import { describe, expect, it } from "vitest";

import {
  bytesPerKvElement,
  kvCachePerRequestGB,
  peakInFlightBatch,
  rps,
  totalKvBudgetGB,
} from "../steps/kv-cache";
import { bytesPerParam, weightsMemoryGB } from "../steps/weights";
import { activationsGB, totalVramGB } from "../steps/vram";
import { requiredBandwidthGBps } from "../steps/gpu-selection";
import { planParallelism } from "../steps/parallelism";
import { sizeBucketForParams, tpEfficiency } from "../constants";
import type { ResolvedModelConfig, SizerInput } from "../types";

const llama70b: ResolvedModelConfig = {
  parameter_count_b: 70,
  active_params_b: 70,
  architecture: "gqa",
  layers: 80,
  kv_heads: 8,
  head_dim: 128,
  uses_mla: false,
  family_id: "llama-3.1-70b",
};

const llama7b: ResolvedModelConfig = {
  parameter_count_b: 7,
  active_params_b: 7,
  architecture: "gqa",
  layers: 32,
  kv_heads: 8,
  head_dim: 128,
  uses_mla: false,
};

const baseInput: SizerInput = {
  workload_type: "interactive_chat",
  parameter_count_b: 70,
  model_architecture: "gqa",
  precision: "FP8",
  max_context_tokens: 32768,
  avg_prompt_tokens: 6000,
  avg_output_tokens: 250,
  concurrent_users: 80,
  requests_per_user_per_minute: 4,
  target_TTFT_ms: 500,
  target_TPOT_ms: 40,
  burst_factor: 2.5,
  redundancy_mode: "N+1",
  serving_engine: "vLLM",
};

describe("Step 1 — weights", () => {
  it("70B FP8 → 70 GB", () => {
    expect(weightsMemoryGB(70, "FP8")).toBe(70);
  });
  it("70B BF16 → 140 GB", () => {
    expect(weightsMemoryGB(70, "BF16")).toBe(140);
  });
  it("70B INT4 → 35 GB", () => {
    expect(weightsMemoryGB(70, "INT4")).toBe(35);
  });
  it("bytesPerParam mapping", () => {
    expect(bytesPerParam("FP16")).toBe(2);
    expect(bytesPerParam("FP8")).toBe(1);
    expect(bytesPerParam("INT4")).toBe(0.5);
  });
});

describe("Step 2 — KV cache per request", () => {
  it("70B at 6250 tok FP8 ≈ 1.0 GB (sizing-math TC2)", () => {
    const gb = kvCachePerRequestGB(llama70b, 6250, 1);
    // 2*80*8*128*6250 = 1.024e9 bytes ≈ 1.024 GB
    expect(gb).toBeCloseTo(1.024, 1);
  });
  it("7B at 1580 tok FP8 ≈ 0.1 GB (sizing-math TC1)", () => {
    const gb = kvCachePerRequestGB(llama7b, 1580, 1);
    // 2*32*8*128*1580 = 103.5e6 bytes ≈ 0.103 GB
    expect(gb).toBeCloseTo(0.103, 2);
  });
  it("MLA models get 0.1× multiplier", () => {
    const mla: ResolvedModelConfig = { ...llama70b, uses_mla: true };
    const gqa = kvCachePerRequestGB(llama70b, 1000, 1);
    const mlaResult = kvCachePerRequestGB(mla, 1000, 1);
    expect(mlaResult).toBeCloseTo(gqa * 0.1, 5);
  });
});

describe("Step 3 — RPS and B_peak", () => {
  it("80 users × 4 rpm → 5.33 rps", () => {
    expect(rps(baseInput)).toBeCloseTo(5.333, 2);
  });
  it("B_peak = ceil(rps × E[out_sec] × burst)", () => {
    // 5.33 × (250 × 40/1000) × 2.5 = 5.33 × 10 × 2.5 = 133.25 → ceil 134
    const b = peakInFlightBatch(baseInput, 2.5);
    expect(b).toBeGreaterThanOrEqual(133);
    expect(b).toBeLessThanOrEqual(134);
  });
});

describe("Step 4 — KV total", () => {
  it("133 batch × ~1 GB = ~133 GB (TC2)", () => {
    const kvTotal = totalKvBudgetGB(baseInput, llama70b, 133, 1);
    expect(kvTotal).toBeGreaterThan(125);
    expect(kvTotal).toBeLessThan(145);
  });
  it("kv_offload halves the total", () => {
    const off = totalKvBudgetGB(baseInput, llama70b, 100, 1);
    const on = totalKvBudgetGB({ ...baseInput, kv_offload: true }, llama70b, 100, 1);
    expect(on).toBeCloseTo(off * 0.5, 5);
  });
});

describe("bytesPerKvElement", () => {
  it("defaults to 1 byte for FP8 model", () => {
    expect(bytesPerKvElement(baseInput)).toBe(1);
  });
  it("BF16 model defaults to 2 bytes", () => {
    expect(bytesPerKvElement({ ...baseInput, precision: "BF16" })).toBe(2);
  });
  it("kv_cache_dtype override wins", () => {
    expect(bytesPerKvElement({ ...baseInput, kv_cache_dtype: "FP16" })).toBe(2);
  });
});

describe("Step 5-7 — activations, headroom, VRAM total", () => {
  it("activations: floor 2 GB", () => {
    expect(activationsGB(10)).toBe(2); // 5% of 10 = 0.5, floor=2
  });
  it("activations: 5% of large weights", () => {
    expect(activationsGB(200)).toBe(10);
  });
  it("total VRAM matches TC2 shape (70+133+3.5+headroom)", () => {
    const v = totalVramGB({
      weights_gb: 70,
      kv_total_gb: 133,
      headroom_fraction: 0.25,
    });
    // subtotal = 70 + 133 + 3.5 = 206.5; headroom = 51.625; vram = 258.125
    expect(v.vram_gb).toBeCloseTo(258.125, 1);
  });
  it("speculative decoding adds 10%", () => {
    const v = totalVramGB({
      weights_gb: 70,
      kv_total_gb: 100,
      headroom_fraction: 0.25,
      speculative_decoding: true,
    });
    const without = totalVramGB({
      weights_gb: 70,
      kv_total_gb: 100,
      headroom_fraction: 0.25,
    });
    expect(v.vram_gb).toBeCloseTo(without.vram_gb * 1.1, 2);
  });
});

describe("Step 8 — required bandwidth", () => {
  it("(W + KV) / TPOT", () => {
    const bw = requiredBandwidthGBps({
      active_weights_gb: 70,
      kv_total_gb: 133,
      target_TPOT_ms: 40,
    });
    // (70 + 133) / 0.040 = 5075 GB/s
    expect(bw).toBeCloseTo(5075, 0);
  });
});

describe("Step 9 — parallelism", () => {
  it("1 GPU → no parallelism", () => {
    const p = planParallelism({ gpu_count: 1, architecture: "gqa", exceeded_single_node: false });
    expect(p.tp_degree).toBe(1);
    expect(p.pp_degree).toBe(1);
  });
  it("4 GPUs → TP=4, PP=1", () => {
    const p = planParallelism({ gpu_count: 4, architecture: "gqa", exceeded_single_node: false });
    expect(p.tp_degree).toBe(4);
    expect(p.pp_degree).toBe(1);
  });
  it("8 GPUs → TP=8, PP=1", () => {
    const p = planParallelism({ gpu_count: 8, architecture: "gqa", exceeded_single_node: false });
    expect(p.tp_degree).toBe(8);
    expect(p.pp_degree).toBe(1);
  });
  it("over single node → PP across nodes", () => {
    const p = planParallelism({ gpu_count: 16, architecture: "gqa", exceeded_single_node: true });
    expect(p.tp_degree).toBe(8);
    expect(p.pp_degree).toBe(2);
    expect(p.total_gpus_per_replica).toBe(16);
  });
  it("PP>4 emits bubble warning", () => {
    const p = planParallelism({ gpu_count: 48, architecture: "gqa", exceeded_single_node: true });
    expect(p.warnings.some((w) => w.includes("bubble"))).toBe(true);
  });
});

describe("TP efficiency table", () => {
  it("monotonically decreases", () => {
    expect(tpEfficiency(1)).toBeGreaterThan(tpEfficiency(2));
    expect(tpEfficiency(2)).toBeGreaterThan(tpEfficiency(4));
    expect(tpEfficiency(4)).toBeGreaterThan(tpEfficiency(8));
  });
});

describe("sizeBucketForParams", () => {
  it("buckets match sizing-math", () => {
    expect(sizeBucketForParams(7)).toBe("7B");
    expect(sizeBucketForParams(13)).toBe("13-34B");
    expect(sizeBucketForParams(34)).toBe("13-34B");
    expect(sizeBucketForParams(70)).toBe("70B");
    expect(sizeBucketForParams(405)).toBe("405B+");
  });
});
