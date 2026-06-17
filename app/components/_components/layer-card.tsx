"use client";

import { ExternalLink } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Compact catalog-entry card used in the stack overview. Hovering the body
 * shows a tooltip with the entry's notes; an optional source link sits below
 * the card. Designed to tile 2-3 across at md+.
 *
 * Every value passed in must originate from `getCatalog()` / `get*ById()` —
 * no string literals should be hard-coded at the call site.
 */
export type LayerCardSpec = {
  /** Short label shown left of the value (e.g. "Memory"). */
  label: string;
  /** Value rendered in JetBrains Mono (e.g. "141 GB HBM3e"). */
  value: string;
};

export function LayerCard({
  name,
  vendor,
  specs,
  notes,
  source,
  roadmap,
}: {
  name: string;
  vendor?: string | null;
  specs: LayerCardSpec[];
  notes?: string | null;
  source?: string | null;
  roadmap?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "group flex h-full cursor-help flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 transition-colors",
                "hover:border-brand-700 hover:bg-brand-50/40",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {vendor && (
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      {vendor}
                    </p>
                  )}
                  <p className="text-sm font-semibold leading-snug text-slate-900 group-hover:text-brand-800">
                    {name}
                  </p>
                </div>
                {roadmap && (
                  <span className="shrink-0 rounded-sm bg-amber-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                    Roadmap
                  </span>
                )}
              </div>

              {specs.length > 0 && (
                <dl className="flex flex-col gap-1 border-t border-slate-100 pt-2">
                  {specs.map((s) => (
                    <div key={s.label} className="flex justify-between gap-2">
                      <dt className="text-xs text-slate-500">{s.label}</dt>
                      <dd className="text-right font-mono text-xs text-slate-800">
                        {s.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </TooltipTrigger>
          {notes && (
            <TooltipContent
              side="top"
              className="max-w-sm bg-slate-900 text-left text-slate-50"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                {name}
              </p>
              <p className="mt-1 text-sm leading-relaxed">{notes}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      {source && (
        <a
          href={source}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 inline-flex items-center gap-1 self-start text-[11px] font-medium text-slate-500 hover:text-brand-700"
        >
          source
          <ExternalLink aria-hidden="true" className="h-2.5 w-2.5" />
        </a>
      )}
    </div>
  );
}
