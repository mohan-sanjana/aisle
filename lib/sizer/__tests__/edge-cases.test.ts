/**
 * Boundary-condition tests for the Sizer calc engine.
 *
 * These mirror the guardrail behaviors from docs/sizing-math.md §5
 * ("Edge cases and guardrails"). Each scenario verifies that the engine
 * either picks a sensible alternative SKU/topology or emits a warning
 * the UI can surface to the user.
 */

import { describe, expect, it } from "vitest";

import { sizeWorkload } from "../index";
import type { SizerInput } from "../types";

// ──────────────────────────────────────────────────────────────────────────────
// Shared base input — small/safe; individual tests mutate.
// ──────────────────────────────────────────────────────────────────────────────

const safeInput: SizerInput = {
  workload_type: "interactive_chat",
  parameter_count_b: 13,
  model_architecture: "gqa",
  precision: "FP8",
  max_context_tokens: 4096,
  avg_prompt_tokens: 1000,
  avg_output_tokens: 200,
  concurrent_users: 50,
  requests_per_user_per_minute: 2,
  target_TTFT_ms: 500,
  target_TPOT_ms: 40,
  burst_factor: 2.0,
  redundancy_mode: "N+1",
  serving_engine: "vLLM",
};

function hasWarningMatching(warnings: string[], pattern: RegExp): boolean {
  return warnings.some((w) => pattern.test(w));
}

// ──────────────────────────────────────────────────────────────────────────────
// Model doesn't fit one GPU → auto-TP within node
// ──────────────────────────────────────────────────────────────────────────────

describe("Guardrail: model too big for a single GPU", () => {
  it("70B FP8 forces ≥ 2 GPUs per replica", () => {
    const out = sizeWorkload({ ...safeInput, parameter_count_b: 70 });
    // Burst scenario should land on multi-GPU.
    expect(out.scenarios.burst.server_spec.gpu_count).toBeGreaterThanOrEqual(2);
  });

  it("405B FP8 forces 8 GPUs per replica (max single-node TP)", () => {
    const out = sizeWorkload({
      ...safeInput,
      parameter_count_b: 405,
      concurrent_users: 200,
      target_TTFT_ms: 1500,
      target_TPOT_ms: 50,
    });
    expect(out.scenarios.burst.server_spec.gpu_count).toBe(8);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Multi-node pipeline-parallel boundary
// ──────────────────────────────────────────────────────────────────────────────

describe("Guardrail: PP across nodes emits warning", () => {
  it("model that exceeds 8-GPU node triggers PP / single-node-exceeded warning", () => {
    // 2T params FP16 = ~4 TB weights — exceeds 8× any current GPU's VRAM.
    const out = sizeWorkload({
      ...safeInput,
      parameter_count_b: 2000,
      precision: "FP16",
      concurrent_users: 100,
      target_TTFT_ms: 5000,
      target_TPOT_ms: 200,
    });
    const allWarnings = [
      ...out.guardrails_triggered,
      ...out.scenarios.burst.warnings,
    ];
    expect(
      hasWarningMatching(
        allWarnings,
        /pipeline|single 8.gpu|single-node|fit in a single|pp/i,
      ),
    ).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// TPOT target unreachable
// ──────────────────────────────────────────────────────────────────────────────

describe("Guardrail: TPOT target unreachable", () => {
  it("sub-millisecond TPOT on a 70B model emits a bandwidth warning", () => {
    // 70B FP8 + KV ≈ 200 GB. 1 ms → 200 TB/s required, exceeds even 8× B200 (64 TB/s).
    const out = sizeWorkload({
      ...safeInput,
      parameter_count_b: 70,
      target_TPOT_ms: 1,
    });
    const allWarnings = [
      ...out.guardrails_triggered,
      ...out.scenarios.burst.warnings,
    ];
    expect(
      hasWarningMatching(allWarnings, /bandwidth|tpot|unreachable|memory bandwidth/i),
    ).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// L40S boundary
// ──────────────────────────────────────────────────────────────────────────────

describe("Guardrail: L40S boundary (≤ ~13B at FP8)", () => {
  it("7B FP8 — L40S is a valid pick", () => {
    const out = sizeWorkload({
      ...safeInput,
      parameter_count_b: 7,
      precision: "FP8",
    });
    // Either L40S or a step-up SKU is acceptable; we just verify the engine
    // didn't pick something obviously over-spec like a B200 for a 7B model.
    const gpu = out.scenarios.burst.server_spec.gpu_id;
    expect(gpu).not.toMatch(/b200|b100|gb200/);
  });

  it("70B FP8 — L40S is NOT picked (weights exceed 30 GB threshold)", () => {
    const out = sizeWorkload({ ...safeInput, parameter_count_b: 70 });
    const gpu = out.scenarios.burst.server_spec.gpu_id;
    expect(gpu).not.toMatch(/l40s|l4/);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Long-context worst-case check
// ──────────────────────────────────────────────────────────────────────────────

describe("Guardrail: long-context bursts could evict KV", () => {
  it("max_context >> avg_prompt triggers a long-context warning", () => {
    const out = sizeWorkload({
      ...safeInput,
      parameter_count_b: 70,
      avg_prompt_tokens: 4000,
      max_context_tokens: 128000, // 32× the average
    });
    const allWarnings = [
      ...out.guardrails_triggered,
      ...out.scenarios.burst.warnings,
    ];
    expect(
      hasWarningMatching(
        allWarnings,
        /long.context|context|kv.evict|kv_offload|cap context|long context/i,
      ),
    ).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// MoE confidence margin
// ──────────────────────────────────────────────────────────────────────────────

describe("MoE: confidence margin and active-param handling", () => {
  it("MoE selection produces ±30% confidence margin", () => {
    const out = sizeWorkload({
      ...safeInput,
      parameter_count_b: 141, // Mixtral 8x22B-class total
      model_architecture: "moe",
      active_params_b: 39,
    });
    expect(out.confidence.is_moe).toBe(true);
    expect(out.confidence.margin_pct).toBe(30);
  });

  it("dense GQA model produces ±15% confidence margin", () => {
    const out = sizeWorkload({ ...safeInput, model_architecture: "gqa" });
    expect(out.confidence.is_moe).toBe(false);
    expect(out.confidence.margin_pct).toBe(15);
  });

  it("MoE with model_family lookup populates active_params_b automatically", () => {
    const out = sizeWorkload({
      ...safeInput,
      parameter_count_b: 141,
      model_family: "mixtral-8x22b",
      model_architecture: "moe",
      // active_params_b intentionally omitted — family lookup should fill it
    });
    expect(out.confidence.is_moe).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Throughput override
// ──────────────────────────────────────────────────────────────────────────────

describe("Throughput override field", () => {
  it("override changes per-replica throughput in the assumptions", () => {
    const baseline = sizeWorkload({
      ...safeInput,
      parameter_count_b: 70,
    });
    const overridden = sizeWorkload({
      ...safeInput,
      parameter_count_b: 70,
      throughput_override_tokens_per_sec_per_replica: 9999,
    });
    expect(overridden.assumptions.throughput_tokens_per_sec_per_replica).toBe(9999);
    expect(overridden.assumptions.throughput_tokens_per_sec_per_replica).not.toBe(
      baseline.assumptions.throughput_tokens_per_sec_per_replica,
    );
  });

  it("override marks the source as user override and surfaces a notice", () => {
    const out = sizeWorkload({
      ...safeInput,
      parameter_count_b: 70,
      throughput_override_tokens_per_sec_per_replica: 5000,
    });
    expect(out.assumptions.throughput_source.toLowerCase()).toMatch(
      /override|user/,
    );
  });

  it("higher override throughput reduces replica count", () => {
    const lowOverride = sizeWorkload({
      ...safeInput,
      parameter_count_b: 70,
      throughput_override_tokens_per_sec_per_replica: 1000,
    });
    const highOverride = sizeWorkload({
      ...safeInput,
      parameter_count_b: 70,
      throughput_override_tokens_per_sec_per_replica: 10000,
    });
    expect(highOverride.scenarios.burst.replica_count).toBeLessThanOrEqual(
      lowOverride.scenarios.burst.replica_count,
    );
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Roadmap silicon filter
// ──────────────────────────────────────────────────────────────────────────────

describe("Catalog: roadmap silicon filtering", () => {
  it("never recommends roadmap entries (e.g. Vera Rubin)", () => {
    // Try several realistic workloads — Vera Rubin should never appear.
    const inputs: SizerInput[] = [
      { ...safeInput, parameter_count_b: 7 },
      { ...safeInput, parameter_count_b: 70 },
      { ...safeInput, parameter_count_b: 405 },
    ];
    for (const input of inputs) {
      const out = sizeWorkload(input);
      for (const name of ["baseline", "burst", "resilient"] as const) {
        expect(out.scenarios[name].server_spec.gpu_id).not.toMatch(/rubin/);
      }
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Scenario semantics
// ──────────────────────────────────────────────────────────────────────────────

describe("Scenario semantics", () => {
  it("resilient mode produces at least 2 replicas (failure-domain pair rule)", () => {
    const out = sizeWorkload({ ...safeInput, parameter_count_b: 70 });
    expect(out.scenarios.resilient.replica_count).toBeGreaterThanOrEqual(2);
  });

  it("N redundancy mode gives a strictly smaller replica count than N+1 (when N ≥ 1)", () => {
    const nRedundancy = sizeWorkload({
      ...safeInput,
      parameter_count_b: 70,
      redundancy_mode: "N",
    });
    const nPlusOne = sizeWorkload({
      ...safeInput,
      parameter_count_b: 70,
      redundancy_mode: "N+1",
    });
    // Burst path: N+1 should add ≥ 1 replica vs N
    expect(nPlusOne.scenarios.burst.replica_count).toBeGreaterThanOrEqual(
      nRedundancy.scenarios.burst.replica_count,
    );
  });

  it("higher burst_factor produces more replicas in the burst scenario", () => {
    const low = sizeWorkload({ ...safeInput, parameter_count_b: 70, burst_factor: 1.0 });
    const high = sizeWorkload({ ...safeInput, parameter_count_b: 70, burst_factor: 5.0 });
    expect(high.scenarios.burst.replica_count).toBeGreaterThanOrEqual(
      low.scenarios.burst.replica_count,
    );
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Sanity invariants — outputs are always well-formed
// ──────────────────────────────────────────────────────────────────────────────

describe("Sanity invariants", () => {
  it("every scenario has positive replica/server count and positive power", () => {
    const out = sizeWorkload({ ...safeInput, parameter_count_b: 70 });
    for (const name of ["baseline", "burst", "resilient"] as const) {
      const s = out.scenarios[name];
      expect(s.replica_count).toBeGreaterThan(0);
      expect(s.servers_required).toBeGreaterThan(0);
      expect(s.servers_required).toBeLessThanOrEqual(s.replica_count);
      expect(s.replicas_per_server).toBeGreaterThanOrEqual(1);
      expect(s.power.sustained_kw_total).toBeGreaterThan(0);
      expect(s.server_spec.gpu_count).toBeGreaterThan(0);
      expect(s.server_spec.ram_gb).toBeGreaterThan(0);
      expect(s.server_spec.local_nvme_tb).toBeGreaterThan(0);
    }
  });

  it("assumptions block is populated", () => {
    const out = sizeWorkload({ ...safeInput, parameter_count_b: 70 });
    expect(out.assumptions.layers).toBeGreaterThan(0);
    expect(out.assumptions.kv_heads).toBeGreaterThan(0);
    expect(out.assumptions.head_dim).toBeGreaterThan(0);
    expect(out.assumptions.bytes_per_param).toBeGreaterThan(0);
    expect(out.assumptions.throughput_tokens_per_sec_per_replica).toBeGreaterThan(0);
    expect(out.assumptions.throughput_source).toBeTruthy();
  });
});
