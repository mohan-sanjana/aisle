"use client";

import type { SizerOutput } from "@/lib/sizer/types";

import { ScenarioCard } from "./scenario-card";

/**
 * Full-width 3-column row of Baseline / Burst / Resilient scenario cards.
 *
 * Rendered below the wizard + form + summary 3-column grid on the Sizer
 * page so each card gets roughly a third of the page width instead of
 * being squeezed into the right column. Stacks to one column on narrow
 * viewports.
 *
 * Returns null when the calc engine errored (the error message already
 * shows in <LiveResults /> above, no need to duplicate).
 */
export function ScenarioGrid({
  output,
}: {
  output: SizerOutput | { error: string };
}) {
  if ("error" in output) return null;

  return (
    <section
      aria-label="Scenario comparison"
      className="scenario-grid mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
    >
      <ScenarioCard scenario={output.scenarios.baseline} />
      <ScenarioCard scenario={output.scenarios.burst} />
      <ScenarioCard scenario={output.scenarios.resilient} />
    </section>
  );
}
