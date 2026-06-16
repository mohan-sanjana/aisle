/**
 * Typed catalog accessors. The JSON is validated against the Zod schema
 * at module load time; invalid data throws immediately.
 *
 * Convention: Sizer and Designer call the `*` getters with default options
 * (roadmap entries excluded). Knowledge and Components pages may pass
 * `{ includeRoadmap: true }` to see everything.
 */

import rawCatalog from "@/data/catalog.json";
import { catalogSchema } from "./schema";
import type {
  Accelerator,
  Catalog,
  NetworkingComponent,
  Optimization,
  PowerCoolingTier,
  ServingEngine,
  StorageTier,
} from "./types";

let cached: Catalog | null = null;

/** Returns the validated catalog. Parses + validates on first call. */
export function getCatalog(): Catalog {
  if (cached) return cached;
  const parsed = catalogSchema.parse(rawCatalog);
  cached = parsed as Catalog;
  return cached;
}

type ListOpts = {
  /** If true, includes entries with `roadmap: true`. Defaults to false. */
  includeRoadmap?: boolean;
};

function filterRoadmap<T extends { roadmap?: boolean }>(
  items: T[],
  opts: ListOpts | undefined,
): T[] {
  if (opts?.includeRoadmap) return items;
  return items.filter((item) => !item.roadmap);
}

export function getAccelerators(opts?: ListOpts): Accelerator[] {
  return filterRoadmap(getCatalog().accelerators, opts);
}

export function getAcceleratorById(id: string): Accelerator | undefined {
  return getCatalog().accelerators.find((a) => a.id === id);
}

export function getNetworking(opts?: ListOpts): NetworkingComponent[] {
  return filterRoadmap(getCatalog().networking, opts);
}

export function getNetworkingById(id: string): NetworkingComponent | undefined {
  return getCatalog().networking.find((n) => n.id === id);
}

export function getStorage(opts?: ListOpts): StorageTier[] {
  return filterRoadmap(getCatalog().storage, opts);
}

export function getStorageById(id: string): StorageTier | undefined {
  return getCatalog().storage.find((s) => s.id === id);
}

export function getPowerCooling(opts?: ListOpts): PowerCoolingTier[] {
  return filterRoadmap(getCatalog().power_cooling, opts);
}

export function getPowerCoolingById(id: string): PowerCoolingTier | undefined {
  return getCatalog().power_cooling.find((p) => p.id === id);
}

export function getOptimizations(opts?: ListOpts): Optimization[] {
  return filterRoadmap(getCatalog().optimizations, opts);
}

export function getOptimizationById(id: string): Optimization | undefined {
  return getCatalog().optimizations.find((o) => o.id === id);
}

export function getServingEngines(opts?: ListOpts): ServingEngine[] {
  return filterRoadmap(getCatalog().serving_engines, opts);
}

export function getServingEngineById(id: string): ServingEngine | undefined {
  return getCatalog().serving_engines.find((e) => e.id === id);
}

export type {
  Accelerator,
  Catalog,
  NetworkingComponent,
  Optimization,
  PowerCoolingTier,
  ServingEngine,
  StorageTier,
} from "./types";
