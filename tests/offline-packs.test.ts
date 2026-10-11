// @vitest-environment node
import { describe, expect, it } from "vitest";
import { MANIFEST_TRACKS } from "../src/data/manifest";
import {
  PACK_CACHE,
  type PackCache,
  type PackDeps,
  type PackIndex,
  packStatus,
  packUrls,
  parsePackIndex,
  savePack,
} from "../src/lib/offlinePacks";

const INDEX: PackIndex = {
  version: "abc123def456",
  core: ["/assets/index.js", "/assets/index.css"],
  tracks: {
    web: ["/assets/web.js", "/assets/shared.js"],
    python: ["/assets/python.js"],
  },
  runtimes: { ts: ["/assets/tsRunner.js"] },
};

function memoryCache(): PackCache & { urls: () => string[] } {
  const store = new Map<string, Response>();
  return {
    async put(url, response) {
      store.set(url, response);
    },
    async match(url) {
      return store.get(url);
    },
    urls: () => [...store.keys()],
  };
}

/** A fake origin: serves every requested path from `files`, or fails when offline. */
function origin(files: Record<string, string>, online: { value: boolean }) {
  const requested: string[] = [];
  const fetch: PackDeps["fetch"] = async (url) => {
    requested.push(url);
    if (!online.value) throw new TypeError("Failed to fetch");
    if (!(url in files)) return new Response("missing", { status: 404 });
    return new Response(files[url], { status: 200 });
  };
  return { fetch, requested };
}

const ALL_FILES = Object.fromEntries(
  [...INDEX.core, ...INDEX.tracks.web, ...INDEX.tracks.python, ...INDEX.runtimes.ts].map((url) => [
    url,
    `body of ${url}`,
  ]),
);

describe("parsePackIndex (untrusted input)", () => {
  const valid = JSON.parse(JSON.stringify(INDEX));

  it("accepts a well-formed index", () => {
    expect(parsePackIndex(valid)).toEqual(INDEX);
  });

  it.each([
    ["null", null],
    ["missing version", { ...valid, version: "" }],
    ["path traversal", { ...valid, core: ["/assets/../../etc"] }],
    ["absolute external URL", { ...valid, core: ["https://evil.example/x.js"] }],
    ["relative path", { ...valid, core: ["assets/x.js"] }],
    ["non-string entry", { ...valid, core: [42] }],
    ["bad track id", { ...valid, tracks: { "../web": ["/a.js"] } }],
    ["tracks not an object", { ...valid, tracks: [] }],
    ["missing runtimes", { ...valid, runtimes: undefined }],
  ])("rejects %s", (_name, raw) => {
    expect(parsePackIndex(raw)).toBeNull();
  });
});

describe("packUrls", () => {
  it("returns core plus the track's files, without duplicates", () => {
    const urls = packUrls(INDEX, "web");
    expect(urls).toEqual(["/assets/index.js", "/assets/index.css", "/assets/web.js", "/assets/shared.js"]);
  });

  it("returns null for an unknown track", () => {
    expect(packUrls(INDEX, "nope")).toBeNull();
  });

  it("adds the TypeScript runtime only for tracks that have TS lessons", () => {
    const withTs = MANIFEST_TRACKS.find((t) => t.lessons.some((l) => l.lang === "ts"));
    const withoutTs = MANIFEST_TRACKS.find((t) => t.lessons.every((l) => l.lang !== "ts"));
    expect(withTs && withoutTs).toBeTruthy();
    const index: PackIndex = {
      ...INDEX,
      tracks: { [withTs!.id]: ["/a.js"], [withoutTs!.id]: ["/b.js"] },
    };
    expect(packUrls(index, withTs!.id)).toContain("/assets/tsRunner.js");
    expect(packUrls(index, withoutTs!.id)).not.toContain("/assets/tsRunner.js");
  });
});

describe("savePack and offline loading", () => {
  it("stores every file, then loads the track with the network disabled", async () => {
    const online = { value: true };
    const net = origin(ALL_FILES, online);
    const cache = memoryCache();
    const deps: PackDeps = { fetch: net.fetch, openCache: async () => cache };

    const saved = await savePack(INDEX, "web", deps);
    expect(saved).toBe(4);
    expect(cache.urls().sort()).toEqual(packUrls(INDEX, "web")!.slice().sort());

    // Network off: every file the track needs is answered from the pack.
    online.value = false;
    const status = await packStatus(INDEX, "web", { openCache: async () => cache });
    expect(status).toBe("saved");
    for (const url of packUrls(INDEX, "web")!) {
      const hit = await cache.match(url);
      expect(hit).toBeDefined();
      expect(await hit!.text()).toBe(`body of ${url}`);
    }
  });

  it("rejects an unknown track before any request is made", async () => {
    const net = origin(ALL_FILES, { value: true });
    await expect(
      savePack(INDEX, "nope", { fetch: net.fetch, openCache: async () => memoryCache() }),
    ).rejects.toThrow(/unknown track/);
    expect(net.requested).toEqual([]);
  });

  it("a failed file fails the save and leaves the pack reported as partial", async () => {
    const files = { ...ALL_FILES };
    delete files["/assets/shared.js"];
    const net = origin(files, { value: true });
    const cache = memoryCache();
    const deps: PackDeps = { fetch: net.fetch, openCache: async () => cache };

    await expect(savePack(INDEX, "web", deps)).rejects.toThrow(/shared\.js: HTTP 404/);
    expect(await packStatus(INDEX, "web", { openCache: async () => cache })).toBe("partial");
  });

  it("reports none for a track that was never saved", async () => {
    expect(await packStatus(INDEX, "python", { openCache: async () => memoryCache() })).toBe("none");
  });

  it("the python pack does not pull in the web track's files", async () => {
    const cache = memoryCache();
    const net = origin(ALL_FILES, { value: true });
    await savePack(INDEX, "python", { fetch: net.fetch, openCache: async () => cache });
    expect(cache.urls()).not.toContain("/assets/web.js");
    expect(cache.urls()).toContain("/assets/python.js");
  });

  it("uses the same cache name the service worker keeps", () => {
    expect(PACK_CACHE).toBe("codexter-packs");
  });
});
