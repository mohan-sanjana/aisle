"use client";

import * as React from "react";

import { sizeWorkload } from "@/lib/sizer";
import type { SizerInput, SizerOutput } from "@/lib/sizer/types";

import { AssumptionsPanel } from "./assumptions-panel";
import { ConfidenceBadge } from "./confidence-badge";
import { DeploymentSchematic } from "./deployment-schematic";
import { ExportButtons } from "./export-button";
import { ScenarioCard } from "./scenario-card";
import { SummaryPanel } from "./summary-panel";
import { WarningBanner } from "./warning-banner";

export function LiveResults({ input }: { input: SizerInput }) {
  const output: SizerOutput | { error: string } = React.useMemo(() => {
    try {
      return sizeWorkload(input);
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : "Unable to size workload.",
      };
    }
  }, [input]);

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
          <h2 className="text-h2 text-slate-900">Live result</h2>
          <ConfidenceBadge confidence={output.confidence} />
        </div>
        <ExportButtons input={input} output={output} />
      </header>

      <WarningBanner warnings={output.guardrails_triggered} />

      <SummaryPanel input={input} output={output} />

      <DeploymentSchematic input={input} output={output} />

      <div className="scenario-grid grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ScenarioCard scenario={output.scenarios.baseline} />
        <ScenarioCard scenario={output.scenarios.burst} />
        <ScenarioCard scenario={output.scenarios.resilient} />
      </div>

      <AssumptionsPanel assumptions={output.assumptions} />
    </div>
  );
}
