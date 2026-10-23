// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildPackIndex } from "../scripts/offline-packs.mjs";
import { parsePackIndex } from "../src/lib/offlinePacks";

type FakeChunk = {
  type: "chunk";
  fileName: string;
  isEntry?: boolean;
  facadeModuleId?: string | null;
  imports: string[];
};

function chunk(fileName: string, facade: string | null, imports: string[] = [], isEntry = false): FakeChunk {
  return { type: "chunk", fileName, isEntry, facadeModuleId: facade, imports };
}

function fakeBundle(overrides: Record<string, FakeChunk> = {}) {
  const bundle: Record<string, unknown> = {
    "assets/index-1.js": chunk("assets/index-1.js", "/app/src/main.tsx", ["assets/vendor-2.js"], true),
    "assets/vendor-2.js": chunk("assets/vendor-2.js", null),
    "assets/Lesson-3.js": chunk("assets/Lesson-3.js", "/app/src/pages/Lesson.tsx", ["assets/shared-4.js"]),
    "assets/shared-4.js": chunk("assets/shared-4.js", null),
    "assets/track-web-5.js": chunk("assets/track-web-5.js", "/app/src/data/track-web.ts", ["assets/shared-4.js"]),
    "assets/track-python-6.js": chunk("assets/track-python-6.js", "/app/src/data/track-python.ts"),
    "assets/tsRunner-7.js": chunk("assets/tsRunner-7.js", "/app/src/lib/tsRunner.ts", ["assets/typescript-8.js"]),
    "assets/typescript-8.js": chunk("assets/typescript-8.js", null),
    "assets/index-9.css": { type: "asset", fileName: "assets/index-9.css" },
    "assets/other-10.js": chunk("assets/other-10.js", "/app/src/data/index.ts"),
    ...overrides,
  };
  return bundle;
}

describe("buildPackIndex", () => {
  it("core holds the entry graph, the lesson route and the CSS", () => {
    const index = buildPackIndex(fakeBundle());
    expect(index.core).toEqual(
      expect.arrayContaining([
        "/assets/index-1.js",
        "/assets/vendor-2.js",
        "/assets/Lesson-3.js",
        "/assets/shared-4.js",
        "/assets/index-9.css",
      ]),
    );
    expect(index.core).not.toContain("/assets/track-web-5.js");
  });

  it("each track holds only its own static graph", () => {
    const index = buildPackIndex(fakeBundle());
    expect(Object.keys(index.tracks).sort()).toEqual(["python", "web"]);
    expect(index.tracks.web).toEqual(["/assets/shared-4.js", "/assets/track-web-5.js"]);
    expect(index.tracks.python).toEqual(["/assets/track-python-6.js"]);
  });

  it("the TypeScript runtime is listed separately", () => {
    const index = buildPackIndex(fakeBundle());
    expect(index.runtimes.ts).toEqual(["/assets/tsRunner-7.js", "/assets/typescript-8.js"]);
  });

  it("the version changes when a pack file changes and is stable otherwise", () => {
    const a = buildPackIndex(fakeBundle());
    const b = buildPackIndex(fakeBundle());
    // A content change renames the file (Vite hashes names), so rename it everywhere.
    const renamed = JSON.parse(JSON.stringify(fakeBundle()).split("shared-4.js").join("shared-4-new.js"));
    const c = buildPackIndex(renamed);
    expect(a.version).toBe(b.version);
    expect(c.version).not.toBe(a.version);
  });

  it("its output passes the runtime validator", () => {
    const index = buildPackIndex(fakeBundle());
    expect(parsePackIndex(JSON.parse(JSON.stringify(index)))).toEqual(index);
  });
});
