import type { ReactNode } from "react";

// Foundation: placeholder. Filled in by Knowledge content agent.
// The left-rail ToC will be auto-generated from MDX frontmatter once content lands
// under /content/knowledge/.
export default function KnowledgeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <nav aria-label="Knowledge table of contents">
            <p className="text-small font-semibold text-slate-500">Contents</p>
            <ul className="mt-3 space-y-2 text-small">
              {/* Foundation: placeholder. Filled in by Knowledge content agent. */}
            </ul>
          </nav>
        </aside>
        <article className="max-w-3xl">{children}</article>
      </div>
    </div>
  );
}
