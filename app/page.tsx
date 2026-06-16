import Link from "next/link";
import { BookOpen, Layers, Calculator, Network } from "lucide-react";

const sections = [
  {
    href: "/knowledge",
    title: "Knowledge",
    description:
      "Learn why AI workloads break traditional planning and the mental model for inference at scale.",
    icon: BookOpen,
  },
  {
    href: "/components",
    title: "Infrastructure Components",
    description:
      "See the full stack — accelerators, fabrics, storage, power — in concrete example workloads.",
    icon: Layers,
  },
  {
    href: "/sizer",
    title: "Sizer",
    description:
      "Quantify your workload and get a server-spec recommendation across baseline, burst, and resilient scenarios.",
    icon: Calculator,
  },
  {
    href: "/designer",
    title: "Architecture Designer",
    description:
      "Visualize the deployment topology you should build, with diagram and narrative export.",
    icon: Network,
  },
];

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-16 sm:py-24">
      <section className="mx-auto max-w-3xl text-center">
        <h1 className="text-h1">
          <span className="font-bold">ai</span>
          <span className="font-medium">sle</span>
        </h1>
        <p className="mt-4 text-balance text-lg text-slate-600">
          Plan on-prem AI inference infrastructure with confidence.
        </p>
        <p className="mt-2 text-small text-slate-500">
          An educational and planning workbench for IT admins. Open source. No
          backend. No vendor lock-in.
        </p>
      </section>

      <section className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2">
        {sections.map(({ href, title, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group block rounded-lg border border-slate-200 bg-white p-6 transition hover:border-brand-700 hover:bg-brand-50"
          >
            <div className="flex items-start gap-4">
              <span className="rounded-md bg-brand-50 p-2 text-brand-700 group-hover:bg-brand-100">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-h3 text-slate-900">{title}</h2>
                <p className="mt-2 text-small text-slate-600">{description}</p>
              </div>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
