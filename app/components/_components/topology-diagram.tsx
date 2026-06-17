"use client";

import { useCallback, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "reactflow";
import "reactflow/dist/style.css";
import { ExternalLink, Eye, EyeOff, Info, Printer, X } from "lucide-react";

import {
  getAcceleratorById,
  getNetworkingById,
  getStorageById,
  getPowerCoolingById,
  getServingEngineById,
} from "@/lib/catalog";
import { cn } from "@/lib/utils";

import { nodeTypes } from "./topology-node";
import type {
  Topology,
  TopologyEdge,
  TopologyEdgeData,
  TopologyNodeData,
} from "./topology-types";

/**
 * Wraps a static React Flow topology. Adds:
 *   - Print button (window.print(); see components.css for the print rules).
 *     PNG/SVG export deferred — use Print for now. (TODO: phase 2 export)
 *   - "Explain this architecture" toggle that reveals one-sentence
 *     annotations attached to each node.
 *   - Side panel that opens when a node with a catalog ref is clicked, with
 *     the full catalog entry contents + sources.
 *
 * Diagrams are static (no editing); fitView + minZoom 0.5 / maxZoom 2.
 */

const DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: 1 };

type SidePanelEntry =
  | { kind: "accelerator"; data: ReturnType<typeof getAcceleratorById> }
  | { kind: "networking"; data: ReturnType<typeof getNetworkingById> }
  | { kind: "storage"; data: ReturnType<typeof getStorageById> }
  | { kind: "power_cooling"; data: ReturnType<typeof getPowerCoolingById> }
  | { kind: "serving_engine"; data: ReturnType<typeof getServingEngineById> };

function resolvePanelEntry(
  ref: TopologyNodeData["catalogRef"],
): SidePanelEntry | null {
  if (!ref) return null;
  switch (ref.category) {
    case "accelerators":
      return { kind: "accelerator", data: getAcceleratorById(ref.id) };
    case "networking":
      return { kind: "networking", data: getNetworkingById(ref.id) };
    case "storage":
      return { kind: "storage", data: getStorageById(ref.id) };
    case "power_cooling":
      return { kind: "power_cooling", data: getPowerCoolingById(ref.id) };
    case "serving_engines":
      return { kind: "serving_engine", data: getServingEngineById(ref.id) };
    default:
      return null;
  }
}

function buildEdgeLabel(data: TopologyEdgeData | undefined): string | undefined {
  if (!data) return undefined;
  if (data.label) return data.label;
  if (data.networkingId) {
    const n = getNetworkingById(data.networkingId);
    if (n) return n.type;
  }
  return undefined;
}

export function TopologyDiagram({
  topology,
  height = 540,
  caption,
}: {
  topology: Topology;
  height?: number;
  caption?: string;
}) {
  const [explain, setExplain] = useState(false);
  const [panelRef, setPanelRef] = useState<TopologyNodeData["catalogRef"] | null>(
    null,
  );

  // Resolve edge labels from the catalog. Done in a memo so we don't pay
  // the cost on every render and so React Flow sees stable references.
  const edges = useMemo<Edge[]>(() => {
    return topology.edges.map((e: TopologyEdge) => ({
      ...e,
      type: e.type ?? "smoothstep",
      label: buildEdgeLabel(e.data),
      labelStyle: {
        fill: "rgb(51 65 85)",
        fontSize: 11,
        fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
      },
      labelBgStyle: {
        fill: "white",
        opacity: 0.92,
      },
      labelBgPadding: [6, 3] as [number, number],
      labelBgBorderRadius: 4,
      style: {
        stroke: "rgb(148 163 184)",
        strokeWidth: 1.5,
        ...(e.style ?? {}),
      },
    }));
  }, [topology.edges]);

  // Pass the explain flag into each node so the custom node can choose
  // whether to render its annotation strip. React Flow re-renders on data
  // identity changes, so we build a fresh object per node when the flag flips.
  const nodes = useMemo<Node[]>(() => {
    return topology.nodes.map((n) => ({
      ...n,
      type: n.type ?? "topologyNode",
      data: {
        ...n.data,
        // Re-key explainNote so it only renders when toggle is on. The
        // node component renders it as `hidden` by default; we instead
        // re-assign via CSS class via the wrapper below.
      },
      className: cn(n.className, explain && "topology-explain-on"),
    }));
  }, [topology.nodes, explain]);

  const handleNodeClick = useCallback<NodeMouseHandler>((_evt, node) => {
    const data = node.data as TopologyNodeData;
    if (data?.catalogRef) setPanelRef(data.catalogRef);
  }, []);

  const handlePrint = useCallback(() => {
    if (typeof window !== "undefined") window.print();
  }, []);

  return (
    <section
      aria-label="Deployment topology"
      className="topology-print-frame relative my-8 overflow-hidden rounded-lg border border-slate-200 bg-white"
    >
      <div className="no-print flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Info aria-hidden="true" className="h-3.5 w-3.5" />
          <span>
            Hover any node for specs. Click for the full catalog entry.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExplain((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-brand-700 hover:bg-brand-50/40 hover:text-brand-800",
              explain && "border-brand-700 bg-brand-50 text-brand-800",
            )}
            aria-pressed={explain}
          >
            {explain ? (
              <EyeOff aria-hidden="true" className="h-3.5 w-3.5" />
            ) : (
              <Eye aria-hidden="true" className="h-3.5 w-3.5" />
            )}
            Explain this architecture
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-brand-700 hover:bg-brand-50/40 hover:text-brand-800"
          >
            <Printer aria-hidden="true" className="h-3.5 w-3.5" />
            Print
          </button>
        </div>
      </div>

      {/* Diagram + side panel layout. On mobile we stack; on lg+ the panel
          floats on the right inside the diagram chrome. */}
      <div className="flex flex-col lg:flex-row">
        <div
          style={{ height }}
          className={cn(
            "min-h-[360px] flex-1",
            // When the explain toggle is on we surface the per-node note via
            // a descendant selector (the node renders the note with the
            // `topology-explain-note` class set to `hidden` by default).
            "[&_.topology-explain-on_.topology-explain-note]:!block",
          )}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            defaultViewport={DEFAULT_VIEWPORT}
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1.2 }}
            minZoom={0.5}
            maxZoom={2}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            onNodeClick={handleNodeClick}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} size={1} color="rgb(226 232 240)" />
            <Controls
              showInteractive={false}
              className="!rounded-md !border !border-slate-200 !bg-white !shadow-sm"
            />
          </ReactFlow>
        </div>

        {panelRef && (
          <CatalogSidePanel
            entryRef={panelRef}
            onClose={() => setPanelRef(null)}
          />
        )}
      </div>

      {caption && (
        <p className="border-t border-slate-200 px-4 py-2 text-xs text-slate-500">
          {caption}
        </p>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Side panel
// ─────────────────────────────────────────────────────────────────────────────

function CatalogSidePanel({
  entryRef,
  onClose,
}: {
  entryRef: NonNullable<TopologyNodeData["catalogRef"]>;
  onClose: () => void;
}) {
  const entry = resolvePanelEntry(entryRef);

  return (
    <aside
      aria-label="Catalog entry details"
      className="no-print w-full shrink-0 border-t border-slate-200 bg-slate-50 lg:w-80 lg:border-l lg:border-t-0"
    >
      <header className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-700">
          Catalog entry
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-sm p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          aria-label="Close panel"
        >
          <X aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="max-h-[480px] overflow-y-auto px-4 py-4 text-sm text-slate-700">
        {entry === null || !entry.data ? (
          <p className="text-slate-500">
            Catalog entry not found for id <code>{entryRef.id}</code>.
          </p>
        ) : (
          <CatalogEntryBody entry={entry} />
        )}
      </div>
    </aside>
  );
}

function CatalogEntryBody({ entry }: { entry: SidePanelEntry }) {
  if (entry.kind === "accelerator" && entry.data) {
    const a = entry.data;
    return (
      <article className="flex flex-col gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {a.vendor} · {a.family}
          </p>
          <h3 className="mt-0.5 text-base font-semibold text-slate-900">
            {a.model}
          </h3>
        </div>
        <SpecGrid
          items={[
            ["Form factor", a.form_factor],
            ["Memory", a.memory_gb !== null ? `${a.memory_gb} GB ${a.memory_type ?? ""}` : "—"],
            ["Bandwidth", a.memory_bandwidth_tbps !== null ? `${a.memory_bandwidth_tbps} TB/s` : "—"],
            ["FP16/BF16", a.fp16_tflops_dense !== null ? `${a.fp16_tflops_dense} TFLOPS` : "—"],
            ["FP8", a.fp8_tflops_dense !== null ? `${a.fp8_tflops_dense} TFLOPS` : "—"],
            ["INT8", a.int8_tflops_dense !== null ? `${a.int8_tflops_dense} TFLOPS` : "—"],
            ["FP4", a.fp4_tflops_dense !== null ? `${a.fp4_tflops_dense} TFLOPS` : "—"],
            ["TDP", a.tdp_w !== null ? `${a.tdp_w} W` : "—"],
            ["Interconnect", a.interconnect],
            ["Released", a.released],
          ]}
        />
        <p className="text-xs leading-relaxed text-slate-600">{a.notes}</p>
        {a.fits_models_at_fp8 && (
          <p className="rounded-md border-l-2 border-brand-200 bg-brand-50/60 px-3 py-2 text-xs leading-relaxed text-slate-700">
            <span className="font-semibold text-brand-800">At FP8: </span>
            {a.fits_models_at_fp8}
          </p>
        )}
        <SourceList sources={a.sources} />
      </article>
    );
  }
  if (entry.kind === "networking" && entry.data) {
    const n = entry.data;
    return (
      <article className="flex flex-col gap-3">
        <h3 className="text-base font-semibold text-slate-900">{n.type}</h3>
        <SpecGrid
          items={[
            ["Bandwidth", `${n.bandwidth_gbps} Gb/s`],
            ["RDMA", n.supports_rdma ? "yes" : "no"],
            ["Use case", n.use_case],
          ]}
        />
        <p className="text-xs leading-relaxed text-slate-600">{n.notes}</p>
      </article>
    );
  }
  if (entry.kind === "storage" && entry.data) {
    const s = entry.data;
    return (
      <article className="flex flex-col gap-3">
        <h3 className="text-base font-semibold text-slate-900">{s.tier}</h3>
        <SpecGrid
          items={[
            ["Throughput", s.throughput_tier],
            ["Latency", s.latency],
            ["Capacity", s.capacity_tier],
            ["Use case", s.use_case],
          ]}
        />
        <p className="text-xs leading-relaxed text-slate-600">{s.notes}</p>
        <SourceList sources={s.sources} />
      </article>
    );
  }
  if (entry.kind === "power_cooling" && entry.data) {
    const p = entry.data;
    return (
      <article className="flex flex-col gap-3">
        <h3 className="text-base font-semibold text-slate-900">{p.tier}</h3>
        <SpecGrid
          items={[
            ["Rack power", `${p.rack_power_kw} kW`],
            ["Cooling", p.cooling],
          ]}
        />
        <p className="text-xs leading-relaxed text-slate-600">{p.notes}</p>
      </article>
    );
  }
  if (entry.kind === "serving_engine" && entry.data) {
    const e = entry.data;
    return (
      <article className="flex flex-col gap-3">
        <h3 className="text-base font-semibold text-slate-900">{e.name}</h3>
        <SpecGrid
          items={[
            ["License", e.license],
            ["Primary use", e.primary_use],
          ]}
        />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Capabilities
          </p>
          <ul className="mt-1 flex flex-col gap-0.5 text-xs leading-relaxed text-slate-700">
            {e.capabilities.map((c) => (
              <li key={c} className="flex gap-1.5">
                <span className="text-brand-700">·</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs leading-relaxed text-slate-600">{e.notes}</p>
        <SourceList sources={e.sources} />
      </article>
    );
  }
  return null;
}

function SpecGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <dl className="grid grid-cols-1 gap-y-1 border-y border-slate-200 py-2.5">
      {items.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3">
          <dt className="text-[11px] text-slate-500">{k}</dt>
          <dd className="text-right font-mono text-[11px] text-slate-800">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function SourceList({ sources }: { sources?: string[] }) {
  if (!sources || sources.length === 0) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Sources
      </p>
      <ul className="mt-1 flex flex-col gap-0.5">
        {sources.map((url) => (
          <li key={url}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-baseline gap-1 break-all text-[11px] text-brand-700 hover:text-brand-800"
            >
              {url}
              <ExternalLink aria-hidden="true" className="h-2.5 w-2.5 shrink-0" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
