/**
 * Steps 14–15 — Power and cooling.
 *
 * Step 14:
 *   P_server      = sum(TDP_GPU × N_gpu) + overhead_W
 *   P_cluster_IT  = P_server × N_replicas
 *   P_facility    = P_cluster_IT × PUE
 *
 * Step 15 — cooling tier by per-rack kW:
 *   <15 → air; 15–35 → dense air; 35–80 → RDHX; >80 → DLC
 *   GB200 NVL72 → always liquid (handled upstream)
 */

import type { Accelerator } from "@/lib/catalog";
import {
  COOLING_TIERS,
  PUE_BY_TIER,
  SERVER_OVERHEAD_W_8GPU,
  SERVER_OVERHEAD_W_SMALL,
} from "../constants";
import type { CoolingSpec, PowerSpec } from "../types";

/** Servers per rack ceiling. Limited by power (typically 4-10 in modern racks). */
function serversPerRack(serverKw: number, coolingMaxKwPerRack: number): number {
  // Default: 10 servers/rack physical limit; tighter when power-bound.
  const physicalMax = 10;
  const byPower = Math.max(1, Math.floor(coolingMaxKwPerRack / Math.max(serverKw, 0.1)));
  return Math.min(physicalMax, byPower);
}

export function computePower(args: {
  accelerator: Accelerator;
  gpu_count_per_replica: number;
  replica_count: number;
  /** Pass null on first pass; recompute after cooling-tier known. */
  pue?: number;
}): { server_kw: number; cluster_kw: number; pue: number; facility_kw: number } {
  const { accelerator, gpu_count_per_replica, replica_count, pue } = args;
  const tdp = accelerator.tdp_w ?? 350;
  const overhead = gpu_count_per_replica >= 5 ? SERVER_OVERHEAD_W_8GPU : SERVER_OVERHEAD_W_SMALL;
  const serverW = tdp * gpu_count_per_replica + overhead;
  const serverKw = serverW / 1000;
  const clusterKw = serverKw * replica_count;
  const finalPue = pue ?? 1.5;
  return {
    server_kw: serverKw,
    cluster_kw: clusterKw,
    pue: finalPue,
    facility_kw: clusterKw * finalPue,
  };
}

/** Pick the cooling tier and an approximate per-rack kW. */
export function pickCoolingTier(args: {
  accelerator: Accelerator;
  server_kw: number;
  replica_count: number;
  is_gb200_class: boolean;
}): { cooling: CoolingSpec; kw_per_rack: number; pue: number } {
  const { accelerator, server_kw, replica_count, is_gb200_class } = args;

  if (is_gb200_class) {
    const tier = COOLING_TIERS[COOLING_TIERS.length - 1];
    return {
      cooling: { tier: tier.label, rationale: tier.rationale },
      kw_per_rack: 130, // NVL72 envelope
      pue: PUE_BY_TIER.gb200_nvl72,
    };
  }

  // B200 air-only is up to ~60 kW/rack; liquid above. The spec also notes
  // "DGX B200 ships liquid-assisted." Use B200 detection to lean liquid for
  // high replica counts.
  const isB200 = accelerator.id === "nvidia-b200-sxm";

  // Real-world deployments pack racks densely to save floor space and
  // network length. We target the *highest density that doesn't force DLC
  // unless necessary*: aim for up to ~80 kW/rack (RDHX envelope) before
  // stepping down to lighter cooling.
  const TARGET_RACK_KW = 80;
  const physicalMaxServers = 10;
  const desiredServersPerRack = Math.min(
    physicalMaxServers,
    Math.max(1, Math.floor(TARGET_RACK_KW / Math.max(server_kw, 0.1))),
  );
  // Don't pack more servers than we have replicas.
  const actualServersPerRack = Math.min(desiredServersPerRack, replica_count);
  const rackKw = actualServersPerRack * server_kw;

  // Pick the cooling tier that supports this rack density.
  // Walk tiers in ascending order; first one whose cap ≥ rackKw wins.
  for (const tier of COOLING_TIERS) {
    if (tier.id === "gb200-nvl72") continue; // reserved for GB200
    const cap = tier.max_kw_per_rack;
    if (rackKw > cap) continue;

    const pueKey = tierIdToPueKey(tier.id);
    let rationale = tier.rationale;
    if (isB200 && tier.id === "dlc") {
      rationale = `B200 ${tier.rationale}`;
    }
    return {
      cooling: { tier: tier.label, rationale },
      kw_per_rack: rackKw,
      pue: PUE_BY_TIER[pueKey] ?? 1.25,
    };
  }

  // Fallback to DLC if nothing else fits (e.g. single server > 80 kW)
  const dlc = COOLING_TIERS.find((t) => t.id === "dlc")!;
  return {
    cooling: { tier: dlc.label, rationale: dlc.rationale },
    kw_per_rack: rackKw,
    pue: PUE_BY_TIER.dlc,
  };
}

function tierIdToPueKey(id: string): string {
  switch (id) {
    case "air-traditional":
      return "air_traditional";
    case "air-high-density":
      return "air_high_density";
    case "rdhx":
      return "rdhx";
    case "dlc":
      return "dlc";
    case "gb200-nvl72":
      return "gb200_nvl72";
    default:
      return "air_high_density";
  }
}

export function assemblePowerSpec(args: {
  server_kw: number;
  replica_count: number;
  kw_per_rack: number;
  pue: number;
}): PowerSpec {
  const { server_kw, replica_count, kw_per_rack, pue } = args;
  const sustained = server_kw * replica_count;
  return {
    sustained_kw_total: sustained,
    kw_per_rack,
    pue,
    facility_kw_total: sustained * pue,
  };
}
