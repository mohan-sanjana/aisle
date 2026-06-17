/**
 * Shared types for topology diagrams. Each topology file under `_topologies/`
 * exports a `nodes` and `edges` array conforming to React Flow's shape, with
 * a `data` payload that the `TopologyNode` component knows how to render.
 *
 * Catalog data is resolved at render time via the typed accessors in
 * `@/lib/catalog`. The topology files only carry catalog ids + light
 * presentation hints.
 */

import type { Edge, Node } from "reactflow";

import type { CatalogCategory } from "@/lib/catalog";

/** Visual role of a node. Drives the colored badge in the corner. */
export type TopologyNodeRole =
  | "accelerator"
  | "networking"
  | "storage"
  | "power_cooling"
  | "serving_engine"
  | "client"
  | "router"
  | "gateway"
  | "monitoring";

export type TopologyNodeData = {
  /** Heading shown at the top of the node card. */
  title: string;
  /** Single-line subtitle (e.g. "6 nodes" or "2x per chassis"). */
  subtitle?: string;
  /** Optional annotation that overlays when "Explain" is toggled on. */
  explainNote?: string;
  /** Visual role; drives the corner badge and tint. */
  role: TopologyNodeRole;
  /** Optional catalog reference. When set, the node is hoverable and clickable. */
  catalogRef?: {
    category: CatalogCategory;
    id: string;
  };
};

export type TopologyNode = Node<TopologyNodeData>;

/** Edge data lets us label the fabric type without duplicating the catalog. */
export type TopologyEdgeData = {
  /** Catalog id of a networking entry. Resolved to label at render time. */
  networkingId?: string;
  /** Explicit label override (used for non-catalog connections like "HTTPS"). */
  label?: string;
};

export type TopologyEdge = Edge<TopologyEdgeData>;

export type Topology = {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
};
