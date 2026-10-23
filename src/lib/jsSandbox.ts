/*
 * The JavaScript sandbox core. It runs learner code and returns what it printed.
 *
 * This module has no side effects on import and touches no browser API except
 * the timers it captures up front, so it runs unchanged in a dedicated Web
 * Worker (the browser path, see jsWorker.ts), in a Node worker thread (the test
 * path, see tests/fixtures), and nowhere else. Nothing here runs on the page.
 *
 * Trust boundary — read before changing anything:
 *   - The learner's code is untrusted. It runs on its own thread; the page's
 *     DOM, localStorage, cookies, the Convex session and the React tree are not
 *     reachable from that thread at all. That is the isolation this file buys.
 *   - Inside the thread, the code is still JavaScript that can call anything
 *     the worker itself exposes. `hardenGlobals` removes the obvious doors
 *     (network, storage, worker messaging, Node-style process access) and
 *     `runSandboxedCode` injects shadowing parameters for the same names. This
 *     is defence in depth, not a capability model: a determined script can still
 *     find globals through an object it already holds. Sharing code from other
 *     people therefore also needs a network-level block (CSP connect-src) and,
 *     for full separation, an opaque-origin sandbox. Neither exists yet.
 *   - Termination is the hard guarantee. The page terminates the worker on
 *     timeout, which stops code the loop guard cannot instrument (for example a
 *     catastrophic regular expression). The in-thread loop guard only exists to
 *     produce a friendly "took too long" message sooner.
 *   - Each run gets a fresh worker, so no state survives from one run to the next.
 */

import { createMockAgentEndpoint } from "./mockAgentEndpoint";
import { traceCore, type TraceResult } from "./stepper";

export type RunResult = {
  logs: string[];
  error: string | null;
};

/** What the page may ask the sandbox to do. Both kinds execute learner code. */
export type SandboxRequest =
  | { kind: "run"; code: string; timeoutMs: number }
  | { kind: "trace"; code: string; timeoutMs: number };

/** The worker's single entry point: dispatches one request to its executor. */
export function handleSandboxRequest(request: SandboxRequest): Promise<RunResult | TraceResult> {
  return request.kind === "trace"
    ? traceCore(request.code, request.timeoutMs)
    : runSandboxedCode(request.code, request.timeoutMs);
}

/** Globals hidden from learner code. Shadowed by parameters and deleted from the worker. */
export const SHADOWED_GLOBALS = [
  "window",
  "self",
  "document",
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "caches",
  "navigator",
  "location",
  "history",
  "importScripts",
  "postMessage",
  "close",
  "process",
  "require",
  "module",
  "exports",
  "Deno",
  "Bun",
  "XMLHttpRequest",
  "WebSocket",
  "EventSource",
  "Worker",
  "SharedWorker",
  "BroadcastChannel",
  "globalThis",
  "fetch",
] as const;

/** Removes the names above from a global object. Best effort; errors are ignored. */
export function hardenGlobals(target: Record<string, unknown>): void {
  for (const name of SHADOWED_GLOBALS) {
    try {
      delete target[name];
    } catch {
      /* non-configurable in this realm — the parameter shadowing still applies */
    }
    try {
      Object.defineProperty(target, name, { value: undefined, configurable: true, writable: false });
    } catch {
      /* ignore */
    }
  }
}

/** Keeps a real timer for the sandbox's own use, captured before any learner code runs. */
const realSetTimeout = globalThis.setTimeout.bind(globalThis);

/** Output lines allowed per run. Past this, the run is cut off with a clear error. */
const MAX_LOG_LINES = 500;

/**
 * Runs user JavaScript with console captured, an in-thread loop guard, async
 * support (timers and mock requests are awaited before returning), and a mock
 * REST server mounted as `fetch`.
 */
export async function runSandboxedCode(code: string, timeoutMs = 4000): Promise<RunResult> {
  const logs: string[] = [];
  const push = (...args: unknown[]) => {
    logs.push(
      args
        .map((a) => {
          if (typeof a === "string") return a;
          try {
            return JSON.stringify(a, null, 2) ?? String(a);
          } catch {
            return String(a);
          }
        })
        .join(" ")
    );
    if (logs.length > MAX_LOG_LINES) throw new Error("Output limit reached (500 lines max)");
  };

  const pending: Promise<unknown>[] = [];

  // Loop guard: a deadline check inside every loop body. It cannot interrupt
  // synchronous work that has no loop; the page-side timeout covers that.
  const deadline = Date.now() + timeoutMs;
  const tick = () => {
    if (Date.now() > deadline) {
      throw new Error("Script took too long — possible infinite loop!");
    }
  };
  const guardedCode = addLoopGuards(code);

  const fakeConsole = { log: push, error: push, warn: push, info: push };
  const sandboxFetch = makeMockFetch(push, pending, makeServerState());

  let taskError: string | null = null;
  try {
    // Parameters shadow the hidden globals, so learner code sees `undefined`
    // for each of them even if hardenGlobals could not delete the global.
    const hiddenParams = SHADOWED_GLOBALS.filter((n) => n !== "fetch");
    const fn = new Function(
      "console",
      "__tick__",
      "fetch",
      "setTimeout",
      "setInterval",
      "PromiseLib",
      ...hiddenParams,
      `"use strict"; return (async () => {\n${guardedCode}\n})().then((r) => {\n  if (r !== undefined) console.log("→ return value:", r);\n  return r;\n});`
    );
    const entry = fn(
      fakeConsole,
      tick,
      sandboxFetch,
      trackedTimeout(pending),
      undefined,
      Promise,
      ...hiddenParams.map(() => undefined)
    ) as Promise<unknown>;
    // The entry is never pushed into `pending`: the drain loop waits on leaf
    // tasks, and awaiting the entry directly deadlocks on a late leaf.
    entry.catch((e) => {
      taskError = e instanceof Error ? e.message : String(e);
    });

    // Drain until an idle window passes with nothing scheduled. Microtask
    // chains spawned by settled leaves cannot be observed as pending, so the
    // idle break is the definitive end-of-execution signal.
    let idle = 0;
    const start = Date.now();
    while (Date.now() - start < timeoutMs + 2000) {
      const batch = pending.splice(0);
      if (batch.length) {
        idle = 0;
        await Promise.all(batch);
      } else {
        idle++;
        if (idle >= 40) break;
        await new Promise((r) => realSetTimeout(r, 5));
      }
    }
  } catch (e) {
    return { logs, error: e instanceof Error ? e.message : String(e) };
  }

  return { logs, error: taskError };
}

/*
 * Rewrites every `for`/`while` loop so its body begins with `__tick__();`.
 * Handles balanced-paren headers and both braced and brace-less bodies.
 */
export function addLoopGuards(code: string): string {
  let out = "";
  let i = 0;
  const isBoundary = (ch: string | undefined) => ch === undefined || /[\s;{})]/.test(ch);
  while (i < code.length) {
    const m = /^(for|while)\s*\(/.exec(code.slice(i));
    // Require a token boundary so we never touch `forEach(` or text in strings.
    if (!m || !isBoundary(code[i - 1])) {
      out += code[i];
      i += 1;
      continue;
    }
    const kw = m[1];
    let j = i + kw.length;
    while (/\s/.test(code[j] ?? "")) j += 1;
    if (code[j] !== "(") {
      out += code[i];
      i += 1;
      continue;
    }
    // Copy the balanced-paren header. Headers can contain ')' (destructuring).
    let depth = 0;
    do {
      if (code[j] === "(") depth += 1;
      else if (code[j] === ")") depth -= 1;
      j += 1;
    } while (j < code.length && depth > 0);
    const headerEnd = j;
    let k = headerEnd;
    while (/\s/.test(code[k] ?? "")) k += 1;
    if (code[k] === "{") {
      out += code.slice(i, headerEnd) + " { __tick__();";
      i = k + 1;
    } else {
      // Brace-less body: wrap the single statement so the tick runs each
      // iteration without changing the loop's meaning. The scan is paren-aware
      // and re-guards nested brace-less loops in the body.
      let end = k;
      let pdepth = 0;
      while (end < code.length) {
        const ch = code[end];
        if (ch === "(") pdepth += 1;
        else if (ch === ")") pdepth -= 1;
        else if (ch === ";" && pdepth === 0) break;
        end += 1;
      }
      const body = addLoopGuards(code.slice(k, end + 1));
      out += code.slice(i, headerEnd) + " { __tick__(); " + body + " }";
      i = end + 1;
    }
  }
  return out;
}

function trackedTimeout(pending: Promise<unknown>[]) {
  return (cb: (...args: unknown[]) => void, ms: number, ...rest: unknown[]) => {
    const p = new Promise<void>((resolve) => {
      realSetTimeout(() => {
        cb(...rest);
        resolve();
      }, Math.min(ms, 3000));
    });
    pending.push(p);
  };
}

/* ------------------------------------------------------------------ */
/* Mock REST server: /api/users CRUD + flaky endpoint                  */
/* ------------------------------------------------------------------ */

type MockUser = { id: number; name: string; role?: string };
type ServerState = { nextId: number; users: MockUser[] };

/** Fresh per run: a learner's POST cannot leak into another exercise. */
function makeServerState(): ServerState {
  return {
    nextId: 4,
    users: [
      { id: 1, name: "Ada", role: "engineer" },
      { id: 2, name: "Lin", role: "designer" },
      { id: 3, name: "Sam", role: "manager" },
    ],
  };
}

// Fetch latency registers into the caller's pending list so the drain loop
// keeps running until in-flight requests settle.
const latency = (pending: Promise<unknown>[]) =>
  new Promise<void>((r) => {
    const p = new Promise<void>((resolve) => realSetTimeout(resolve, 40 + Math.random() * 60));
    pending.push(p);
    p.then(() => r());
  });

function jsonRes(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function makeMockFetch(
  log: (...a: unknown[]) => void,
  pending: Promise<unknown>[],
  state: ServerState
) {
  // One endpoint per run, so its retry counter cannot leak between exercises.
  const agentModel = createMockAgentEndpoint();
  return async (url: string, opts?: { method?: string; body?: string }) => {
    await latency(pending);
    const method = (opts?.method ?? "GET").toUpperCase();
    const path = url.replace(/^https?:\/\/[^/]+/, "");
    const users = state.users;

    let m: RegExpMatchArray | null;

    // Deterministic stand-in for a model endpoint: the agent lessons script a
    // request/response loop without a key and without network access.
    if (path === "/api/llm/chat") {
      if (method !== "POST") return jsonRes({ error: "POST required" }, 405);
      try {
        const result = agentModel(JSON.parse(opts?.body ?? "{}"));
        return jsonRes(result.body, result.status);
      } catch {
        return jsonRes({ error: "invalid JSON body" }, 400);
      }
    }

    if ((m = path.match(/^\/api\/flaky\/?$/))) {
      if (Math.random() < 0.5) return jsonRes({ error: "random outage" }, 503);
      return jsonRes({ message: "ok", at: Date.now() });
    }

    if ((m = path.match(/^\/api\/users\/?$/))) {
      if (method === "GET") return jsonRes(users);
      if (method === "POST") {
        let body: Partial<MockUser> = {};
        try {
          body = JSON.parse(opts?.body ?? "{}");
        } catch {
          return jsonRes({ error: "invalid JSON body" }, 400);
        }
        if (!body.name) return jsonRes({ error: "name is required" }, 400);
        const user: MockUser = { id: state.nextId++, name: body.name, role: body.role ?? "member" };
        users.push(user);
        return jsonRes(user, 201);
      }
      return jsonRes({ error: "method not allowed" }, 405);
    }

    if ((m = path.match(/^\/api\/users\/(\d+)\/?$/))) {
      const id = Number(m[1]);
      const idx = users.findIndex((u) => u.id === id);
      if (idx === -1) return jsonRes({ error: "user not found" }, 404);
      if (method === "GET") return jsonRes(users[idx]);
      if (method === "DELETE") {
        const [removed] = users.splice(idx, 1);
        return jsonRes({ deleted: removed }, 200);
      }
      if (method === "PATCH" || method === "PUT") {
        Object.assign(users[idx], JSON.parse(opts?.body ?? "{}"));
        return jsonRes(users[idx]);
      }
      return jsonRes({ error: "method not allowed" }, 405);
    }

    log("(mock server) no route for", method, path);
    return jsonRes({ error: "not found" }, 404);
  };
}
