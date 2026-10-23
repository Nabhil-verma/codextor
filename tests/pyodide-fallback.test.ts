import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  loadWithFallback,
  PYODIDE_CDN_BASE,
  PYODIDE_VERSION,
  pyodideSources,
} from "../src/lib/pyodideSource";

/**
 * The deployed site does not ship Pyodide (its 13 MB exceeds the host's
 * asset budget), so the worker must fall back to a CDN instead of failing.
 * These tests pin the order and the version; the live CDN URL is checked
 * separately, since a unit test cannot rely on the network.
 */
describe("pyodide sources", () => {
  it("pins the CDN to the installed dependency version", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    // Pyodide is a dev dependency: it is copied into public/ at build time.
    const declared = pkg.dependencies?.pyodide ?? pkg.devDependencies?.pyodide;
    expect(declared).toBe(`^${PYODIDE_VERSION}`);
  });

  it("prefers the self-hosted copy and falls back to the CDN", () => {
    const [first, second] = pyodideSources();

    expect(first.label).toBe("self-hosted");
    expect(first.spec).toBe("/pyodide/pyodide.mjs");
    expect(first.indexURL).toBe("/pyodide/");

    expect(second.label).toBe("cdn");
    expect(second.spec).toBe(`${PYODIDE_CDN_BASE}pyodide.mjs`);
    expect(second.indexURL).toBe(PYODIDE_CDN_BASE);
  });

  it("builds the CDN base as an https URL with a trailing slash", () => {
    expect(PYODIDE_CDN_BASE).toBe(
      `https://cdn.jsdelivr.net/npm/pyodide@${PYODIDE_VERSION}/`
    );
  });
});

describe("loadWithFallback", () => {
  it("returns the first success and never calls the next source", async () => {
    const second = vi.fn(async () => "cdn");
    const result = await loadWithFallback([
      { label: "self-hosted", load: async () => "local" },
      { label: "cdn", load: second },
    ]);

    expect(result).toBe("local");
    expect(second).not.toHaveBeenCalled();
  });

  it("falls through when the self-hosted copy is missing", async () => {
    const result = await loadWithFallback([
      {
        label: "self-hosted",
        load: async () => {
          throw new TypeError("Failed to fetch dynamically imported module");
        },
      },
      { label: "cdn", load: async () => "cdn" },
    ]);

    expect(result).toBe("cdn");
  });

  it("names every source it tried when all of them fail", async () => {
    const promise = loadWithFallback([
      { label: "self-hosted", load: async () => Promise.reject(new Error("404")) },
      { label: "cdn", load: async () => Promise.reject(new Error("offline")) },
    ]);

    await expect(promise).rejects.toThrow(/self-hosted.*404.*cdn.*offline/);
  });
});
