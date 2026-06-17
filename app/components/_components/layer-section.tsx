/**
 * Wraps one layer of the inference stack in the overview page. Renders a
 * numbered heading, a one-sentence purpose, the card row (children), and a
 * "what changes if you swap this" note below.
 */
export function LayerSection({
  index,
  title,
  purpose,
  swapNote,
  children,
}: {
  index: number;
  title: string;
  purpose: string;
  swapNote: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-slate-200 py-10 first:border-t-0 first:pt-0">
      <header className="mb-5 flex flex-col gap-2">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-brand-700">
            Layer {index}
          </span>
        </div>
        <h2 className="text-2xl font-semibold leading-snug text-slate-900">
          {title}
        </h2>
        <p className="max-w-prose text-sm leading-relaxed text-slate-700">
          {purpose}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>

      <p className="mt-5 rounded-md border-l-2 border-slate-300 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700">
        <span className="font-semibold text-slate-900">
          What changes if you swap this:
        </span>{" "}
        {swapNote}
      </p>
    </section>
  );
}
