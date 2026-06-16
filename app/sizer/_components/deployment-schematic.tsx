"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";

import type { ScenarioOutput, SizerInput, SizerOutput } from "@/lib/sizer/types";

/**
 * Educational "deployment at a glance" schematic.
 *
 * Auto-renders from the BURST scenario (the canonical sizing path per
 * sizing-math.md §4). Designed for a newcomer to AI infrastructure to grasp
 * the *shape* of what they're planning, not a full topology.
 *
 *   ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢   +N more
 *   └─┴─┴─┴─┴─┴─┴─┴─── 400 Gb InfiniBand NDR
 *
 *   Each [□] = 1 server with 2× H200
 *   Cooling: RDHX · Power: 60 kW sustained
 *
 *   → Open in Architecture Designer
 *
 * Full topology design lives in the Architecture Designer. This is only the
 * visual anchor: a row of server boxes + fabric label + footer line.
 */

const VISIBLE_LIMIT = 8;
const SERVER_W = 56;
const SERVER_H = 64;
const SERVER_GAP = 12;
const OVERFLOW_W = 84;

export function DeploymentSchematic({
  input,
  output,
}: {
  input: SizerInput;
  output: SizerOutput;
}) {
  const burst = output.scenarios.burst;
  const totalServers = burst.servers_required;
  const visibleServers = Math.min(totalServers, VISIBLE_LIMIT);
  const overflow = totalServers - visibleServers;

  const totalGpus = burst.server_spec.gpu_count * burst.servers_required;
  const gpuName = prettyGpuName(burst.server_spec.gpu_id);
  const consolidated = burst.replicas_per_server > 1;

  const searchParams = useSearchParams();
  const designerHref = `/designer?${searchParams?.toString() ?? ""}`;

  // SVG geometry — only renders the server row + fabric line, not the label.
  // Label is HTML below the SVG so long fabric names (e.g. "InfiniBand NDR
  // 400 Gb (failover/sharding) + 100 GbE") can wrap rather than clip.
  const rowWidth =
    visibleServers * SERVER_W +
    (visibleServers - 1) * SERVER_GAP +
    (overflow > 0 ? OVERFLOW_W + SERVER_GAP : 0);
  const padding = 20;
  const svgWidth = rowWidth + padding * 2;
  const fabricY = SERVER_H + 28;
  const svgHeight = fabricY + 8;

  return (
    <section
      aria-labelledby="schematic-heading"
      className="rounded-lg border border-slate-200 bg-white p-5"
    >
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="schematic-heading" className="text-h3 text-slate-900">
          Your deployment at a glance
        </h3>
        <span className="text-xs uppercase tracking-wide text-slate-500">
          Burst scenario
        </span>
      </header>

      <div className="overflow-x-auto">
        <svg
          role="img"
          aria-labelledby="schematic-title schematic-desc"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          width="100%"
          style={{ maxWidth: svgWidth, minWidth: Math.min(svgWidth, 480) }}
          className="block"
        >
          <title id="schematic-title">Deployment schematic</title>
          <desc id="schematic-desc">
            A row of {visibleServers} server icons{overflow > 0 ? ` plus ${overflow} more` : ""} connected to a fabric labeled {burst.fabric.type}.
          </desc>

          {/* Server icons */}
          {Array.from({ length: visibleServers }).map((_, i) => {
            const x = padding + i * (SERVER_W + SERVER_GAP);
            return (
              <ServerGlyph
                key={i}
                x={x}
                y={0}
                gpuCount={burst.server_spec.gpu_count}
              />
            );
          })}

          {/* Overflow chip */}
          {overflow > 0 && (
            <g
              transform={`translate(${
                padding + visibleServers * (SERVER_W + SERVER_GAP)
              }, 0)`}
            >
              <rect
                x={0}
                y={SERVER_H / 2 - 14}
                width={OVERFLOW_W}
                height={28}
                rx={14}
                fill="white"
                stroke="rgb(203 213 225)"
                strokeDasharray="3 3"
              />
              <text
                x={OVERFLOW_W / 2}
                y={SERVER_H / 2 + 4}
                textAnchor="middle"
                className="fill-slate-600"
                style={{ font: "500 12px ui-sans-serif, system-ui" }}
              >
                +{overflow} more
              </text>
            </g>
          )}

          {/* Vertical connectors from each server to the fabric line */}
          {Array.from({ length: visibleServers }).map((_, i) => {
            const cx = padding + i * (SERVER_W + SERVER_GAP) + SERVER_W / 2;
            return (
              <line
                key={`c${i}`}
                x1={cx}
                y1={SERVER_H}
                x2={cx}
                y2={fabricY}
                stroke="rgb(148 163 184)"
                strokeWidth={1.5}
              />
            );
          })}
          {overflow > 0 && (
            <line
              x1={padding + visibleServers * (SERVER_W + SERVER_GAP) + OVERFLOW_W / 2}
              y1={SERVER_H / 2 + 14}
              x2={padding + visibleServers * (SERVER_W + SERVER_GAP) + OVERFLOW_W / 2}
              y2={fabricY}
              stroke="rgb(148 163 184)"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
          )}

          {/* Fabric line */}
          <line
            x1={padding}
            y1={fabricY}
            x2={svgWidth - padding}
            y2={fabricY}
            stroke="rgb(21 128 61)"
            strokeWidth={2}
          />
        </svg>
      </div>

      {/* Fabric label — HTML rather than SVG <text>, so long fabric names
          wrap cleanly instead of overflowing the SVG viewBox. */}
      <p className="mt-2 text-center font-mono text-xs text-slate-700">
        {burst.fabric.type}
      </p>

      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Each box</dt>
          <dd className="font-mono text-slate-800">
            1 server · {burst.server_spec.gpu_count}× {gpuName}
            {consolidated ? ` · ${burst.replicas_per_server} replicas` : ""}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Total fleet</dt>
          <dd className="font-mono text-slate-800">
            {burst.servers_required} server{burst.servers_required === 1 ? "" : "s"}
            {" · "}
            {totalGpus} GPU{totalGpus === 1 ? "" : "s"}
            {consolidated ? ` · ${burst.replica_count} replicas` : ""}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Cooling</dt>
          <dd className="font-mono text-slate-800">{burst.cooling.tier}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Power (sustained)</dt>
          <dd className="font-mono text-slate-800">
            {burst.power.sustained_kw_total.toFixed(1)} kW
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <p className="text-xs text-slate-500">
          This is a schematic, not a rack layout. Use the Architecture Designer
          for a full topology including racks, switches, and failure domains.
        </p>
        <Link
          href={designerHref}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800"
        >
          Open in Designer
          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Server glyph — a server with N small GPU squares
// ──────────────────────────────────────────────────────────────────────────────

function ServerGlyph({
  x,
  y,
  gpuCount,
}: {
  x: number;
  y: number;
  gpuCount: number;
}) {
  // Lay out GPUs in a tidy grid
  const cols = gpuCount === 1 ? 1 : gpuCount <= 4 ? 2 : 4;
  const rows = Math.ceil(gpuCount / cols);
  const innerPadding = 8;
  const labelHeight = 14;
  const innerW = SERVER_W - innerPadding * 2;
  const innerH = SERVER_H - innerPadding - labelHeight - 4;
  const cellW = innerW / cols;
  const cellH = innerH / rows;
  const gpuSize = Math.min(cellW, cellH) - 2;

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Server outline */}
      <rect
        x={0}
        y={0}
        width={SERVER_W}
        height={SERVER_H}
        rx={6}
        fill="white"
        stroke="rgb(203 213 225)"
        strokeWidth={1.5}
      />
      {/* GPU dots */}
      {Array.from({ length: gpuCount }).map((_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const gx = innerPadding + col * cellW + (cellW - gpuSize) / 2;
        const gy = innerPadding + row * cellH + (cellH - gpuSize) / 2;
        return (
          <rect
            key={i}
            x={gx}
            y={gy}
            width={gpuSize}
            height={gpuSize}
            rx={2}
            fill="rgb(21 128 61)"
          />
        );
      })}
      {/* Label */}
      <text
        x={SERVER_W / 2}
        y={SERVER_H - 4}
        textAnchor="middle"
        className="fill-slate-500"
        style={{ font: "500 9px ui-monospace, JetBrains Mono, monospace" }}
      >
        {gpuCount} GPU{gpuCount === 1 ? "" : "s"}
      </text>
    </g>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function prettyGpuName(id: string): string {
  // "nvidia-h200-sxm" -> "H200 SXM"
  return id
    .replace(/^nvidia-/, "")
    .replace(/^amd-/, "")
    .split("-")
    .map((part) =>
      /^[a-z]\d/i.test(part) ? part.toUpperCase() : part.toUpperCase(),
    )
    .join(" ");
}

// Re-exported in case live-results wants to type-narrow before rendering
export type _DeploymentSchematicScenario = ScenarioOutput;
