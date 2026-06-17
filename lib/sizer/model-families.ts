/**
 * Model family defaults (companion to `model_families.json` per spec §6.1).
 *
 * Used when the user picks a known model family — defaults populate layers,
 * kv_heads, head_dim, architecture, and (for MoE) active_params_b. Users may
 * override active_params_b in the wizard.
 */

import type { ModelArchitecture } from "./types";

export type ModelFamilyDefaults = {
  id: string;
  display_name: string;
  parameter_count_b: number;
  architecture: ModelArchitecture;
  layers: number;
  /** Number of KV heads (after GQA grouping). `null` for MLA (DeepSeek). */
  kv_heads: number | null;
  head_dim: number;
  /** For MoE: active params per token (B). Equals parameter_count_b for dense/gqa. */
  active_params_b?: number;
  /** DeepSeek-V3 style multi-head latent attention compresses KV ~10x vs GQA. */
  uses_mla?: boolean;
  /**
   * Reasoning models (DeepSeek R1, o-class, anything with explicit <think>
   * blocks) emit 5–50× more output tokens than chat models. When true, the
   * UI raises avg_output_tokens defaults on family selection.
   */
  reasoning?: boolean;
  /**
   * When set, the UI pre-fills SizerInput.avg_output_tokens with this value
   * on family selection (and not the global default). Used for reasoning
   * models to avoid a 10× undersize on output-bound throughput.
   */
  default_avg_output_tokens?: number;
  notes?: string;
};

/**
 * Defaults are pulled from sizing-math.md §3 "Model architecture defaults".
 * Sources: published model configs + Pierre Lienhart KV deep-dive.
 */
export const MODEL_FAMILIES: readonly ModelFamilyDefaults[] = [
  // Llama 3.x
  {
    id: "llama-3.1-8b",
    display_name: "Llama 3.1 8B",
    parameter_count_b: 8,
    architecture: "gqa",
    layers: 32,
    kv_heads: 8,
    head_dim: 128,
  },
  {
    id: "llama-3.1-70b",
    display_name: "Llama 3.1 70B",
    parameter_count_b: 70,
    architecture: "gqa",
    layers: 80,
    kv_heads: 8,
    head_dim: 128,
  },
  {
    id: "llama-3.3-70b",
    display_name: "Llama 3.3 70B",
    parameter_count_b: 70,
    architecture: "gqa",
    layers: 80,
    kv_heads: 8,
    head_dim: 128,
  },
  {
    id: "llama-3.1-405b",
    display_name: "Llama 3.1 405B",
    parameter_count_b: 405,
    architecture: "gqa",
    layers: 126,
    kv_heads: 16,
    head_dim: 128,
    notes: "Multi-node deployment expected.",
  },

  // Mixtral
  {
    id: "mixtral-8x7b",
    display_name: "Mixtral 8x7B",
    parameter_count_b: 47,
    architecture: "moe",
    layers: 32,
    kv_heads: 8,
    head_dim: 128,
    active_params_b: 13,
    notes: "2 active experts per token.",
  },
  {
    id: "mixtral-8x22b",
    display_name: "Mixtral 8x22B",
    parameter_count_b: 141,
    architecture: "moe",
    layers: 56,
    kv_heads: 8,
    head_dim: 128,
    active_params_b: 39,
    notes: "2 active experts per token.",
  },

  // Qwen3
  {
    id: "qwen3-32b",
    display_name: "Qwen3 32B",
    parameter_count_b: 32,
    architecture: "gqa",
    layers: 64,
    kv_heads: 8,
    head_dim: 128,
  },
  {
    id: "qwen3-235b-a22b",
    display_name: "Qwen3 235B-A22B",
    parameter_count_b: 235,
    architecture: "moe",
    layers: 94,
    kv_heads: 4,
    head_dim: 128,
    active_params_b: 22,
  },

  // DeepSeek
  {
    id: "deepseek-v3",
    display_name: "DeepSeek-V3 (671B)",
    parameter_count_b: 671,
    architecture: "moe",
    layers: 61,
    // MLA — KV roughly 1/10 of equivalent GQA. The engine multiplies KV by 0.1
    // when `uses_mla === true`; kv_heads here is the GQA-equivalent placeholder.
    kv_heads: 8,
    head_dim: 128,
    active_params_b: 37,
    uses_mla: true,
    notes: "Multi-head latent attention; KV compressed ~10x vs GQA-equivalent.",
  },
  {
    id: "deepseek-r1",
    display_name: "DeepSeek-R1 (671B, reasoning)",
    parameter_count_b: 671,
    architecture: "moe",
    layers: 61,
    kv_heads: 8,
    head_dim: 128,
    active_params_b: 37,
    uses_mla: true,
    reasoning: true,
    default_avg_output_tokens: 8000,
    notes:
      "Reasoning model — emits long <think> chains. Plan for 5,000–50,000 output tokens per request.",
  },

  // GPT-OSS
  {
    id: "gpt-oss-120b",
    display_name: "GPT-OSS 120B",
    parameter_count_b: 120,
    architecture: "moe",
    layers: 80,
    kv_heads: 8,
    head_dim: 128,
    active_params_b: 5,
    notes: "Sparse MoE; dense-equivalent KV.",
  },
  {
    id: "qwq-32b",
    display_name: "QwQ 32B (reasoning)",
    parameter_count_b: 32,
    architecture: "gqa",
    layers: 64,
    kv_heads: 8,
    head_dim: 128,
    reasoning: true,
    default_avg_output_tokens: 6000,
    notes:
      "Qwen reasoning model. Emits long chains-of-thought before final answer.",
  },
];

export function getModelFamily(id: string): ModelFamilyDefaults | undefined {
  return MODEL_FAMILIES.find((f) => f.id === id);
}

/**
 * Generic architecture defaults when no family is known. Used as a sane
 * fallback so the calc engine never crashes on missing metadata.
 *
 * Note: layer counts are based on parameter count only. Architecture-specific
 * defaults (dense vs MoE vs GQA) currently use the same table; if that ever
 * needs to diverge, add a parameter back here.
 */
export function genericArchitectureDefaults(
  paramCountB: number,
): { layers: number; kv_heads: number; head_dim: number } {
  // Layer count scales roughly with sqrt(params) — these are rough, sized to
  // land in the right ballpark for sizing math.
  if (paramCountB <= 9) return { layers: 32, kv_heads: 8, head_dim: 128 };
  if (paramCountB <= 15) return { layers: 40, kv_heads: 8, head_dim: 128 };
  if (paramCountB <= 40) return { layers: 60, kv_heads: 8, head_dim: 128 };
  if (paramCountB <= 80) return { layers: 80, kv_heads: 8, head_dim: 128 };
  if (paramCountB <= 200) return { layers: 96, kv_heads: 8, head_dim: 128 };
  return { layers: 126, kv_heads: 16, head_dim: 128 };
}
