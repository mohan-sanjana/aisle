"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { sizeWorkload } from "@/lib/sizer";
import type { SizerInput, SizerOutput } from "@/lib/sizer/types";

import { DEFAULT_SIZER_INPUT } from "../_lib/defaults";
import { decodeSizerInput, encodeSizerInput } from "../_lib/url-state";
import { LiveResults } from "./live-results";
import { ScenarioGrid } from "./scenario-grid";
import { Stepper, type StepId } from "./stepper";
import { WizardStep } from "./wizard-step";
import { AdvancedStep } from "./steps/advanced-step";
import { ModelStep } from "./steps/model-step";
import { ReliabilityStep } from "./steps/reliability-step";
import { ReviewStep } from "./steps/review-step";
import { SlosStep } from "./steps/slos-step";
import { TrafficStep } from "./steps/traffic-step";
import { WorkloadStep } from "./steps/workload-step";

const STEP_ORDER: ReadonlyArray<StepId> = [
  "workload",
  "model",
  "traffic",
  "slos",
  "reliability",
  "advanced",
  "review",
];

/** All steps are considered "complete" for stepper checkmarks once the
 *  required field for that step has a sane value (always true for our
 *  default-backed inputs, but kept explicit so future required fields can
 *  gate the checkmark). */
function computeCompleted(input: SizerInput): Set<StepId> {
  const done = new Set<StepId>();
  if (input.workload_type) done.add("workload");
  if (input.parameter_count_b > 0 && input.precision) done.add("model");
  if (
    input.concurrent_users > 0 &&
    input.avg_prompt_tokens > 0 &&
    input.avg_output_tokens > 0 &&
    input.max_context_tokens > 0
  )
    done.add("traffic");
  if (input.target_TTFT_ms > 0 && input.target_TPOT_ms > 0) done.add("slos");
  if (input.burst_factor >= 1 && input.serving_engine) done.add("reliability");
  done.add("advanced"); // optional; always complete
  done.add("review"); // computed view; always complete
  return done;
}

export function SizerWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Decode initial input from URL once on mount; subsequent changes are
  // driven by local state + router.replace so we don't fight the router.
  const [input, setInput] = React.useState<SizerInput>(() =>
    decodeSizerInput(new URLSearchParams(searchParams?.toString() ?? "")),
  );
  const [currentStep, setCurrentStep] = React.useState<StepId>("workload");

  // Push state into URL whenever input changes.
  React.useEffect(() => {
    const params = encodeSizerInput(input);
    const search = params.toString();
    const url = search ? `/sizer?${search}` : "/sizer";
    router.replace(url, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  const update = React.useCallback((patch: Partial<SizerInput>) => {
    setInput((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetStep = React.useCallback(
    (stepId: StepId) => {
      const d = DEFAULT_SIZER_INPUT;
      switch (stepId) {
        case "workload":
          update({ workload_type: d.workload_type });
          break;
        case "model":
          update({
            parameter_count_b: d.parameter_count_b,
            model_family: d.model_family,
            model_architecture: d.model_architecture,
            active_params_b: d.active_params_b,
            precision: d.precision,
          });
          break;
        case "traffic":
          update({
            max_context_tokens: d.max_context_tokens,
            avg_prompt_tokens: d.avg_prompt_tokens,
            avg_output_tokens: d.avg_output_tokens,
            concurrent_users: d.concurrent_users,
            requests_per_user_per_minute: d.requests_per_user_per_minute,
          });
          break;
        case "slos":
          update({
            target_TTFT_ms: d.target_TTFT_ms,
            target_TPOT_ms: d.target_TPOT_ms,
          });
          break;
        case "reliability":
          update({
            burst_factor: d.burst_factor,
            redundancy_mode: d.redundancy_mode,
            serving_engine: d.serving_engine,
          });
          break;
        case "advanced":
          update({
            throughput_override_tokens_per_sec_per_replica: undefined,
            kv_offload: d.kv_offload,
            speculative_decoding: d.speculative_decoding,
            prefix_caching: d.prefix_caching,
            kv_cache_dtype: d.kv_cache_dtype,
          });
          break;
        case "review":
          // Reset everything.
          setInput(DEFAULT_SIZER_INPUT);
          break;
      }
    },
    [update],
  );

  const completed = React.useMemo(() => computeCompleted(input), [input]);

  // Compute sizing once at this level so both <LiveResults /> (right column,
  // sticky) and <ScenarioGrid /> (full-width row below) share one result.
  const output: SizerOutput | { error: string } = React.useMemo(() => {
    try {
      return sizeWorkload(input);
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : "Unable to size workload.",
      };
    }
  }, [input]);

  const stepIndex = STEP_ORDER.indexOf(currentStep);
  const onBack =
    stepIndex > 0
      ? () => setCurrentStep(STEP_ORDER[stepIndex - 1])
      : undefined;
  const onNext =
    stepIndex < STEP_ORDER.length - 1
      ? () => setCurrentStep(STEP_ORDER[stepIndex + 1])
      : undefined;

  return (
    <>
    <div className="grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)_minmax(0,1.4fr)]">
      <aside
        className="no-print lg:sticky lg:top-20 lg:self-start"
        aria-label="Sizer wizard"
      >
        <Stepper
          current={currentStep}
          onSelect={setCurrentStep}
          completed={completed}
        />
      </aside>

      <div className="min-w-0">
        {currentStep === "workload" && (
          <WizardStep
            title="Workload type"
            description="Different patterns demand different TTFT, TPOT, and KV budgets."
            onBack={onBack}
            onNext={onNext}
            onReset={() => resetStep("workload")}
            hideBack
          >
            <WorkloadStep input={input} onChange={update} />
          </WizardStep>
        )}
        {currentStep === "model" && (
          <WizardStep
            title="Model"
            description="Pick a known family or roll your own. MoE models show an extra active-params field."
            onBack={onBack}
            onNext={onNext}
            onReset={() => resetStep("model")}
          >
            <ModelStep input={input} onChange={update} />
          </WizardStep>
        )}
        {currentStep === "traffic" && (
          <WizardStep
            title="Traffic"
            description="Concurrent users and token volumes feed the KV cache budget and throughput targets."
            onBack={onBack}
            onNext={onNext}
            onReset={() => resetStep("traffic")}
          >
            <TrafficStep input={input} onChange={update} />
          </WizardStep>
        )}
        {currentStep === "slos" && (
          <WizardStep
            title="Service-level objectives"
            description="TTFT and TPOT bound how aggressive the GPU + parallelism plan needs to be."
            onBack={onBack}
            onNext={onNext}
            onReset={() => resetStep("slos")}
          >
            <SlosStep input={input} onChange={update} />
          </WizardStep>
        )}
        {currentStep === "reliability" && (
          <WizardStep
            title="Reliability"
            description="Burst headroom + redundancy drive replica counts on the Burst and Resilient cards."
            onBack={onBack}
            onNext={onNext}
            onReset={() => resetStep("reliability")}
          >
            <ReliabilityStep input={input} onChange={update} />
          </WizardStep>
        )}
        {currentStep === "advanced" && (
          <WizardStep
            title="Advanced"
            description="Override the throughput coefficient with your own benchmark, or toggle inference optimizations."
            onBack={onBack}
            onNext={onNext}
            onReset={() => resetStep("advanced")}
          >
            <AdvancedStep input={input} onChange={update} />
          </WizardStep>
        )}
        {currentStep === "review" && (
          <WizardStep
            title="Review"
            description="Confirm the inputs and export or share the result."
            onBack={onBack}
            onReset={() => resetStep("review")}
            backLabel="Back"
            nextLabel="Done"
            hideNext
          >
            <ReviewStep input={input} onJump={setCurrentStep} />
          </WizardStep>
        )}
      </div>

      <aside
        className="lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto"
        aria-label="Live result"
      >
        <LiveResults input={input} output={output} />
      </aside>
    </div>

    {/* Full-width scenario comparison row below the wizard + form + summary
        3-column grid, so each scenario card gets roughly a third of the
        page width instead of being squeezed into the right column. */}
    <ScenarioGrid output={output} />
    </>
  );
}
