/*
 * Codexter service worker.
 *
 * Policy:
 *   - Navigations: network-first, so a deploy is picked up on the next load
 *     (stale code = broken app). A failed fetch falls back to the cached
 *     copy and finally to the cached shell, which is what makes an offline
 *     reload explain itself instead of showing the browser's error page.
 *   - Same-origin static assets (hashed JS/CSS, fonts, images): stale-while-
 *     revalidate — answer from cache immediately, refresh it in the
 *     background.
 *   - Everything else (the Convex API, lesson CDNs, non-GET) is not touched.
 *   - /pyodide/ is deliberately never cached: 13 MB of WASM and stdlib that
 *     would dominate the origin's storage budget.
 */

/* v4: the brand marks kept their URLs while the artwork changed, so the old
   cache has to go — otherwise the first load after this deploy shows the
   previous logo from stale-while-revalidate. */
const CACHE_NAME = "codexter-v4";
/** Offline track packs (src/lib/offlinePacks.ts). Kept across activations. */
const PACK_CACHE_NAME = "codexter-packs";
const SHELL = "/index.html";
const PRECACHE_URLS = ["/", SHELL];

/** Extensions worth keeping on the origin. Navigations are handled separately. */
const CACHEABLE = /\.(?:js|mjs|css|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Added one by one: a single unreachable URL must not abort the whole
      // install and leave the app with no worker at all.
      Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch(() => undefined)
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME && k !== PACK_CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
  );
  self.clients.claim();
});

/**
 * Store a response for later, refusing anything that must not be cached:
 * opaque/error responses, partial (206) bodies and non-ok statuses. Returns
 * the original response so it can be handed straight back to the page.
 */
function stash(request, response) {
  if (!response || !response.ok || response.status === 206) return response;
  const copy = response.clone();
  caches
    .open(CACHE_NAME)
    .then((cache) => cache.put(request, copy))
    .catch(() => undefined);
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => stash(request, response))
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || (await caches.match(SHELL)) || Response.error();
        })
    );
    return;
  }

  if (!sameOrigin) return;
  if (url.pathname.startsWith("/pyodide/")) return;
  if (!CACHEABLE.test(url.pathname)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => stash(request, response))
        .catch(() => undefined);

      if (cached) {
        // Keep the revalidation alive past the response we hand back.
        event.waitUntil(network);
        return cached;
      }
      return network.then((response) => response || Response.error());
    })
  );
});
