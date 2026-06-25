/**
 * Word-count based reading-time estimator for Knowledge MDX modules.
 *
 * Runs at build time (server components read the .mdx, call this, and bake
 * the result into the static page), so there is no runtime cost. The
 * displayed reading time updates automatically when content changes or
 * when new modules are added — no metadata edits required.
 *
 * 220 words per minute is a common figure for technical prose. The Nielsen
 * Norman Group puts general adult reading at 250 wpm; we shave a little for
 * the heavier vocabulary and concept density in this curriculum.
 */
const WORDS_PER_MINUTE = 220;

/**
 * MDX components used in our modules whose inner text is *not* prose the
 * reader is meant to read linearly: diagrams, CTA cards, captions inside
 * figures. These get stripped wholesale (tags + content) before counting.
 *
 * <Callout> and <GlossaryTerm> are intentionally not in this list — their
 * inner text IS prose and should count toward reading time.
 */
const SKIP_BLOCK_COMPONENTS = ["KnowledgeMermaid", "TryInSizer", "img", "figure"] as const;

const SKIP_PATTERN = new RegExp(
  `<(${SKIP_BLOCK_COMPONENTS.join("|")})\\b[\\s\\S]*?(?:/>|</\\1>)`,
  "g",
);

export function estimateReadingTime(mdxText: string): number {
  const wordCount = countWords(mdxText);
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}

export function countWords(mdxText: string): number {
  const stripped = mdxText
    // Multi-line JSX blocks for diagrams, CTA cards, figures: drop entirely.
    .replace(SKIP_PATTERN, " ")
    // Fenced code blocks (```...```) — not prose.
    .replace(/```[\s\S]*?```/g, " ")
    // Inline code spans (`code`).
    .replace(/`[^`]*`/g, " ")
    // Markdown links [text](url) → keep just the text.
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Bare URLs.
    .replace(/https?:\/\/\S+/g, " ")
    // Remaining inline HTML/JSX tags (e.g. <GlossaryTerm id="..."> wrappers)
    // — keep the wrapped text, drop just the tag itself.
    .replace(/<\/?[A-Za-z][^>]*>/g, " ")
    // Markdown emphasis / heading / list markers.
    .replace(/[*_~#>]/g, " ")
    .trim();

  if (!stripped) return 0;
  return stripped.split(/\s+/).filter((w) => w.length > 0).length;
}
