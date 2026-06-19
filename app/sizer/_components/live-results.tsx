"use client";

import type { SizerInput, SizerOutput } from "@/lib/sizer/types";

import { AssumptionsPanel } from "./assumptions-panel";
import { ConfidenceBadge } from "./confidence-badge";
import { DeploymentSchematic } from "./deployment-schematic";
import { ExportButtons } from "./export-button";
import { SummaryPanel } from "./summary-panel";
import { WarningBanner } from "./warning-banner";

/**
 * The sticky right column on the Sizer page.
 *
 * Shows the header, warnings, plain-English summary, deployment schematic,
 * and assumptions. The three Baseline / Burst / Resilient scenario cards
 * live in <ScenarioGrid /> below the main 3-column grid so they get full
 * page width and stay readable.
 *
 * Caller passes both `input` and `output` so the calculation can be lifted
 * to wizard.tsx and shared with <ScenarioGrid /> without re-running.
 */
export function LiveResults({
  input,
  output,
}: {
  input: SizerInput;
  output: SizerOutput | { error: string };
}) {
  if ("error" in output) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-4 text-small text-red-800">
        <p className="font-medium">Could not size this workload.</p>
        <p className="mt-1">{output.error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-h3 text-slate-900">Live result</h2>
          <ConfidenceBadge confidence={output.confidence} />
        </div>
        <ExportButtons input={input} output={output} />
      </header>

      <WarningBanner warnings={output.guardrails_triggered} />

      <SummaryPanel input={input} output={output} />

      <DeploymentSchematic output={output} />

      <AssumptionsPanel assumptions={output.assumptions} />
    </div>
  );
}
