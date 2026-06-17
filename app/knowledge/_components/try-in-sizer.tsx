import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * "Try this in the Sizer" cross-link. Params is a small object whose keys map
 * to the URL-state codec keys in `app/sizer/_lib/url-state.ts`. Renders as a
 * forest-green CTA box at the bottom of a section.
 *
 * Keep params minimal — only what the reader needs to see the concept land.
 */
export function TryInSizer({
  title = "Try this in the Sizer",
  prompt,
  params,
}: {
  title?: string;
  prompt: string;
  /** URL-state codec keys; see app/sizer/_lib/url-state.ts. */
  params: Partial<Record<SizerUrlKey, string | number>>;
}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    qs.set(k, String(v));
  }
  const href = `/sizer${qs.size ? `?${qs.toString()}` : ""}`;

  return (
    <Link
      href={href}
      className="my-6 flex items-start gap-3 rounded-lg border border-brand-700 bg-brand-50/60 px-5 py-4 no-underline transition-colors hover:bg-brand-50"
    >
      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white">
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-brand-900">{title}</span>
        <span className="text-sm text-slate-700">{prompt}</span>
      </span>
    </Link>
  );
}

/**
 * Subset of URL-state keys exposed to authors. Matches keys in
 * app/sizer/_lib/url-state.ts.
 */
export type SizerUrlKey =
  | "w"
  | "p"
  | "mf"
  | "a"
  | "ap"
  | "pr"
  | "ctx"
  | "pt"
  | "ot"
  | "u"
  | "rpm"
  | "ttft"
  | "tpot"
  | "bf"
  | "r"
  | "eng"
  | "tov"
  | "ko"
  | "sd"
  | "pc"
  | "kvd";
