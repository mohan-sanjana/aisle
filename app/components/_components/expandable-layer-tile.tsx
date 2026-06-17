"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Collapsible tile for one layer of the inference stack.
 *
 * Default state: shows the layer number, title, and a 1-2 sentence summary.
 * Click anywhere on the header to expand. Expanded body shows three prose
 * sections (What it is / Role in inference / What changes if you swap this)
 * followed by the catalog option cards passed as children.
 *
 * Tiles are independent (multiple can be open at once). Summary is hidden
 * when expanded so the same idea isn't shown twice.
 */
export function ExpandableLayerTile({
  index,
  title,
  summary,
  whatItIs,
  role,
  whatChanges,
  optionCount,
  children,
}: {
  index: number;
  title: string;
  summary: string;
  whatItIs: string;
  role: string;
  whatChanges: string;
  /** Shown as a small chip when collapsed: "12 options". */
  optionCount?: number;
  /** Catalog option cards rendered inside the expanded body. */
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const headerId = `tile-${index}-header`;
  const bodyId = `tile-${index}-body`;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border bg-white transition-colors",
        open ? "border-brand-700" : "border-slate-200 hover:border-brand-100",
      )}
    >
      <button
        id={headerId}
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-start justify-between gap-4 p-5 text-left transition-colors hover:bg-brand-50/30"
      >
        <div className="flex min-w-0 items-start gap-4">
          <div
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-50 font-mono text-sm font-semibold text-brand-800 ring-1 ring-inset ring-brand-100"
          >
            L{index}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className="text-xl font-semibold leading-snug text-slate-900">
                {title}
              </h2>
              {optionCount !== undefined && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  {optionCount} {optionCount === 1 ? "option" : "options"}
                </span>
              )}
            </div>
            {!open && (
              <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-slate-600">
                {summary}
              </p>
            )}
          </div>
        </div>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "mt-2 h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200",
            open && "rotate-180 text-brand-700",
          )}
        />
      </button>

      {open && (
        <div
          id={bodyId}
          role="region"
          aria-labelledby={headerId}
          className="border-t border-slate-200 px-5 pb-6 pt-5"
        >
          <div className="flex flex-col gap-5">
            <ProseBlock label="What it is">{whatItIs}</ProseBlock>
            <ProseBlock label="Role in inference">{role}</ProseBlock>
            <ProseBlock label="What changes if you swap this">
              {whatChanges}
            </ProseBlock>
          </div>

          {children && (
            <div className="mt-7 border-t border-slate-100 pt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Options in the catalog
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {children}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ProseBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-prose">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-700">
        {label}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
        {children}
      </p>
    </div>
  );
}
