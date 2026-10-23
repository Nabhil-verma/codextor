import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { tracks } from "../src/data";
import { canonicalProgressKey } from "../src/lib/progressKeys";
import { nextLessonRef } from "../src/data/loadTrack";
import { finishedTracks } from "../src/lib/gamification";
import { MILESTONES } from "../src/lib/milestones";
const baseline = JSON.parse(readFileSync(new URL("../docs/curriculum-baseline.json", import.meta.url), "utf8"));

describe("agentic core spine and identity compatibility", () => {
  it("puts agents fourth and keeps all optional tracks after core", () => {
    expect(tracks.filter(t => !t.optional).map(t => t.id)).toEqual(["web","git","testing","agents","workflow","security","typescript","backend","react","api"]);
    const firstOptional = tracks.findIndex(t => t.optional);
    expect(tracks.slice(firstOptional).every(t => t.optional)).toBe(true);
  });
  it("retains all original keys and titles", () => {
    const actual = tracks.flatMap(t => t.lessons.map(l => canonicalProgressKey(`${t.id}/${l.id}`)));
    for (const key of baseline.keys) expect(actual).toContain(key);
    for (const title of baseline.titles) expect(tracks.flatMap(t => t.lessons.map(l => l.title))).toContain(title);
  });
  it("preserves depth-track certificates and milestones", () => {
    for (const id of ["state", "dsa"]) {
      const track = tracks.find(t => t.id === id)!;
      expect(track.optionalWhy).toBe("depth track: learn it once you are supervising agents on real code");
      const completed = Object.fromEntries(track.lessons.map(l => [`${id}/${l.id}`,1]));
      expect(finishedTracks({completed}).map(t => t.id)).toContain(id);
    }
    const keys = new Set(tracks.flatMap(t => t.lessons.map(l => `${t.id}/${l.id}`)));
    for (const m of MILESTONES) for (const key of m.skills) expect(keys.has(key),key).toBe(true);
  });
  it("makes prefetch follow the new cross-track order", () => {
    expect(nextLessonRef("web", "capstone-utility-belt")?.trackId).toBe("git");
    expect(nextLessonRef("testing", "incident-timeline")?.trackId).toBe("agents");
  });
  it("meets the authored-minute reorder targets", () => {
    const core = tracks.filter(t => !t.optional);
    const before = (id: string) => core.slice(0,core.findIndex(t => t.id === id)).flatMap(t => t.lessons).reduce((n,l) => n+l.minutes,0);
    expect(before("agents")).toBe(241);
    // Lesson zero adds twelve authored minutes after the #1 verified checkpoint.
    // #10 adds two twelve-minute Agents lessons (enforceable rules, headless runs): +24.
    expect(before("workflow")).toBe(406);
    expect(core.flatMap(t => t.lessons).reduce((n,l) => n+l.minutes,0)).toBe(790);
  });
});
