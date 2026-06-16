"use client";

import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getModelFamily } from "@/lib/sizer/model-families";
import type { SizerInput } from "@/lib/sizer/types";

import {
  PRECISION_OPTIONS,
  REDUNDANCY_OPTIONS,
  SERVING_ENGINE_OPTIONS,
  WORKLOAD_OPTIONS,
} from "../../_lib/options";
import type { StepId } from "../stepper";

function labelOf<T extends string>(
  options: ReadonlyArray<{ value: T; label: string }>,
  value: T,
): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

function Section({
  title,
  stepId,
  onJump,
  children,
}: {
  title: string;
  stepId: StepId;
  onJump: (id: StepId) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-slate-200 p-4">
      <header className="mb-2 flex items-center justify-between">
        <h3 className="text-small font-semibold text-slate-900">{title}</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onJump(stepId)}
          aria-label={`Edit ${title}`}
          className="no-print"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          Edit
        </Button>
      </header>
      <dl className="space-y-1 text-small">{children}</dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-right text-slate-900">{value}</dd>
    </div>
  );
}

export function ReviewStep({
  input,
  onJump,
}: {
  input: SizerInput;
  onJump: (id: StepId) => void;
}) {
  const family = input.model_family
    ? getModelFamily(input.model_family)
    : undefined;

  return (
    <div className="grid gap-3">
      <Section title="Workload" stepId="workload" onJump={onJump}>
        <Row label="Type" value={labelOf(WORKLOAD_OPTIONS, input.workload_type)} />
      </Section>

      <Section title="Model" stepId="model" onJump={onJump}>
        <Row label="Family" value={family?.display_name ?? "Custom"} />
        <Row
          label="Params"
          value={
            <span className="font-mono">{input.parameter_count_b} B</span>
          }
        />
        <Row
          label="Architecture"
          value={input.model_architecture.toUpperCase()}
        />
        {input.model_architecture === "moe" && input.active_params_b && (
          <Row
            label="Active params"
            value={
              <span className="font-mono">{input.active_params_b} B</span>
            }
          />
        )}
        <Row
          label="Precision"
          value={
            <span className="font-mono">
              {labelOf(PRECISION_OPTIONS, input.precision)}
            </span>
          }
        />
      </Section>

      <Section title="Traffic" stepId="traffic" onJump={onJump}>
        <Row
          label="Concurrent users"
          value={
            <span className="font-mono">
              {input.concurrent_users.toLocaleString("en-US")}
            </span>
          }
        />
        <Row
          label="Requests / user / min"
          value={
            <span className="font-mono">
              {input.requests_per_user_per_minute}
            </span>
          }
        />
        <Row
          label="Avg prompt tokens"
          value={
            <span className="font-mono">
              {input.avg_prompt_tokens.toLocaleString("en-US")}
            </span>
          }
        />
        <Row
          label="Avg output tokens"
          value={
            <span className="font-mono">
              {input.avg_output_tokens.toLocaleString("en-US")}
            </span>
          }
        />
        <Row
          label="Max context"
          value={
            <span className="font-mono">
              {input.max_context_tokens.toLocaleString("en-US")} tok
            </span>
          }
        />
      </Section>

      <Section title="SLOs" stepId="slos" onJump={onJump}>
        <Row
          label="Target TTFT"
          value={<span className="font-mono">{input.target_TTFT_ms} ms</span>}
        />
        <Row
          label="Target TPOT"
          value={<span className="font-mono">{input.target_TPOT_ms} ms</span>}
        />
      </Section>

      <Section title="Reliability" stepId="reliability" onJump={onJump}>
        <Row
          label="Burst factor"
          value={<span className="font-mono">×{input.burst_factor}</span>}
        />
        <Row
          label="Redundancy"
          value={labelOf(REDUNDANCY_OPTIONS, input.redundancy_mode)}
        />
        <Row
          label="Serving engine"
          value={labelOf(SERVING_ENGINE_OPTIONS, input.serving_engine)}
        />
      </Section>

      <Section title="Advanced" stepId="advanced" onJump={onJump}>
        <Row
          label="Throughput override"
          value={
            input.throughput_override_tokens_per_sec_per_replica !== undefined ? (
              <span className="font-mono">
                {input.throughput_override_tokens_per_sec_per_replica.toLocaleString(
                  "en-US",
                )}{" "}
                tok/s
              </span>
            ) : (
              <span className="text-slate-500">using default</span>
            )
          }
        />
        <Row
          label="Prefix caching"
          value={input.prefix_caching ? "On" : "Off"}
        />
        <Row
          label="Speculative decoding"
          value={input.speculative_decoding ? "On" : "Off"}
        />
        <Row label="KV offload" value={input.kv_offload ? "On" : "Off"} />
        <Row
          label="KV cache dtype"
          value={
            <span className="font-mono">
              {input.kv_cache_dtype ?? "FP16"}
            </span>
          }
        />
      </Section>
    </div>
  );
}
