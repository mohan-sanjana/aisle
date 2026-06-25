"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { DIAGRAMS, type DiagramName } from "@/content/knowledge/diagrams";

/**
 * Lazy-loaded Mermaid renderer. The `mermaid` dep is already in package.json;
 * we dynamically import it client-side so it doesn't block SSR or bloat the
 * initial bundle.
 *
 * Preferred MDX usage is the registry form, which is bulletproof against
 * next-mdx-remote v6's flaky JSX expression serialization:
 *
 *   <KnowledgeMermaid name="request-lifecycle" caption="..." />
 *
 * The `name` prop is just a plain string attribute — no template literals,
 * no expression children — so it always survives the MDX -> RSC -> client
 * compile path. The actual diagram source lives in
 * `content/knowledge/diagrams.ts`.
 *
 * `source` and `children` are still accepted for ad-hoc one-off diagrams,
 * but the registry form should be preferred.
 */
export function KnowledgeMermaid({
  name,
  source,
  children,
  caption,
}: {
  name?: DiagramName | string;
  source?: string;
  children?: React.ReactNode;
  caption?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Resolve the diagram source from whichever channel the MDX used.
  // Priority: explicit `source` prop > registry lookup by `name` > children.
  const diagramSource = useMemo(() => {
    if (source) return source.trim();
    if (name && name in DIAGRAMS) {
      return DIAGRAMS[name as DiagramName].trim();
    }
    return extractText(children).trim();
  }, [name, source, children]);

  useEffect(() => {
    let cancelled = false;
    if (!diagramSource) {
      setError(
        "No diagram source provided. Pass it via the `source` prop or as the component's children.",
      );
      return;
    }
    void (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "neutral",
          themeVariables: {
            primaryColor: "#dcfce7",
            primaryTextColor: "#0f172a",
            primaryBorderColor: "#15803d",
            lineColor: "#475569",
            secondaryColor: "#f8fafc",
            tertiaryColor: "#ffffff",
            fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
          },
        });
        const id = `mmd-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, diagramSource);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "Could not render Mermaid diagram.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [diagramSource]);

  return (
    <figure className="my-8 overflow-x-auto rounded-lg border border-slate-200 bg-white p-4">
      <div ref={ref} aria-hidden={!!error} className="flex justify-center" />
      {error && (
        <p className="text-xs text-red-700">Diagram failed to render: {error}</p>
      )}
      {caption && (
        <figcaption className="mt-3 text-center text-xs text-slate-500">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

/**
 * Recursively flatten a React node into plain text. Handles strings, arrays,
 * and elements whose children are themselves nested. Used to read diagram
 * source from MDX children when the `source` prop isn't supplied.
 */
function extractText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (typeof node === "object" && "props" in node) {
    const props = (node as { props?: { children?: React.ReactNode } }).props;
    return extractText(props?.children);
  }
  return "";
}
