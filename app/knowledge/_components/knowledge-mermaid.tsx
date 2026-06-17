"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Lazy-loaded Mermaid renderer. The `mermaid` dep is already in package.json;
 * we dynamically import it client-side so it doesn't block SSR or bloat the
 * initial bundle.
 *
 * Use sparingly. Two diagrams across the whole Knowledge curriculum:
 *   M3 — request lifecycle (sequence)
 *   M4 — memory stack (block)
 */
export function KnowledgeMermaid({
  source,
  caption,
}: {
  source: string;
  caption?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
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
        const { svg } = await mermaid.render(id, source);
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
  }, [source]);

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
