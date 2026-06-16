import type {
  KvCacheDtype,
  ModelArchitecture,
  Precision,
  RedundancyMode,
  ServingEngineId,
  SizerInput,
  WorkloadType,
} from "@/lib/sizer/types";

import { DEFAULT_SIZER_INPUT } from "./defaults";

/**
 * URL-state codec for Sizer. Keys are short to keep URLs short.
 * Round-trip-safe: any field that decodes back to the default is omitted
 * from the encoded URL, so two equivalent inputs produce the same string.
 */

const KEYS = {
  workload_type: "w",
  parameter_count_b: "p",
  model_family: "mf",
  model_architecture: "a",
  active_params_b: "ap",
  precision: "pr",
  max_context_tokens: "ctx",
  avg_prompt_tokens: "pt",
  avg_output_tokens: "ot",
  concurrent_users: "u",
  requests_per_user_per_minute: "rpm",
  target_TTFT_ms: "ttft",
  target_TPOT_ms: "tpot",
  burst_factor: "bf",
  redundancy_mode: "r",
  serving_engine: "eng",
  throughput_override_tokens_per_sec_per_replica: "tov",
  kv_offload: "ko",
  speculative_decoding: "sd",
  prefix_caching: "pc",
  kv_cache_dtype: "kvd",
} as const;

const WORKLOAD_TYPES: ReadonlyArray<WorkloadType> = [
  "interactive_chat",
  "code_completion",
  "rag",
  "batch",
  "agentic",
];
const ARCHITECTURES: ReadonlyArray<ModelArchitecture> = ["dense", "gqa", "moe"];
const PRECISIONS: ReadonlyArray<Precision> = [
  "FP16",
  "BF16",
  "FP8",
  "INT8",
  "INT4",
];
const KV_DTYPES: ReadonlyArray<KvCacheDtype> = ["FP16", "FP8"];
const REDUNDANCY_MODES: ReadonlyArray<RedundancyMode> = ["N", "N+1", "N+2"];
const SERVING_ENGINES: ReadonlyArray<ServingEngineId> = [
  "vLLM",
  "TRT-LLM",
  "Triton",
  "SGLang",
];

function parseNumber(raw: string | null): number | undefined {
  if (raw === null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function parseBool(raw: string | null): boolean | undefined {
  if (raw === null) return undefined;
  if (raw === "1" || raw === "true") return true;
  if (raw === "0" || raw === "false") return false;
  return undefined;
}

function parseEnum<T extends string>(
  raw: string | null,
  values: ReadonlyArray<T>,
): T | undefined {
  if (raw === null) return undefined;
  return (values as ReadonlyArray<string>).includes(raw) ? (raw as T) : undefined;
}

export function decodeSizerInput(params: URLSearchParams): SizerInput {
  const base: SizerInput = { ...DEFAULT_SIZER_INPUT };

  const workload = parseEnum(params.get(KEYS.workload_type), WORKLOAD_TYPES);
  if (workload) base.workload_type = workload;

  const param_b = parseNumber(params.get(KEYS.parameter_count_b));
  if (param_b !== undefined) base.parameter_count_b = param_b;

  const family = params.get(KEYS.model_family);
  if (family) {
    base.model_family = family;
  } else if (params.has(KEYS.model_family)) {
    // empty string explicitly clears the family
    base.model_family = undefined;
  }

  const arch = parseEnum(params.get(KEYS.model_architecture), ARCHITECTURES);
  if (arch) base.model_architecture = arch;

  const activeB = parseNumber(params.get(KEYS.active_params_b));
  if (activeB !== undefined) base.active_params_b = activeB;

  const prec = parseEnum(params.get(KEYS.precision), PRECISIONS);
  if (prec) base.precision = prec;

  const ctx = parseNumber(params.get(KEYS.max_context_tokens));
  if (ctx !== undefined) base.max_context_tokens = ctx;
  const pt = parseNumber(params.get(KEYS.avg_prompt_tokens));
  if (pt !== undefined) base.avg_prompt_tokens = pt;
  const ot = parseNumber(params.get(KEYS.avg_output_tokens));
  if (ot !== undefined) base.avg_output_tokens = ot;
  const u = parseNumber(params.get(KEYS.concurrent_users));
  if (u !== undefined) base.concurrent_users = u;
  const rpm = parseNumber(params.get(KEYS.requests_per_user_per_minute));
  if (rpm !== undefined) base.requests_per_user_per_minute = rpm;

  const ttft = parseNumber(params.get(KEYS.target_TTFT_ms));
  if (ttft !== undefined) base.target_TTFT_ms = ttft;
  const tpot = parseNumber(params.get(KEYS.target_TPOT_ms));
  if (tpot !== undefined) base.target_TPOT_ms = tpot;

  const bf = parseNumber(params.get(KEYS.burst_factor));
  if (bf !== undefined) base.burst_factor = bf;
  const rm = parseEnum(params.get(KEYS.redundancy_mode), REDUNDANCY_MODES);
  if (rm) base.redundancy_mode = rm;

  const eng = parseEnum(params.get(KEYS.serving_engine), SERVING_ENGINES);
  if (eng) base.serving_engine = eng;

  const tov = parseNumber(
    params.get(KEYS.throughput_override_tokens_per_sec_per_replica),
  );
  if (tov !== undefined && tov > 0) {
    base.throughput_override_tokens_per_sec_per_replica = tov;
  }

  const ko = parseBool(params.get(KEYS.kv_offload));
  if (ko !== undefined) base.kv_offload = ko;
  const sd = parseBool(params.get(KEYS.speculative_decoding));
  if (sd !== undefined) base.speculative_decoding = sd;
  const pc = parseBool(params.get(KEYS.prefix_caching));
  if (pc !== undefined) base.prefix_caching = pc;

  const kvd = parseEnum(params.get(KEYS.kv_cache_dtype), KV_DTYPES);
  if (kvd) base.kv_cache_dtype = kvd;

  return base;
}

export function encodeSizerInput(input: SizerInput): URLSearchParams {
  const out = new URLSearchParams();
  const d = DEFAULT_SIZER_INPUT;

  const set = (k: string, v: string) => out.set(k, v);

  if (input.workload_type !== d.workload_type)
    set(KEYS.workload_type, input.workload_type);
  if (input.parameter_count_b !== d.parameter_count_b)
    set(KEYS.parameter_count_b, String(input.parameter_count_b));
  if (input.model_family !== d.model_family) {
    set(KEYS.model_family, input.model_family ?? "");
  }
  if (input.model_architecture !== d.model_architecture)
    set(KEYS.model_architecture, input.model_architecture);
  if (
    input.active_params_b !== undefined &&
    input.active_params_b !== d.active_params_b
  )
    set(KEYS.active_params_b, String(input.active_params_b));
  if (input.precision !== d.precision) set(KEYS.precision, input.precision);

  if (input.max_context_tokens !== d.max_context_tokens)
    set(KEYS.max_context_tokens, String(input.max_context_tokens));
  if (input.avg_prompt_tokens !== d.avg_prompt_tokens)
    set(KEYS.avg_prompt_tokens, String(input.avg_prompt_tokens));
  if (input.avg_output_tokens !== d.avg_output_tokens)
    set(KEYS.avg_output_tokens, String(input.avg_output_tokens));
  if (input.concurrent_users !== d.concurrent_users)
    set(KEYS.concurrent_users, String(input.concurrent_users));
  if (input.requests_per_user_per_minute !== d.requests_per_user_per_minute)
    set(
      KEYS.requests_per_user_per_minute,
      String(input.requests_per_user_per_minute),
    );

  if (input.target_TTFT_ms !== d.target_TTFT_ms)
    set(KEYS.target_TTFT_ms, String(input.target_TTFT_ms));
  if (input.target_TPOT_ms !== d.target_TPOT_ms)
    set(KEYS.target_TPOT_ms, String(input.target_TPOT_ms));

  if (input.burst_factor !== d.burst_factor)
    set(KEYS.burst_factor, String(input.burst_factor));
  if (input.redundancy_mode !== d.redundancy_mode)
    set(KEYS.redundancy_mode, input.redundancy_mode);

  if (input.serving_engine !== d.serving_engine)
    set(KEYS.serving_engine, input.serving_engine);

  if (input.throughput_override_tokens_per_sec_per_replica !== undefined) {
    set(
      KEYS.throughput_override_tokens_per_sec_per_replica,
      String(input.throughput_override_tokens_per_sec_per_replica),
    );
  }

  if (input.kv_offload !== d.kv_offload)
    set(KEYS.kv_offload, input.kv_offload ? "1" : "0");
  if (input.speculative_decoding !== d.speculative_decoding)
    set(KEYS.speculative_decoding, input.speculative_decoding ? "1" : "0");
  if (input.prefix_caching !== d.prefix_caching)
    set(KEYS.prefix_caching, input.prefix_caching ? "1" : "0");
  if (input.kv_cache_dtype !== d.kv_cache_dtype && input.kv_cache_dtype)
    set(KEYS.kv_cache_dtype, input.kv_cache_dtype);

  return out;
}
