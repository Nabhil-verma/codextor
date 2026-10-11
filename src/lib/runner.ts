import { evaluateCheckExpression } from "./checkExpr";
import type { RunResult } from "./jsSandbox";
import { runInSandbox } from "./sandboxClient";

export type { RunResult } from "./jsSandbox";

/*
 * Running the learner's code, in a worker.
 *
 * Each run gets its own dedicated Web Worker (src/lib/jsWorker.ts), so the
 * code never executes on the page's thread: it cannot touch the DOM, storage,
 * the account session or the React tree. A run that does not answer within
 * the budget is terminated, which also stops synchronous work the in-thread
 * loop guard cannot see. The worker plumbing lives in sandboxClient.ts.
 *
 * Trust boundary: the worker is isolation plus a hard kill, not a complete
 * capability sandbox. See the header of jsSandbox.ts for what it does and does
 * not block, and for what sharing other people's code would additionally need.
 */

/** Wall-clock budget for the learner's code, not counting worker start-up. */
export const JS_TIMEOUT_MS = 4000;

/**
 * Runs user JavaScript and returns what it printed. Never throws; a failure to
 * run is reported in `error`.
 */
export function runUserCode(code: string, timeoutMs = JS_TIMEOUT_MS): Promise<RunResult> {
  return runInSandbox({ kind: "run", code, timeoutMs });
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
