import Link from "next/link";
import { ArrowRight, BookOpen, Calculator, Layers, Network } from "lucide-react";

import { HeroIllustration } from "./_components/hero-illustration";

/**
 * Four primary entry points, each describing a *kind of visitor* rather than
 * a step. Visitors self-categorize and pick where to start; no forced
 * sequence. Designer is flagged as `comingSoon` until the rule engine ships.
 */
type EntryPoint = {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  icon: typeof BookOpen;
  comingSoon?: boolean;
};

const entryPoints: ReadonlyArray<EntryPoint> = [
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
  {
    href: "/designer",
    eyebrow: "Already have a sizing?",
    title: "Visualize the topology.",
    description:
      "Turn a sizing into a deployment archetype with a topology diagram. Picks between single-node, multi-GPU, and multi-node TP+PP patterns based on your inputs.",
    cta: "Open Designer",
    icon: Network,
    comingSoon: true,
  },
];

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-14 sm:py-20">
      {/* ─── Hero ──────────────────────────────────────────────────────── */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_minmax(0,520px)] lg:gap-14">
        <div className="text-center lg:text-left">
          <p className="inline-block rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-800">
            Learn. Plan. Design.
          </p>
          <h1 className="mt-5 text-balance text-h1 font-bold tracking-tight text-slate-900">
            Plan on-prem AI inference infrastructure with confidence.
          </h1>
          <p className="mt-6 text-balance text-lg leading-relaxed text-slate-700">
            Aisle is the planning workbench for IT teams. Walk every layer of
            the inference stack, from GPU memory to facility power, and build a
            sizing you can defend.
          </p>
          <p className="mt-4 text-xs text-slate-500">
            Open source · Vendor neutral · Runs in your browser
          </p>
        </div>
        <div className="flex justify-center lg:justify-end">
          <HeroIllustration className="w-full max-w-[520px]" />
        </div>
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

        <ol className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {entryPoints.map(({ href, eyebrow, title, description, cta, icon: Icon, comingSoon }) => (
            <li key={href}>
              <Link
                href={href}
                className="group relative flex h-full flex-col rounded-lg border border-slate-200 bg-white p-5 transition-colors hover:border-brand-700 hover:bg-brand-50/40"
              >
                {comingSoon && (
                  <span className="absolute right-4 top-4 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                    Coming soon
                  </span>
                )}
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

    </div>
  );
}
