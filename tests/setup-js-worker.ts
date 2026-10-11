/*
 * Test-only: gives Node a browser-shaped `Worker` for the JavaScript sandbox.
 *
 * The production path (src/lib/runner.ts) spawns a module Worker per run. Node
 * has none, so this runs the same sandbox core on a real worker thread, from
 * the bundle that tests/global-setup-js-worker.ts prebuilt. Termination is real
 * too: a synchronous hang can be killed, which is what the runner relies on.
 *
 * Installed only where the global is missing, so a test can still replace
 * `globalThis.Worker` with a fake.
 */
import { Worker as NodeWorker } from "node:worker_threads";
import { JS_WORKER_BUNDLE } from "./js-worker-bundle-path";

const holder = globalThis as { Worker?: unknown };

if (typeof holder.Worker === "undefined") {
  class NodeSandboxWorker {
    onmessage: ((event: { data: unknown }) => void) | null = null;
    onerror: ((event: unknown) => void) | null = null;
    onmessageerror: ((event: unknown) => void) | null = null;
    private readonly worker: NodeWorker;

    constructor(_url: URL, _options?: unknown) {
      this.worker = new NodeWorker(JS_WORKER_BUNDLE);
      this.worker.on("message", (data: unknown) => this.onmessage?.({ data }));
      this.worker.on("error", (e: unknown) => this.onerror?.(e));
    }

    postMessage(message: unknown) {
      this.worker.postMessage(message);
    }

    terminate() {
      void this.worker.terminate();
    }
  }

  holder.Worker = NodeSandboxWorker;
}
