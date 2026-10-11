// @vitest-environment node
/*
 * Runs the real public/sw.js in a VM with fake Cache Storage and a switchable
 * network. A pack is saved with the real client code (src/lib/offlinePacks),
 * then the network is switched off and the worker must still serve it.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { PACK_CACHE, type PackIndex, packStatus, savePack } from "../src/lib/offlinePacks";

const ORIGIN = "https://codexter.test";
const SW_SOURCE = readFileSync(resolve(__dirname, "../public/sw.js"), "utf8");

const INDEX: PackIndex = {
  version: "v1",
  core: ["/assets/index.js"],
  tracks: { web: ["/assets/track-web.js"] },
  runtimes: { ts: [] },
};

const FILES: Record<string, string> = {
  "/assets/index.js": "app()",
  "/assets/track-web.js": "export const web = 1;",
};

type Store = Map<string, Map<string, Response>>;

/** Cache keys are absolute URLs, as in the browser. */
const key = (request: unknown) =>
  new URL(typeof request === "string" ? request : (request as { url: string }).url, ORIGIN).href;

function createWorld(stores: Store) {
  const online = { value: true };
  const fetched: string[] = [];

  const network = async (request: unknown): Promise<Response> => {
    const url = key(request);
    fetched.push(url);
    if (!online.value) throw new TypeError("Failed to fetch");
    const path = new URL(url).pathname;
    if (path === "/" || path === "/index.html") return new Response("<html>shell</html>");
    if (path in FILES) return new Response(FILES[path]);
    return new Response("not found", { status: 404 });
  };

  const openCache = async (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name)!;
    return {
      add: async (request: unknown) => {
        const res = await network(request);
        if (!res.ok) throw new Error("add failed");
        store.set(key(request), res);
      },
      put: async (request: unknown, res: Response) => {
        store.set(key(request), res);
      },
      match: async (request: unknown) => store.get(key(request)),
    };
  };

  const cacheApi = {
    open: openCache,
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
    match: async (request: unknown) => {
      for (const store of stores.values()) {
        const hit = store.get(key(request));
        if (hit) return hit;
      }
      return undefined;
    },
  };

  const listeners: Record<string, (event: FakeEvent) => void> = {};
  const self = {
    location: { origin: ORIGIN },
    addEventListener(type: string, fn: (event: FakeEvent) => void) {
      listeners[type] = fn;
    },
    skipWaiting: () => undefined,
    clients: { claim: () => Promise.resolve() },
  };
  vm.runInContext(SW_SOURCE, vm.createContext({ self, caches: cacheApi, fetch: network, Response, URL }));

  /** Fires an event and resolves with the response the worker handed back. */
  const dispatch = async (type: string, request?: unknown) => {
    const event = new FakeEvent(request);
    listeners[type](event);
    await Promise.all(event.waits);
    return event.response ? await event.response : undefined;
  };

  return { online, fetched, network, openCache, dispatch };
}

class FakeEvent {
  response: Promise<Response> | undefined;
  waits: Promise<unknown>[] = [];
  constructor(readonly request?: unknown) {}
  respondWith(p: Promise<Response>) {
    this.response = p;
  }
  waitUntil(p: Promise<unknown>) {
    this.waits.push(p);
  }
}

const get = (path: string, mode = "no-cors") => ({ url: `${ORIGIN}${path}`, method: "GET", mode });

describe("public/sw.js with offline packs", () => {
  it("a saved track loads with the network disabled", async () => {
    const stores: Store = new Map();
    const world = createWorld(stores);

    // Online: the worker installs, the page saves the pack through the real client.
    await world.dispatch("install");
    await world.dispatch("activate");
    const saved = await savePack(INDEX, "web", { fetch: world.network, openCache: world.openCache });
    expect(saved).toBe(2);

    // Network off: the chunk is served from the pack, not from the network.
    world.online.value = false;
    const chunk = await world.dispatch("fetch", get("/assets/track-web.js"));
    expect(await chunk!.text()).toBe("export const web = 1;");

    // An offline reload of a lesson route still gets the cached app shell.
    const nav = await world.dispatch("fetch", get("/learn/web/intro", "navigate"));
    expect(await nav!.text()).toBe("<html>shell</html>");
  });

  it("the pack survives a later activation, while unrelated caches are removed", async () => {
    const stores: Store = new Map([
      ["codexter-v3", new Map()],
      [PACK_CACHE, new Map([[key("/assets/track-web.js"), new Response("kept")]])],
    ]);
    const world = createWorld(stores);
    await world.dispatch("activate");
    expect([...stores.keys()]).toEqual([PACK_CACHE]);
  });

  it("an offline request for a file that was never saved is not answered from cache", async () => {
    const stores: Store = new Map();
    const world = createWorld(stores);
    await world.dispatch("install");
    await world.dispatch("activate");
    await savePack(INDEX, "web", { fetch: world.network, openCache: world.openCache });
    world.online.value = false;
    // A file outside the pack and not in any cache: the worker falls through to the network and fails.
    const res = await world.dispatch("fetch", get("/assets/other.js"));
    expect(res!.type).toBe("error");
  });

  it("the worker and the client agree on the pack cache name", () => {
    expect(SW_SOURCE).toContain(`const PACK_CACHE_NAME = "${PACK_CACHE}";`);
  });

  it("the client status reports a partial pack when only some files were stored", async () => {
    const stores: Store = new Map([[PACK_CACHE, new Map([[key("/assets/index.js"), new Response("x")]])]]);
    const world = createWorld(stores);
    expect(await packStatus(INDEX, "web", { openCache: world.openCache })).toBe("partial");
  });
});
