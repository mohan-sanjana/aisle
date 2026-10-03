# Aisle — notes for Claude

Aisle (AI Sizing and Learning Environment) is an open-source web app that helps IT admins plan on-prem infrastructure for AI inference. Repo: github.com/mohan-sanjana/aisle. Deployed on Vercel from `main`; every push to `main` ships to prod.

Owner: Sanjana Mohan (PM). She writes and edits most curriculum prose herself; Claude's job is usually cleanup, structure, wiring, and drafting new modules for her to edit.

## Stack

- Next.js 15 (App Router, static export), TypeScript strict, Tailwind 3 + @tailwindcss/typography, shadcn/ui
- MDX via next-mdx-remote v6 (RSC) with remark-gfm
- Zod for catalog validation, Vitest for tests, Mermaid for diagrams
- Commands: `npm run dev`, `npm run build`, `npm run test`, `npm run typecheck`, `npm run validate:catalog`

## Site sections

- **Knowledge** (`/knowledge`): the curriculum. Main area of active work.
- **Components** (`/components`): reference for each infrastructure layer.
- **Sizer** (`/sizer`): calculation engine in `lib/sizer/` plus a wizard UI. Math is documented in `docs/sizing-math.md`.
- **Designer** (`/designer`): not built yet ("coming soon").

## Knowledge curriculum

- Module registry: `content/knowledge/modules.ts` (order, `part`, title, summary, learning objective, prerequisites). Sidebar groups modules by `part` using `PART_NAMES`.
- Module prose: `content/knowledge/modules/{slug}.mdx`. Filenames are slug-only, so reordering only needs `modules.ts` edits.
- Reading time is computed from word count at build time (`content/knowledge/reading-time.ts`). Do not hardcode it.
- Available MDX components: `<GlossaryTerm id="...">`, `<Callout variant="key|note|pitfall">`, `<KnowledgeMermaid name="..." caption="..." />`, `<TryInSizer prompt="..." params={{...}} />`.
- Mermaid diagrams live in `content/knowledge/diagrams.ts` and are referenced by `name`. Do not inline diagram source in MDX (next-mdx-remote v6 drops template-literal props).
- Glossary IDs: `content/knowledge/glossary.ts`.

### Current structure (14 modules)

| # | Part | Slug | Status |
|---|---|---|---|
| 1 | I Foundations | what-is-inference | done |
| 2 | I Foundations | tokens-and-context-windows | done |
| 3 | II GPU architecture and memory | inside-a-gpu | done (Jensen Huang GIF still to add) |
| 4 | II | how-a-model-serves ("How a model makes a token") | done |
| 5 | II | kv-cache | done |
| 6 | II | managing-kv-pressure | done |
| 7 | II | playbook-breaks (five broken assumptions) | done |
| 8 | III Planning your workload | seven-parameters | done |
| 9 | III | worked-example | done |
| 10 | IV A single inference server | single-server | drafted, awaiting Sanjana's review |
| 11 | V Scaling out | beyond-one-gpu | TODO: new write (TP/PP/EP, replicas, routing, fabrics) |
| 12 | VI Production | inference-engines | TODO: new write (vLLM, TensorRT-LLM, SGLang, Triton) |
| 13 | VI | optimization-techniques | TODO: voice pass; open by bridging from inference engines |
| 14 | VI | it-ai-conversation | TODO: voice pass; reframe as the curriculum's closing synthesis |

Deferred for a later version: workload patterns, day-2 operations.

## Voice rules (apply to all curriculum prose)

- No em dashes or en dashes. Use commas, parentheses, colons, or periods.
- Straight ASCII quotes and apostrophes only.
- Full, proper adult sentences. Avoid choppy fragment-style punchiness.
- Curious, conversational framing. Explain jargon on first use; wrap first mentions of glossary terms in `<GlossaryTerm>`.
- Easy analogies when they genuinely fit (school/career for training vs inference, F1 pit crew for prefill, SAT reading passage). Drop an analogy rather than force one.
- Refer to other modules by description ("the KV cache module", "the next module"), never by number, since numbering shifts.
- Each module ends with a short bridge to the next module.
- When Sanjana pastes revised prose, keep her wording; fix typography, broken formatting from rich-text paste, obvious typos, and cross-module bridges, and flag anything substantive you changed.

## Working conventions

- Check with Sanjana before restructuring the curriculum or making substantive content changes.
- Run `npm run typecheck` after changes. Commit with descriptive messages.
- `header.tsx` nav labels are intentionally "Knowledge / Components / Sizer / Designer". Don't rename them.
