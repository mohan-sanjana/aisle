import Link from "next/link";

import "./components.css";

/**
 * Infrastructure Components section layout. Mirrors the Knowledge layout
 * (persistent left sidebar at md+, two-column chip grid below that), but
 * uses a shorter nav with three items: stack overview and two worked
 * example workloads.
 */

type NavItem = {
  href: string;
  label: string;
  tag: string;
  description: string;
};

const NAV: ReadonlyArray<NavItem> = [
  {
    href: "/components",
    label: "Stack overview",
    tag: "Overview",
    description: "Every layer of the inference stack, layer by layer.",
  },
  {
    href: "/components/enterprise",
    label: "Enterprise example",
    tag: "Workload 1",
    description: "5,000+ users, 70B at FP8, multi-rack on-prem.",
  },
  {
    href: "/components/departmental",
    label: "Departmental example",
    tag: "Workload 2",
    description: "200 users, 13B model, single rack.",
  },
];

export default function ComponentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto flex flex-col gap-8 px-4 py-10 md:flex-row md:gap-10">
      <aside className="no-print shrink-0 md:w-60 lg:w-64">
        <nav
          aria-label="Infrastructure components"
          className="md:sticky md:top-24"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Reference
          </p>
          {/* Mobile: uniform 2-col grid of chips. md+: vertical sidebar. */}
          <ol className="grid grid-cols-2 gap-2 md:flex md:flex-col md:gap-0">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="
                    group flex h-full flex-col gap-0.5
                    rounded-md border border-slate-200 px-3 py-2 no-underline
                    transition-colors hover:border-brand-700 hover:bg-brand-50/40
                    md:rounded-none md:border-0 md:border-l-2 md:border-transparent md:px-3 md:py-1.5
                    md:hover:border-brand-700 md:hover:bg-brand-50/40
                  "
                >
                  <span className="flex items-baseline gap-2">
                    <span className="font-mono text-[11px] font-semibold text-brand-700">
                      {item.tag}
                    </span>
                    <span className="text-sm font-medium leading-snug text-slate-900 group-hover:text-brand-800">
                      {item.label}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
