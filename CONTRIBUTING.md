# Contributing to Aisle

Aisle is open source and MIT-licensed. The most common contribution is updating the catalog as hardware specs and serving engines evolve.

## Catalog updates

The canonical catalog is `data/catalog.json`. It is the single source of truth used by the Knowledge pages, Infrastructure Components, Sizer, and Designer. **Update specs in one place; the rest of the app picks up the change at build time.**

### Schema

Top-level shape (full types in `lib/catalog/types.ts`, runtime validation in `lib/catalog/schema.ts`):

```ts
type Catalog = {
  _meta: { version: string; last_updated: string; notes: string };
  accelerators: Accelerator[];
  networking: NetworkingComponent[];
  storage: StorageTier[];
  power_cooling: PowerCoolingTier[];
  optimizations: Optimization[];
  serving_engines: ServingEngine[];
};
```

Every entry has a stable `id` (kebab-case). Other entries reference it by id — never duplicate spec data.

### Rules

1. **Cite every numeric spec.** Every entry has a `sources` array with at least one URL. If a vendor publishes the number, that URL is the source. If we computed it (e.g., dense FLOPS from a sparse marketing figure), note the calculation in `notes`.
2. **Prefer `null` over extrapolation.** If a vendor doesn't publish a value at a given precision, set the field to `null`. Do not guess.
3. **Use the dense convention for FLOPS.** Vendor marketing often quotes 2× sparse — halve those numbers and note it.
4. **Roadmap entries are allowed.** Set `roadmap: true` for unreleased silicon. Most fields can be `null`. These appear in Knowledge content with a "Roadmap" badge but are filtered out of the Sizer and Designer until they graduate.
5. **Don't break ids.** External catalog references (in templates, sizing-math worked examples) depend on stable ids.

### PR flow

1. Fork the repo.
2. Make your catalog edit in `data/catalog.json`.
3. Run `npm run validate:catalog` locally.
4. Run `npm run typecheck` and `npm run build` to make sure nothing downstream breaks.
5. Open a PR. CI runs schema validation; invalid entries block merge.
6. The maintainer (Sanjana Mohan) reviews and merges.

### Review cadence

The catalog is reviewed quarterly. A reminder issue is auto-created on the first Monday of each quarter. New silicon, new serving engines, and significant spec updates should land in those review windows where possible.

## Code contributions

For bugs and small fixes, open a PR. For larger features (new archetypes, new wizard steps, new sections), please open an issue first to discuss scope.

Local development:

```bash
npm install
npm run dev
```

Before submitting:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Code of conduct

Be respectful. Disagreements about technical decisions are welcome; personal attacks are not.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
