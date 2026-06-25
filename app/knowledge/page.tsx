import { readFile } from "node:fs/promises";
import path from "node:path";

import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";

import { MODULES, moduleFilename } from "@/content/knowledge/modules";
import { estimateReadingTime } from "@/content/knowledge/reading-time";

import { ReadingTime } from "./_components/reading-time";

export const metadata: Metadata = {
  title: "Knowledge — Aisle",
  description:
    "A progressive curriculum on planning on-prem AI inference infrastructure, for IT admins and data center planners.",
};

export default async function KnowledgeIndexPage() {
  // Read every module's MDX in parallel at build time and compute reading
  // time from word count. Static export bakes the result into the HTML.
  const modulesWithTime = await Promise.all(
    MODULES.map(async (m) => {
      const source = await readFile(
        path.join(process.cwd(), moduleFilename(m)),
        "utf-8",
      );
      return { ...m, reading_time_minutes: estimateReadingTime(source) };
    }),
  );

  const totalMinutes = modulesWithTime.reduce(
    (sum, m) => sum + m.reading_time_minutes,
    0,
  );

  return (
    <article className="max-w-3xl">
      <header className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
          Curriculum · {modulesWithTime.length} modules · ~{totalMinutes} min
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-tight tracking-tight text-slate-900">
          A working knowledge of on-prem AI inference
        </h1>
        <p className="mt-4 max-w-prose text-base leading-relaxed text-slate-700">
          Learn about AI inference and what makes it a truly unique workload. The modules below build on each other. You can start at
          the top if you&rsquo;re new to AI, or jump to a specific module if
          you know what you&rsquo;re looking for. By the end you&rsquo;ll be
          ready to use the Sizer with confidence and have a productive planning
          conversation with your AI team.
        </p>
      </header>

      <ol className="flex flex-col gap-2">
        {modulesWithTime.map((m) => (
          <li key={m.slug}>
            <Link
              href={`/knowledge/${m.slug}`}
              className="
                group grid grid-cols-[auto_1fr] items-start gap-x-5 gap-y-1
                rounded-lg border border-slate-200 px-4 py-4 no-underline
                transition-colors
                hover:border-brand-700 hover:bg-brand-50/40
              "
            >
              {/* Big module-number badge (the visual anchor of the card) */}
              <div
                aria-hidden="true"
                className="
                  flex h-14 w-14 shrink-0 items-center justify-center
                  rounded-lg bg-brand-50 ring-1 ring-inset ring-brand-100
                  font-mono text-base font-semibold text-brand-800
                  group-hover:bg-brand-100 group-hover:ring-brand-200
                "
              >
                M{m.index}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h2 className="text-lg font-semibold leading-snug text-slate-900 group-hover:text-brand-800">
                    {m.title}
                  </h2>
                  <ReadingTime minutes={m.reading_time_minutes} />
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {m.summary}
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                  Open module
                  <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ol>

      <footer className="mt-12 rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-700">
        <p>
          Each module ends with a &ldquo;Try this in the Sizer&rdquo; cross-link
          that opens the wizard pre-filled with a relevant workload. Glossary
          terms (
          <span className="border-b border-dotted border-slate-400">
            like this
          </span>
          ) show a definition on hover.
        </p>
      </footer>
    </article>
  );
}
