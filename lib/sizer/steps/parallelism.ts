/**
 * Step 9 — Parallelism strategy.
 *
 * - N_gpu = 1            → no parallelism
 * - 1 < N_gpu ≤ 8        → TP within node (NVLink/Infinity Fabric)
 * - N_gpu > 8            → TP=8 within node + PP across nodes
 *
 * Warnings:
 *  - PP > 4 stages: bubble overhead degrades TPOT
 *  - MoE with > 8 GPUs: prefer expert parallelism over PP
 */

import { MAX_GPUS_PER_NODE } from "../constants";
import type { ModelArchitecture } from "../types";

export type ParallelismPlan = {
  /** Tensor-parallel degree within a single node. */
  tp_degree: number;
  /** Pipeline-parallel degree across nodes (1 = single-node replica). */
  pp_degree: number;
  /** Total GPUs per replica. */
  total_gpus_per_replica: number;
  /** Nodes per replica. */
  nodes_per_replica: number;
  warnings: string[];
};

export function planParallelism(args: {
  gpu_count: number;
  architecture: ModelArchitecture;
  exceeded_single_node: boolean;
}): ParallelismPlan {
  const { gpu_count, architecture, exceeded_single_node } = args;
  const warnings: string[] = [];

  if (gpu_count <= 1) {
    return {
      tp_degree: 1,
      pp_degree: 1,
      total_gpus_per_replica: 1,
      nodes_per_replica: 1,
      warnings,
    };
  }

  if (gpu_count <= MAX_GPUS_PER_NODE && !exceeded_single_node) {
    // Round TP degree up to a power of two so it divides attention heads evenly.
    const tp = nextPowerOfTwo(gpu_count);
    if (![2, 4, 8].includes(tp)) {
      warnings.push(
        `TP degree ${gpu_count} does not divide attention heads evenly; rounded to ${tp}.`,
      );
    }
    return {
      tp_degree: tp,
      pp_degree: 1,
      total_gpus_per_replica: tp,
      nodes_per_replica: 1,
      warnings,
    };
  }

  // Multi-node: TP=8 within node, PP across nodes.
  const ppDegree = Math.ceil(gpu_count / MAX_GPUS_PER_NODE);
  if (ppDegree > 4) {
    warnings.push(
      `Pipeline parallelism PP=${ppDegree} > 4 — bubble overhead will degrade TPOT (~10–20% per stage).`,
    );
  }
  if (architecture === "moe") {
    warnings.push(
      "MoE with PP often load-balances worse than expert parallelism (EP). Consider EP if your engine supports it.",
    );
  }

  return {
    tp_degree: MAX_GPUS_PER_NODE,
    pp_degree: ppDegree,
    total_gpus_per_replica: MAX_GPUS_PER_NODE * ppDegree,
    nodes_per_replica: ppDegree,
    warnings,
  };
}

function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 1;
  if (n <= 2) return 2;
  if (n <= 4) return 4;
  return 8;
}
