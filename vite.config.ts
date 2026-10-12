/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { offlinePacksPlugin } from "./scripts/offline-packs.mjs";

/*
 * `bun run build:analyze` (vite build --mode analyze) also writes
 * dist/stats.html — a treemap of the real production bundle, so the route
 * code splitting is something we measure instead of assume. Plain
 * `vite build` stays exactly as fast as before; the plugin never runs.
 */
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Writes offline-packs.json so the Learn page can save tracks for offline use.
    offlinePacksPlugin(),
    ...(mode === "analyze"
      ? [
          visualizer({
            filename: "dist/stats.html",
            gzipSize: true,
            template: "treemap",
          }),
        ]
      : []),
  ],
  server: {
    host: "0.0.0.0",
    port: Number(process.env.PORT) || 5173,
    hmr: false,
  },
  preview: {
    host: "0.0.0.0",
    port: Number(process.env.PORT) || 4173,
  },
  test: {
    // Gives Node a browser-shaped Worker for the JS sandbox (see the file).
    globalSetup: ["./tests/global-setup-js-worker.ts"],
    setupFiles: ["./tests/setup-js-worker.ts"],
    /*
     * Wall-clock ceiling for a single test. Several suites drive the *real*
     * sandbox in loops — one worker thread per run, each carrying its own
     * JS_TIMEOUT_MS (4000) budget — so they are seconds of genuine CPU work:
     * `curriculum` already takes ~12s to run every starter and check
     * expression on an idle box. Under that load Vitest's 5s default failed
     * whichever sandbox test the scheduler starved ("Test timed out in
     * 5000ms"), i.e. it measured contention rather than correctness. This
     * raises the ceiling only; no test asserts differently.
     */
    testTimeout: 30_000,
  },
}));
