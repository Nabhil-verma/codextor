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
   schema even though older documentation lists them. Leave both out. Without
   `spa`, unknown paths return 404; that is harmless because routing is
   hash-based (`/#/lesson/...`) and the static pages are real files.
3. **The total asset budget is ~10 MiB.** A 9.2 MB single asset passes, a 16 MB
   set does not. Pyodide is 13 MB (`pyodide.asm.wasm` alone is 9.2 MB), so the
   payload above deletes `pyodide/` and the deployed build is 6.3 MB.
   Python still works: `src/lib/pyodideSource.ts` tries `/pyodide/` first and
   falls back to `https://cdn.jsdelivr.net/npm/pyodide@314.0.7/`, pinned to the
   `pyodide` dependency version (a test fails if the pin drifts). Local dev and
   any host with room for 13 MB keep using the self-hosted copy, so no
   third-party request is made there.

The Worker itself only forwards to `env.ASSETS`; Convex is called from the
browser, not proxied.
