import { evaluateCheckExpression } from "./checkExpr";
import type { RunResult } from "./jsSandbox";

export type { RunResult } from "./jsSandbox";

/*
 * Running the learner's code, in a worker.
 *
 * Each run gets its own dedicated Web Worker (src/lib/jsWorker.ts), so the
 * code never executes on the page's thread: it cannot touch the DOM, storage,
 * the account session or the React tree. A run that does not answer within
 * the budget is terminated, which also stops synchronous work the in-thread
 * loop guard cannot see.
 *
 * Trust boundary: the worker is isolation plus a hard kill, not a complete
 * capability sandbox. See the header of jsSandbox.ts for what it does and does
 * not block, and for what sharing other people's code would additionally need.
 *
 * If the browser has no Worker support, the run fails closed: the code is not
 * executed on the page. Node tests install a worker shim (tests/setup).
 */

/** Wall-clock budget for the learner's code, not counting worker start-up. */
export const JS_TIMEOUT_MS = 4000;

/** Extra time the page allows past the in-worker budget before terminating. */
const HARD_KILL_GRACE_MS = 3000;

const TOO_LONG = "Script took too long — possible infinite loop!";

type WorkerLike = {
  onmessage: ((event: MessageEvent<RunResult>) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onmessageerror: ((event: unknown) => void) | null;
  postMessage: (message: unknown) => void;
  terminate: () => void;
};

function createSandboxWorker(): WorkerLike | null {
  const Ctor = (globalThis as { Worker?: new (url: URL, opts: WorkerOptions) => WorkerLike }).Worker;
  if (typeof Ctor !== "function") return null;
  return new Ctor(new URL("./jsWorker.ts", import.meta.url), { type: "module" });
}

/**
 * Runs user JavaScript and returns what it printed. Never throws; a failure to
 * run is reported in `error`.
 */
export function runUserCode(code: string, timeoutMs = JS_TIMEOUT_MS): Promise<RunResult> {
  return new Promise<RunResult>((resolve) => {
    let worker: WorkerLike | null;
    try {
      worker = createSandboxWorker();
    } catch {
      worker = null;
    }
    if (!worker) {
      resolve({
        logs: [],
        error: "This browser cannot run code in an isolated worker, so the code was not run.",
      });
      return;
    }
    const w = worker;
    let settled = false;
    const finish = (result: RunResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      w.terminate();
      resolve(result);
    };
    const timer = setTimeout(() => {
      finish({ logs: [], error: TOO_LONG });
    }, timeoutMs + HARD_KILL_GRACE_MS);

    w.onmessage = (event) => finish(event.data);
    w.onerror = () => finish({ logs: [], error: "The code sandbox failed to start." });
    w.onmessageerror = () => finish({ logs: [], error: "The code sandbox returned an unreadable result." });
    w.postMessage({ code, timeoutMs });
  });
}

/**
 * Grade captured output against a curriculum check expression.
 *
 * This is the grading primitive and it no longer compiles anything: the
 * expression is parsed against a whitelist grammar in checkExpr.ts and the
 * syntax tree is walked directly. A check expression can therefore never
 * reach `localStorage`, the DOM or `fetch`, and an unrecognised expression
 * fails closed. (Running the learner's *own* code is a separate, deliberate
 * path — `runUserCode` above — where execution is the product.)
 */
export function evaluateCheck(expr: string, output: string): boolean {
  return evaluateCheckExpression(expr, output);
}
