import { cn } from "@/lib/utils";
import type { SizerConfidence } from "@/lib/sizer/types";

export function ConfidenceBadge({
  confidence,
  className,
}: {
  confidence: SizerConfidence;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-xs",
        confidence.is_moe
          ? "border-amber-300 bg-amber-50 text-amber-800"
          : "border-brand-100 bg-brand-50 text-brand-800",
        className,
      )}
      title={
        confidence.is_moe
          ? "MoE sizing has wider uncertainty due to routing and expert-activation variance."
          : "Dense / GQA sizing has tighter bounds; ±15% reflects benchmark spread."
      }
    >
      <span aria-hidden="true">±</span>
      {confidence.margin_pct}%{" "}
      <span className="font-sans text-[10px] uppercase tracking-wide">
        {confidence.is_moe ? "MoE" : "dense"}
      </span>
    </span>
  );
}
