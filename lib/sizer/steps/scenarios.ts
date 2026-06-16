/**
 * Scenario assembly — runs the full pipeline three times with the multipliers
 * from sizing-math.md §4.
 *
 *   Baseline   — burst=1.0,        N redundancy,    headroom=20%
 *   Burst      — burst=user,       N+1 (min),       headroom=25%
 *   Resilient  — burst=max(u,3.0), N+2,             headroom=30%, pair domains
 */

import { scenarioParams } from "../constants";
import type { ScenarioName, ScenarioParams, SizerInput } from "../types";

export function buildScenarioParams(
  input: SizerInput,
): Record<ScenarioName, ScenarioParams> {
  return {
    baseline: scenarioParams("baseline", input.burst_factor, input.redundancy_mode),
    burst: scenarioParams("burst", input.burst_factor, input.redundancy_mode),
    resilient: scenarioParams("resilient", input.burst_factor, input.redundancy_mode),
  };
}
