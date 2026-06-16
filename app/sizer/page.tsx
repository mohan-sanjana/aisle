import { Suspense } from "react";

import { SizerWizard } from "./_components/wizard";

export const metadata = {
  title: "Sizer — Aisle",
  description:
    "Quantify your AI inference workload and get a server-spec recommendation across baseline, burst, and resilient scenarios.",
};

export default function SizerPage() {
  return (
    <div>
      <header className="no-print mb-6">
        <h1 className="text-h1 text-slate-900">Sizer</h1>
        <p className="mt-2 max-w-2xl text-small text-slate-600">
          Walk through the wizard on the left; the live result on the right
          re-runs the calc engine on every change. Three scenarios — Baseline,
          Burst, Resilient — show what to provision for steady-state, peak, and
          fault-tolerant operation.
        </p>
      </header>

      {/* SizerWizard reads URL search params; wrap in Suspense per Next.js 15. */}
      <Suspense fallback={<div className="text-slate-500">Loading…</div>}>
        <SizerWizard />
      </Suspense>
    </div>
  );
}
