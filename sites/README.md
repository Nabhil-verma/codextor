# Deploying to Freebuff Sites

`sites.deploy.json` at the repo root is the deploy manifest; `sites/worker.js`
is the Worker that serves the built SPA. Redeploy with the Sites deploy tool,
pointing `manifestPath` at `sites.deploy.json`.

## Regenerate the payload

```bash
npm run build          # writes dist/
rm -rf sites/build-nopy
cp -a dist/. sites/build-nopy/
rm -rf sites/build-nopy/pyodide
```

## Three constraints that are not obvious

1. **The assets directory must not be hidden or gitignored.** The deployer skips
   ignored and dot-prefixed paths, which leaves an empty asset set and surfaces
   as `Sites rejected these arguments: invalid_type`. `dist/` is gitignored
   here, so the payload is copied to `sites/build-nopy/` (also gitignored, but
   only so it is not committed — it is still uploaded).
2. **`spa` and `compatibilityFlags` are rejected** by the current deploy
   schema even though older documentation lists them, so leave both out and do
   the fallback in the Worker: a missing asset whose path has no file extension
   is served `index.html` (see `serveAsset` in `sites/api/worker.ts`). Routing
   is hash-based (`/#/verify/CODE`), but people paste path-style URLs and
   reload them, and a hard 404 for those looks like the site is broken.
3. **The total asset budget is ~10 MiB.** A 9.2 MB single asset passes, a 16 MB
   set does not. Pyodide is 13 MB (`pyodide.asm.wasm` alone is 9.2 MB), so the
   payload above deletes `pyodide/` and the deployed build is 6.3 MB.
   Python still works: `src/lib/pyodideSource.ts` tries `/pyodide/` first and
   falls back to `https://cdn.jsdelivr.net/npm/pyodide@314.0.7/`, pinned to the
   `pyodide` dependency version (a test fails if the pin drifts). Local dev and
   any host with room for 13 MB keep using the self-hosted copy, so no
   third-party request is made there.

## The Worker now does more than forward

`sites/worker.js` is bundled from `sites/api/` by `scripts/build-worker.mjs`,
which `npm run build` runs last. It serves `POST /api/rpc` (every backend call),
the `/auth/freebuff/*` sign-in routes via `@freebuff/auth`, and everything else
from `env.ASSETS` — including SPA deep links, which fall back to `index.html`.

The database is a D1 binding named `DB`; `sites/api/schema.ts` creates its
tables idempotently on the first request after a deploy, so a new environment
needs no migration step.
