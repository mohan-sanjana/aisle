import type { ComponentType } from "react";

import { Callout } from "@/app/knowledge/_components/callout";
import { GlossaryTerm } from "@/app/knowledge/_components/glossary-term";
import { KnowledgeMermaid } from "@/app/knowledge/_components/knowledge-mermaid";
import { TryInSizer } from "@/app/knowledge/_components/try-in-sizer";

type ComponentMap = Record<string, ComponentType<Record<string, unknown>>>;

/**
 * Components available in every MDX file without an explicit import.
 * Passed to <MDXRemote components={...}> in app/knowledge/[slug]/page.tsx.
 *
 * Module authors can use these directly in markdown:
 *
 *   ## A heading
 *
 *   <Callout variant="key">A highlighted box.</Callout>
 *
 *   <GlossaryTerm id="kv_cache">KV cache</GlossaryTerm> with a hover tooltip.
 */
export const MDX_COMPONENT_MAP: ComponentMap = {
  Callout: Callout as ComponentType<Record<string, unknown>>,
  GlossaryTerm: GlossaryTerm as ComponentType<Record<string, unknown>>,
  KnowledgeMermaid: KnowledgeMermaid as ComponentType<Record<string, unknown>>,
  TryInSizer: TryInSizer as ComponentType<Record<string, unknown>>,
};

/**
 * Next.js convention export. Kept so any auto-injection path that looks for
 * `useMDXComponents` still resolves. Functionally equivalent to spreading
 * MDX_COMPONENT_MAP after the incoming components.
 */
export function useMDXComponents(components: ComponentMap): ComponentMap {
  return {
    ...components,
    ...MDX_COMPONENT_MAP,
  };
}
