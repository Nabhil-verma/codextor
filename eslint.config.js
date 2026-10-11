// Flat ESLint config. Scope: application code and tests. Build output, the
// Convex backend (generated and owned separately) and build scripts are not
// linted here.
//
// Severity decisions, kept deliberately narrow:
// - Correctness rules (rules-of-hooks, no-fallthrough, prefer-const, ...) are
//   errors everywhere.
// - The React Compiler advisory rules (set-state-in-effect, refs, immutability,
//   set-state-in-render, preserve-manual-memoization) and exhaustive-deps are
//   warnings: they flag patterns that predate this config across many
//   components. They are reported on every run, not hidden.
// - `src/data` is authored curriculum content, frozen by the quiz work; its
//   string escapes are semantic no-ops and are not rewritten.
// - Destructured names prefixed with `_` are intentionally unused (omitting
//   props from a rest spread).
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "public", "convex", "scripts"] },
  {
    files: ["src/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/set-state-in-render": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    files: ["src/data/**/*.ts"],
    rules: {
      "no-useless-escape": "off",
    },
  },
);
