"use client";

import { Info } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { SizerInput } from "@/lib/sizer/types";

import { TPOT_DEFAULTS, TTFT_DEFAULTS } from "../../_lib/options";

export function SlosStep({
  input,
  onChange,
}: {
  input: SizerInput;
  onChange: (next: Partial<SizerInput>) => void;
}) {
  const ttftDefault = TTFT_DEFAULTS[input.workload_type];
  const tpotDefault = TPOT_DEFAULTS[input.workload_type];

  return (
    <div className="grid gap-6">
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor="ttft">Target TTFT (time-to-first-token)</Label>
          <span className="font-mono text-small text-slate-700">
            {input.target_TTFT_ms} ms
          </span>
        </div>
        <p className="mt-0.5 flex items-start gap-1 text-xs text-slate-500">
          <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          Default for this workload: {ttftDefault} ms. Lower = users perceive
          the model as snappier; cost rises sharply below ~200 ms.
        </p>
        <Slider
          id="ttft"
          min={100}
          max={5000}
          step={50}
          value={[input.target_TTFT_ms]}
          onValueChange={(values: number[]) =>
            onChange({ target_TTFT_ms: values[0] })
          }
          aria-label="Target TTFT in milliseconds"
          className="mt-2"
        />
        <div className="mt-1 flex justify-between font-mono text-xs text-slate-400">
          <span>100 ms</span>
          <span>5,000 ms</span>
        </div>
        <Input
          type="number"
          inputMode="numeric"
          min={50}
          max={10000}
          step={10}
          value={input.target_TTFT_ms}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v) && v > 0) {
              onChange({ target_TTFT_ms: v });
            }
          }}
          aria-label="Target TTFT (custom value)"
          className="mt-2 w-32"
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor="tpot">Target TPOT (time-per-output-token)</Label>
          <span className="font-mono text-small text-slate-700">
            {input.target_TPOT_ms} ms
          </span>
        </div>
        <p className="mt-0.5 flex items-start gap-1 text-xs text-slate-500">
          <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          Default for this workload: {tpotDefault} ms. 30 ms ≈ 33 tokens/sec —
          faster than human reading speed.
        </p>
        <Slider
          id="tpot"
          min={10}
          max={300}
          step={5}
          value={[input.target_TPOT_ms]}
          onValueChange={(values: number[]) =>
            onChange({ target_TPOT_ms: values[0] })
          }
          aria-label="Target TPOT in milliseconds"
          className="mt-2"
        />
        <div className="mt-1 flex justify-between font-mono text-xs text-slate-400">
          <span>10 ms</span>
          <span>300 ms</span>
        </div>
        <Input
          type="number"
          inputMode="numeric"
          min={5}
          max={1000}
          step={1}
          value={input.target_TPOT_ms}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v) && v > 0) {
              onChange({ target_TPOT_ms: v });
            }
          }}
          aria-label="Target TPOT (custom value)"
          className="mt-2 w-32"
        />
      </div>
    </div>
  );
}
