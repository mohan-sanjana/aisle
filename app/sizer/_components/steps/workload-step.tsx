"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { SizerInput, WorkloadType } from "@/lib/sizer/types";

import { WORKLOAD_OPTIONS, TPOT_DEFAULTS, TTFT_DEFAULTS } from "../../_lib/options";

export function WorkloadStep({
  input,
  onChange,
}: {
  input: SizerInput;
  onChange: (next: Partial<SizerInput>) => void;
}) {
  function handleChange(value: string) {
    const next = value as WorkloadType;
    onChange({
      workload_type: next,
      // Auto-update SLOs to the workload's defaults so users don't have to
      // walk back to step 4 every time they change category.
      target_TTFT_ms: TTFT_DEFAULTS[next],
      target_TPOT_ms: TPOT_DEFAULTS[next],
    });
  }

  return (
    <RadioGroup
      value={input.workload_type}
      onValueChange={handleChange}
      aria-label="Workload type"
      className="gap-2"
    >
      {WORKLOAD_OPTIONS.map((opt) => {
        const id = `workload-${opt.value}`;
        const selected = input.workload_type === opt.value;
        return (
          <Label
            key={opt.value}
            htmlFor={id}
            className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
              selected
                ? "border-brand-700 bg-brand-50"
                : "border-slate-200 hover:border-brand-100 hover:bg-slate-50"
            }`}
          >
            <RadioGroupItem id={id} value={opt.value} className="mt-1" />
            <span className="flex-1">
              <span className="block font-medium text-slate-900">{opt.label}</span>
              {opt.description && (
                <span className="mt-0.5 block text-small font-normal text-slate-600">
                  {opt.description}
                </span>
              )}
            </span>
          </Label>
        );
      })}
    </RadioGroup>
  );
}
