import type { Topology } from "../_components/topology-types";

/**
 * Departmental inferencing deployment: internal HR/IT help assistant for a
 * single department. 3x single-GPU L40S servers behind one inference router
 * replica, fronted by an internal API gateway. Local NVMe for model storage.
 * 100 GbE frontend only (no separate backend fabric). Standard air cooling.
 *
 * Layout: top-to-bottom flow similar to enterprise but visibly smaller.
 */

const COL = 180;
const ROW = 130;

export const departmentalTopology: Topology = {
  nodes: [
    {
      id: "clients",
      type: "topologyNode",
      position: { x: COL * 1.5, y: 0 },
      data: {
        title: "Internal employees",
        subtitle: "Browser SSO",
        role: "client",
        explainNote:
          "Internal-only traffic. Peak concurrency is modest (10-20 in flight).",
      },
    },
    {
      id: "gateway",
      type: "topologyNode",
      position: { x: COL * 1.5, y: ROW },
      data: {
        title: "Internal API gateway",
        subtitle: "SSO · audit",
        role: "gateway",
        explainNote:
          "Single gateway replica is fine here. Failures degrade gracefully to a static help page.",
      },
    },
    {
      id: "router",
      type: "topologyNode",
      position: { x: COL * 1.5, y: ROW * 2 },
      data: {
        title: "vLLM server",
        subtitle: "Continuous batching",
        role: "router",
        catalogRef: { category: "serving_engines", id: "vllm" },
        explainNote:
          "vLLM with continuous batching is enough at this scale. No KV-cache-aware routing needed.",
      },
    },

    // Three single-GPU L40S nodes
    ...Array.from({ length: 3 }).map((_, i) => ({
      id: `gpu-node-${i + 1}`,
      type: "topologyNode",
      position: { x: COL * 0.2 + i * COL * 1.3, y: ROW * 3.2 },
      data: {
        title: `L40S server ${i + 1}`,
        subtitle: "1x L40S · PCIe",
        role: "accelerator" as const,
        catalogRef: { category: "accelerators" as const, id: "nvidia-l40s" },
        explainNote:
          i === 0
            ? "13B at FP8 fits comfortably on a single L40S with KV room for a 1,500-token average prompt."
            : i === 2
              ? "Third server gives N+1 redundancy. Lose one and the other two still serve peak."
              : undefined,
      },
    })),

    {
      id: "local-nvme",
      type: "topologyNode",
      position: { x: COL * 3.3, y: ROW * 2 },
      data: {
        title: "Local NVMe (per node)",
        subtitle: "Model weight cache",
        role: "storage",
        catalogRef: { category: "storage", id: "local-nvme" },
        explainNote:
          "Each server holds its own copy of the model on local NVMe. No shared file system needed at this scale.",
      },
    },

    {
      id: "cooling",
      type: "topologyNode",
      position: { x: -COL * 0.3, y: ROW * 2 },
      data: {
        title: "Rack cooling",
        subtitle: "High-density air",
        role: "power_cooling",
        catalogRef: { category: "power_cooling", id: "air-high-density" },
        explainNote:
          "L40S at 350 W TDP fits within a 15-35 kW air-cooled rack. No liquid required.",
      },
    },
  ],

  edges: [
    {
      id: "e-client-gateway",
      source: "clients",
      target: "gateway",
      data: { label: "HTTPS" },
    },
    {
      id: "e-gateway-router",
      source: "gateway",
      target: "router",
      data: { networkingId: "eth-100gbe-frontend" },
    },
    ...Array.from({ length: 3 }).map((_, i) => ({
      id: `e-router-gpu-${i + 1}`,
      source: "router",
      target: `gpu-node-${i + 1}`,
      data: { networkingId: "eth-100gbe-frontend" },
    })),
    {
      id: "e-gpu-2-nvme",
      source: "gpu-node-2",
      target: "local-nvme",
      data: { label: "model load" },
    },
    {
      id: "e-gpu-1-cooling",
      source: "gpu-node-1",
      target: "cooling",
      data: { label: "air cooling" },
      style: { strokeDasharray: "3 3", stroke: "rgb(217 119 6)" },
    },
  ],
};
