import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = dirname(fileURLToPath(import.meta.url));

/**
 * Round 8 — the first test configuration this repository has had.
 *
 * SCOPE. These tests exist to protect the security properties the platform
 * review identified, not to chase a coverage number:
 *
 *   tests/expenses-route.test.ts  ownership scoping on all four expense verbs
 *                                 (the no-IDOR positive control, §E) plus the
 *                                 new §G.4 pagination boundary
 *   tests/validation.test.ts      the Round 3 zod trust boundary
 *                                 (ET-H4 / ET-H5 / ET-M5)
 *   tests/middleware.test.ts      the Round 2 default-deny authorization
 *                                 matrix (ET-H2)
 *
 * OFFLINE AND ENV-FREE. Nothing here opens a socket. Mongoose, NextAuth and
 * `next/server` are mocked at the module boundary, so `npm test` passes on a
 * clean checkout with no MONGODB_URI, no NEXTAUTH_SECRET and no network — which
 * is what lets CI run it (.github/workflows/ci.yml) without being handed a
 * credential.
 */
export default defineConfig({
  resolve: {
    // Mirrors the `@/*` path mapping in tsconfig.json so test files and the
    // modules under test resolve imports identically.
    alias: { "@": rootDir },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Route handlers read `process.env` and Response.json; the Node
    // environment provides both without a DOM.
    clearMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["lib/**/*.ts", "app/api/**/*.ts", "middleware.ts"],
      reportsDirectory: resolve(rootDir, "coverage"),
    },
  },
});
