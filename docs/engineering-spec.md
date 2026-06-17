# Aisle — Engineering Spec

For engineers maintaining or extending Aisle. Read alongside `project-overview.md` (the what and why) and `aisle-spec.md` (the original product spec).

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 15.1, App Router, static export** | `output: "export"` in `next.config.ts`. No backend. |
| Language | **TypeScript 5, strict mode** | No `any`. |
| Styling | **Tailwind 3.4 + @tailwindcss/typography** | Light mode only. Forest green accent. |
| Components | **shadcn/ui** (vendored) | No runtime dep on a component lib. |
| Diagrams (interactive) | **React Flow 11** | Used in Components topology diagrams and the Sizer schematic. |
| Diagrams (static) | **Mermaid 11** | Inline in Knowledge modules. |
| Content (Knowledge) | **MDX via next-mdx-remote** | `.mdx` files in `content/knowledge/modules/`. |
| Validation | **Zod 3** | Catalog schema enforcement. |
| Testing | **Vitest 2** | Unit + integration for the Sizer engine. |
| Lint / format | **ESLint + Prettier** | Standard Next.js defaults. |
| Hosting target | **Cloudflare Pages or Vercel** | Free tier, static export. |
| Analytics | **Plausible or Cloudflare Web Analytics** | Privacy-first, no cookies. |
| License | **MIT** | OSS-friendly. |

## Project layout

```
aisle/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # root: Inter/JetBrains Mono, Header/Footer
│   ├── page.tsx                      # landing
│   ├── globals.css                   # design tokens
│   ├── knowledge/                    # progressive curriculum
│   │   ├── layout.tsx                # left-rail sidebar
│   │   ├── page.tsx                  # curriculum index
│   │   ├── [slug]/page.tsx           # module renderer (reads MDX, uses MDXRemote)
│   │   └── _components/              # callout, glossary-term, mermaid, etc.
│   ├── components/                   # infrastructure reference
│   │   ├── layout.tsx                # left-rail sidebar
│   │   ├── page.tsx                  # stack overview (7 layers)
│   │   ├── enterprise/page.tsx       # worked example 1
│   │   ├── departmental/page.tsx     # worked example 2
│   │   ├── _components/              # topology-diagram, layer-card, etc.
│   │   └── _topologies/              # enterprise.ts, departmental.ts (data)
│   ├── sizer/                        # sizing wizard
│   │   ├── page.tsx
│   │   ├── _components/              # wizard, stepper, scenario cards, schematic, summary
│   │   └── _lib/                     # url-state, defaults, options, export-markdown
│   └── designer/                     # architecture designer (Phase 1, not yet built)
├── content/
│   └── knowledge/
│       ├── modules.ts                # module registry (slug → metadata)
│       ├── glossary.ts               # term → definition
│       └── modules/*.mdx             # 7 module bodies (4 written, 3 stubs)
├── lib/
│   ├── catalog/                      # typed catalog access
│   │   ├── types.ts
│   │   ├── schema.ts                 # Zod
│   │   └── index.ts                  # accessors (roadmap-filtered by default)
│   ├── sizer/                        # calculation engine
│   │   ├── index.ts                  # public API: sizeWorkload()
│   │   ├── types.ts                  # SizerInput, SizerOutput, ScenarioOutput
│   │   ├── constants.ts              # lookup tables, search orders, multipliers
│   │   ├── model-families.ts         # known model defaults (Llama, Mixtral, etc.)
│   │   ├── guardrails.ts             # boundary detection / warnings
│   │   ├── steps/                    # one file per major step (weights, kv-cache, vram, etc.)
│   │   └── __tests__/                # vitest suites (units, test-cases, edge-cases)
│   └── utils.ts                      # cn() helper
├── components/                       # shared UI primitives
│   ├── layout/                       # Header, Footer
│   └── ui/                           # shadcn primitives
├── data/
│   └── catalog.json                  # canonical catalog (45 entries)
├── scripts/
│   └── validate-catalog.ts           # CI entrypoint
├── docs/                             # spec, sizing-math, knowledge-outline, sources, this file
├── mdx-components.tsx                # MDX component registry (Callout, GlossaryTerm, etc.)
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

## Architecture decisions

### Static export, no backend
The whole app is statically rendered. The Sizer's calculation engine runs client-side. URL search params are the state store. There is no API, no database, no auth. This keeps Phase 1 deployable to free static hosts.

### Catalog as single source of truth
`data/catalog.json` is the only place hardware/software specs live. The Sizer, Components diagrams, and Knowledge MDX all reference it through `lib/catalog/index.ts`. Updates flow through a single file, validated against a Zod schema in CI.

### Calculation engine as a pure module
`lib/sizer/` is independent of any UI code. The public API is one function: `sizeWorkload(input: SizerInput): SizerOutput`. The pipeline composes 15 step modules. Every step is a pure function. Tested with Vitest against 5 worked cases and 25+ edge cases.

### Knowledge content as MDX
Modules are MDX files compiled at build time by `next-mdx-remote`. The components map (Callout, GlossaryTerm, etc.) is registered in `mdx-components.tsx` and passed explicitly to `<MDXRemote>` from the `[slug]` page. **Explicit passing matters** — the auto-injection that works for MDX-as-pages doesn't fire reliably for MDX-as-content.

### Roadmap filtering
Catalog entries marked `roadmap: true` (e.g., Vera Rubin) are filtered out by default from Sizer and Components. They're visible only in Knowledge content via the catalog API's `includeRoadmap` option. When roadmap entries graduate (flag flipped to false, fields populated), they automatically appear in all surfaces.

## Development

```bash
npm install
npm run dev          # localhost:3000
npm run test         # vitest
npm run test:watch   # vitest --watch
npm run typecheck    # tsc --noEmit
npm run lint
npm run validate:catalog
npm run build        # static export to out/
```

CI runs: `npm run validate:catalog` → `npm run lint` → `npm run typecheck` → `npm run test` → `npm run build`.

## Testing

The Sizer calc engine carries the test budget. Three suites:

- `units.test.ts` — fine-grained tests for individual step functions (KV math, parallelism plan, throughput table lookups).
- `test-cases.test.ts` — five worked cases from `docs/sizing-math.md` Section 6 (7B coding copilot, 70B RAG, 405B multi-node, 70B batch, 13B local). Each test asserts the major output values (GPU family, replica count, fabric type, cooling tier) with ±10–20% tolerance.
- `edge-cases.test.ts` — guardrail behaviors (L40S boundary, TPOT unreachable, PP across nodes, MoE confidence margin, throughput override, roadmap silicon filter, scenario semantics).

The UI is not currently tested. If you add UI tests, recommend Playwright for E2E + Vitest for utility-function tests.

## Key contracts

### `SizerInput` → `SizerOutput`
The fundamental data flow. Defined in `lib/sizer/types.ts`. Both shapes are stable and have version-able fields; treat them as a public API.

### URL state codec
In `app/sizer/_lib/url-state.ts`. Uses short codes (`mf`, `ctx`, `tpot`, `bf`, etc.) to keep shared URLs concise. Round-trip safe; any value that decodes back to the default is omitted from the encoded URL, so equivalent inputs produce identical strings.

### Catalog entry IDs
Lowercase-with-hyphens, vendor-prefixed for accelerators (`nvidia-h100-sxm`). Used as primary keys throughout the app. Adding a new entry: pick a stable ID, add the entry to `catalog.json`, add the source citation to `docs/catalog-sources.md`, let CI validate.

### MDX component registry
`mdx-components.tsx` at the project root exports `useMDXComponents`. The function takes existing components and returns the merged map. Any component listed here is available in `.mdx` files without an import. Pass it explicitly to `<MDXRemote components={...}>`.

## Conventions

### File naming
- `kebab-case` for files and directories
- `.tsx` for React components
- `.mdx` for Knowledge prose
- `.ts` for logic, types, data
- `_components/`, `_lib/`, `_topologies/` (underscore prefix) for route-local code that should never be a route itself

### Imports
- `@/*` alias maps to project root
- Catalog access via `@/lib/catalog`, never importing `catalog.json` directly
- shadcn primitives via `@/components/ui/*`

### Comments
- Comment why, not what
- File headers describe the file's purpose
- Step files in `lib/sizer/steps/` document the formula they implement

### Voice (Knowledge and Components prose)
- **No em dashes** — use periods, commas, colons, semicolons, parens
- Simple but full sentences
- Concrete numbers with sources
- Real GPU SKUs by name (per the Phase 1 vendor decision)
- No marketing language ("powerful", "leading", "blazing-fast" all forbidden)

## Known gotchas

- **MDX components must be passed explicitly.** The `mdx-components.tsx` auto-injection only fires reliably for MDX-as-pages, not MDX-as-content. We use `next-mdx-remote/rsc` and pass `components={useMDXComponents({})}` to `<MDXRemote>` from the `[slug]` page.
- **Tailwind JIT and `@apply`.** New utility classes referenced via `@apply` in `globals.css` sometimes need a dev server restart to be picked up. If a CSS change isn't showing up, restart `npm run dev`.
- **Static export and dynamic routes.** Every dynamic slug must be in `generateStaticParams` or the build fails. Knowledge and Components both follow this pattern.
- **Server vs client components.** Prose modules and topology pages are server components. Interactive bits (`<GlossaryTerm>`, `<KnowledgeMermaid>`, React Flow diagrams, the Sizer wizard) are client components with `"use client"`. The boundary is enforced at file-level.
- **L40S boundary in the Sizer.** `pickGpu()` refuses to recommend L40S for models > 30 GB weights. Without this guard, the search order picks L40S for 70B models that don't actually fit (L40S has no NVLink, so multi-GPU TP collapses throughput). This is documented in `sizing-math.md` §5.
- **MoE active_params_b.** For MoE models, `active_params_b` must be set explicitly or via the model family lookup. The engine uses it for compute math; weights memory still uses total params (everything must be resident).
- **Bandwidth-headroom GPU promotion.** `pickGpu()` tries 1.3× bandwidth headroom first, falls back to 1.0× if nothing matches. This avoids the worked-example case where the engine picks a barely-adequate L40S/A100 for a workload that should land on H100/H200.
- **Cooling tier dense-packing.** The cooling logic targets ~80 kW/rack (RDHX envelope) by default. Sparse facilities will see different recommendations. There's no facility-constraints input yet; see Phase 2 roadmap.

## How to add things

### A new GPU SKU
1. Add to `data/catalog.json` `accelerators` array (template from any existing entry).
2. Add citation to `docs/catalog-sources.md`.
3. Optionally add to `GPU_SEARCH_ORDER` in `lib/sizer/constants.ts` if it should be considered by the Sizer.
4. Add throughput entries to `THROUGHPUT_TABLE` for any (model_bucket, gpu, count) tuples you have benchmarks for.
5. CI runs Zod schema validation; fix any errors.

### A new model family
1. Add to `lib/sizer/model-families.ts` `MODEL_FAMILIES` array.
2. If it's a reasoning model, set `reasoning: true` and `default_avg_output_tokens` (5,000–10,000 typical).
3. If it's MoE, set `active_params_b` (the per-token active count).
4. If it uses MLA, set `uses_mla: true`.

### A new Knowledge module
1. Create `content/knowledge/modules/m{N}-{slug}.mdx`.
2. Add an entry to `content/knowledge/modules.ts` `MODULES` array (slug, index, title, summary, learning_objective, reading_time_minutes, prerequisites).
3. Add any new glossary terms to `content/knowledge/glossary.ts`.
4. The route auto-generates from the registry.

### A new shared MDX component
1. Create the component file under `app/knowledge/_components/`.
2. Register in `mdx-components.tsx` (add to the returned object).
3. Use in any `.mdx` file without an explicit import.

### A new topology in Components
1. Add a topology data file under `app/components/_topologies/` (follow the pattern in `enterprise.ts`).
2. Create the page at `app/components/<name>/page.tsx`, mirroring the existing pages.
3. Add a nav entry to `app/components/layout.tsx`.

### A new Sizer scenario type (beyond Baseline/Burst/Resilient)
1. Add a `ScenarioName` value to `lib/sizer/types.ts`.
2. Add the scenario's multipliers to `buildScenarioParams` in `lib/sizer/steps/scenarios.ts`.
3. Run the scenario through the pipeline in `lib/sizer/index.ts` and emit it in the output.
4. Add a scenario card variant for it in `app/sizer/_components/scenario-card.tsx`.
5. Add tests in `__tests__/test-cases.test.ts`.

## Deployment

Static export to Cloudflare Pages or Vercel. No env vars required. No backend. Hosted at `sanjana-mohan.com/aisle` (production); per-PR preview deploys via the host's git integration.

## Open architectural questions

These are decisions deferred but worth flagging for future engineers:

1. **Facility-constraints input.** The Sizer has no way to express "my colo caps at 12 kW/rack" or "no liquid cooling allowed." A `facility_profile` enum input would let the engine respect real constraints.
2. **TCO and pricing.** Out of Phase 1 scope. When added, will need a pricing data source (volatile) and a TCO formula spec.
3. **Authentication and saved workspaces.** Currently sharable-URL-only. If we add saved workspaces, the next decision is between localStorage (simple, no backend) and an auth backend (real but Phase 2+).
4. **Catalog update cadence in practice.** Spec calls for quarterly review. Worth automating the "create a quarterly review issue" workflow via GitHub Actions.
5. **Pilot interview infrastructure.** Spec has the script; no booking link or scheduling helper exists yet.
