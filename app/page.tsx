import Link from "next/link";
import { ArrowRight, BookOpen, Calculator, Layers, Network } from "lucide-react";

/**
 * Three primary entry points, each describing a *kind of visitor* rather than
 * a step. Visitors self-categorize and pick where to start; no forced
 * sequence. Designer is intentionally not an entry point — it's used after a
 * sizing exists, so it appears in the "what's inside" section below.
 */
const entryPoints = [
  {
    href: "/knowledge",
    eyebrow: "New to AI infrastructure?",
    title: "Start with the fundamentals.",
    description:
      "Eight short modules walk you from what inference actually is to how to size and plan an on-prem deployment. About 40 minutes end to end.",
    cta: "Start learning",
    icon: BookOpen,
  },
  {
    href: "/sizer",
    eyebrow: "Have a workload to size?",
    title: "Open the Sizer.",
    description:
      "Tell us your model, traffic, and latency SLOs. Get a server-spec recommendation across baseline, burst, and resilient scenarios. Shareable URL, exportable summary.",
    cta: "Plan a deployment",
    icon: Calculator,
  },
  {
    href: "/components",
    eyebrow: "Exploring the inference stack?",
    title: "Browse the layers.",
    description:
      "Six layers of an on-prem inference deployment, from the GPU to the rack. Two worked examples (enterprise scale and departmental scale) show how the pieces fit together.",
    cta: "Explore components",
    icon: Layers,
  },
];

const allSections = [
  { href: "/knowledge", label: "Learn", purpose: "Eight-module curriculum on AI inference and infrastructure planning.", icon: BookOpen },
  { href: "/components", label: "Explore", purpose: "Six-layer infrastructure stack and worked example deployments.", icon: Layers },
  { href: "/sizer", label: "Plan", purpose: "Guided workload sizing across three scenarios.", icon: Calculator },
  { href: "/designer", label: "Design", purpose: "Deployment topology and architecture archetypes.", icon: Network },
];

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-16 sm:py-20">
      {/* ─── Hero ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl text-center">
        <p className="inline-block rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-800">
          Learn. Plan. Design.
        </p>
        <h1 className="mt-5 text-balance text-h1 font-bold tracking-tight text-slate-900">
          Plan on-prem AI inference infrastructure with confidence.
        </h1>
        <p className="mt-6 text-balance text-lg leading-relaxed text-slate-700">
          Aisle is the planning workbench for IT teams. Walk every layer of the
          inference stack, from GPU memory to facility power, and build a
          sizing you can defend.
        </p>
        <p className="mt-4 text-xs text-slate-500">
          Open source · Vendor neutral · Runs in your browser
        </p>
      </section>

      {/* ─── Three entry points ────────────────────────────────────────── */}
      <section
        aria-labelledby="entry-heading"
        className="mx-auto mt-20 max-w-5xl"
      >
        <header className="mb-6 text-center">
          <h2
            id="entry-heading"
            className="text-2xl font-semibold tracking-tight text-slate-900"
          >
            Pick where you want to start.
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
            Three ways into the aisle. Choose the one that matches where you
            are today; the others stay one click away.
          </p>
        </header>

        <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {entryPoints.map(({ href, eyebrow, title, description, cta, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex h-full flex-col rounded-lg border border-slate-200 bg-white p-5 transition-colors hover:border-brand-700 hover:bg-brand-50/40"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-brand-50 text-brand-700 group-hover:bg-brand-100">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
                  {eyebrow}
                </p>
                <h3 className="mt-1 text-lg font-semibold leading-snug text-slate-900 group-hover:text-brand-800">
                  {title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                  {description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                  {cta}
                  <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* ─── What's inside (reference index of all four sections) ──────── */}
      <section
        aria-labelledby="inside-heading"
        className="mx-auto mt-20 max-w-5xl"
      >
        <header className="mb-5">
          <h2
            id="inside-heading"
            className="text-base font-semibold uppercase tracking-wider text-slate-500"
          >
            What&rsquo;s inside
          </h2>
        </header>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          {allSections.map(({ href, label, purpose, icon: Icon }) => (
            <div
              key={href}
              className="flex items-start gap-3 border-l-2 border-slate-200 pl-4"
            >
              <Icon
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-brand-700"
              />
              <div>
                <dt>
                  <Link
                    href={href}
                    className="text-sm font-semibold text-slate-900 hover:text-brand-800"
                  >
                    {label}
                  </Link>
                </dt>
                <dd className="mt-0.5 text-sm leading-relaxed text-slate-600">
                  {purpose}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
