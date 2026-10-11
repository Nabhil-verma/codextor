import { afterEach, describe, expect, it } from "vitest";
import { traceCode } from "../src/lib/stepper";
import { SANDBOX_TOO_LONG } from "../src/lib/sandboxClient";

/*
 * The visualizer used to run learner code on the page. These tests pin the
 * move: traces run in the worker, can be terminated, and see no page globals.
 */

const RealWorker = (globalThis as { Worker?: unknown }).Worker;
const spy = { constructed: 0, terminated: 0 };

function installSpy() {
  const Base = RealWorker as new (...a: unknown[]) => { terminate(): void };
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

describe("tracing runs in the sandbox worker", () => {
  it("starts a worker for the trace and ends it", async () => {
    installSpy();
    const r = await traceCode(`let x = 1;\nx = x + 1;\nconsole.log(x);`);
    expect(r.error).toBeNull();
    expect(spy.constructed).toBe(1);
    expect(spy.terminated).toBe(1);
  });

  it("records steps and the final output", async () => {
    const r = await traceCode(`let x = 1;\nx = x + 1;\nconsole.log("x is", x);`);
    expect(r.error).toBeNull();
    expect(r.steps.length).toBeGreaterThan(0);
    expect(r.steps[r.steps.length - 1].logs).toContain("x is 2");
  });

  it("reports a thrown error as the trace's error", async () => {
    const r = await traceCode(`throw new Error("nope");`);
    expect(r.error).toBe("nope");
  });

  it("terminates a synchronous hang that the in-thread guard cannot see", async () => {
    const started = Date.now();
    const r = await traceCode(`/(a+)+$/.test("a".repeat(40) + "!");`, 500);
    expect(r.error).toBe(SANDBOX_TOO_LONG);
    expect(Date.now() - started).toBeLessThan(500 + 3000 + 2000);
  }, 15000);

  it("sees none of the page's storage or DOM from inside a trace", async () => {
    const r = await traceCode(
      `console.log(typeof document, typeof window, typeof localStorage, typeof process);`,
    );
    expect(r.error).toBeNull();
    expect(r.steps[r.steps.length - 1].logs).toContain("undefined undefined undefined undefined");
  });

  it("fails closed when no worker exists", async () => {
    (globalThis as { Worker?: unknown }).Worker = undefined;
    const r = await traceCode(`console.log("never")`);
    expect(r.steps).toEqual([]);
    expect(r.error).toMatch(/cannot run code in an isolated worker/);
  });
});
