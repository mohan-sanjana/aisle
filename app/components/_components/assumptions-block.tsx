/**
 * A two-column bordered block of workload assumptions, sized to land at the
 * top of an example-workload page. Each row is rendered with monospace
 * values to read like a spec sheet.
 */
export type Assumption = { label: string; value: string };

export function AssumptionsBlock({
  title = "Workload assumptions",
  scenario,
  assumptions,
}: {
  title?: string;
  scenario: string;
  assumptions: Assumption[];
}) {
  return (
    <section
      aria-labelledby="assumptions-heading"
      className="my-8 rounded-lg border border-brand-200 bg-brand-50/60 p-5"
    >
      <header className="mb-4 border-b border-brand-200/70 pb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">
          {title}
        </p>
        <h2
          id="assumptions-heading"
          className="mt-1 text-lg font-semibold leading-snug text-slate-900"
        >
          {scenario}
        </h2>
      </header>
      <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
        {assumptions.map((a) => (
          <div
            key={a.label}
            className="flex flex-col gap-0.5 border-b border-brand-100/80 pb-2 last:border-0 sm:border-0 sm:pb-0"
          >
            <dt className="text-[11px] uppercase tracking-wide text-slate-500">
              {a.label}
            </dt>
            <dd className="font-mono text-sm text-slate-900">{a.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
