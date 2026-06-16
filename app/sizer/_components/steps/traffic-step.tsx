"use client";

import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SizerInput } from "@/lib/sizer/types";

type NumKey =
  | "concurrent_users"
  | "requests_per_user_per_minute"
  | "avg_prompt_tokens"
  | "avg_output_tokens"
  | "max_context_tokens";

/**
 * Controlled number field that tolerates being transiently empty while the
 * user is typing. Without this, `Number("")` collapses to 0 and the field
 * displays a stuck "0" prefix on the next keystroke.
 */
function NumberField({
  id,
  value,
  onChange,
  min,
  max,
  step,
  ariaDescribedBy,
}: {
  id: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  ariaDescribedBy?: string;
}) {
  const [draft, setDraft] = useState(String(value));

  // Re-sync if the parent's value changes for reasons other than this input
  // (e.g., URL deserialization on first load, model-family preset, etc.).
  useEffect(() => {
    setDraft((prev) => (Number(prev) === value ? prev : String(value)));
  }, [value]);

  return (
    <Input
      id={id}
      type="number"
      inputMode="decimal"
      min={min}
      max={max}
      step={step}
      value={draft}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        if (raw === "") return; // mid-edit, don't push to parent
        const n = Number(raw);
        if (Number.isFinite(n) && n >= 0) onChange(n);
      }}
      onBlur={() => {
        // If user left the field empty, snap back to the last valid value
        if (draft === "" || !Number.isFinite(Number(draft))) {
          setDraft(String(value));
        }
      }}
      aria-describedby={ariaDescribedBy}
    />
  );
}

const FIELDS: ReadonlyArray<{
  key: NumKey;
  label: string;
  help: string;
  min: number;
  max: number;
  step: number;
  suffix: string;
}> = [
  {
    key: "concurrent_users",
    label: "Concurrent users",
    help: "Active users with an open session at peak. Not registered users.",
    min: 1,
    max: 100000,
    step: 1,
    suffix: "users",
  },
  {
    key: "requests_per_user_per_minute",
    label: "Requests per user per minute",
    help: "How chatty is each user? 1–4 for chat, 10+ for code assistants.",
    min: 0.1,
    max: 60,
    step: 0.1,
    suffix: "req/min",
  },
  {
    key: "avg_prompt_tokens",
    label: "Average prompt tokens",
    help: "Typical input length. RAG and agentic flows skew long (2k–8k).",
    min: 16,
    max: 200000,
    step: 16,
    suffix: "tokens",
  },
  {
    key: "avg_output_tokens",
    label: "Average output tokens",
    help: "Typical answer length. Chat ~300, code completions ~80.",
    min: 16,
    max: 32000,
    step: 16,
    suffix: "tokens",
  },
  {
    key: "max_context_tokens",
    label: "Max context tokens",
    help: "Hardest case the model must support. Drives worst-case KV.",
    min: 256,
    max: 1000000,
    step: 256,
    suffix: "tokens",
  },
];

export function TrafficStep({
  input,
  onChange,
}: {
  input: SizerInput;
  onChange: (next: Partial<SizerInput>) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {FIELDS.map((f) => {
        const id = `traffic-${f.key}`;
        return (
          <div key={f.key}>
            <Label htmlFor={id}>{f.label}</Label>
            <p className="mb-1.5 mt-0.5 text-xs text-slate-500">{f.help}</p>
            <div className="flex items-center gap-2">
              <NumberField
                id={id}
                value={input[f.key]}
                onChange={(v) => onChange({ [f.key]: v } as Partial<SizerInput>)}
                min={f.min}
                max={f.max}
                step={f.step}
                ariaDescribedBy={`${id}-help`}
              />
              <span
                id={`${id}-help`}
                className="font-mono text-xs text-slate-500"
              >
                {f.suffix}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
