import { cn } from "@/lib/utils";

type CalloutVariant = "key" | "pitfall" | "note";

const VARIANTS: Record<
  CalloutVariant,
  { label: string; border: string; bg: string; text: string }
> = {
  key: {
    label: "Key idea",
    border: "border-brand-200",
    bg: "bg-brand-50",
    text: "text-brand-900",
  },
  pitfall: {
    label: "Common pitfall",
    border: "border-amber-200",
    bg: "bg-amber-50",
    text: "text-amber-900",
  },
  note: {
    label: "Note",
    border: "border-slate-200",
    bg: "bg-slate-50",
    text: "text-slate-800",
  },
};

export function Callout({
  variant = "key",
  title,
  children,
}: {
  variant?: CalloutVariant;
  title?: string;
  children: React.ReactNode;
}) {
  const v = VARIANTS[variant];
  return (
    <aside
      className={cn(
        "my-6 rounded-lg border-l-4 px-5 py-4",
        v.border,
        v.bg,
        v.text,
      )}
    >
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide">
        {title ?? v.label}
      </p>
      <div className="text-sm leading-relaxed">{children}</div>
    </aside>
  );
}
