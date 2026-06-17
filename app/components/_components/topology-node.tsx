"use client";

import { useMemo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Info } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getAcceleratorById,
  getNetworkingById,
  getStorageById,
  getPowerCoolingById,
  getServingEngineById,
} from "@/lib/catalog";
import { cn } from "@/lib/utils";

import type { TopologyNodeData, TopologyNodeRole } from "./topology-types";

/**
 * Custom React Flow node. Renders a small card with a role badge, title,
 * subtitle, and (when a catalog ref is present) a hover popover with the
 * catalog entry's specs, plus a "View details" click that bubbles up to
 * the parent topology-diagram via the onNodeClick handler.
 */

const ROLE_STYLES: Record<TopologyNodeRole, { badge: string; ring: string; label: string }> = {
  accelerator: {
    badge: "bg-brand-50 text-brand-800 ring-brand-100",
    ring: "ring-brand-100",
    label: "Accelerator",
  },
  networking: {
    badge: "bg-sky-50 text-sky-800 ring-sky-100",
    ring: "ring-sky-100",
    label: "Network",
  },
  storage: {
    badge: "bg-violet-50 text-violet-800 ring-violet-100",
    ring: "ring-violet-100",
    label: "Storage",
  },
  power_cooling: {
    badge: "bg-amber-50 text-amber-800 ring-amber-100",
    ring: "ring-amber-100",
    label: "Power/cooling",
  },
  serving_engine: {
    badge: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    ring: "ring-emerald-100",
    label: "Serving",
  },
  client: {
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
    ring: "ring-slate-200",
    label: "Client",
  },
  router: {
    badge: "bg-indigo-50 text-indigo-800 ring-indigo-100",
    ring: "ring-indigo-100",
    label: "Router",
  },
  gateway: {
    badge: "bg-rose-50 text-rose-800 ring-rose-100",
    ring: "ring-rose-100",
    label: "Gateway",
  },
  monitoring: {
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
    ring: "ring-slate-200",
    label: "Monitoring",
  },
};

type ResolvedSpec = { label: string; value: string };

function resolveCatalogSpecs(
  ref: TopologyNodeData["catalogRef"],
): { name: string; notes: string; specs: ResolvedSpec[] } | null {
  if (!ref) return null;

  switch (ref.category) {
    case "accelerators": {
      const a = getAcceleratorById(ref.id);
      if (!a) return null;
      const specs: ResolvedSpec[] = [];
      if (a.memory_gb !== null && a.memory_type)
        specs.push({ label: "Memory", value: `${a.memory_gb} GB ${a.memory_type}` });
      if (a.memory_bandwidth_tbps !== null)
        specs.push({ label: "Bandwidth", value: `${a.memory_bandwidth_tbps} TB/s` });
      if (a.fp8_tflops_dense !== null)
        specs.push({ label: "FP8", value: `${a.fp8_tflops_dense} TFLOPS` });
      if (a.tdp_w !== null) specs.push({ label: "TDP", value: `${a.tdp_w} W` });
      return { name: `${a.vendor} ${a.model}`, notes: a.notes, specs };
    }
    case "networking": {
      const n = getNetworkingById(ref.id);
      if (!n) return null;
      return {
        name: n.type,
        notes: n.notes,
        specs: [
          { label: "Bandwidth", value: `${n.bandwidth_gbps} Gb/s` },
          { label: "RDMA", value: n.supports_rdma ? "yes" : "no" },
        ],
      };
    }
    case "storage": {
      const s = getStorageById(ref.id);
      if (!s) return null;
      return {
        name: s.tier,
        notes: s.notes,
        specs: [
          { label: "Throughput", value: s.throughput_tier },
          { label: "Latency", value: s.latency },
        ],
      };
    }
    case "power_cooling": {
      const p = getPowerCoolingById(ref.id);
      if (!p) return null;
      return {
        name: p.tier,
        notes: p.notes,
        specs: [
          { label: "Rack power", value: `${p.rack_power_kw} kW` },
          { label: "Cooling", value: p.cooling },
        ],
      };
    }
    case "serving_engines": {
      const e = getServingEngineById(ref.id);
      if (!e) return null;
      return {
        name: e.name,
        notes: e.notes,
        specs: [
          { label: "License", value: e.license.split(" ")[0] },
          { label: "Primary use", value: e.primary_use },
        ],
      };
    }
    default:
      return null;
  }
}

export function TopologyNode({ data, selected }: NodeProps<TopologyNodeData>) {
  const role = ROLE_STYLES[data.role];
  const resolved = useMemo(() => resolveCatalogSpecs(data.catalogRef), [data.catalogRef]);

  const card = (
    <div
      className={cn(
        "w-44 rounded-md border border-slate-200 bg-white p-3 ring-1 ring-inset shadow-sm transition-colors",
        role.ring,
        selected && "border-brand-700 ring-brand-200",
        resolved && "cursor-pointer hover:border-brand-700",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider ring-1 ring-inset",
            role.badge,
          )}
        >
          {role.label}
        </span>
        {resolved && (
          <Info aria-hidden="true" className="h-3 w-3 text-slate-400" />
        )}
      </div>
      <p className="mt-1.5 text-sm font-semibold leading-snug text-slate-900">
        {data.title}
      </p>
      {data.subtitle && (
        <p className="mt-0.5 font-mono text-[11px] leading-snug text-slate-600">
          {data.subtitle}
        </p>
      )}
      {data.explainNote && (
        <p
          className="topology-explain-note mt-2 hidden rounded-sm bg-amber-50 px-1.5 py-1 text-[10px] leading-snug text-amber-900"
          aria-hidden="true"
        >
          {data.explainNote}
        </p>
      )}
    </div>
  );

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="!h-1.5 !w-1.5 !border-slate-300 !bg-white"
      />
      {resolved ? (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>{card}</TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-xs bg-slate-900 text-left text-slate-50"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                {role.label}
              </p>
              <p className="text-sm font-semibold leading-snug">{resolved.name}</p>
              <dl className="mt-2 flex flex-col gap-1">
                {resolved.specs.map((s) => (
                  <div key={s.label} className="flex justify-between gap-3">
                    <dt className="text-[11px] text-slate-400">{s.label}</dt>
                    <dd className="text-right font-mono text-[11px] text-slate-100">
                      {s.value}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 border-t border-slate-700 pt-2 text-[11px] leading-relaxed text-slate-300">
                {resolved.notes}
              </p>
              <p className="mt-1 text-[10px] italic text-slate-400">
                Click for full details
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        card
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-1.5 !w-1.5 !border-slate-300 !bg-white"
      />
    </>
  );
}

export const nodeTypes = {
  topologyNode: TopologyNode,
} as const;
