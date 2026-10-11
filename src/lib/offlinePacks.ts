/*
 * Offline track packs.
 *
 * A pack is the set of built JS/CSS files a track needs to render and run its
 * lessons (see scripts/offline-packs.mjs, which writes the index at build
 * time). Saving a pack stores those files in the `codexter-packs` Cache, which
 * public/sw.js reads through `caches.match`. Its activate step keeps this cache
 * across deploys, so an offline reload still finds the saved files.
 *
 * Not included: the Pyodide runtime (Python lessons need a connection) and
 * Convex, so progress saved while offline is not synced.
 *
 * Trust: the index comes over the network, so it is validated strictly before
 * any URL is fetched or cached. Only same-origin paths are accepted.
 */
import { MANIFEST_TRACKS } from "../data/manifest";

/** Must match PACK_CACHE_NAME in public/sw.js (tests/offline-sw.test.ts checks). */
export const PACK_CACHE = "codexter-packs";
export const PACK_INDEX_URL = "/offline-packs.json";

export type PackIndex = {
  version: string;
  core: string[];
  tracks: Record<string, string[]>;
  runtimes: { ts: string[] };
};

/** The subset of the Cache API the packs use; injectable for tests. */
export type PackCache = {
  put(url: string, response: Response): Promise<void>;
  match(url: string): Promise<Response | undefined>;
};

export type PackDeps = {
  fetch: (url: string) => Promise<Response>;
  openCache: (name: string) => Promise<PackCache>;
};

export type PackStatus = "saved" | "partial" | "none";

const SAFE_PATH = /^\/[A-Za-z0-9._\-/]+$/;

function isPathList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && SAFE_PATH.test(item) && !item.includes(".."))
  );
}

/** Validates an untrusted index; returns null for anything malformed. */
export function parsePackIndex(raw: unknown): PackIndex | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.version !== "string" || r.version.length === 0) return null;
  if (!isPathList(r.core)) return null;
  if (!r.tracks || typeof r.tracks !== "object" || Array.isArray(r.tracks)) return null;
  const tracks: Record<string, string[]> = {};
  for (const [id, files] of Object.entries(r.tracks as Record<string, unknown>)) {
    if (!/^[a-z0-9-]+$/.test(id) || !isPathList(files)) return null;
    tracks[id] = files;
  }
  const runtimes = r.runtimes as Record<string, unknown> | undefined;
  if (!runtimes || !isPathList(runtimes.ts)) return null;
  return { version: r.version, core: r.core, tracks, runtimes: { ts: runtimes.ts } };
}

/** Every file a track needs offline, or null for an unknown track. */
export function packUrls(index: PackIndex, trackId: string): string[] | null {
  const track = index.tracks[trackId];
  if (!track) return null;
  const manifest = MANIFEST_TRACKS.find((t) => t.id === trackId);
  const needsTs = manifest?.lessons.some((l) => l.lang === "ts") ?? false;
  const urls = [...index.core, ...track, ...(needsTs ? index.runtimes.ts : [])];
  return [...new Set(urls)];
}

const defaultDeps: PackDeps = {
  fetch: (url) => fetch(url),
  openCache: (name) => caches.open(name),
};

/** Loads and validates the index. Throws on network or validation failure. */
export async function loadPackIndex(deps: Pick<PackDeps, "fetch"> = defaultDeps): Promise<PackIndex> {
  const res = await deps.fetch(PACK_INDEX_URL);
  if (!res.ok) throw new Error(`pack index: HTTP ${res.status}`);
  const index = parsePackIndex(await res.json());
  if (!index) throw new Error("pack index: malformed");
  return index;
}

/**
 * Downloads and stores every file for a track. Any failed file throws; files
 * stored before the failure stay, and `packStatus` reports them as partial.
 */
export async function savePack(
  index: PackIndex,
  trackId: string,
  deps: PackDeps = defaultDeps,
): Promise<number> {
  const urls = packUrls(index, trackId);
  if (!urls) throw new Error(`unknown track: ${trackId}`);
  const cache = await deps.openCache(PACK_CACHE);
  await Promise.all(
    urls.map(async (url) => {
      const res = await deps.fetch(url);
      if (!res.ok) throw new Error(`pack file ${url}: HTTP ${res.status}`);
      await cache.put(url, res);
    }),
  );
  return urls.length;
}

/** Whether every file for the track is in the packs cache. */
export async function packStatus(
  index: PackIndex,
  trackId: string,
  deps: Pick<PackDeps, "openCache"> = defaultDeps,
): Promise<PackStatus> {
  const urls = packUrls(index, trackId);
  if (!urls) return "none";
  const cache = await deps.openCache(PACK_CACHE);
  const hits = await Promise.all(urls.map((url) => cache.match(url)));
  const found = hits.filter(Boolean).length;
  if (found === 0) return "none";
  return found === urls.length ? "saved" : "partial";
}
