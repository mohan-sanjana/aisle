"use client";

import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export function WizardStep({
  title,
  description,
  children,
  onBack,
  onNext,
  onReset,
  backLabel = "Back",
  nextLabel = "Next",
  hideBack = false,
  hideNext = false,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  onReset?: () => void;
  backLabel?: string;
  nextLabel?: string;
  hideBack?: boolean;
  hideNext?: boolean;
}) {
  return (
    <section className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-h2 text-slate-900">{title}</h2>
          {description && (
            <p className="mt-1 text-small text-slate-600">{description}</p>
          )}
        </div>
        {onReset && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            aria-label="Reset this step to defaults"
            className="no-print"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset step
          </Button>
        )}
      </header>

      <div>{children}</div>

      <footer className="no-print flex items-center justify-between border-t border-slate-200 pt-4">
        {!hideBack && onBack ? (
          <Button variant="outline" onClick={onBack}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            {backLabel}
          </Button>
        ) : (
          <span />
        )}
        {!hideNext && onNext && (
          <Button onClick={onNext}>
            {nextLabel}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </footer>
    </section>
  );
}
