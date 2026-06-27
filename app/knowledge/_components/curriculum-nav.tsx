"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { MODULES, PART_NAMES, partLabel } from "@/content/knowledge/modules";

/**
 * Sidebar nav listing every module in order, grouped by Part. Highlights
 * whichever module the reader is currently on. Lives as a client component
 * because it needs `usePathname` to detect the active route; the surrounding
 * layout stays server-rendered.
 *
 * Mobile renders a uniform 2-column chip grid (no Part headers, just every
 * module side by side). Desktop (md+) shows the Part group headers stacked
 * vertically so the reader can see the curriculum's shape at a glance.
 */
/** Strip a single trailing slash so a path matches whether or not the
 *  framework appended one (Next.js static export does, dev server does not). */
const normalize = (p: string) => (p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p);

/** Bucket modules by their Part number, preserving in-Part ordering. */
function groupByPart() {
  const groups = new Map<number, typeof MODULES[number][]>();
  for (const m of MODULES) {
    if (!groups.has(m.part)) groups.set(m.part, []);
    groups.get(m.part)!.push(m);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a - b)
    .map(([part, modules]) => ({ part, modules }));
}

export function CurriculumNav() {
  const pathname = normalize(usePathname() ?? "");
  const grouped = groupByPart();

  return (
    <nav aria-label="Knowledge modules" className="md:sticky md:top-24">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Curriculum
      </p>

      {/* Mobile: uniform 2-col chip grid, no Part headers. */}
      <ol className="grid grid-cols-2 gap-2 md:hidden">
        {MODULES.map((m) => (
          <ModuleLink key={m.slug} module={m} pathname={pathname} mobile />
        ))}
      </ol>

      {/* md+: vertical sidebar grouped by Part with section headers. */}
      <div className="hidden md:flex md:flex-col md:gap-4">
        {grouped.map(({ part, modules }) => (
          <section key={part}>
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              <span className="text-brand-700">{partLabel(part)}</span>
              <span aria-hidden="true" className="mx-1.5 text-slate-300">
                ·
              </span>
              <span>{PART_NAMES[part]}</span>
            </p>
            <ol className="flex flex-col">
              {modules.map((m) => (
                <li key={m.slug}>
                  <ModuleLink module={m} pathname={pathname} />
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </nav>
  );
}

function ModuleLink({
  module: m,
  pathname,
  mobile,
}: {
  module: (typeof MODULES)[number];
  pathname: string;
  mobile?: boolean;
}) {
  const href = `/knowledge/${m.slug}`;
  const isActive = pathname === href;

  if (mobile) {
    return (
      <li>
        <Link
          href={href}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "group flex h-full flex-col gap-0.5 rounded-md border border-slate-200 px-3 py-2 no-underline transition-colors",
            !isActive && "hover:border-brand-700 hover:bg-brand-50/40",
            isActive && "border-brand-700 bg-brand-50",
          )}
        >
          <span className="flex items-baseline gap-2">
            <span
              className={cn(
                "font-mono text-[11px] font-semibold",
                isActive ? "text-brand-800" : "text-brand-700",
              )}
            >
              M{m.index}
            </span>
            <span
              className={cn(
                "text-sm leading-snug",
                isActive
                  ? "font-semibold text-brand-900"
                  : "font-medium text-slate-900 group-hover:text-brand-800",
              )}
            >
              {m.title}
            </span>
          </span>
        </Link>
      </li>
    );
  }

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group flex h-full flex-col gap-0.5 rounded-none border-l-2 border-transparent px-3 py-1.5 no-underline transition-colors",
        !isActive && "hover:border-brand-700 hover:bg-brand-50/40",
        isActive && "border-brand-700 bg-brand-50/70",
      )}
    >
      <span className="flex items-baseline gap-2">
        <span
          className={cn(
            "font-mono text-[11px] font-semibold",
            isActive ? "text-brand-800" : "text-brand-700",
          )}
        >
          M{m.index}
        </span>
        <span
          className={cn(
            "text-sm leading-snug",
            isActive
              ? "font-semibold text-brand-900"
              : "font-medium text-slate-900 group-hover:text-brand-800",
          )}
        >
          {m.title}
        </span>
      </span>
    </Link>
  );
}
