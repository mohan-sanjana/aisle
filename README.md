# Aisle

**AI Sizing and Learning Environment** — a web app that helps IT admins plan on-premises infrastructure for AI inference workloads.

Aisle has four surfaces, each serving a different stage of the planning journey:

1. **Knowledge** — learn the foundations of LLM inference.
2. **Infrastructure Components** — see the stack in concrete example workloads.
3. **Sizer** — quantify what your workload requires.
4. **Architecture Designer** — visualize the deployment topology you should build.

The "aisle" metaphor is the rack aisle that runs between rows of servers — where infrastructure planners literally walk to think about what they're building.

## Status

Phase 1 build in progress. The full spec lives in `aisle-spec.md` (alongside the catalog and sizing math documents).

## Quickstart

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

To produce a static export:

```bash
npm run build
```

The output is written to `out/` and can be served from any static host (Cloudflare Pages, Vercel, GitHub Pages, S3, etc.).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local dev server with hot reload |
| `npm run build` | Static export to `out/` |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest unit tests |
| `npm run validate:catalog` | Validate `data/catalog.json` against the Zod schema |

## Repository layout

```
aisle/
  app/                    Next.js App Router pages
    knowledge/            Educational content (4 pages)
    components/           Infrastructure Components (overview + 2 examples)
    sizer/                Sizing wizard
    designer/             Architecture Designer
  components/
    layout/               Header, footer
    ui/                   shadcn primitives (Button, Card, Dialog, Tabs, ...)
  lib/
    catalog/              Typed catalog access (types, schema, getters)
    sizer/                Pure-TS sizing calc engine (added by Sizer agent)
    designer/             Pure-TS designer rule engine (added by Designer agent)
    utils.ts              cn() helper
  data/
    catalog.json          Canonical catalog (single source of truth)
  scripts/
    validate-catalog.ts   CI catalog validation entrypoint
  content/                MDX knowledge pages (added by Knowledge agent)
```

## Tech stack

- **Next.js 15** (App Router, static export)
- **TypeScript** (strict)
- **Tailwind CSS** (light mode only)
- **shadcn/ui** (Radix-based primitives, vendored under `components/ui/`)
- **React Flow** for interactive topology diagrams
- **Mermaid** for inline static diagrams in Knowledge prose
- **Zod** for runtime catalog validation
- **Vitest** for unit tests

State is encoded in URL search params; there is no backend.

## Catalog

`data/catalog.json` is the single source of truth for hardware, networking, storage, power/cooling, optimizations, and serving engines. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the schema and contribution flow.

## Spec

The full Phase 1 spec is in the project root as `aisle-spec.md`. Companion documents:

- `sizing-math.md` — calculation engine specification
- `knowledge-outline.md` — Knowledge content outlines
- `catalog-sources.md` — citation index for every catalog entry

## License

[MIT](./LICENSE). Aisle is an open-source project by Sanjana Mohan.
