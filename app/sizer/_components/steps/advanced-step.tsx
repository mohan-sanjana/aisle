"use client";

import { Info } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { KvCacheDtype, SizerInput } from "@/lib/sizer/types";

import { KV_CACHE_DTYPE_OPTIONS } from "../../_lib/options";

function Toggle({
  id,
  label,
  description,
  value,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  value: boolean | undefined;
  onChange: (v: boolean) => void;
}) {
  return (
    <Label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 p-3 transition-colors hover:border-brand-100"
    >
      <input
        id={id}
        type="checkbox"
        checked={value === true}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-2 focus:ring-brand-700 focus:ring-offset-1"
      />
      <span className="flex-1">
        <span className="block font-medium text-slate-900">{label}</span>
        <span className="mt-0.5 block text-xs font-normal text-slate-600">
          {description}
        </span>
      </span>
    </Label>
  );
}

export function AdvancedStep({
  input,
  onChange,
}: {
  input: SizerInput;
  onChange: (next: Partial<SizerInput>) => void;
}) {
  const overrideSet =
    input.throughput_override_tokens_per_sec_per_replica !== undefined;

  return (
    <div className="grid gap-6">
      <Accordion type="multiple" defaultValue={["throughput"]} className="border-y border-slate-200">
        <AccordionItem value="throughput">
          <AccordionTrigger>Throughput coefficient override</AccordionTrigger>
          <AccordionContent>
            <p className="text-small text-slate-600">
              The default tokens/sec/replica comes from published benchmarks per{" "}
              <code className="font-mono text-xs">(family, GPU, engine, precision)</code>{" "}
              tuple. If you have your own benchmark, enter it here and the
              sizer will use your number for every scenario.
            </p>
            <p className="mt-2 flex items-start gap-1 text-xs text-slate-500">
              <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
              Source for the default appears in the assumptions panel under the
              live result. The override is encoded in the URL so shared links
              carry your number.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Label htmlFor="throughput-override" className="sr-only">
                Throughput override (tokens/sec/replica)
              </Label>
              <Input
                id="throughput-override"
                type="number"
                inputMode="numeric"
                min={0}
                step={50}
                placeholder="e.g. 2400"
                value={
                  input.throughput_override_tokens_per_sec_per_replica ?? ""
                }
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") {
                    onChange({
                      throughput_override_tokens_per_sec_per_replica: undefined,
                    });
                  } else {
                    const v = Number(raw);
                    if (Number.isFinite(v) && v >= 0) {
                      onChange({
                        throughput_override_tokens_per_sec_per_replica: v,
                      });
                    }
                  }
                }}
                className="w-48"
              />
              <span className="font-mono text-xs text-slate-500">
                tok/s / replica
              </span>
              <span
                className={`ml-1 rounded-full px-2 py-0.5 text-xs ${
                  overrideSet
                    ? "bg-brand-50 text-brand-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {overrideSet ? "override" : "using default"}
              </span>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="optimizations">
          <AccordionTrigger>Inference optimizations</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-2">
              <Toggle
                id="prefix-caching"
                label="Prefix caching"
                description="Reuse KV state for repeated system prompts. Big win for chat / RAG."
                value={input.prefix_caching}
                onChange={(v) => onChange({ prefix_caching: v })}
              />
              <Toggle
                id="speculative-decoding"
                label="Speculative decoding"
                description="Draft model proposes tokens; main model verifies. ~2× throughput; adds VRAM overhead."
                value={input.speculative_decoding}
                onChange={(v) => onChange({ speculative_decoding: v })}
              />
              <Toggle
                id="kv-offload"
                label="KV offload to CPU/NVMe"
                description="Halves on-GPU KV at the cost of slower decode. Useful for very long contexts."
                value={input.kv_offload}
                onChange={(v) => onChange({ kv_offload: v })}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="kv-dtype">
          <AccordionTrigger>KV cache precision</AccordionTrigger>
          <AccordionContent>
            <p className="text-small text-slate-600">
              Storing KV in FP8 halves cache memory. Most workloads tolerate it;
              accuracy-critical RAG may want FP16.
            </p>
            <RadioGroup
              value={input.kv_cache_dtype ?? "FP16"}
              onValueChange={(v: string) =>
                onChange({ kv_cache_dtype: v as KvCacheDtype })
              }
              className="mt-3 grid grid-cols-2 gap-2"
            >
              {KV_CACHE_DTYPE_OPTIONS.map((opt) => {
                const id = `kv-${opt.value}`;
                const selected = (input.kv_cache_dtype ?? "FP16") === opt.value;
                return (
                  <Label
                    key={opt.value}
                    htmlFor={id}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border p-2 transition-colors ${
                      selected
                        ? "border-brand-700 bg-brand-50"
                        : "border-slate-200 hover:border-brand-100"
                    }`}
                  >
                    <RadioGroupItem id={id} value={opt.value} />
                    <span className="font-mono text-small">{opt.label}</span>
                    <span className="text-xs text-slate-500">
                      {opt.description}
                    </span>
                  </Label>
                );
              })}
            </RadioGroup>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
