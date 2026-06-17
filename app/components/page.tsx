import type { Metadata } from "next";

import {
  getAccelerators,
  getNetworking,
  getOptimizations,
  getPowerCooling,
  getServingEngines,
  getStorage,
} from "@/lib/catalog";

import { LayerCard, type LayerCardSpec } from "./_components/layer-card";
import { LayerSection } from "./_components/layer-section";

export const metadata: Metadata = {
  title: "Infrastructure Components — Aisle",
  description:
    "The seven layers of the on-prem LLM inference stack: accelerator, intra-node fabric, inter-node fabric, storage, serving engine, power and cooling, and optimization techniques.",
};

/**
 * Stack overview page. Walks through the seven layers of the inference
 * infrastructure stack in the order a planner would think about them, with
 * a small card per component pulled live from the catalog.
 *
 * Every name, vendor, and spec value comes from `lib/catalog`. The "what
 * changes if you swap this" notes are static narration written for this
 * page; the catalog data is the source of truth for everything else.
 */
export default function ComponentsOverviewPage() {
  // ── Layer 1: Accelerators (exclude roadmap entries from the cards) ─────────
  const accelerators = getAccelerators();

  // ── Layer 2: Intra-node fabric (NVLink, NVSwitch) ──────────────────────────
  // We filter the networking catalog to entries whose type names start with
  // NVLink/NVSwitch — those are the intra-node options the catalog tracks.
  const intraNode = getNetworking().filter(
    (n) => /^NVLink|^NVSwitch/i.test(n.type),
  );

  // ── Layer 3: Inter-node fabric (IB + RoCE + Ethernet frontend) ─────────────
  const interNode = getNetworking().filter(
    (n) => /^InfiniBand|^RoCE|^100 GbE/i.test(n.type),
  );

  // ── Layer 4: Storage ───────────────────────────────────────────────────────
  const storage = getStorage();

  // ── Layer 5: Serving engines ───────────────────────────────────────────────
  const engines = getServingEngines();

  // ── Layer 6: Power and cooling ─────────────────────────────────────────────
  const powerCooling = getPowerCooling();

  // ── Layer 7: Optimization techniques ───────────────────────────────────────
  const optimizations = getOptimizations();

  return (
    <article className="max-w-4xl">
      {/* Hero */}
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
          Reference · stack overview
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-tight tracking-tight text-slate-900">
          The seven layers of an inference deployment
        </h1>
        <p className="mt-4 max-w-prose text-base leading-relaxed text-slate-700">
          The inference stack has seven layers. Each one has component
          choices, and every choice cascades. Swap an accelerator and the
          power envelope changes. Swap the serving engine and the throughput
          coefficient changes. Swap the fabric and the maximum useful replica
          count changes. The cards below pull from the live catalog so the
          numbers match what the Sizer would assume.
        </p>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-slate-600">
          Hover any card for the catalog notes. After this overview, two
          worked examples (
          <a className="text-brand-700 hover:text-brand-800" href="/components/enterprise">
            enterprise
          </a>{" "}
          and{" "}
          <a className="text-brand-700 hover:text-brand-800" href="/components/departmental">
            departmental
          </a>
          ) show how these layers compose into real deployments.
        </p>
      </header>

      {/* ─── Layer 1: Accelerator ──────────────────────────────────────────── */}
      <LayerSection
        index={1}
        title="Accelerator"
        purpose="The GPU (or comparable accelerator) that holds the model weights and performs the matrix math. Memory capacity and bandwidth matter more than peak FLOPS for inference."
        swapNote="A bigger-memory SKU lets you hold longer contexts and more concurrent requests on one GPU, reducing the number of nodes you need. A higher-bandwidth SKU speeds up decode (which is memory-bound, not compute-bound). FLOPS only dominates during prefill."
      >
        {accelerators.map((a) => {
          const specs: LayerCardSpec[] = [];
          if (a.memory_gb !== null)
            specs.push({
              label: "Memory",
              value: `${a.memory_gb} GB ${a.memory_type ?? ""}`.trim(),
            });
          if (a.memory_bandwidth_tbps !== null)
            specs.push({
              label: "Bandwidth",
              value: `${a.memory_bandwidth_tbps} TB/s`,
            });
          if (a.tdp_w !== null)
            specs.push({ label: "TDP", value: `${a.tdp_w} W` });
          return (
            <LayerCard
              key={a.id}
              name={a.model}
              vendor={a.vendor}
              specs={specs}
              notes={a.notes}
              source={a.sources[0]}
            />
          );
        })}
      </LayerSection>

      {/* ─── Layer 2: Intra-node fabric ────────────────────────────────────── */}
      <LayerSection
        index={2}
        title="Intra-node fabric"
        purpose="The wires that connect GPUs inside one chassis. Required for tensor parallelism, where the model is sharded across GPUs and they exchange activations on every layer."
        swapNote="Without NVLink (e.g. PCIe-only L40S), tensor parallelism inside a node still works but pays a real latency tax. Above two GPUs, all-to-all traffic over PCIe becomes the bottleneck. NVLink + NVSwitch is what makes 8-way TP viable at sub-millisecond all-reduce."
      >
        {intraNode.map((n) => (
          <LayerCard
            key={n.id}
            name={n.type}
            specs={[
              { label: "Bandwidth", value: `${n.bandwidth_gbps} Gb/s` },
              { label: "RDMA", value: n.supports_rdma ? "yes" : "no" },
            ]}
            notes={n.notes}
          />
        ))}
      </LayerSection>

      {/* ─── Layer 3: Inter-node fabric ────────────────────────────────────── */}
      <LayerSection
        index={3}
        title="Inter-node fabric"
        purpose="The network that connects servers. Carries cross-node tensor or pipeline parallelism traffic on the back end, and user requests on the front end. Two distinct networks, often."
        swapNote="InfiniBand is the conventional choice for back-end GPU traffic because of low-latency RDMA. RoCE over Ethernet matches the bandwidth and is cheaper, at the cost of careful PFC/ECN tuning. 100 GbE on the frontend carries user requests, model artifacts on cold start, and the control plane."
      >
        {interNode.map((n) => (
          <LayerCard
            key={n.id}
            name={n.type}
            specs={[
              { label: "Bandwidth", value: `${n.bandwidth_gbps} Gb/s` },
              { label: "RDMA", value: n.supports_rdma ? "yes" : "no" },
            ]}
            notes={n.notes}
          />
        ))}
      </LayerSection>

      {/* ─── Layer 4: Storage ──────────────────────────────────────────────── */}
      <LayerSection
        index={4}
        title="Storage"
        purpose="Where model weights live at rest and how they reach the GPU on a cold start. KV cache spillover and the RAG corpus also need a tier."
        swapNote="A parallel file system lets many replicas load the same weights simultaneously without serializing on a single NFS box. Local NVMe is the path of least resistance for single-replica deployments. Object storage is fine for the cold model registry but too slow for hot KV."
      >
        {storage.map((s) => (
          <LayerCard
            key={s.id}
            name={s.tier}
            specs={[
              { label: "Throughput", value: s.throughput_tier },
              { label: "Latency", value: s.latency },
            ]}
            notes={s.notes}
            source={s.sources?.[0]}
          />
        ))}
      </LayerSection>

      {/* ─── Layer 5: Serving engine ───────────────────────────────────────── */}
      <LayerSection
        index={5}
        title="Serving engine"
        purpose="The software that actually runs the model: batches requests, manages the KV cache, applies quantization, and exposes an API. Hardware-agnostic in principle, but each engine has different sweet spots."
        swapNote="vLLM is the open-source default; TensorRT-LLM edges it on raw throughput on NVIDIA but needs per-model engine builds. SGLang wins on prefix-heavy agent and structured-output workloads. Dynamo orchestrates a fleet of engines for datacenter-scale deployments. TGI is the HF Hub on-ramp."
      >
        {engines.map((e) => (
          <LayerCard
            key={e.id}
            name={e.name}
            specs={[
              { label: "License", value: e.license.split(" ")[0] },
              {
                label: "Hardware",
                value: e.supported_hardware.length > 7 ? "NVIDIA + AMD" : "NVIDIA only",
              },
            ]}
            notes={e.notes}
            source={e.sources?.[0]}
          />
        ))}
      </LayerSection>

      {/* ─── Layer 6: Power and cooling ────────────────────────────────────── */}
      <LayerSection
        index={6}
        title="Power and cooling"
        purpose="The facility tier that determines what hardware can land where. The constraint that quietly kills more deployments than any other."
        swapNote="One 8x H200 chassis pulls about 11 kW; two per rack are already at the edge of high-density air. RDHX buys you to ~80 kW per rack without touching the servers. Above that, direct liquid is required. GB200 NVL72 is a single-product cooling tier: liquid only, no air option."
      >
        {powerCooling.map((p) => (
          <LayerCard
            key={p.id}
            name={p.tier}
            specs={[
              { label: "Rack power", value: `${p.rack_power_kw} kW` },
              { label: "Cooling", value: shortenCooling(p.cooling) },
            ]}
            notes={p.notes}
          />
        ))}
      </LayerSection>

      {/* ─── Layer 7: Optimization techniques ──────────────────────────────── */}
      <LayerSection
        index={7}
        title="Optimization techniques"
        purpose="The software-side levers that turn a marginally feasible deployment into a comfortable one. Quantization shrinks weights and KV; batching and caching reuse work across requests."
        swapNote="FP8 is the production baseline in 2026; it roughly doubles decode throughput vs BF16 with near-identical quality. Continuous batching and PagedAttention together move per-GPU throughput by 4-24x vs naive HF Transformers. Prefix caching slashes prefill cost on RAG and agent workloads."
      >
        {optimizations.map((o) => (
          <LayerCard
            key={o.id}
            name={o.name}
            specs={[
              { label: "Category", value: o.category },
              { label: "Memory", value: shortenImpact(o.memory_impact) },
            ]}
            notes={o.notes}
            source={o.sources?.[0]}
          />
        ))}
      </LayerSection>

      <footer className="mt-12 rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-700">
        <p>
          Two worked examples follow. The{" "}
          <a className="text-brand-700 hover:text-brand-800" href="/components/enterprise">
            enterprise workload
          </a>{" "}
          shows what every layer looks like at multi-rack, mission-critical
          scale. The{" "}
          <a className="text-brand-700 hover:text-brand-800" href="/components/departmental">
            departmental workload
          </a>{" "}
          intentionally contrasts: one rack, single-GPU servers, air cooling.
        </p>
      </footer>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — keep the card chrome tight without lying about the catalog values
// ─────────────────────────────────────────────────────────────────────────────

function shortenCooling(cooling: string): string {
  // Catalog cooling descriptions can be long; show the first phrase that
  // fits in the small spec slot, then rely on the hover tooltip for the rest.
  const firstClause = cooling.split(/[,;]/)[0].trim();
  return firstClause.length > 36 ? firstClause.slice(0, 33) + "…" : firstClause;
}

function shortenImpact(impact: string): string {
  // Optimizations memory_impact strings are long. Truncate for the chip-sized
  // value slot; the full text lives in the hover tooltip.
  const firstClause = impact.split(/[,;]/)[0].trim();
  return firstClause.length > 28 ? firstClause.slice(0, 25) + "…" : firstClause;
}
