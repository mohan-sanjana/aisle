"use client";

import { Info } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MODEL_FAMILIES, getModelFamily } from "@/lib/sizer/model-families";
import type { ModelArchitecture, Precision, SizerInput } from "@/lib/sizer/types";

import { ARCHITECTURE_OPTIONS, PRECISION_OPTIONS } from "../../_lib/options";

const CUSTOM_FAMILY_VALUE = "__custom__";

export function ModelStep({
  input,
  onChange,
}: {
  input: SizerInput;
  onChange: (next: Partial<SizerInput>) => void;
}) {
  function handleFamily(id: string) {
    if (id === CUSTOM_FAMILY_VALUE) {
      onChange({ model_family: undefined });
      return;
    }
    const family = getModelFamily(id);
    if (!family) return;
    const next: Partial<SizerInput> = {
      model_family: family.id,
      parameter_count_b: family.parameter_count_b,
      model_architecture: family.architecture,
      active_params_b: family.active_params_b,
    };
    // Reasoning models emit 5–50× more output tokens; pre-fill the default
    // so the user doesn't undersize by 10× by leaving the chat default of 300.
    if (family.default_avg_output_tokens) {
      next.avg_output_tokens = family.default_avg_output_tokens;
    }
    onChange(next);
  }

  function handleParamCount(value: number) {
    onChange({ parameter_count_b: value });
  }

  function handleArchitecture(arch: string) {
    onChange({
      model_architecture: arch as ModelArchitecture,
      active_params_b:
        arch === "moe" ? input.active_params_b ?? input.parameter_count_b / 3 : undefined,
    });
  }

  function handlePrecision(p: string) {
    onChange({ precision: p as Precision });
  }

  const familyValue = input.model_family ?? CUSTOM_FAMILY_VALUE;
  const isMoe = input.model_architecture === "moe";

  return (
    <div className="grid gap-6">
      <div>
        <Label htmlFor="model-family">Model family</Label>
        <p className="mb-2 mt-0.5 text-xs text-slate-500">
          Picking a known family auto-fills layers, KV heads, and active-params
          (for MoE).
        </p>
        <Select value={familyValue} onValueChange={handleFamily}>
          <SelectTrigger id="model-family" aria-label="Model family">
            <SelectValue placeholder="Choose a model family" />
          </SelectTrigger>
          <SelectContent>
            {MODEL_FAMILIES.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.display_name}
              </SelectItem>
            ))}
            <SelectItem value={CUSTOM_FAMILY_VALUE}>Custom / other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <Label htmlFor="param-count">Total parameters</Label>
          <span className="font-mono text-small text-slate-700">
            {input.parameter_count_b} B
          </span>
        </div>
        <Slider
          id="param-count"
          min={1}
          max={700}
          step={1}
          value={[input.parameter_count_b]}
          onValueChange={(values: number[]) => handleParamCount(values[0])}
          aria-label="Total parameters in billions"
          className="mt-2"
        />
        <div className="mt-1 flex justify-between font-mono text-xs text-slate-400">
          <span>1 B</span>
          <span>700 B</span>
        </div>
      </div>

      <div>
        <Label htmlFor="architecture">Architecture</Label>
        <RadioGroup
          id="architecture"
          value={input.model_architecture}
          onValueChange={handleArchitecture}
          className="mt-2 grid grid-cols-3 gap-2"
        >
          {ARCHITECTURE_OPTIONS.map((opt) => {
            const id = `arch-${opt.value}`;
            const selected = input.model_architecture === opt.value;
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

      {isMoe && (
        <div>
          <Label htmlFor="active-params">Active params per token (MoE)</Label>
          <p className="mt-0.5 text-xs text-slate-500">
            For MoE models, only a fraction of parameters are active per token.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Input
              id="active-params"
              type="number"
              inputMode="decimal"
              step={0.1}
              min={1}
              max={input.parameter_count_b}
              value={input.active_params_b ?? ""}
              onChange={(e) =>
                onChange({
                  active_params_b: e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
              className="w-32"
            />
            <span className="font-mono text-small text-slate-600">
              B (of {input.parameter_count_b} B total)
            </span>
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="precision">Precision</Label>
        <p className="mt-0.5 flex items-start gap-1 text-xs text-slate-500">
          <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          FP8 is the recommended default on Hopper / Blackwell.
        </p>
        <RadioGroup
          id="precision"
          value={input.precision}
          onValueChange={handlePrecision}
          className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5"
        >
          {PRECISION_OPTIONS.map((opt) => {
            const id = `prec-${opt.value}`;
            const selected = input.precision === opt.value;
            return (
              <Label
                key={opt.value}
                htmlFor={id}
                title={opt.description}
                className={`flex cursor-pointer items-center justify-center rounded-md border px-3 py-2.5 text-center transition-colors ${
                  selected
                    ? "border-brand-700 bg-brand-50 ring-1 ring-brand-700"
                    : "border-slate-200 hover:border-brand-100"
                }`}
              >
                <RadioGroupItem id={id} value={opt.value} className="sr-only" />
                <span className="font-mono text-sm font-medium text-slate-900">
                  {opt.label}
                </span>
              </Label>
            );
          })}
        </RadioGroup>
      </div>
    </div>
  );
}
