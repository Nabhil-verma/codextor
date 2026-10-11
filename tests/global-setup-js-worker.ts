/*
 * Builds the Node worker bundle for the JavaScript sandbox once per test run.
 *
 * This runs in the plain Node process, before any test environment (jsdom
 * included) exists. esbuild cannot be imported inside jsdom: its TextEncoder
 * invariant check fails there. The per-file setup (setup-js-worker.ts) only
 * spawns the prebuilt file.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { buildSync } from "esbuild";
import { JS_WORKER_BUNDLE } from "./js-worker-bundle-path";

export default function setup() {
  mkdirSync(join(process.cwd(), "node_modules/.cache/codextor"), { recursive: true });
  buildSync({
    entryPoints: [join(process.cwd(), "tests/fixtures/js-worker-node.ts")],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node18",
    outfile: JS_WORKER_BUNDLE,
    logLevel: "silent",
  });
}
