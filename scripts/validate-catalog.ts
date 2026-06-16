/**
 * CI catalog validation entrypoint.
 *
 * Imports the catalog through `lib/catalog/index.ts`, which runs the Zod
 * schema parse on load. Any ZodError propagates and exits the process with
 * a non-zero status, blocking the PR.
 *
 * Run with: `npm run validate:catalog`
 */

import { getCatalog } from "../lib/catalog";

function main() {
  const catalog = getCatalog();

  const counts = {
    accelerators: catalog.accelerators.length,
    networking: catalog.networking.length,
    storage: catalog.storage.length,
    power_cooling: catalog.power_cooling.length,
    optimizations: catalog.optimizations.length,
    serving_engines: catalog.serving_engines.length,
  };

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  // Additional invariants beyond schema parsing.
  const seenIds = new Set<string>();
  for (const [category, items] of Object.entries(catalog)) {
    if (category === "_meta") continue;
    for (const item of items as Array<{ id: string }>) {
      const key = `${category}:${item.id}`;
      if (seenIds.has(key)) {
        console.error(`Duplicate id within ${category}: ${item.id}`);
        process.exit(1);
      }
      seenIds.add(key);
    }
  }

  console.log(`Catalog validated. Version ${catalog._meta.version}, last updated ${catalog._meta.last_updated}.`);
  console.log(`Total entries: ${total}`);
  for (const [category, count] of Object.entries(counts)) {
    console.log(`  ${category}: ${count}`);
  }
}

try {
  main();
} catch (err) {
  console.error("Catalog validation failed:");
  console.error(err);
  process.exit(1);
}
