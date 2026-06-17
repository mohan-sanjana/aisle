import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * "Size this exact workload in the Sizer" call-to-action card. Takes a
 * pre-built href (the Sizer's URL-encoded search params are constructed by
 * the call site, since the keys live in app/sizer/_lib/url-state.ts) and a
 * short paragraph explaining what the user will see when they land.
 */
export function SizerCta({
  href,
  description,
  buttonLabel = "Size this workload in the Sizer",
}: {
  href: string;
  description: string;
  buttonLabel?: string;
}) {
  return (
    <section className="my-10 flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">
          Next step
        </p>
        <p className="mt-1 text-sm leading-relaxed text-slate-700">
          {description}
        </p>
      </div>
      <Link
        href={href}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
      >
        {buttonLabel}
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </section>
  );
}
