"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export type StepId =
  | "workload"
  | "model"
  | "traffic"
  | "slos"
  | "reliability"
  | "advanced"
  | "review";

export type StepDef = {
  id: StepId;
  index: number;
  label: string;
  description: string;
};

export const STEPS: ReadonlyArray<StepDef> = [
  { id: "workload", index: 1, label: "Workload", description: "What kind of traffic?" },
  { id: "model", index: 2, label: "Model", description: "Family, size, precision." },
  { id: "traffic", index: 3, label: "Traffic", description: "Users, context, tokens." },
  { id: "slos", index: 4, label: "SLOs", description: "TTFT and TPOT targets." },
  {
    id: "reliability",
    index: 5,
    label: "Reliability",
    description: "Burst factor + redundancy.",
  },
  {
    id: "advanced",
    index: 6,
    label: "Advanced",
    description: "Optimizations + overrides.",
  },
  { id: "review", index: 7, label: "Review", description: "Confirm and export." },
];

export function Stepper({
  current,
  onSelect,
  completed,
}: {
  current: StepId;
  onSelect: (id: StepId) => void;
  completed: ReadonlySet<StepId>;
}) {
  return (
    <nav aria-label="Sizer wizard steps" className="no-print">
      <ol className="space-y-1" role="list">
        {STEPS.map((step) => {
          const isCurrent = step.id === current;
          const isComplete = completed.has(step.id);
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => onSelect(step.id)}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "group flex w-full items-start gap-3 rounded-md border border-transparent px-3 py-2 text-left transition-colors",
                  isCurrent
                    ? "border-brand-100 bg-brand-50 text-brand-800"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-xs",
                    isCurrent
                      ? "border-brand-700 bg-white text-brand-700"
                      : isComplete
                      ? "border-brand-700 bg-brand-700 text-white"
                      : "border-slate-300 bg-white text-slate-500",
                  )}
                  aria-hidden="true"
                >
                  {isComplete && !isCurrent ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    step.index
                  )}
                </span>
                <span className="flex-1">
                  <span className="block text-small font-medium leading-tight">
                    {step.label}
                  </span>
                  <span className="block text-xs leading-snug text-slate-500 group-hover:text-slate-600">
                    {step.description}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
