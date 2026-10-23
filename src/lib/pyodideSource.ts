/* ═══════════════════════════════════════════════════════════════
   Where Pyodide comes from.

   Pyodide is ~13 MB (9.2 MB of WASM alone). Self-hosting it from
   `public/pyodide/` is the default — no third-party request, and the
   files sit on our own origin. Some hosts cannot carry that payload
   (Freebuff Sites allows ~10 MiB per deployment), so the loader walks
   a list of sources and uses the first one that answers.

   The CDN entry is pinned to the exact version in package.json: a
   floating version would swap interpreter and stdlib build under a
   learner mid-exercise. `tests/pyodide-fallback.test.ts` fails if the
   pin drifts from the dependency.
   ═══════════════════════════════════════════════════════════════ */

/** Must match the `pyodide` dependency in package.json. */
export const PYODIDE_VERSION = "314.0.7";

export const PYODIDE_CDN_BASE = `https://cdn.jsdelivr.net/npm/pyodide@${PYODIDE_VERSION}/`;

export type PyodideSource = {
  /** Shown in the failure message so a learner knows what was tried. */
  label: string;
  /** Module specifier handed to a dynamic import. */
  spec: string;
  /** Passed to `loadPyodide`; Pyodide resolves its assets from here. */
  indexURL: string;
};

/**
 * Ordered load plan: our own copy first, the pinned CDN second. Order
 * matters for privacy and speed, not correctness — both serve the same
 * build, so a run behaves identically either way.
 */
export function pyodideSources(): PyodideSource[] {
  return [
    { label: "self-hosted", spec: "/pyodide/pyodide.mjs", indexURL: "/pyodide/" },
    { label: "cdn", spec: `${PYODIDE_CDN_BASE}pyodide.mjs`, indexURL: PYODIDE_CDN_BASE },
  ];
}

/**
 * Try each attempt in order and return the first success. Everything is
 * reported when all of them fail — a bare "failed to fetch" would hide
 * whether the local copy or the network was at fault.
 */
export async function loadWithFallback<T>(
  attempts: { label: string; load: () => Promise<T> }[]
): Promise<T> {
  const failures: string[] = [];
  for (const attempt of attempts) {
    try {
      return await attempt.load();
    } catch (err) {
      failures.push(`${attempt.label} (${err instanceof Error ? err.message : String(err)})`);
    }
  }
  throw new Error(`Pyodide could not be loaded — tried ${failures.join(", ")}`);
}
