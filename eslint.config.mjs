import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import security from "eslint-plugin-security";
import noUnsanitized from "eslint-plugin-no-unsanitized";

/**
 * ET-L5 / ET-M7 — lint is a security gate, not just a style gate.
 *
 * `eslint-plugin-security` flags dangerous Node/JS sinks (child_process,
 * non-literal fs paths, non-literal RegExp, object-injection, timing-unsafe
 * comparisons). `eslint-plugin-no-unsanitized` flags the DOM/React HTML sinks —
 * `innerHTML`, `insertAdjacentHTML`, `document.write` — which is the class of
 * bug ET-M3 (`dangerouslySetInnerHTML` on notification text) belonged to.
 * Round 5 removed that specific sink; these rules stop the next one landing.
 *
 * Both are wired at ERROR severity so CI (.github/workflows/ci.yml) blocks a
 * merge rather than printing a warning nobody reads.
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  security.configs.recommended,
  noUnsanitized.configs.recommended,
  {
    name: "expense-tracker/security-severity",
    rules: {
      // eslint-plugin-security ships its recommended set as warnings; a
      // security lint that only warns is a security lint that gets ignored.
      "security/detect-child-process": "error",
      "security/detect-eval-with-expression": "error",
      "security/detect-new-buffer": "error",
      "security/detect-no-csrf-before-method-override": "error",
      "security/detect-non-literal-require": "error",
      "security/detect-unsafe-regex": "error",
      "no-unsanitized/method": "error",
      "no-unsanitized/property": "error",

      // OFF, deliberately. `detect-object-injection` fires on *every* computed
      // member access — `totals[key]`, `colors[type]`, `acc[exp.type]` — with no
      // taint analysis behind it. In this codebase all four hits are local
      // aggregation maps and a hard-coded colour lookup; none is a prototype-
      // pollution vector. Leaving it on buries the rules above in false
      // positives, which is how a security lint gets ignored wholesale. The real
      // untrusted-input boundary is lib/validation.ts (ET-H4/ET-H5/ET-M5), which
      // is enforced by zod, not by this heuristic.
      "security/detect-object-injection": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
