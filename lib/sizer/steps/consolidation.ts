/**
 * Server consolidation — map logical replicas to physical servers.
 *
 * The calc engine's previous (and conventional) mental model was "1 replica =
 * 1 server." That's right for multi-GPU TP replicas, where the server's whole
 * chassis is the replica. It's wasteful for single-GPU replicas: 4 L40S serving
 * 4 independent replicas can sit in one 4U chassis instead of four 1U boxes.
 *
 * Rules:
 *   • Multi-GPU per replica (TP within node) → 1 replica per server. The TP
 *     domain is the chassis.
 *   • Single-GPU per replica → pack up to `maxGpusPerChassis(SKU)` per server,
 *     subject to a redundancy floor on physical-server count:
 *       N    → no minimum server count
 *       N+1  → at least 2 physical servers (so a spare lives in a separate
 *              failure domain)
 *       N+2  → at least 3 physical servers
 *
 * Capacities reflect typical air-cooled chassis density:
 *   • L40S       4 per server (350 W PCIe, dense 4U build)
 *   • L4         8 per server (72 W low-profile PCIe, easily packed)
 *   • SXM / OAM  8 per server (HGX/DGX/UBB are 8-GPU boards by design)
 *
 * Returns the per-scenario shape: how many physical servers, how many
 * replicas each server hosts, and the resulting GPU count per server.
 */

import type { RedundancyMode } from "../types";

export type ConsolidationPlan = {
  servers_required: number;
  replicas_per_server: number;
  gpus_per_server: number;
};

export function planConsolidation(args: {
  replicas: number;
  gpu_count_per_replica: number;
  gpu_id: string;
  redundancy_mode: RedundancyMode;
}): ConsolidationPlan {
  const { replicas, gpu_count_per_replica, gpu_id, redundancy_mode } = args;

  // Multi-GPU replicas: the chassis IS the replica (TP within node). One
  // logical replica per physical server.
  if (gpu_count_per_replica > 1) {
    return {
      servers_required: replicas,
      replicas_per_server: 1,
      gpus_per_server: gpu_count_per_replica,
    };
  }

  // Single-GPU replicas: consolidate up to chassis capacity, subject to a
  // redundancy-aware minimum server count.
  const maxPerChassis = maxGpusPerChassis(gpu_id);
  if (maxPerChassis <= 1) {
    return {
      servers_required: replicas,
      replicas_per_server: 1,
      gpus_per_server: 1,
    };
  }

  const minServers = minimumServersFor(redundancy_mode);
  const desiredServers = Math.ceil(replicas / maxPerChassis);
  const servers = Math.max(minServers, Math.min(replicas, desiredServers));
  // Distribute replicas as evenly as possible; use the max-per-server count
  // when sizing each server (worst case is what we provision for).
  const perServer = Math.ceil(replicas / servers);

  return {
    servers_required: servers,
    replicas_per_server: perServer,
    // Single-GPU replicas → GPUs/server == replicas/server
    gpus_per_server: perServer,
  };
}

function maxGpusPerChassis(gpu_id: string): number {
  switch (gpu_id) {
    case "nvidia-l40s":
      return 4;
    case "nvidia-l4":
      return 8;
    case "nvidia-h100-pcie":
      return 4;
    default:
      // SXM / OAM SKUs ship as 8-GPU HGX/DGX/UBB chassis.
      return 8;
  }
}

function minimumServersFor(mode: RedundancyMode): number {
  switch (mode) {
    case "N":
      return 1;
    case "N+1":
      return 2;
    case "N+2":
      return 3;
  }
}
