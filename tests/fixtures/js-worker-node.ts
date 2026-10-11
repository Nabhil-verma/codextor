/*
 * Node worker-thread entry for the test suite. Same job as src/lib/jsWorker.ts
 * (harden the scope, run one request, reply), wired to worker_threads instead
 * of the browser's `self`. Bundled by tests/setup-js-worker.ts.
 */
import { parentPort } from "node:worker_threads";
import { hardenGlobals, runSandboxedCode } from "../../src/lib/jsSandbox";

if (!parentPort) throw new Error("js-worker-node must run as a worker thread");
const port = parentPort;
const send = (message: unknown) => port.postMessage(message);

hardenGlobals(globalThis as unknown as Record<string, unknown>);

port.on("message", (request: { code: string; timeoutMs: number }) => {
  void runSandboxedCode(request.code, request.timeoutMs).then(
    (result) => send(result),
    (e: unknown) => send({ logs: [], error: e instanceof Error ? e.message : String(e) }),
  );
});
