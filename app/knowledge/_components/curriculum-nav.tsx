"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { MODULES } from "@/content/knowledge/modules";

/**
 * Sidebar nav listing every module in order. Highlights whichever module
 * the reader is currently on (and dims completed-position modules slightly
 * so the active one pops). Lives as a client component because it needs
 * `usePathname` to detect the active route; the surrounding layout stays
 * server-rendered.
 */
/** Strip a single trailing slash so a path matches whether or not the
 *  framework appended one (Next.js static export does, dev server does not). */
const normalize = (p: string) => (p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p);

export function CurriculumNav() {
  const pathname = normalize(usePathname() ?? "");

  return (
    <nav aria-label="Knowledge modules" className="md:sticky md:top-24">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Curriculum
      </p>
      {/* Mobile: uniform 2-col grid of chips. md+: vertical sidebar. */}
      <ol className="grid grid-cols-2 gap-2 md:flex md:flex-col md:gap-0">
        {MODULES.map((m) => {
          const href = `/knowledge/${m.slug}`;
          const isActive = pathname === href;
          return (
            <li key={m.slug}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  // Base (mobile chip + desktop row, shared)
                  "group flex h-full flex-col gap-0.5 rounded-md border border-slate-200 px-3 py-2 no-underline transition-colors",
                  "md:rounded-none md:border-0 md:border-l-2 md:border-transparent md:px-3 md:py-1.5",
                  // Inactive state hovers
                  !isActive &&
                    "hover:border-brand-700 hover:bg-brand-50/40 md:hover:border-brand-700 md:hover:bg-brand-50/40",
                  // Active state: brand bar + tinted background + bolder text
                  isActive &&
                    "border-brand-700 bg-brand-50 md:border-brand-700 md:bg-brand-50/70",
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
        })}
      </ol>
    </nav>
  );
}
