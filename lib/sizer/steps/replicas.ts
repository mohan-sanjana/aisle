/**
 * Step 11 — Replica count.
 *
 *   demand_tokens_per_sec = RPS × (avg_prompt + avg_output) × burst_factor
 *   N_replicas_active     = ceil(demand / throughput_per_replica)
 *   N_replicas            = N_replicas_active + redundancy_offset
 *
 * Resilient scenario additionally pairs failure domains:
 *   N_replicas = max(N_replicas_active + 2, 2 × ceil(N_replicas_active / 2))
 */

import { rps } from "./kv-cache";
import type { ScenarioParams, SizerInput } from "../types";

export type ReplicaPlan = {
  rps: number;
  demand_tokens_per_sec: number;
  active_replicas: number;
  total_replicas: number;
};

export function planReplicas(args: {
  input: SizerInput;
  scenario: ScenarioParams;
  throughput_per_replica: number;
}): ReplicaPlan {
  const { input, scenario, throughput_per_replica } = args;
  const reqRate = rps(input);
  const demand =
    reqRate * (input.avg_prompt_tokens + input.avg_output_tokens) * scenario.burst_factor;

  const activeReplicas = Math.max(
    1,
    Math.ceil(demand / Math.max(throughput_per_replica, 1)),
  );

  let total = activeReplicas + scenario.redundancy_offset;

  if (scenario.pair_failure_domains) {
    total = Math.max(activeReplicas + 2, 2 * Math.ceil(activeReplicas / 2));
  }

  return {
    rps: reqRate,
    demand_tokens_per_sec: demand,
    active_replicas: activeReplicas,
    total_replicas: total,
  };
}
