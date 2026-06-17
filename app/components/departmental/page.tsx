import type { Metadata } from "next";

import { AssumptionsBlock } from "../_components/assumptions-block";
import { SizerCta } from "../_components/sizer-cta";
import { TopologyDiagram } from "../_components/topology-diagram";
import { departmentalTopology } from "../_topologies/departmental";

export const metadata: Metadata = {
  title: "Departmental inferencing example — Aisle",
  description:
    "A worked example of a smaller, departmental inference deployment: an internal HR/IT help assistant. 200 users, 13B model at FP8, three single-GPU L40S servers, standard air cooling.",
};

/**
 * Worked example: departmental inferencing.
 *
 * Sizer pre-fill uses the same URL keys as the enterprise page; here we set
 * the smaller-scale workload.
 */
const sizerHref = "/sizer?" + new URLSearchParams({
  w: "interactive_chat",
  p: "13",
  a: "dense",
  pr: "FP8",
  ctx: "4096",
  pt: "1500",
  ot: "250",
  u: "20", // peak concurrent in-flight (per spec)
  rpm: "4",
  ttft: "1000",
  tpot: "50",
  bf: "1.5",
  r: "N+1",
  eng: "vLLM",
}).toString();

export default function DepartmentalPage() {
  return (
    <article className="max-w-4xl">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
          Reference · worked example 2
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-tight tracking-tight text-slate-900">
          Departmental inferencing: an internal help assistant
        </h1>
        <p className="mt-4 max-w-prose text-base leading-relaxed text-slate-700">
          A 2,000-person business unit stands up an internal assistant that
          answers HR and IT questions, looks up policy documents, and opens
          tickets. The audience is internal, traffic is modest, and downtime
          degrades gracefully to a static help page. This is what a
          one-rack deployment looks like.
        </p>
      </header>

      <AssumptionsBlock
        scenario="Internal HR/IT help assistant, single rack"
        assumptions={[
          { label: "Active users", value: "200" },
          { label: "Peak concurrent in-flight", value: "10-20 requests" },
          { label: "Model", value: "13B-class (e.g. Qwen3 13B)" },
          { label: "Precision", value: "FP8 (E4M3)" },
          { label: "Average prompt", value: "1,500 tokens" },
          { label: "Average output", value: "250 tokens" },
          { label: "TTFT target", value: "< 1,000 ms (relaxed)" },
          { label: "TPOT target", value: "< 50 ms" },
          { label: "Redundancy", value: "N+1" },
          { label: "Burst factor", value: "1.5x" },
          { label: "Deployment", value: "Single rack, single GPU per node" },
          { label: "Serving engine", value: "vLLM" },
        ]}
      />

      <h2 className="mt-10 text-2xl font-semibold leading-snug text-slate-900">
        Deployment topology
      </h2>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-slate-700">
        Three single-GPU L40S servers behind one vLLM instance acting as the
        router. Standard air cooling. No back-end fabric, no parallel file
        system, no Dynamo. The whole deployment fits in one cabinet. Click
        any node for the full catalog entry.
      </p>

      <TopologyDiagram
        topology={departmentalTopology}
        height={560}
        caption="Three L40S servers, one vLLM front, local NVMe per node. PNG/SVG export is deferred for Phase 1; use Print for a paper copy."
      />

      <section className="mt-10 max-w-prose">
        <h2 className="text-2xl font-semibold leading-snug text-slate-900">
          Why this configuration
        </h2>

        <h3 className="mt-5 text-lg font-semibold leading-snug text-slate-900">
          Why L40S over H100 or H200
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          A 13B model at FP8 weighs about 13 GB. With a 4k context window
          and modest concurrency, the KV cache stays well under the L40S
          48 GB envelope. The L40S also fits into a standard 2U PCIe
          chassis with no NVLink baseboard, no liquid loop, and a 350 W
          per-GPU TDP. An H100 or H200 would also work and would have
          spare headroom for growth, but at roughly 3-4x the per-GPU cost
          and a TDP that pushes the rack power budget. For 13B at this
          scale, the L40S is exactly enough.
        </p>

        <h3 className="mt-5 text-lg font-semibold leading-snug text-slate-900">
          Why 100 GbE only
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          Each L40S server is a self-contained inference replica. There is
          no cross-node tensor parallelism, so there is no back-end fabric
          to build. The 100 GbE frontend carries user requests and model
          load traffic, and that is sufficient.
        </p>

        <h3 className="mt-5 text-lg font-semibold leading-snug text-slate-900">
          Why N+1 instead of N+2
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          The workload is internal and the failure mode is bounded
          (employees fall back to existing help portals). One spare replica
          gives us a maintenance window without taking the service offline,
          which is the operational threshold that matters here. N+2 would
          be over-spec for the consequence of an outage.
        </p>

        <h3 className="mt-5 text-lg font-semibold leading-snug text-slate-900">
          Why standard air cooling
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          Three L40S servers at 350 W each plus chassis overhead lands
          well under 5 kW per rack. That sits comfortably inside
          traditional air-cooled cabinets, so no facility-side changes
          are required. The deployment can land in an existing colocation
          row without a cooling retrofit.
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
                  Topology
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Cooling
                </th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs text-slate-800">
              <tr className="border-b border-slate-200">
                <td className="px-3 py-3 align-top font-sans text-sm text-slate-900">
                  Bigger model (30B-class)
                </td>
                <td className="px-3 py-3 align-top">
                  L40S with INT4 quant, or single H100 PCIe
                </td>
                <td className="px-3 py-3 align-top">
                  Same single-GPU pattern
                </td>
                <td className="px-3 py-3 align-top">
                  High-density air for H100
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-3 py-3 align-top font-sans text-sm text-slate-900">
                  Higher concurrency (200 in flight)
                </td>
                <td className="px-3 py-3 align-top">
                  L40S, more replicas
                </td>
                <td className="px-3 py-3 align-top">
                  Add a small router (Dynamo or vLLM scheduler)
                </td>
                <td className="px-3 py-3 align-top">
                  Likely still high-density air
                </td>
              </tr>
              <tr>
                <td className="px-3 py-3 align-top font-sans text-sm text-slate-900">
                  Embeddings-only workload
                </td>
                <td className="px-3 py-3 align-top">
                  L4 (72 W TDP)
                </td>
                <td className="px-3 py-3 align-top">
                  1U edge server, 4-8 GPUs
                </td>
                <td className="px-3 py-3 align-top">
                  Traditional air, any rack
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <SizerCta
        href={sizerHref}
        description="Open the Sizer pre-filled with these exact parameters. Compare what the calc engine produces against this hand-crafted topology."
      />
    </article>
  );
}
