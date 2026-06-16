import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScenarioOutput } from "@/lib/sizer/types";

const SCENARIO_META: Record<
  ScenarioOutput["name"],
  { title: string; subtitle: string; accent: string }
> = {
  baseline: {
    title: "Baseline",
    subtitle: "Steady-state load · 20% headroom",
    accent: "border-brand-700",
  },
  burst: {
    title: "Burst",
    subtitle: "Spike absorption · N+1 minimum",
    accent: "border-amber-500",
  },
  resilient: {
    title: "Resilient",
    subtitle: "N+2 redundancy · paired failure domains",
    accent: "border-slate-900",
  },
};

function fmt(n: number, digits = 0): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function Spec({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-slate-100 py-1.5 last:border-b-0">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd
        className={cn(
          "text-right text-small text-slate-900",
          mono && "font-mono",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function ScenarioCard({ scenario }: { scenario: ScenarioOutput }) {
  const meta = SCENARIO_META[scenario.name];
  const { server_spec: s, fabric, power, cooling } = scenario;

  return (
    <article
      className={cn(
        "scenario-card flex flex-col rounded-lg border-l-4 border-y border-r border-slate-200 bg-white",
        meta.accent,
      )}
      aria-labelledby={`scenario-${scenario.name}`}
    >
      <header className="px-4 py-3">
        <h3
          id={`scenario-${scenario.name}`}
          className="text-h3 leading-tight text-slate-900"
        >
          {meta.title}
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">{meta.subtitle}</p>
      </header>

      <div className="grid grid-cols-2 gap-2 px-4 pb-3">
        <div className="rounded-md bg-brand-50 px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-brand-800">
            Servers
          </p>
          <p className="font-mono text-2xl font-semibold leading-tight text-brand-800">
            {scenario.servers_required}
          </p>
        </div>
        <div className="rounded-md bg-slate-50 px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-slate-700">
            Replicas
          </p>
          <p className="font-mono text-2xl font-semibold leading-tight text-slate-900">
            {scenario.replica_count}
          </p>
          {scenario.replicas_per_server > 1 && (
            <p className="mt-0.5 text-xs text-slate-500">
              {scenario.replicas_per_server} per server
            </p>
          )}
        </div>
      </div>

      <section className="px-4 pb-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          Server hardware
        </h4>
        <dl className="mt-1">
          <Spec label="CPU" value={s.cpu_class} />
          <Spec label="RAM" value={`${fmt(s.ram_gb)} GB`} mono />
          <Spec
            label="GPU"
            value={
              <span>
                {s.gpu_count} × <code className="font-mono">{s.gpu_id}</code>
              </span>
            }
          />
          <Spec label="NIC" value={s.nic} />
          <Spec label="NVMe" value={`${fmt(s.local_nvme_tb)} TB`} mono />
        </dl>
      </section>

      <section className="px-4 py-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          Fabric
        </h4>
        <p className="mt-1 text-small text-slate-900">
          {fabric.type}{" "}
          <span className="font-mono text-slate-500">
            ({fmt(fabric.bandwidth_gbps)} Gb)
          </span>
        </p>
        <p className="mt-0.5 text-xs text-slate-500">{fabric.rationale}</p>
      </section>

      <section className="px-4 py-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          Power
        </h4>
        <dl className="mt-1">
          <Spec
            label="Sustained"
            value={`${fmt(power.sustained_kw_total, 1)} kW`}
            mono
          />
          <Spec
            label="Per rack"
            value={`${fmt(power.kw_per_rack, 1)} kW`}
            mono
          />
          <Spec label="PUE" value={power.pue.toFixed(2)} mono />
          <Spec
            label="Facility"
            value={`${fmt(power.facility_kw_total, 1)} kW`}
            mono
          />
        </dl>
      </section>

      <section className="px-4 py-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          Cooling
        </h4>
        <p className="mt-1 text-small text-slate-900">{cooling.tier}</p>
        <p className="mt-0.5 text-xs text-slate-500">{cooling.rationale}</p>
      </section>

      {scenario.warnings.length > 0 && (
        <section className="border-t border-slate-100 px-4 py-2">
          <h4 className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            Warnings
          </h4>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-amber-900">
            {scenario.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
