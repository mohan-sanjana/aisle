import type { Metadata } from "next";

import { AssumptionsBlock } from "../_components/assumptions-block";
import { SizerCta } from "../_components/sizer-cta";
import { TopologyDiagram } from "../_components/topology-diagram";
import { enterpriseTopology } from "../_topologies/enterprise";

export const metadata: Metadata = {
  title: "Enterprise inferencing example — Aisle",
  description:
    "A worked example of a large enterprise inference deployment: a customer-facing AI assistant for a bank. 5,000+ daily active users, Llama 3.1-70B at FP8, six 8-GPU HGX H200 nodes on InfiniBand NDR, direct liquid cooling.",
};

/**
 * Worked example: enterprise inferencing.
 *
 * The Sizer-link href below pre-fills the wizard with this workload's
 * parameters using the URL keys defined in `app/sizer/_lib/url-state.ts`.
 * Only fields that differ from the Sizer defaults need to be encoded;
 * the encoder strips equal-to-default values, but here we set everything
 * explicitly so the page is self-documenting and the user can read the URL.
 */
const sizerHref = "/sizer?" + new URLSearchParams({
  w: "rag", // workload_type: RAG-heavy assistant
  p: "70", // 70B parameter count
  mf: "llama-3.1-70b",
  a: "gqa",
  pr: "FP8",
  ctx: "16384", // max context (room above 4k prompt + 300 output)
  pt: "4000",
  ot: "300",
  u: "200", // peak concurrent in-flight (per spec)
  rpm: "6",
  ttft: "500",
  tpot: "40",
  bf: "2",
  r: "N+2",
  eng: "vLLM",
  pc: "1", // prefix caching on (RAG-heavy)
}).toString();

export default function EnterprisePage() {
  return (
    <article className="max-w-4xl">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
          Reference · worked example 1
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-tight tracking-tight text-slate-900">
          Enterprise inferencing: a customer-facing assistant
        </h1>
        <p className="mt-4 max-w-prose text-base leading-relaxed text-slate-700">
          A large bank stands up an AI assistant for its retail customers. The
          assistant answers product questions, retrieves account context (with
          consent), and hands off to a human when uncertain. It runs entirely
          on-prem because of regulatory constraints on customer data. This is
          what the deployment looks like, layer by layer.
        </p>
      </header>

      <AssumptionsBlock
        scenario="Customer-facing assistant, on-prem, multi-rack"
        assumptions={[
          { label: "Daily active users", value: "5,000+" },
          { label: "Peak concurrent in-flight", value: "200 requests" },
          { label: "Model", value: "Llama 3.1-70B" },
          { label: "Precision", value: "FP8 (E4M3)" },
          { label: "Average prompt", value: "4,000 tokens (RAG-heavy)" },
          { label: "Average output", value: "300 tokens" },
          { label: "TTFT target", value: "< 500 ms p95" },
          { label: "TPOT target", value: "< 40 ms p95" },
          { label: "Redundancy", value: "N+2 (mission-critical)" },
          { label: "Burst factor", value: "2x" },
          { label: "Deployment", value: "On-prem, multi-rack" },
          { label: "Serving engine", value: "vLLM + Dynamo router" },
        ]}
      />

      <h2 className="mt-10 text-2xl font-semibold leading-snug text-slate-900">
        Deployment topology
      </h2>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-slate-700">
        Six 8-GPU HGX H200 nodes sit behind a pool of two inference-router
        replicas. An API gateway in front handles rate limiting and auth.
        The back-end fabric is InfiniBand NDR. Liquid cooling is required
        at the rack tier. Click any node for the full catalog entry. Toggle
        &ldquo;Explain this architecture&rdquo; for one-line annotations.
      </p>

      <TopologyDiagram
        topology={enterpriseTopology}
        height={680}
        caption="Six 8-GPU HGX H200 nodes, paired inference routers, API gateway, parallel file system for model registry. PNG/SVG export is deferred for Phase 1; use Print for a paper copy."
      />

      <section className="mt-10 max-w-prose">
        <h2 className="text-2xl font-semibold leading-snug text-slate-900">
          Why this configuration
        </h2>

        <h3 className="mt-5 text-lg font-semibold leading-snug text-slate-900">
          Why H200 over H100 or B200
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          The H200 carries 141 GB of HBM3e per GPU at 4.8 TB/s. That extra
          memory headroom (vs the H100&rsquo;s 80 GB) is what lets a 70B
          model at FP8 fit comfortably on a single GPU and still leave room
          for the KV cache of long, RAG-heavy prompts. The bandwidth uplift
          accelerates decode, which is memory-bandwidth-bound. The B200 is
          the obvious next-generation choice and adds native FP4, but in
          mid-2026 it is more expensive per GPU and requires a stricter
          cooling tier for the liquid-only SKU. For a workload at this
          scale, the H200 is the sweet spot between capability and supply.
        </p>

        <h3 className="mt-5 text-lg font-semibold leading-snug text-slate-900">
          Why InfiniBand NDR on the back end
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          With 6 nodes (48 GPUs) and a router fleet that may shift KV
          fragments across replicas (Dynamo KV Block Manager pattern), the
          back-end fabric needs low-latency RDMA at 400 Gb/s per port.
          InfiniBand NDR with ConnectX-7 is the production-ready answer.
          RoCE over 400 GbE would work and may be cheaper, but it adds
          PFC/ECN tuning to the operational burden in exchange for no extra
          headline bandwidth.
        </p>

        <h3 className="mt-5 text-lg font-semibold leading-snug text-slate-900">
          Why N+2 redundancy
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          Customer-facing means an outage is a public incident. N+2 means we
          can take one node out for maintenance and still tolerate an
          unplanned failure during the same window. With four replicas
          sized for peak (and two spare), routine patching does not require
          a maintenance window in off-hours.
        </p>

        <h3 className="mt-5 text-lg font-semibold leading-snug text-slate-900">
          Why direct liquid cooling
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          An 8-way H200 chassis pulls roughly 11 kW sustained. Two per rack
          puts the rack past 22 kW before networking and ancillaries. Three
          per rack is comfortably past 30 kW, where high-density air starts
          to struggle. Direct-to-chip liquid (warm-water DLC at 30-45 C
          supply) handles this density without drama and enables free
          cooling in most climates. RDHX would be acceptable for the
          two-chassis tier but loses headroom if the workload grows.
        </p>

        <h3 className="mt-5 text-lg font-semibold leading-snug text-slate-900">
          Why a parallel file system
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          When a node fails and a replacement spins up, the new node needs
          to load 70 GB of FP8 weights as fast as possible. A parallel file
          system (WEKA, VAST, or equivalent) lets several replicas pull
          weights in parallel without serializing on a single NFS box.
          Local NVMe inside each node serves as the KV-cache spill tier
          (Dynamo KV Block Manager).
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold leading-snug text-slate-900">
          What you would change for a different workload
        </h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-slate-700">
          Three plausible variations, and what shifts in the spec sheet:
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-300">
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Variation
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Accelerator
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Fabric
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Cooling
                </th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs text-slate-800">
              <tr className="border-b border-slate-200">
                <td className="px-3 py-3 align-top font-sans text-sm text-slate-900">
                  Smaller model (13B-class)
                </td>
                <td className="px-3 py-3 align-top">
                  L40S, 1-2 GPUs per node
                </td>
                <td className="px-3 py-3 align-top">100 GbE frontend only</td>
                <td className="px-3 py-3 align-top">High-density air</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-3 py-3 align-top font-sans text-sm text-slate-900">
                  Shorter context (1k prompt)
                </td>
                <td className="px-3 py-3 align-top">
                  H200, fewer GPUs per replica
                </td>
                <td className="px-3 py-3 align-top">
                  InfiniBand NDR (same)
                </td>
                <td className="px-3 py-3 align-top">RDHX would suffice</td>
              </tr>
              <tr>
                <td className="px-3 py-3 align-top font-sans text-sm text-slate-900">
                  Batch / offline workload
                </td>
                <td className="px-3 py-3 align-top">
                  A100 80 GB acceptable (no FP8 needed)
                </td>
                <td className="px-3 py-3 align-top">
                  Ethernet frontend, no IB
                </td>
                <td className="px-3 py-3 align-top">Traditional air</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <SizerCta
        href={sizerHref}
        description="Open the Sizer pre-filled with these exact parameters. The wizard will run the calc engine and show baseline, burst, and resilient scenarios side by side."
      />
    </article>
  );
}
