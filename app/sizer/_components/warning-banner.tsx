import { AlertTriangle } from "lucide-react";

export function WarningBanner({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;

  return (
    <div
      className="rounded-md border border-amber-300 bg-amber-50 p-3 text-small text-amber-900"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
          aria-hidden="true"
        />
        <div className="flex-1">
          <p className="font-medium text-amber-900">
            {warnings.length === 1
              ? "1 guardrail triggered"
              : `${warnings.length} guardrails triggered`}
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
