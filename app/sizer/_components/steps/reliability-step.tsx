"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type {
  RedundancyMode,
  ServingEngineId,
  SizerInput,
} from "@/lib/sizer/types";

import { REDUNDANCY_OPTIONS, SERVING_ENGINE_OPTIONS } from "../../_lib/options";

export function ReliabilityStep({
  input,
  onChange,
}: {
  input: SizerInput;
  onChange: (next: Partial<SizerInput>) => void;
}) {
  return (
    <div className="grid gap-6">
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor="burst-factor">Burst factor</Label>
          <span className="font-mono text-small text-slate-700">
            ×{input.burst_factor.toFixed(1)}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          Peak load divided by steady-state. 3× covers most enterprise patterns;
          go higher for batch-style bursts.
        </p>
        <Slider
          id="burst-factor"
          min={1}
          max={10}
          step={0.5}
          value={[input.burst_factor]}
          onValueChange={(values: number[]) =>
            onChange({ burst_factor: values[0] })
          }
          aria-label="Burst factor (peak ÷ steady-state)"
          className="mt-2"
        />
        <div className="mt-1 flex justify-between font-mono text-xs text-slate-400">
          <span>×1</span>
          <span>×10</span>
        </div>
      </div>

      <div>
        <Label htmlFor="redundancy">Redundancy mode</Label>
        <RadioGroup
          id="redundancy"
          value={input.redundancy_mode}
          onValueChange={(v: string) =>
            onChange({ redundancy_mode: v as RedundancyMode })
          }
          className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3"
        >
          {REDUNDANCY_OPTIONS.map((opt) => {
            const id = `redundancy-${opt.value}`;
            const selected = input.redundancy_mode === opt.value;
            return (
              <Label
                key={opt.value}
                htmlFor={id}
                className={`flex cursor-pointer flex-col gap-1 rounded-md border p-3 transition-colors ${
                  selected
                    ? "border-brand-700 bg-brand-50"
                    : "border-slate-200 hover:border-brand-100"
                }`}
              >
                <span className="flex items-center gap-2">
                  <RadioGroupItem id={id} value={opt.value} />
                  <span className="font-medium text-slate-900">{opt.label}</span>
                </span>
                {opt.description && (
                  <span className="text-xs font-normal text-slate-500">
                    {opt.description}
                  </span>
                )}
              </Label>
            );
          })}
        </RadioGroup>
      </div>

      <div>
        <Label htmlFor="serving-engine">Serving engine</Label>
        <p className="mt-0.5 text-xs text-slate-500">
          vLLM is the open-source default. TensorRT-LLM adds ~20% throughput on
          NVIDIA-only stacks.
        </p>
        <Select
          value={input.serving_engine}
          onValueChange={(v: string) =>
            onChange({ serving_engine: v as ServingEngineId })
          }
        >
          <SelectTrigger id="serving-engine" className="mt-2" aria-label="Serving engine">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SERVING_ENGINE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-1 text-xs text-slate-500">
          {SERVING_ENGINE_OPTIONS.find((e) => e.value === input.serving_engine)
            ?.description}
        </p>
      </div>
    </div>
  );
}
