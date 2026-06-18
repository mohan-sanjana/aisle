"use client";

import { useEffect, useState } from "react";
import { ChevronRight, MessageSquare, Server, Shield, Zap } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Hero widget for the landing page.
 *
 * Teaches the single most important concept in AI inference infrastructure:
 * each generated token requires the GPU to re-read weights and KV cache from
 * HBM, which makes memory bandwidth (not compute) the dominant bottleneck.
 *
 * The widget is educational at first glance (subtle auto-pulse animates the
 * path and the memory-bandwidth meter even without interaction) and goes
 * deeper when the visitor clicks "Generate Token" to walk through a single
 * "Paris is the capital of France." stream.
 *
 * Animations follow Vercel/Stripe style: subtle, progress-indicator based,
 * no spinning objects or 3D illustrations.
 */

const TOKENS = [
  "", // initial state, before any tokens have streamed
  "Paris",
  "Paris is",
  "Paris is the",
  "Paris is the capital",
  "Paris is the capital of",
  "Paris is the capital of France.",
];

// KV cache fills slightly with each generated token. Starts mid-range because
// the prompt's prefill already populated some KV before generation begins.
const KV_FILL = [0.35, 0.42, 0.48, 0.54, 0.6, 0.66, 0.72];

// Memory bandwidth bumps with each token; compute stays low for decode.
const BW_VALUES = [85, 91, 88, 92, 89, 93, 90];

export function HeroWidget() {
  const [tokenIndex, setTokenIndex] = useState(0);
  const [pulse, setPulse] = useState(false);

  const currentText = TOKENS[tokenIndex];
  const kvFraction = KV_FILL[tokenIndex];
  const bwValue = pulse
    ? Math.min(BW_VALUES[tokenIndex] + 5, 100)
    : BW_VALUES[tokenIndex];
  const atEnd = tokenIndex === TOKENS.length - 1;

  // Auto-pulse every 3s so visitors learn the concept without interacting.
  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 900);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  function handleGenerate() {
    if (tokenIndex < TOKENS.length - 1) {
      setPulse(true);
      setTokenIndex((i) => i + 1);
      setTimeout(() => setPulse(false), 900);
    }
  }

  function handleReset() {
    setTokenIndex(0);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
      {/* Header */}
      <header className="mb-2.5 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Zap className="h-4 w-4 text-brand-700" aria-hidden="true" />
          What happens when AI generates one token?
        </h3>
        <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-brand-700">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full bg-brand-700 transition-opacity",
              pulse ? "opacity-100" : "opacity-60",
            )}
            aria-hidden="true"
          />
          Interactive
        </span>
      </header>

      {/* Main flow: 3 step boxes + GPU card, arrows between */}
      <div className="mb-2.5 grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1.6fr] items-center gap-1.5">
        <StepBox
          icon={<MessageSquare className="h-4 w-4" aria-hidden="true" />}
          label="User"
          sub="prompt"
          pulse={pulse}
        />
        <FlowArrow pulse={pulse} />
        <StepBox
          icon={<Shield className="h-4 w-4" aria-hidden="true" />}
          label="API Gateway"
          sub="auth, rate limit"
          pulse={pulse}
        />
        <FlowArrow pulse={pulse} />
        <StepBox
          icon={<Server className="h-4 w-4" aria-hidden="true" />}
          label="Inference Server"
          sub="batch, schedule"
          pulse={pulse}
        />
        <FlowArrow pulse={pulse} />
        <GpuCard kvFraction={kvFraction} pulse={pulse} />
      </div>

      {/* Token stream display: compact inline labels */}
      <div className="mb-2.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
        <div className="flex items-baseline gap-2">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Prompt
          </span>
          <span className="truncate font-mono text-[12px] text-slate-700">
            What is the capital of France?
          </span>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-brand-700">
            Output
          </span>
          <span className="min-h-[16px] truncate font-mono text-[12px] text-slate-900">
            {currentText || <span className="text-slate-400">(empty)</span>}
            {!atEnd && (
              <span className="ml-0.5 animate-pulse text-brand-700">|</span>
            )}
          </span>
        </div>
      </div>

      {/* Generate / Reset button */}
      <button
        type="button"
        onClick={atEnd ? handleReset : handleGenerate}
        className="mb-2.5 w-full rounded-md bg-brand-700 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
      >
        {atEnd ? "Reset" : "Generate next token"}
      </button>

      {/* Insight card: single sentence, meters inline */}
      <aside className="rounded-md border-l-4 border-brand-700 bg-brand-50/60 px-3 py-2">
        <p className="text-[12px] font-semibold leading-snug text-slate-900">
          Each token re-reads the model from memory. The bottleneck is{" "}
          <span className="text-brand-700">memory bandwidth</span>, not compute.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <Meter label="Memory bandwidth" value={bwValue} highlight />
          <Meter label="Compute" value={35} />
        </div>
      </aside>
    </div>
  );
}

function FlowArrow({ pulse }: { pulse: boolean }) {
  return (
    <ChevronRight
      aria-hidden="true"
      className={cn(
        "h-4 w-4 shrink-0 transition-colors duration-500",
        pulse ? "text-brand-700" : "text-slate-300",
      )}
    />
  );
}

function StepBox({
  icon,
  label,
  sub,
  pulse,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  pulse: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 rounded-md border bg-white px-2 py-2 text-center transition-all duration-500",
        pulse ? "border-brand-700 shadow-sm" : "border-slate-200",
      )}
    >
      <div className={cn("transition-colors", pulse ? "text-brand-700" : "text-slate-400")}>
        {icon}
      </div>
      <p className="text-[12px] font-semibold leading-tight text-slate-900">
        {label}
      </p>
      <p className="text-[10px] leading-tight text-slate-500">{sub}</p>
    </div>
  );
}

function GpuCard({
  kvFraction,
  pulse,
}: {
  kvFraction: number;
  pulse: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border bg-white p-2 transition-all duration-500",
        pulse ? "border-brand-700 shadow-md" : "border-brand-700/50",
      )}
    >
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-700">
        GPU · HBM
      </p>
      <div className="space-y-1.5">
        <MemoryRow label="Weights" value="70 GB" fill={0.92} />
        <MemoryRow label="KV Cache" value="Dynamic" fill={kvFraction} animated />
        <MemoryRow label="Headroom" value="~25%" fill={0.22} />
      </div>
    </div>
  );
}

function MemoryRow({
  label,
  value,
  fill,
  animated,
}: {
  label: string;
  value: string;
  fill: number;
  animated?: boolean;
}) {
  return (
    <div>
      <div className="flex justify-between text-[10px]">
        <span className="font-semibold text-slate-800">{label}</span>
        <span className="font-mono text-slate-500">{value}</span>
      </div>
      <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn(
            "h-full rounded-full bg-brand-700",
            animated && "transition-all duration-700 ease-out",
          )}
          style={{ width: `${fill * 100}%` }}
        />
      </div>
    </div>
  );
}

function Meter({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="mb-1 text-[11px] text-slate-500">{label}</p>
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              highlight ? "bg-brand-700" : "bg-slate-400",
            )}
            style={{ width: `${value}%` }}
          />
        </div>
        <span className="font-mono text-[11px] text-slate-600">{value}%</span>
      </div>
    </div>
  );
}
