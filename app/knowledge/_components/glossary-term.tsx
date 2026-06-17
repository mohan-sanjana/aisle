"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { GLOSSARY } from "@/content/knowledge/glossary";

/**
 * Inline glossary term. Wrap a phrase in prose to give it a hover tooltip
 * with the definition from `content/knowledge/glossary.ts`.
 *
 *   <GlossaryTerm id="kv_cache">KV cache</GlossaryTerm>
 *
 * Use only on the first occurrence of a term per module.
 */
export function GlossaryTerm({
  id,
  children,
}: {
  id: keyof typeof GLOSSARY;
  children: React.ReactNode;
}) {
  const entry = GLOSSARY[id];
  if (!entry) {
    return <span>{children}</span>;
  }
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help border-b border-dotted border-slate-400">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">
            {entry.term}
          </p>
          <p className="mt-1 text-sm leading-relaxed">{entry.definition}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
