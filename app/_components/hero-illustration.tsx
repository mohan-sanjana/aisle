/**
 * Hero illustration for the landing page.
 *
 * Shows the lifecycle of a single inference request:
 *   user → API gateway → inference server → GPU
 *
 * The GPU node is "exploded" to reveal the three memory regions that compete
 * for HBM: model weights, KV cache, and headroom. The intent is that a new
 * visitor learns the central planning concept (everything happens in GPU
 * memory, and memory bandwidth is the bottleneck) before clicking anything.
 *
 * Pure SVG, no animation, no client-side state. Renders cleanly in any
 * server component.
 */
export function HeroIllustration({
  className,
}: {
  className?: string;
}) {
  // ── Geometry (single source of truth for layout) ──────────────────────────
  const W = 580;
  const H = 280;

  // Node sizing
  const nodeW = 88;
  const nodeH = 44;
  const nodeY = 70;

  // Horizontal node positions
  const userX = 16;
  const gatewayX = 132;
  const serverX = 248;

  // The GPU is wider (it's the "interesting" node) and slightly taller
  const gpuW = 156;
  const gpuH = 130;
  const gpuX = 408;
  const gpuY = 36;

  // Memory rows inside the GPU
  const memRowH = 26;
  const memRowGap = 4;
  const memBaseY = gpuY + 36;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby="hero-illustration-title hero-illustration-desc"
      className={className}
      style={{ maxWidth: "100%", height: "auto" }}
    >
      <title id="hero-illustration-title">
        The lifecycle of an inference request
      </title>
      <desc id="hero-illustration-desc">
        A horizontal diagram showing a request flowing from the user through an
        API gateway and inference server to the GPU. The GPU is expanded to
        show three memory regions competing for high-bandwidth memory: model
        weights, KV cache, and a headroom band.
      </desc>

      {/* ── Connecting line from gateway through to GPU ─────────────────────── */}
      <line
        x1={userX + nodeW}
        y1={nodeY + nodeH / 2}
        x2={gpuX}
        y2={nodeY + nodeH / 2}
        stroke="rgb(148 163 184)"
        strokeWidth={1.5}
        strokeDasharray="3 4"
      />

      {/* Step nodes */}
      <StepNode x={userX} y={nodeY} w={nodeW} h={nodeH} label="User" sub="prompt" />
      <StepNode
        x={gatewayX}
        y={nodeY}
        w={nodeW}
        h={nodeH}
        label="API gateway"
        sub="auth, rate limit"
      />
      <StepNode
        x={serverX}
        y={nodeY}
        w={nodeW}
        h={nodeH}
        label="Inference server"
        sub="batch, schedule"
      />

      {/* ── GPU node (exploded) ─────────────────────────────────────────────── */}
      <rect
        x={gpuX}
        y={gpuY}
        width={gpuW}
        height={gpuH}
        rx={8}
        fill="white"
        stroke="rgb(21 128 61)"
        strokeWidth={1.75}
      />
      <text
        x={gpuX + 12}
        y={gpuY + 22}
        fill="rgb(21 128 61)"
        style={{
          font: "600 12px ui-sans-serif, system-ui, sans-serif",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        GPU · HBM
      </text>

      {/* Memory regions */}
      <MemoryRow
        x={gpuX + 12}
        y={memBaseY}
        w={gpuW - 24}
        h={memRowH}
        label="Weights"
        value="70 GB"
        fillFraction={0.92}
      />
      <MemoryRow
        x={gpuX + 12}
        y={memBaseY + memRowH + memRowGap}
        w={gpuW - 24}
        h={memRowH}
        label="KV cache"
        value="variable"
        fillFraction={0.55}
      />
      <MemoryRow
        x={gpuX + 12}
        y={memBaseY + 2 * (memRowH + memRowGap)}
        w={gpuW - 24}
        h={memRowH}
        label="Headroom"
        value="~25%"
        fillFraction={0.22}
      />

      {/* ── Annotation under the diagram ─────────────────────────────────────── */}
      <g>
        <text
          x={W / 2}
          y={220}
          textAnchor="middle"
          fill="rgb(15 23 42)"
          style={{ font: "500 13px ui-sans-serif, system-ui, sans-serif" }}
        >
          Reads weights + KV cache for every output token.
        </text>
        <text
          x={W / 2}
          y={244}
          textAnchor="middle"
          fill="rgb(71 85 105)"
          style={{ font: "13px ui-sans-serif, system-ui, sans-serif" }}
        >
          The bottleneck is memory bandwidth, not compute.
        </text>
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal building blocks
// ─────────────────────────────────────────────────────────────────────────────

function StepNode({
  x,
  y,
  w,
  h,
  label,
  sub,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub?: string;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={6}
        fill="white"
        stroke="rgb(203 213 225)"
        strokeWidth={1.25}
      />
      <text
        x={x + w / 2}
        y={y + 18}
        textAnchor="middle"
        fill="rgb(15 23 42)"
        style={{ font: "600 12px ui-sans-serif, system-ui, sans-serif" }}
      >
        {label}
      </text>
      {sub && (
        <text
          x={x + w / 2}
          y={y + 33}
          textAnchor="middle"
          fill="rgb(100 116 139)"
          style={{ font: "10px ui-sans-serif, system-ui, sans-serif" }}
        >
          {sub}
        </text>
      )}
    </g>
  );
}

function MemoryRow({
  x,
  y,
  w,
  h,
  label,
  value,
  fillFraction,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  value: string;
  fillFraction: number;
}) {
  // Two-tier bar: muted background showing the full slot, brand-green fill
  // showing how much of it is occupied.
  return (
    <g>
      {/* Background track */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={3}
        fill="rgb(241 245 249)"
      />
      {/* Filled portion */}
      <rect
        x={x}
        y={y}
        width={w * fillFraction}
        height={h}
        rx={3}
        fill="rgb(187 247 208)"
        stroke="rgb(21 128 61)"
        strokeWidth={1}
      />
      {/* Label */}
      <text
        x={x + 6}
        y={y + h / 2 + 4}
        fill="rgb(15 23 42)"
        style={{ font: "600 11px ui-sans-serif, system-ui, sans-serif" }}
      >
        {label}
      </text>
      {/* Value */}
      <text
        x={x + w - 6}
        y={y + h / 2 + 4}
        textAnchor="end"
        fill="rgb(71 85 105)"
        style={{ font: "11px ui-monospace, JetBrains Mono, monospace" }}
      >
        {value}
      </text>
    </g>
  );
}
