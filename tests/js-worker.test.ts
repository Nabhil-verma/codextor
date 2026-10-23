import { afterEach, describe, expect, it } from "vitest";
import { runUserCode, JS_TIMEOUT_MS } from "../src/lib/runner";

/*
 * The learner's code runs on a worker thread, not on the page. These tests pin
 * the contract that makes that worth doing: normal runs are unchanged, a hang
 * is actually terminated, and nothing from the page's world is reachable.
 */

type Spy = { constructed: number; terminated: number };
const spy: Spy = { constructed: 0, terminated: 0 };
const RealWorker = (globalThis as { Worker?: new (...a: unknown[]) => unknown }).Worker;

/** Counts workers created and terminated, around the real (shimmed) Worker. */
function installSpy() {
  const Base = RealWorker as unknown as new (...a: unknown[]) => { terminate(): void };
  class CountingWorker extends Base {
    constructor(...args: unknown[]) {
      super(...args);
      spy.constructed += 1;
    }
    override terminate(): void {
      spy.terminated += 1;
      super.terminate();
    }
  }
  (globalThis as { Worker?: unknown }).Worker = CountingWorker;
}

afterEach(() => {
  (globalThis as { Worker?: unknown }).Worker = RealWorker;
  spy.constructed = 0;
  spy.terminated = 0;
});

describe("normal execution in the worker", () => {
  it("returns what the code printed, in order", async () => {
    installSpy();
    const r = await runUserCode(`console.log("one"); console.log("two", 3);`);
    expect(r.error).toBeNull();
    expect(r.logs).toEqual(["one", "two 3"]);
  });

  it("runs each program in a fresh worker, and ends every worker it starts", async () => {
    installSpy();
    await runUserCode(`console.log("a")`);
    await runUserCode(`console.log("b")`);
    expect(spy.constructed).toBe(2);
    expect(spy.terminated).toBe(2);
  });
});

describe("thrown errors", () => {
  it("reports a thrown error as the run's error, with its message", async () => {
    const r = await runUserCode(`throw new Error("boom");`);
    expect(r.error).toBe("boom");
  });

  it("reports a syntax error without crashing the page", async () => {
    const r = await runUserCode(`const = ;`);
    expect(r.error).toMatch(/Unexpected|Invalid|expected/i);
  });

  it("reports a rejected async error", async () => {
    const r = await runUserCode(`await Promise.reject(new Error("late"));`);
    expect(r.error).toBe("late");
  });
});

describe("termination", () => {
  it("terminates a synchronous hang that the loop guard cannot see", async () => {
    installSpy();
    // Catastrophic backtracking runs inside the regex engine with no loop for the
    // guard to instrument. Only the page-side kill can stop it.
    const started = Date.now();
    const r = await runUserCode(
      `console.log("before"); /(a+)+$/.test("a".repeat(40) + "!");`,
      500,
    );
    const elapsed = Date.now() - started;
    expect(r.error).toMatch(/took too long/);
    expect(elapsed).toBeLessThan(500 + 3000 + 2000);
    expect(spy.terminated).toBe(spy.constructed);
  }, 15000);

  it("stops an instrumented infinite loop from inside the worker with the same message", async () => {
    const r = await runUserCode(`while (true) { }`, 300);
    expect(r.error).toMatch(/took too long|infinite loop/);
  });

  it("uses the shared default budget", () => {
    expect(JS_TIMEOUT_MS).toBe(4000);
  });
});

describe("isolation from the page", () => {
  /** Reads each name's type from inside the sandbox, so the test sees the sandbox's view. */
  const probe = `
    const names = ["window","self","document","localStorage","sessionStorage",
      "indexedDB","navigator","location","importScripts","postMessage","close",
      "process","require","module","XMLHttpRequest","WebSocket","Worker",
      "BroadcastChannel","globalThis"];
    const seen = {};
    for (const n of names) {
      try { seen[n] = typeof eval(n); } catch { seen[n] = "throws"; }
    }
    console.log(JSON.stringify(seen));
  `;

  it("hides DOM, storage, networking and Node globals from learner code", async () => {
    const r = await runUserCode(probe);
    expect(r.error).toBeNull();
    const seen = JSON.parse(r.logs[0]) as Record<string, string>;
    for (const [name, kind] of Object.entries(seen)) {
      expect(kind, name).toMatch(/^(undefined|throws)$/);
    }
  });

  it("cannot reach the real network through globalThis", async () => {
    const r = await runUserCode(`
      try {
        await globalThis.fetch("https://example.com/");
        console.log("reached network");
      } catch (e) {
        console.log("blocked:", e.message);
      }
    `);
    expect(r.logs.join("\n")).not.toContain("reached network");
  });

  it("cannot read the page's stored progress, even by name", async () => {
    const r = await runUserCode(`
      try {
        console.log(localStorage.getItem("cl_codextor_reviews"));
      } catch (e) {
        console.log("no storage");
      }
    `);
    expect(r.logs[0]).toBe("no storage");
  });

  it("still gives the sandbox its own fetch, which only answers the mock API", async () => {
    const r = await runUserCode(`
      const res = await fetch("/api/users/1");
      console.log((await res.json()).name);
    `);
    expect(r.error).toBeNull();
    expect(r.logs[0]).toBe("Ada");
  });
});

describe("failing closed", () => {
  it("does not run the code when the browser has no Worker", async () => {
    (globalThis as { Worker?: unknown }).Worker = undefined;
    const r = await runUserCode(`console.log("should not run")`);
    expect(r.logs).toEqual([]);
    expect(r.error).toMatch(/cannot run code in an isolated worker/);
  });

  it("reports a worker that fails to start instead of hanging", async () => {
    class BrokenWorker {
      onmessage: unknown = null;
      onerror: ((e: unknown) => void) | null = null;
      onmessageerror: unknown = null;
      constructor() {
        queueMicrotask(() => this.onerror?.(new Error("404")));
      }
      postMessage() {}
      terminate() {}
    }
    (globalThis as { Worker?: unknown }).Worker = BrokenWorker;
    const r = await runUserCode(`console.log(1)`);
    expect(r.error).toMatch(/failed to start/);
  });
});
