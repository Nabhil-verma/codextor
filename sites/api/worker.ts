/*
 * The Codextor Worker: Sign in with Freebuff, a small JSON API over D1, and
 * the static SPA.
 *
 * One `createFreebuffAuth` instance per environment/isolation; `wrap` serves
 * `/auth/freebuff/*` and keeps the session cookie fresh before every request,
 * including static assets. The account id always comes from the verified
 * session (`user.sub`), never from the request body.
 *
 * Bundled to `sites/worker.js` by `scripts/build-worker.mjs`; `sites.deploy.json`
 * uploads that file with the built SPA.
 */
import { createFreebuffAuth, isSameOriginRequest, type FreebuffAuth } from "@freebuff/auth";
import { ensureAccount } from "./accounts";
import type { Ctx } from "./context";
import { ApiError } from "./context";
import { d1, type D1Database } from "./d1";
import { endpoints, type Handler } from "./registry";
import { ensureSchema } from "./schema";

export type Env = {
  ASSETS?: { fetch(request: Request): Promise<Response> };
  DB?: D1Database;
  FREEBUFF_CLIENT_ID?: string;
  FREEBUFF_ISSUER?: string;
  APP_ORIGIN?: string;
};

const authByEnv = new WeakMap<Env, FreebuffAuth>();
const schemaByDb = new WeakMap<object, Promise<void>>();

/**
 * A loopback origin is the documented local-development setup: the dev client
 * plus `allowInsecureLocalhost`. The deployed origin is always https, so this
 * can never relax the check in production.
 */
function isLoopback(origin: string): boolean {
  return /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);
}

function authFor(env: Env): FreebuffAuth {
  let auth = authByEnv.get(env);
  if (!auth) {
    if (!env.FREEBUFF_CLIENT_ID || !env.APP_ORIGIN) {
      throw new Error("Sign-in is not configured for this environment.");
    }
    auth = createFreebuffAuth({
      clientId: env.FREEBUFF_CLIENT_ID,
      issuer: env.FREEBUFF_ISSUER,
      baseUrl: env.APP_ORIGIN,
      allowInsecureLocalhost: isLoopback(env.APP_ORIGIN),
    });
    authByEnv.set(env, auth);
  }
  return auth;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // Personalized answers must never sit in a shared cache.
      "cache-control": "private, no-store",
    },
  });
}

const MAX_BODY_BYTES = 512 * 1024;

async function rpc(request: Request, env: Env, auth: FreebuffAuth): Promise<Response> {
  if (request.method !== "POST") return json({ error: { message: "Use POST." } }, 405);

  // State changes are same-origin only; SameSite alone is not CSRF protection.
  if (!isSameOriginRequest(request, env.APP_ORIGIN ?? "")) {
    return json({ error: { message: "Cross-origin request refused." } }, 403);
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return json({ error: { message: "That request is too large." } }, 413);
  }

  let body: { fn?: unknown; args?: unknown };
  try {
    body = JSON.parse(raw) as { fn?: unknown; args?: unknown };
  } catch {
    return json({ error: { message: "Malformed request." } }, 400);
  }

  const name = typeof body.fn === "string" ? body.fn : "";
  const handler = (endpoints as Record<string, Handler | undefined>)[name];
  if (!handler) return json({ error: { message: "Unknown endpoint." } }, 404);

  if (!env.DB) return json({ error: { message: "The database is not configured." } }, 503);

  let ready = schemaByDb.get(env.DB);
  if (!ready) {
    ready = ensureSchema(d1(env.DB));
    schemaByDb.set(env.DB, ready);
  }
  await ready;

  const db = d1(env.DB);
  const user = await auth.getUser(request);
  const account = user
    ? await ensureAccount(db, user)
    : null;
  const ctx: Ctx = { db, userId: user?.sub ?? null, account };

  try {
    const result = await handler(ctx, body.args ?? {});
    return json({ result: result === undefined ? null : result });
  } catch (error) {
    if (error instanceof ApiError) {
      return json({ error: { message: error.message } }, error.status);
    }
    // Validation and domain errors carry messages meant for the learner.
    const message =
      error instanceof Error && error.message ? error.message : "That request failed.";
    console.warn(`api ${name} failed: ${message}`);
    return json({ error: { message } }, 400);
  }
}

/**
 * Deep links are client-side routes: `/learn`, `/verify/CODE`, `/guild` and the
 * rest only exist in the router. A missing asset with no file extension is
 * therefore the SPA, not a 404 — otherwise every shared or reloaded URL breaks.
 */
function wantsDocument(request: Request, pathname: string): boolean {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  const last = pathname.slice(pathname.lastIndexOf("/") + 1);
  return !last.includes(".");
}

async function serveAsset(request: Request, env: Env): Promise<Response> {
  if (!env.ASSETS) {
    return new Response("ASSETS binding missing", { status: 500 });
  }
  const response = await env.ASSETS.fetch(request);
  const url = new URL(request.url);
  if (response.status !== 404 || !wantsDocument(request, url.pathname)) return response;
  // `/index.html` itself 307-redirects to `/`, so ask for the root directly.
  const page = await env.ASSETS.fetch(
    new Request(new URL("/", url.origin), { method: request.method, headers: request.headers }),
  );
  if (!page.ok) return response;
  return new Response(page.body, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      // The shell is the same for everyone; the data behind it is not.
      "cache-control": "no-cache",
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const auth = authFor(env);
      const handler = auth.wrap(async (req: Request) => {
        const url = new URL(req.url);
        if (url.pathname === "/api/rpc") return rpc(req, env, auth);
        if (url.pathname.startsWith("/api/")) {
          return json({ error: { message: "Unknown endpoint." } }, 404);
        }
        return serveAsset(req, env);
      });
      return await handler(request);
    } catch (error) {
      // A thrown error otherwise leaves the platform's opaque "Site
      // unavailable" page with no clue in it. Answer with JSON the client can
      // explain, and keep the detail in the log for the operator.
      console.error("unhandled", error);
      // The detail is useful on a loopback dev server and is never shown to a
      // visitor of the deployed site, where it could leak internals.
      const message = isLoopback(env.APP_ORIGIN ?? "")
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Something went wrong on the server.";
      return json({ error: { message } }, 500);
    }
  },
};
