/**
 * Step 13 — Network fabric selection.
 *
 *   single-node replica           → 100 GbE frontend only
 *   multi-node TP (rare, avoid)   → IB NDR / RoCE 400G + tuning
 *   multi-node PP                 → IB NDR 400G (or XDR 800G for very large MoE)
 *   disaggregated prefill/decode  → IB NDR 400G minimum
 */

import {
  FABRIC_FRONTEND,
  FABRIC_IB_NDR,
  FABRIC_IB_XDR,
} from "../constants";
import type { FabricSpec, ModelArchitecture } from "../types";

export function pickFabric(args: {
  nodes_per_replica: number;
  replica_count: number;
  architecture: ModelArchitecture;
  parameter_count_b: number;
}): FabricSpec {
  const { nodes_per_replica, replica_count, architecture, parameter_count_b } = args;

  // Multi-node single replica → backend fabric required (PP across nodes,
  // or — rare — TP across nodes). This is the only case where inference
  // workloads genuinely need high-bandwidth inter-node fabric.
  if (nodes_per_replica > 1) {
    // Very large MoE → consider XDR 800G
    if (architecture === "moe" && parameter_count_b > 200) {
      return {
        type: FABRIC_IB_XDR.type,
        bandwidth_gbps: FABRIC_IB_XDR.bandwidth_gbps,
        rationale: `Multi-node ${architecture.toUpperCase()} ${parameter_count_b}B model: ${FABRIC_IB_XDR.rationale}`,
      };
    }
    return {
      type: FABRIC_IB_NDR.type,
      bandwidth_gbps: FABRIC_IB_NDR.bandwidth_gbps,
      rationale: `Multi-node pipeline parallelism: ${FABRIC_IB_NDR.rationale}`,
    };
  }

  // Single-node replicas don't need a backend fabric — replicas are
  // independent, talking to clients over HTTP and to model storage on
  // startup. 100 GbE frontend covers both.
  //
  // (At very large fleets — hundreds of replicas — operators sometimes add
  // a parallel IB plane for KV-cache-aware routing or fast weight reload,
  // but that's a Phase 2 concern and shouldn't be a default Phase 1 recco.)
  return {
    type: FABRIC_FRONTEND.type,
    bandwidth_gbps: FABRIC_FRONTEND.bandwidth_gbps,
    rationale:
      replica_count >= 4
        ? `${FABRIC_FRONTEND.rationale} Replicas are independent; no inter-node tensor or pipeline parallelism needed.`
        : FABRIC_FRONTEND.rationale,
  };
}
