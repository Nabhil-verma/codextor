/*
 * The page side of the sandbox: starts one worker per request, sends the
 * request, returns the reply, and terminates the worker when it answers or when
 * the budget runs out. Nothing learner-supplied runs on this thread.
 *
 * Both the run path (runner.ts) and the trace path (stepper.ts) go through
 * here, so the isolation and the hard kill are the same for both.
 */

import type { RunResult, SandboxRequest } from "./jsSandbox";
import type { TraceResult } from "./stepper";

/** Extra time past the in-worker budget before the page terminates the worker. */
export const SANDBOX_HARD_KILL_GRACE_MS = 3000;

export const SANDBOX_TOO_LONG = "Script took too long — possible infinite loop!";

type WorkerLike = {
  onmessage: ((event: MessageEvent<RunResult | TraceResult>) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onmessageerror: ((event: unknown) => void) | null;
  postMessage: (message: unknown) => void;
  terminate: () => void;
};

function createSandboxWorker(): WorkerLike | null {
  if (typeof globalThis.Worker !== "function") return null;
  // Written as `new Worker(new URL(…), …)` so Vite bundles jsWorker.ts as a real
  // JavaScript chunk. A small worker written any other way is inlined as a
  // data:video/mp2t URL, which browsers refuse to run.
  return new Worker(new URL("./jsWorker.ts", import.meta.url), { type: "module" }) as unknown as WorkerLike;
}

function failure(request: SandboxRequest, message: string): RunResult | TraceResult {
  return request.kind === "trace" ? { steps: [], error: message } : { logs: [], error: message };
}

export function runInSandbox(request: Extract<SandboxRequest, { kind: "run" }>): Promise<RunResult>;
export function runInSandbox(request: Extract<SandboxRequest, { kind: "trace" }>): Promise<TraceResult>;
export function runInSandbox(request: SandboxRequest): Promise<RunResult | TraceResult> {
  return new Promise((resolve) => {
    let worker: WorkerLike | null;
    try {
      worker = createSandboxWorker();
    } catch {
      worker = null;
    }
    if (!worker) {
      // Fail closed: without a worker the code is not executed on the page.
      resolve(
        failure(request, "This browser cannot run code in an isolated worker, so the code was not run."),
      );
      return;
    }
    const w = worker;
    let settled = false;
    const finish = (result: RunResult | TraceResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      w.terminate();
      resolve(result);
    };
    const timer = setTimeout(() => {
      finish(failure(request, SANDBOX_TOO_LONG));
    }, request.timeoutMs + SANDBOX_HARD_KILL_GRACE_MS);

    w.onmessage = (event) => finish(event.data);
    w.onerror = () => finish(failure(request, "The code sandbox failed to start."));
    w.onmessageerror = () => finish(failure(request, "The code sandbox returned an unreadable result."));
    w.postMessage(request);
  });
}
