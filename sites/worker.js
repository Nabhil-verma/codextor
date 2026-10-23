/**
 * Freebuff Sites entry Worker for Codextor.
 *
 * Codextor is a client-rendered Vite SPA (HashRouter), so the Worker has no
 * API surface of its own: it hands every request to the static asset binding.
 * `spa: true` in sites.deploy.json makes the platform serve index.html for
 * unknown paths, which keeps deep links and the service worker working.
 *
 * The Convex backend is called directly from the browser, not proxied here.
 */
export default {
  async fetch(request, env) {
    if (!env.ASSETS) {
      return new Response("ASSETS binding missing", { status: 500 });
    }
    return env.ASSETS.fetch(request);
  },
};
