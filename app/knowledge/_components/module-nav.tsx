import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { MODULES, type ModuleMeta } from "@/content/knowledge/modules";

export function ModuleNav({ currentSlug }: { currentSlug: string }) {
  const idx = MODULES.findIndex((m) => m.slug === currentSlug);
  const prev: ModuleMeta | undefined = idx > 0 ? MODULES[idx - 1] : undefined;
  const next: ModuleMeta | undefined =
    idx >= 0 && idx < MODULES.length - 1 ? MODULES[idx + 1] : undefined;

  return (
    <nav
      aria-label="Module navigation"
      className="mt-16 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-stretch sm:justify-between"
    >
      {prev ? (
        <Link
          href={`/knowledge/${prev.slug}`}
          className="group flex flex-1 flex-col gap-1 rounded-lg border border-slate-200 px-4 py-3 no-underline hover:border-brand-700 hover:bg-brand-50/40"
        >
          <span className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            <ArrowLeft aria-hidden="true" className="h-3 w-3" /> Previous
          </span>
          <span className="text-sm font-semibold text-slate-900 group-hover:text-brand-800">
            {prev.title}
          </span>
        </Link>
      ) : (
        <span className="flex-1" aria-hidden="true" />
      )}

      {next ? (
        <Link
          href={`/knowledge/${next.slug}`}
          className="group flex flex-1 flex-col gap-1 rounded-lg border border-slate-200 px-4 py-3 text-right no-underline hover:border-brand-700 hover:bg-brand-50/40"
        >
          <span className="inline-flex items-center justify-end gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            Next <ArrowRight aria-hidden="true" className="h-3 w-3" />
          </span>
          <span className="text-sm font-semibold text-slate-900 group-hover:text-brand-800">
            {next.title}
          </span>
        </Link>
      ) : (
        <Link
          href="/sizer"
          className="group flex flex-1 flex-col gap-1 rounded-lg border border-brand-700 bg-brand-50/60 px-4 py-3 text-right no-underline hover:bg-brand-50"
        >
          <span className="inline-flex items-center justify-end gap-1 text-xs font-medium uppercase tracking-wide text-brand-800">
            Next <ArrowRight aria-hidden="true" className="h-3 w-3" />
          </span>
          <span className="text-sm font-semibold text-brand-900 group-hover:text-brand-800">
            Open the Sizer with your workload
          </span>
        </Link>
      )}
    </nav>
  );
}
