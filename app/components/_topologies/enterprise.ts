import type { Topology } from "../_components/topology-types";

/**
 * Enterprise inferencing deployment: customer-facing assistant for a large
 * bank. 6x 8-GPU HGX H200 nodes behind a router pool, fronted by an API
 * gateway. Parallel file system for the model registry. InfiniBand NDR back
 * end + 100 GbE frontend. Liquid cooling at the rack tier.
 *
 * Layout uses a top-to-bottom flow: client -> gateway -> router pool ->
 * GPU servers -> shared infra (storage, power/cooling).
 *
 * Catalog refs are by `(category, id)`. The topology-node component resolves
 * the rest at render time.
 */

const COL = 180;
const ROW = 130;

export const enterpriseTopology: Topology = {
  nodes: [
    // Row 0: clients
    {
      id: "clients",
      type: "topologyNode",
      position: { x: COL * 2.5, y: 0 },
      data: {
        title: "Bank customers",
        subtitle: "Web + mobile",
        role: "client",
        explainNote:
          "Customer-facing traffic enters over HTTPS. Peak concurrency is the binding constraint.",
      },
    },

    // Row 1: API gateway
    {
      id: "gateway",
      type: "topologyNode",
      position: { x: COL * 2.5, y: ROW },
      data: {
        title: "API gateway",
        subtitle: "Rate limit · authn · audit",
        role: "gateway",
        explainNote:
          "Centralizes rate limiting, authentication, and audit logging so the inference layer can stay stateless.",
      },
    },

    // Row 2: inference router pool (2 replicas)
    {
      id: "router-a",
      type: "topologyNode",
      position: { x: COL * 1.5, y: ROW * 2 },
      data: {
        title: "Inference router A",
        subtitle: "KV-cache aware",
        role: "router",
        catalogRef: { category: "serving_engines", id: "nvidia-dynamo" },
        explainNote:
          "Routes each request to the replica most likely to already hold its prefix in KV cache.",
      },
    },
    {
      id: "router-b",
      type: "topologyNode",
      position: { x: COL * 3.5, y: ROW * 2 },
      data: {
        title: "Inference router B",
        subtitle: "Failover replica",
        role: "router",
        catalogRef: { category: "serving_engines", id: "nvidia-dynamo" },
        explainNote:
          "Second router replica so a single failure does not take the deployment offline.",
      },
    },

    // Row 3+: six 8-GPU HGX H200 nodes (2 rows of 3 for layout density)
    ...Array.from({ length: 6 }).map((_, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      return {
        id: `gpu-node-${i + 1}`,
        type: "topologyNode",
        position: {
          x: COL * 0.5 + col * COL * 2,
          y: ROW * 3 + row * ROW * 1.1,
        },
        data: {
          title: `HGX H200 node ${i + 1}`,
          subtitle: "8x H200 SXM · NVLink 4",
          role: "accelerator" as const,
          catalogRef: { category: "accelerators" as const, id: "nvidia-h200-sxm" },
          explainNote:
            i === 0
              ? "8-way tensor parallelism inside each node via NVLink. 70B at FP8 with KV room for long context."
              : undefined,
        },
      };
    }),

    // Storage column on the right
    {
      id: "model-registry",
      type: "topologyNode",
      position: { x: COL * 5.5, y: ROW * 3 },
      data: {
        title: "Model registry",
        subtitle: "Parallel file system",
        role: "storage",
        catalogRef: { category: "storage", id: "parallel-fs" },
        explainNote:
          "Shared model store. All replicas pull weights from the same parallel file system on cold start.",
      },
    },
    {
      id: "local-nvme",
      type: "topologyNode",
      position: { x: COL * 5.5, y: ROW * 4 },
      data: {
        title: "Per-node local NVMe",
        subtitle: "KV spill · scratch",
        role: "storage",
        catalogRef: { category: "storage", id: "local-nvme" },
        explainNote:
          "PCIe Gen5 NVMe inside each GPU server for KV cache spillover and fast model load.",
      },
    },

    // Power/cooling tier on the left
    {
      id: "cooling",
      type: "topologyNode",
      position: { x: -COL * 0.6, y: ROW * 3.5 },
      data: {
        title: "Rack cooling",
        subtitle: "Direct liquid (cold plate)",
        role: "power_cooling",
        catalogRef: { category: "power_cooling", id: "dlc" },
        explainNote:
          "Two 8x H200 chassis per rack push past 20 kW each. Direct liquid is the safe call above 80 kW/rack.",
      },
    },

    // Backend fabric (logical node so the labels make sense)
    {
      id: "ib-fabric",
      type: "topologyNode",
      position: { x: COL * 2.5, y: ROW * 5.4 },
      data: {
        title: "InfiniBand NDR fabric",
        subtitle: "400 Gb/s per port",
        role: "networking",
        catalogRef: { category: "networking", id: "ib-ndr-400" },
        explainNote:
          "Backend fabric carries cross-replica KV transfer and metric/telemetry traffic.",
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
      id: "e-gateway-router-a",
      source: "gateway",
      target: "router-a",
      data: { networkingId: "eth-100gbe-frontend" },
    },
    {
      id: "e-gateway-router-b",
      source: "gateway",
      target: "router-b",
      data: { networkingId: "eth-100gbe-frontend" },
    },
    // Router fan-out to GPU nodes
    ...Array.from({ length: 6 }).flatMap((_, i) => [
      {
        id: `e-router-a-gpu-${i + 1}`,
        source: "router-a",
        target: `gpu-node-${i + 1}`,
        data: { networkingId: "eth-100gbe-frontend" },
      },
      {
        id: `e-router-b-gpu-${i + 1}`,
        source: "router-b",
        target: `gpu-node-${i + 1}`,
        data: { networkingId: "eth-100gbe-frontend" },
        style: { strokeDasharray: "4 4" },
      },
    ]),
    // GPU nodes to backend fabric
    ...Array.from({ length: 6 }).map((_, i) => ({
      id: `e-gpu-${i + 1}-ib`,
      source: `gpu-node-${i + 1}`,
      target: "ib-fabric",
      data: { networkingId: "ib-ndr-400" },
    })),
    // GPU nodes to storage
    {
      id: "e-gpu-1-registry",
      source: "gpu-node-1",
      target: "model-registry",
      data: { label: "weight load" },
    },
    {
      id: "e-gpu-3-nvme",
      source: "gpu-node-3",
      target: "local-nvme",
      data: { label: "KV spill" },
    },
    // GPU nodes to cooling (annotation edge)
    {
      id: "e-gpu-4-cooling",
      source: "gpu-node-4",
      target: "cooling",
      data: { label: "liquid loop" },
      style: { strokeDasharray: "3 3", stroke: "rgb(217 119 6)" },
    },
  ],
};
