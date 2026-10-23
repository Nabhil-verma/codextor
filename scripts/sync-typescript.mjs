/*
 * Self-host the TypeScript compiler for the Playground.
 *
 * `typescript.js` is a 9 MB CommonJS bundle. Importing it into the app
 * makes Vite/Rollup parse the whole thing at build time, which needs about
 * 1 GB of memory and fails on small build machines. Serving the compiler as
 * a static script keeps it out of the module graph entirely. It declares a
 * global `ts` (its first statement is `var ts = {}`), and tsRunner.ts loads
 * it on demand, so JavaScript lessons still never pay for it.
 *
 * The copy is minified with the esbuild that Vite already uses (about 3.6 MB
 * instead of 9.1 MB, 1.0 MB instead of 1.6 MB gzipped). Vite copies
 * `public/` verbatim into `dist/`.
 *
 * Idempotent: it rewrites the copy only when it is missing or older than
 * this script or the compiler.
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SRC = "node_modules/typescript/lib/typescript.js";
const DEST_DIR = "public/typescript";
const DEST = join(DEST_DIR, "typescript.js");

if (!existsSync(SRC)) {
  console.error(`sync-typescript: ${SRC} is missing — run the install first.`);
  process.exit(1);
}

const upToDate =
  existsSync(DEST) &&
  statSync(DEST).mtimeMs >= statSync(SRC).mtimeMs &&
  statSync(DEST).mtimeMs >= statSync(new URL(import.meta.url)).mtimeMs;

if (upToDate) {
  console.log("sync-typescript: already up to date");
} else {
  // Vite is a declared devDependency; its transformWithEsbuild is the public
  // way to minify without depending on esbuild directly.
  const vite = await import("vite");
  const { code } = await vite.transformWithEsbuild(readFileSync(SRC, "utf8"), "typescript.js", {
    minify: true,
    target: "es2020",
    legalComments: "none",
  });
  mkdirSync(DEST_DIR, { recursive: true });
  writeFileSync(DEST, code);
  console.log(`sync-typescript: wrote minified typescript.js to ${DEST} (${code.length} bytes)`);
}
