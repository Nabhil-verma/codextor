// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";
import { tracks, totalLessonCount } from "../src/data";
import { MANIFEST_TRACKS, TOTAL_LESSONS, TRACK_COUNT, findLessonMeta } from "../src/data/manifest";

/*
 * #6: the entry chunk used to import the whole curriculum through
 * `src/data/index.ts` (via Landing, Nav, gamification and milestones).
 * The app now reads the generated manifest and loads one track on demand.
 *
 * These tests are the guard rails: the first keeps the entry path off the full
 * registry, the rest keep the generated manifest honest about the curriculum.
 */

const SRC = fileURLToPath(new URL("../src", import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

/** Every statement that imports from the full registry (type-only is erased). */
function registryImports(source: string): string[] {
  const hits: string[] = [];
  const re = /import\s+(type\s+)?([\s\S]*?)\s+from\s+"(\.\.?\/data|\.\.?\/data\/index)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    if (m[1]) continue; // `import type` costs nothing at runtime
    hits.push(m[0].split("\n")[0]);
  }
  return hits;
}

describe("the entry path stays off the full curriculum registry", () => {
  const files = walk(SRC);

  it("only src/data itself imports data/index", () => {
    const offenders = files
      .filter((f) => !relative(SRC, f).startsWith("data/"))
      .filter((f) => registryImports(readFileSync(f, "utf8")).length > 0);
    expect(offenders.map((f) => relative(SRC, f))).toEqual([]);
  });

  it("the lesson route loads one track on demand", () => {
    const lesson = readFileSync(join(SRC, "pages/Lesson.tsx"), "utf8");
    expect(lesson).toContain('from "../data/manifest"');
    expect(lesson).toContain('from "../data/loadTrack"');
    expect(lesson).toContain("prefetchNextLesson");
  });

  it("the loader glob is per track, not per curriculum", () => {
    const loader = readFileSync(join(SRC, "data/loadTrack.ts"), "utf8");
    expect(loader).toContain('import.meta.glob<Record<string, unknown>>("./track-*.ts")');
  });
});

describe("manifest agrees with the curriculum registry", () => {
  it("has the same tracks in the same order", () => {
    expect(TRACK_COUNT).toBe(tracks.length);
    expect(TOTAL_LESSONS).toBe(totalLessonCount);
    expect(MANIFEST_TRACKS.map((t) => t.id)).toEqual(tracks.map((t) => t.id));
  });

  it("keeps every track's metadata", () => {
    for (const track of tracks) {
      const meta = MANIFEST_TRACKS.find((t) => t.id === track.id);
      expect(meta, `${track.id} is missing from the manifest`).toBeTruthy();
      expect(meta!.title).toBe(track.title);
      expect(meta!.blurb).toBe(track.blurb);
      expect(meta!.numeral).toBe(track.numeral);
      expect(meta!.optional ?? false).toBe(track.optional ?? false);
    }
  });

  it("keeps every lesson's id, title, minutes, language and interaction kind", () => {
    for (const track of tracks) {
      const meta = MANIFEST_TRACKS.find((t) => t.id === track.id)!;
      expect(meta.lessons.map((l) => l.id)).toEqual(track.lessons.map((l) => l.id));
      for (const lesson of track.lessons) {
        const entry = findLessonMeta(track.id, lesson.id)!;
        expect(entry.title).toBe(lesson.title);
        expect(entry.minutes).toBe(lesson.minutes);
        expect(entry.lang).toBe(lesson.lang);
        expect(entry.quizCount).toBe(lesson.quiz.length);
        expect(entry.hasPredict).toBe(Boolean(lesson.predict?.length));
        expect(entry.hasDebug).toBe(Boolean(lesson.debug));
        expect(entry.debugCode).toBe(lesson.debug?.diagnosis?.answer);
        const expected = lesson.starter
          ? "interactive"
          : lesson.gitSim
            ? "terminal"
            : lesson.sandbox
              ? "visual"
              : "reading";
        expect(entry.interaction).toBe(expected);
      }
    }
  });

  it("carries no lesson bodies (that is the entire point)", () => {
    const source = readFileSync(join(SRC, "data/manifest.ts"), "utf8");
    expect(source).not.toContain("body:");
    expect(source).not.toContain("starter:");
    expect(source).not.toContain("explanation:");
  });
});
