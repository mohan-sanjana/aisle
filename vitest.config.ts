import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Vitest configuration for the Sizer calc engine.
 * The "@/" path alias matches tsconfig.json so imports work uniformly.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["lib/**/*.test.ts", "lib/**/__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["lib/sizer/**/*.ts"],
      exclude: ["lib/sizer/**/__tests__/**", "lib/sizer/types.ts"],
    },
  },
});
