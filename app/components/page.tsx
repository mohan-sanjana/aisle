import type { Metadata } from "next";
import Link from "next/link";

import {
  getAccelerators,
  getNetworking,
  getPowerCooling,
  getServingEngines,
  getStorage,
} from "@/lib/catalog";

import { ExpandableLayerTile } from "./_components/expandable-layer-tile";
import { LayerCard, type LayerCardSpec } from "./_components/layer-card";

export const metadata: Metadata = {
  title: "Infrastructure Components — Aisle",
  description:
    "The six layers of the on-prem LLM inference stack: accelerator, intra-node fabric, inter-node fabric, storage, serving engine, power and cooling. Tap any tile for the full explanation and the catalog options.",
};

/**
 * Stack overview page. Six collapsible tiles, one per layer of the inference
 * infrastructure stack. Each tile shows a short summary by default and
 * expands to reveal the full explanation and the catalog options.
 *
 * Optimization techniques are intentionally not a stack layer here. They
 * appear as inputs in the Sizer (Advanced step) and will get a dedicated
 * Knowledge module. See the footer for the rationale.
 */
export default function ComponentsOverviewPage() {
  // ── Catalog data per layer ────────────────────────────────────────────────
  const accelerators = getAccelerators();
  const intraNode = getNetworking().filter((n) =>
    /^NVLink|^NVSwitch/i.test(n.type),
  );
  const interNode = getNetworking().filter((n) =>
    /^InfiniBand|^RoCE|^100 GbE/i.test(n.type),
  );
  const storage = getStorage();
  const engines = getServingEngines();
  const powerCooling = getPowerCooling();

  return (
    <article className="max-w-4xl">
      {/* Hero */}
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
          Reference · stack overview
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-tight tracking-tight text-slate-900">
          The six layers of an inference deployment
        </h1>
        <p className="mt-4 max-w-prose text-base leading-relaxed text-slate-700">
          The inference stack has six layers. Each one has component choices,
          and every choice cascades. Swap an accelerator and the power envelope
          changes. Swap the serving engine and the throughput coefficient
          changes. Swap the fabric and the maximum useful replica count
          changes. Tap any tile for the full explanation and the catalog
          options.
        </p>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-slate-600">
          After this overview, two worked examples (
          <Link
            className="text-brand-700 hover:text-brand-800"
            href="/components/enterprise"
          >
            enterprise
          </Link>{" "}
          and{" "}
          <Link
            className="text-brand-700 hover:text-brand-800"
            href="/components/departmental"
          >
            departmental
          </Link>
          ) show how these layers compose into real deployments.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        {/* ─── Layer 1: Accelerator ─────────────────────────────────────── */}
        <ExpandableLayerTile
          index={1}
          title="Accelerator"
          summary="The GPU itself. Determines what models fit, how fast they run, and most of your hardware budget."
          whatItIs="A specialized chip designed for the parallel math at the heart of AI models. Where a CPU runs a small number of complex instructions very fast, a GPU runs thousands of simple matrix operations at the same time. Modern data-center GPUs combine those compute units with very fast on-chip memory (HBM) sitting right next to the silicon."
          role="This is where the model lives. The weights are loaded into HBM at startup and stay resident for the life of the deployment. Every token of every response requires the GPU to read the weights, run them through the network, and write the result. The bottleneck for streaming inference is not how fast the GPU can do math. It is how fast the GPU can move data between its memory and its compute units."
          whatChanges="Almost everything downstream. Moving from H100 to H200 keeps the same chassis and power envelope but adds 76 percent more memory and 43 percent more memory bandwidth, which translates directly to more concurrent users. Moving to B200 nearly doubles compute but pushes you into liquid cooling. Moving from NVIDIA to AMD (MI300X, MI325X) gets you 192 GB of memory per GPU at the cost of running on ROCm instead of CUDA, which changes your software compatibility surface."
          optionCount={accelerators.length}
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
        </ExpandableLayerTile>

        {/* ─── Layer 2: Intra-node fabric ───────────────────────────────── */}
        <ExpandableLayerTile
          index={2}
          title="Intra-node fabric"
          summary="The high-speed wiring inside each chassis that lets multiple GPUs cooperate. Makes tensor parallelism viable."
          whatItIs="A purpose-built interconnect inside a single server. NVIDIA calls this NVLink, paired with NVSwitch for multi-GPU routing. AMD's equivalent is Infinity Fabric. This wiring runs at hundreds of gigabytes per second per link, roughly ten to twenty times faster than the PCIe bus that would otherwise connect the GPUs."
          role="When a model is too big for one GPU, you split it across multiple GPUs in the same chassis (tensor parallelism). Every forward pass requires those GPUs to exchange intermediate values. Without a real intra-node fabric, this exchange happens over PCIe and is so slow it cancels the benefit of multi-GPU. If your model needs more than one GPU, intra-node fabric is what makes the setup work."
          whatChanges="Most enterprise teams don't choose this layer directly. It comes bundled with the chassis. SXM, HGX, and DGX servers include NVLink and NVSwitch as standard. PCIe form factors don't have it. The real decision is implicit: are you buying multi-GPU SXM servers, or single-GPU PCIe boxes? Newer generations (NVLink 5.0 on Blackwell, NVLink-Switch on NVL72 racks) deliver dramatically more bandwidth but only with the matching silicon."
          optionCount={intraNode.length}
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
        </ExpandableLayerTile>

        {/* ─── Layer 3: Inter-node fabric ───────────────────────────────── */}
        <ExpandableLayerTile
          index={3}
          title="Inter-node fabric"
          summary="The network between servers. Optional for single-node replicas, mandatory if a model spans multiple chassis."
          whatItIs="The high-speed network between physical servers. For inference, this is typically InfiniBand (NVIDIA's HPC-style fabric, 400 to 800 Gb/s per port) or RoCE (RDMA over Ethernet at similar speeds, on familiar Ethernet hardware). This is separate from the regular Ethernet that carries user traffic, which usually runs at 100 GbE."
          role="Single-server deployments don't need a backend fabric at all. The regular 100 GbE handles requests and responses. Inter-node fabric becomes necessary when a model spans multiple chassis (pipeline parallelism), when replicas need to share KV cache for routing efficiency, or when you're moving big files like model weights between servers fast. For most enterprise workloads, the choice is binary: stay within one chassis per replica, or commit to a real backend fabric."
          whatChanges="Choosing InfiniBand versus RoCE is mostly an organizational fit decision. IB has lower latency and better congestion control out of the box. RoCE uses familiar Ethernet hardware and integrates with existing network teams. Bandwidth tier matters more than protocol. Going from 100 GbE to 400 Gb IB unlocks multi-node tensor parallelism. Going from 400 Gb to 800 Gb XDR matters mostly for very large MoE models. If your model fits in one chassis, you can skip the backend fabric entirely and save real money."
          optionCount={interNode.length}
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
        </ExpandableLayerTile>

        {/* ─── Layer 4: Storage ─────────────────────────────────────────── */}
        <ExpandableLayerTile
          index={4}
          title="Storage"
          summary="Where model weights live before they're loaded, and where cache and telemetry sit at runtime. Affects cold-start time more than steady-state."
          whatItIs="Three concerns rolled into one layer. The model registry is where weights live before they're loaded onto a GPU. Local NVMe is the fast SSD on each server, used for restart caching and increasingly for KV-cache spillover. Observability storage holds logs, metrics, and request traces."
          role="The model registry is what spins up new replicas. Loading a 70B model is moving 70 to 140 GB of data into HBM. Scale that to 16 replicas spinning up at once and you're pulling 1 to 2 TB of sequential reads. Slow storage means slow cold starts, which means slow autoscaling, which means worse handling of traffic spikes. Local NVMe is a fast cache between cold storage and HBM. Observability storage is where you'll diagnose anything that goes wrong later."
          whatChanges="For one or two replicas, object storage (S3-compatible, Ceph) is fine. For ten or more replicas spinning up simultaneously, you start hitting the registry's bandwidth limits and a parallel file system (Lustre, WekaFS, Vast) becomes worth the investment. Local NVMe matters more as KV-cache offloading becomes practical, which is mostly Phase 2 territory today. Observability storage rarely affects the inference hot path, but it determines how quickly you can debug issues when they surface."
          optionCount={storage.length}
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
        </ExpandableLayerTile>

        {/* ─── Layer 5: Serving engine ──────────────────────────────────── */}
        <ExpandableLayerTile
          index={5}
          title="Serving engine"
          summary="The software that actually runs the model. The single largest software lever in your stack."
          whatItIs="A specialized inference server, not raw PyTorch in a Python loop. It handles request batching, GPU scheduling, KV cache management, and token streaming. vLLM is the de facto open-source choice. NVIDIA's TensorRT-LLM is the most optimized alternative. SGLang, Hugging Face TGI, NVIDIA Triton, and NVIDIA Dynamo each fill niches."
          role="This is where most of the magic happens. A good serving engine packs four times more concurrent requests onto the same GPU than a naive setup, by managing the KV cache as virtual memory (PagedAttention) and stitching new requests into the running batch the moment an old one finishes (continuous batching). Without these, your GPU sits 80 percent idle even at full request volume."
          whatChanges="Switching engines can change throughput by 4x or more on the same hardware. vLLM is the broad default and a safe choice. TensorRT-LLM gives you maximum throughput on NVIDIA hardware at the cost of more complex compilation. SGLang has aggressive batching and structured-output features for agentic workloads. Triton is more of an orchestrator that wraps another runtime. Each engine has different quantization support, different production maturity, and different operational characteristics. The choice often follows the AI team's familiarity as much as raw performance."
          optionCount={engines.length}
        >
          {engines.map((e) => (
            <LayerCard
              key={e.id}
              name={e.name}
              specs={[
                { label: "License", value: e.license.split(" ")[0] },
                {
                  label: "Hardware",
                  value:
                    e.supported_hardware.length > 7
                      ? "NVIDIA + AMD"
                      : "NVIDIA only",
                },
              ]}
              notes={e.notes}
              source={e.sources?.[0]}
            />
          ))}
        </ExpandableLayerTile>

        {/* ─── Layer 6: Power and cooling ───────────────────────────────── */}
        <ExpandableLayerTile
          index={6}
          title="Power and cooling"
          summary="The facilities-layer answer to whether your rack can handle the heat. Often the real gating constraint, not silicon."
          whatItIs="The physical infrastructure that keeps your GPUs powered and at operating temperature. For traditional servers, a typical colo rack handles 8 to 15 kilowatts with conventional air cooling. GPU servers blow past that. The cooling story has tiers: regular air, dense air with hot/cold aisle containment, rear-door heat exchangers (RDHX), and direct-to-chip liquid cooling."
          role="GPU servers pull power continuously at near-rated TDP, not in the bursty pattern CPU workloads follow. A single 8-GPU HGX H100 server pulls 10 to 11 kilowatts by itself. A rack of four of them is at 40 kW, well past most legacy colocation envelopes. Above about 35 kW per rack, air cooling stops working. Above 80 kW, you have to use liquid. The latest Blackwell rack designs (GB200 NVL72) pull 120 to 140 kW and ship with liquid as a design constraint, not a tuning choice."
          whatChanges="Each step up the cooling stack reduces PUE (power usage effectiveness, meaning less overhead per watt of useful work) but increases capex, operational complexity, and the skills your operations team needs. Air to high-density air is usually a facility upgrade, not a per-rack change. Air to RDHX adds rack-level water loops but keeps server-side air cooling. RDHX to direct-to-chip liquid requires servers that support it and a full facility coolant loop. Most teams move up the stack reluctantly, only when the silicon they want forces them to."
          optionCount={powerCooling.length}
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
        </ExpandableLayerTile>
      </div>

      <footer className="mt-10 rounded-lg border border-slate-200 bg-slate-50 px-5 py-5 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">
          Where do optimization techniques fit?
        </p>
        <p className="mt-2 leading-relaxed">
          Optimization techniques (FP8 quantization, continuous batching,
          PagedAttention, speculative decoding, LoRA, prefix caching)
          aren&rsquo;t a stack layer. They are configuration choices applied <em>within</em>{" "}
          the serving engine, not components you assemble. They show up in two
          places in Aisle: as inputs in the{" "}
          <Link
            className="text-brand-700 hover:text-brand-800"
            href="/sizer"
          >
            Sizer (Advanced step)
          </Link>
          , and (soon) as a dedicated Knowledge module that explains each
          technique, the throughput impact, and the trade-offs.
        </p>
        <p className="mt-4 leading-relaxed">
          Next: the{" "}
          <Link
            className="text-brand-700 hover:text-brand-800"
            href="/components/enterprise"
          >
            enterprise workload example
          </Link>{" "}
          shows what these layers look like at multi-rack, mission-critical
          scale. The{" "}
          <Link
            className="text-brand-700 hover:text-brand-800"
            href="/components/departmental"
          >
            departmental workload
          </Link>{" "}
          intentionally contrasts: one rack, single-GPU servers, air cooling.
        </p>
      </footer>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function shortenCooling(cooling: string): string {
  // Catalog cooling descriptions can be long; show the first phrase that fits
  // in the small spec slot, then rely on the hover tooltip for the rest.
  const firstClause = cooling.split(/[,;]/)[0].trim();
  return firstClause.length > 36 ? firstClause.slice(0, 33) + "…" : firstClause;
}
