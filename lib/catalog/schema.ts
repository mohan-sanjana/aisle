/**
 * Zod schemas for runtime validation of `data/catalog.json`.
 *
 * Used by `lib/catalog/index.ts` at module-load time and by
 * `scripts/validate-catalog.ts` in CI.
 */

import { z } from "zod";

const roadmapFlags = {
  roadmap: z.boolean().optional(),
  uncertain: z.boolean().optional(),
};

export const catalogMetaSchema = z.object({
  version: z.string(),
  last_updated: z.string(),
  notes: z.string(),
});

export const acceleratorSchema = z.object({
  id: z.string(),
  vendor: z.string(),
  family: z.string(),
  model: z.string(),
  form_factor: z.string(),
  memory_gb: z.number().nullable(),
  memory_type: z.string().nullable(),
  memory_bandwidth_tbps: z.number().nullable(),
  fp16_tflops_dense: z.number().nullable(),
  fp8_tflops_dense: z.number().nullable(),
  int8_tflops_dense: z.number().nullable(),
  fp4_tflops_dense: z.number().nullable(),
  tdp_w: z.number().nullable(),
  interconnect: z.string(),
  pcie_gen: z.number().nullable(),
  released: z.string(),
  successor: z.string().nullable(),
  primary_use: z.array(z.string()),
  fits_models_at_fp8: z.string().nullable(),
  typical_server: z.string(),
  notes: z.string(),
  sources: z.array(z.string()),
  ...roadmapFlags,
});

export const networkingSchema = z.object({
  id: z.string(),
  type: z.string(),
  bandwidth_gbps: z.number(),
  use_case: z.string(),
  supports_rdma: z.boolean(),
  notes: z.string(),
  ...roadmapFlags,
});

export const storageSchema = z.object({
  id: z.string(),
  tier: z.string(),
  use_case: z.string(),
  throughput_tier: z.string(),
  latency: z.string(),
  capacity_tier: z.string(),
  notes: z.string(),
  sources: z.array(z.string()).optional(),
  ...roadmapFlags,
});

export const powerCoolingSchema = z.object({
  id: z.string(),
  tier: z.string(),
  rack_power_kw: z.string(),
  cooling: z.string(),
  fits_hardware: z.array(z.string()),
  notes: z.string(),
  ...roadmapFlags,
});

export const optimizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  memory_impact: z.string(),
  throughput_impact: z.string(),
  quality_impact: z.string(),
  supported_hardware: z.array(z.string()),
  notes: z.string(),
  sources: z.array(z.string()).optional(),
  ...roadmapFlags,
});

export const servingEngineSchema = z.object({
  id: z.string(),
  name: z.string(),
  license: z.string(),
  capabilities: z.array(z.string()),
  primary_use: z.string(),
  supported_hardware: z.array(z.string()),
  notes: z.string(),
  sources: z.array(z.string()).optional(),
  ...roadmapFlags,
});

export const catalogSchema = z.object({
  _meta: catalogMetaSchema,
  accelerators: z.array(acceleratorSchema),
  networking: z.array(networkingSchema),
  storage: z.array(storageSchema),
  power_cooling: z.array(powerCoolingSchema),
  optimizations: z.array(optimizationSchema),
  serving_engines: z.array(servingEngineSchema),
});
