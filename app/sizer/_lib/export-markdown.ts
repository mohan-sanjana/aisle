import { getModelFamily } from "@/lib/sizer/model-families";
import type {
  ScenarioOutput,
  SizerInput,
  SizerOutput,
} from "@/lib/sizer/types";

import {
  PRECISION_OPTIONS,
  REDUNDANCY_OPTIONS,
  SERVING_ENGINE_OPTIONS,
  WORKLOAD_OPTIONS,
} from "./options";

function labelFor<T extends string>(
  options: ReadonlyArray<{ value: T; label: string }>,
  value: T,
): string {
  return options.find((o) => o.value === value)?.label ?? String(value);
}

function fmt(n: number, digits = 0): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function scenarioToMarkdown(s: ScenarioOutput): string {
  const lines: string[] = [];
  const title =
    s.name === "baseline"
      ? "Baseline"
      : s.name === "burst"
      ? "Burst"
      : "Resilient";
  lines.push(`### ${title}`);
  lines.push("");
  lines.push("**Server spec (per physical server)**");
  lines.push("");
  lines.push(`- CPU: ${s.server_spec.cpu_class}`);
  lines.push(`- RAM: ${fmt(s.server_spec.ram_gb)} GB`);
  lines.push(
    `- GPU: ${s.server_spec.gpu_count} × \`${s.server_spec.gpu_id}\``,
  );
  lines.push(`- NIC: ${s.server_spec.nic}`);
  lines.push(`- Local NVMe: ${fmt(s.server_spec.local_nvme_tb)} TB`);
  lines.push("");
  if (s.replicas_per_server > 1) {
    lines.push(
      `**Servers:** ${s.servers_required} (hosting ${s.replica_count} replicas, ~${s.replicas_per_server} per server)`,
    );
  } else {
    lines.push(`**Servers / replicas:** ${s.servers_required}`);
  }
  lines.push("");
  lines.push(
    `**Fabric:** ${s.fabric.type} (${fmt(s.fabric.bandwidth_gbps)} Gb) — ${
      s.fabric.rationale
    }`,
  );
  lines.push("");
  lines.push(
    `**Power:** ${fmt(s.power.sustained_kw_total, 1)} kW sustained · ${fmt(
      s.power.kw_per_rack,
      1,
    )} kW/rack · PUE ${s.power.pue.toFixed(2)} · facility ${fmt(
      s.power.facility_kw_total,
      1,
    )} kW`,
  );
  lines.push("");
  lines.push(`**Cooling:** ${s.cooling.tier} — ${s.cooling.rationale}`);
  if (s.warnings.length > 0) {
    lines.push("");
    lines.push("**Warnings:**");
    for (const w of s.warnings) lines.push(`- ${w}`);
  }
  lines.push("");
  return lines.join("\n");
}

export function sizerOutputToMarkdown(
  input: SizerInput,
  output: SizerOutput,
): string {
  const family = input.model_family
    ? getModelFamily(input.model_family)
    : undefined;
  const familyLabel = family?.display_name ?? "Custom model";
  const lines: string[] = [];

  lines.push(`# Aisle Sizer — ${familyLabel}`);
  lines.push("");
  lines.push(
    `_Generated ${new Date().toISOString().slice(0, 10)} · confidence ±${
      output.confidence.margin_pct
    }% ${output.confidence.is_moe ? "(MoE)" : "(dense / GQA)"}_`,
  );
  lines.push("");

  // ── Inputs ──────────────────────────────────────────────────────────────
  lines.push("## Inputs");
  lines.push("");
  lines.push(
    `- Workload: **${labelFor(WORKLOAD_OPTIONS, input.workload_type)}**`,
  );
  lines.push(
    `- Model: **${familyLabel}** — ${input.parameter_count_b} B params, ${input.model_architecture.toUpperCase()}` +
      (input.active_params_b
        ? `, ${input.active_params_b} B active`
        : ""),
  );
  lines.push(
    `- Precision: **${labelFor(PRECISION_OPTIONS, input.precision)}**` +
      (input.kv_cache_dtype ? ` · KV dtype ${input.kv_cache_dtype}` : ""),
  );
  lines.push(
    `- Context: ${fmt(input.max_context_tokens)} tokens max · ${fmt(
      input.avg_prompt_tokens,
    )} avg prompt · ${fmt(input.avg_output_tokens)} avg output`,
  );
  lines.push(
    `- Traffic: ${fmt(input.concurrent_users)} concurrent users · ${
      input.requests_per_user_per_minute
    } req/user/min`,
  );
  lines.push(
    `- SLOs: TTFT ≤ ${fmt(input.target_TTFT_ms)} ms · TPOT ≤ ${fmt(
      input.target_TPOT_ms,
    )} ms`,
  );
  lines.push(
    `- Reliability: burst ×${input.burst_factor} · ${labelFor(
      REDUNDANCY_OPTIONS,
      input.redundancy_mode,
    )}`,
  );
  lines.push(
    `- Serving engine: ${labelFor(SERVING_ENGINE_OPTIONS, input.serving_engine)}`,
  );
  if (input.kv_offload || input.speculative_decoding || input.prefix_caching) {
    const flags: string[] = [];
    if (input.kv_offload) flags.push("KV offload");
    if (input.speculative_decoding) flags.push("speculative decoding");
    if (input.prefix_caching) flags.push("prefix caching");
    lines.push(`- Optimizations: ${flags.join(", ")}`);
  }
  if (input.throughput_override_tokens_per_sec_per_replica !== undefined) {
    lines.push(
      `- **Throughput override:** ${fmt(
        input.throughput_override_tokens_per_sec_per_replica,
      )} tokens/sec/replica (user-supplied benchmark)`,
    );
  }
  lines.push("");

  // ── Assumptions ─────────────────────────────────────────────────────────
  lines.push("## Assumptions");
  lines.push("");
  lines.push(
    `- Throughput: **${fmt(
      output.assumptions.throughput_tokens_per_sec_per_replica,
    )} tokens/sec/replica**`,
  );
  lines.push(`- Source: ${output.assumptions.throughput_source}`);
  lines.push(
    `- Model: ${output.assumptions.layers} layers · ${output.assumptions.kv_heads} KV heads · head_dim ${output.assumptions.head_dim}`,
  );
  lines.push(
    `- Memory: ${output.assumptions.bytes_per_param} B/param · ${output.assumptions.bytes_per_kv_element} B/KV element`,
  );
  lines.push("");

  // ── Scenarios ───────────────────────────────────────────────────────────
  lines.push("## Scenarios");
  lines.push("");
  lines.push(scenarioToMarkdown(output.scenarios.baseline));
  lines.push(scenarioToMarkdown(output.scenarios.burst));
  lines.push(scenarioToMarkdown(output.scenarios.resilient));

  // ── Guardrails ──────────────────────────────────────────────────────────
  if (output.guardrails_triggered.length > 0) {
    lines.push("## Guardrails triggered");
    lines.push("");
    for (const g of output.guardrails_triggered) lines.push(`- ${g}`);
    lines.push("");
  }

  // ── Footer ──────────────────────────────────────────────────────────────
  lines.push("---");
  lines.push("");
  lines.push(
    "Generated by [Aisle](https://github.com/mohan-sanjana/aisle) — open-source planning workbench for on-prem LLM inference infrastructure.",
  );
  lines.push("");

  return lines.join("\n");
}

export function downloadMarkdown(filename: string, body: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([body], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
