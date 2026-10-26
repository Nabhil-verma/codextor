/*
 * Bundle the Sites Worker.
 *
 * `sites.deploy.json` uploads exactly one module, `sites/worker.js`, next to the
 * static SPA. The source lives in `sites/api/*.ts` so it can share the pure
 * modules in `src/lib` (XP rules, guild ladder, atlas merge) with the app and be
 * covered by the same `tsc` run and the same tests.
 *
 * Bundling is deliberate: the deployed manifest is one file, so there is no
 * runtime module resolution to get wrong.
 */
import { build } from "esbuild";

await build({
  entryPoints: ["sites/api/worker.ts"],
  outfile: "sites/worker.js",
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  conditions: ["worker", "browser", "import", "module", "default"],
  mainFields: ["module", "main"],
  legalComments: "none",
  logLevel: "warning",
  define: { "process.env.NODE_ENV": '"production"' },
});

console.log("build-worker: wrote sites/worker.js");
