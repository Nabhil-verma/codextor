import { afterEach, describe, expect, it, vi } from "vitest";

/*
 * The browser path of tsRunner's compiler loader: no `ts` global yet, so it
 * injects <script src="/typescript/typescript.js">, waits for it, and reads
 * the global it defines. Node has no DOM, so a minimal document stub stands
 * in for it and the test drives the script's load events by hand.
 */

type FakeScript = {
  src: string;
  async: boolean;
  onload: (() => void) | null;
  onerror: (() => void) | null;
  remove: () => void;
};

function installDocument() {
  const appended: FakeScript[] = [];
  const doc = {
    createElement: (): FakeScript => ({
      src: "",
      async: false,
      onload: null,
      onerror: null,
      remove: () => {},
    }),
    head: {
      appendChild: (el: FakeScript) => {
        appended.push(el);
        return el;
      },
    },
  };
  vi.stubGlobal("document", doc);
  return appended;
}

async function freshLoader() {
  vi.resetModules();
  return import("../src/lib/tsRunner");
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete (globalThis as { ts?: unknown }).ts;
});

describe("tsRunner compiler loader", () => {
  it("fails with a clear error when there is no DOM and no compiler", async () => {
    const { loadCompiler } = await freshLoader();
    await expect(loadCompiler()).rejects.toThrow(/not available/);
  });

  it("injects the static compiler script once and resolves to its global", async () => {
    const appended = installDocument();
    const { loadCompiler } = await freshLoader();

    const first = loadCompiler();
    const second = loadCompiler();
    expect(appended).toHaveLength(1);
    expect(appended[0].src).toBe("/typescript/typescript.js");
    expect(appended[0].async).toBe(true);

    // The real script defines `ts` as a global; simulate that, then load.
    const fakeCompiler = { ScriptTarget: { ES2020: 7 } };
    (globalThis as { ts?: unknown }).ts = fakeCompiler;
    appended[0].onload?.();

    await expect(first).resolves.toBe(fakeCompiler);
    await expect(second).resolves.toBe(fakeCompiler);
    expect(appended).toHaveLength(1);
  });

  it("reports a failed script load and retries on the next call", async () => {
    const appended = installDocument();
    const { loadCompiler } = await freshLoader();

    const failed = loadCompiler();
    appended[0].onerror?.();
    await expect(failed).rejects.toThrow("Could not load the TypeScript compiler from /typescript/typescript.js");

    const retried = loadCompiler();
    expect(appended).toHaveLength(2);
    (globalThis as { ts?: unknown }).ts = { ScriptTarget: {} };
    appended[1].onload?.();
    await expect(retried).resolves.toBeDefined();
  });

  it("fails when the script loads but does not define the global", async () => {
    const appended = installDocument();
    const { loadCompiler } = await freshLoader();

    const pending = loadCompiler();
    appended[0].onload?.();
    await expect(pending).rejects.toThrow(/did not define `ts`/);
  });
});
