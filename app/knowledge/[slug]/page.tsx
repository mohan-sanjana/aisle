import { readFile } from "node:fs/promises";
import path from "node:path";

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";

import { MDX_COMPONENT_MAP } from "@/mdx-components";
import { MODULES, getModule, moduleFilename } from "@/content/knowledge/modules";

import { ModuleHeader } from "../_components/module-header";
import { ModuleNav } from "../_components/module-nav";

export function generateStaticParams() {
  return MODULES.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const m = getModule(slug);
  if (!m) return { title: "Knowledge — Aisle" };
  return {
    title: `M${m.index} · ${m.title} — Aisle`,
    description: m.summary,
  };
}

export default async function KnowledgeModulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const m = getModule(slug);
  if (!m) notFound();

  // Read the MDX content at build time (static export) and let
  // next-mdx-remote compile + render with the registered components.
  const filepath = path.join(process.cwd(), moduleFilename(m));
  const source = await readFile(filepath, "utf-8");

  return (
    <article className="max-w-3xl">
      <ModuleHeader
        index={m.index}
        title={m.title}
        learningObjective={m.learning_objective}
        readingTimeMinutes={m.reading_time_minutes}
      />

      <div className="prose prose-lg prose-slate max-w-[70ch]">
        <MDXRemote source={source} components={MDX_COMPONENT_MAP} />
      </div>

      <ModuleNav currentSlug={slug} />
    </article>
  );
}
