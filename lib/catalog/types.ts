/**
 * Aisle catalog types — mirrors the shape of `data/catalog.json`.
 *
 * The catalog is the single source of truth for the Sizer, Designer,
 * Components, and Knowledge sections. Entries are referenced by `id`;
 * never duplicate spec data.
 */

export type CatalogMeta = {
  version: string;
  last_updated: string;
  notes: string;
};

/** A roadmap entry has `roadmap: true` and most spec fields null. Filtered
 *  out of Sizer/Designer until graduated; visible in Knowledge content. */
export type RoadmapFlags = {
  roadmap?: boolean;
  uncertain?: boolean;
};

export type Accelerator = {
  id: string;
  vendor: string;
  family: string;
  model: string;
  form_factor: string;
  memory_gb: number | null;
  memory_type: string | null;
  memory_bandwidth_tbps: number | null;
  fp16_tflops_dense: number | null;
  fp8_tflops_dense: number | null;
  int8_tflops_dense: number | null;
  fp4_tflops_dense: number | null;
  tdp_w: number | null;
  interconnect: string;
  pcie_gen: number | null;
  released: string;
  successor: string | null;
  primary_use: string[];
  fits_models_at_fp8: string | null;
  typical_server: string;
  notes: string;
  sources: string[];
} & RoadmapFlags;

export type NetworkingComponent = {
  id: string;
  type: string;
  bandwidth_gbps: number;
  use_case: string;
  supports_rdma: boolean;
  notes: string;
} & RoadmapFlags;

export type StorageTier = {
  id: string;
  tier: string;
  use_case: string;
  throughput_tier: string;
  latency: string;
  capacity_tier: string;
  notes: string;
  sources?: string[];
} & RoadmapFlags;

export type PowerCoolingTier = {
  id: string;
  tier: string;
  rack_power_kw: string;
  cooling: string;
  /** Accelerator ids (or descriptive strings) this tier supports. */
  fits_hardware: string[];
  notes: string;
} & RoadmapFlags;

export type Optimization = {
  id: string;
  name: string;
  category: string;
  memory_impact: string;
  throughput_impact: string;
  quality_impact: string;
  /** Accelerator ids that support this optimization. */
  supported_hardware: string[];
  notes: string;
  sources?: string[];
} & RoadmapFlags;

export type ServingEngine = {
  id: string;
  name: string;
  license: string;
  capabilities: string[];
  primary_use: string;
  /** Accelerator ids supported by this engine. */
  supported_hardware: string[];
  notes: string;
  sources?: string[];
} & RoadmapFlags;

export type Catalog = {
  _meta: CatalogMeta;
  accelerators: Accelerator[];
  networking: NetworkingComponent[];
  storage: StorageTier[];
  power_cooling: PowerCoolingTier[];
  optimizations: Optimization[];
  serving_engines: ServingEngine[];
};

/** Union of every catalog entry category (for generic helpers). */
export type CatalogEntry =
  | Accelerator
  | NetworkingComponent
  | StorageTier
  | PowerCoolingTier
  | Optimization
  | ServingEngine;

export type CatalogCategory =
  | "accelerators"
  | "networking"
  | "storage"
  | "power_cooling"
  | "optimizations"
  | "serving_engines";
