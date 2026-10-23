// @vitest-environment node
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { tracks } from "../src/data";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const baseline = JSON.parse(read("docs/curriculum-baseline.json"));

describe("reproducible lesson-grain curriculum profile", () => {
  it("runs the delivered CLI against the actual data", () => {
    const result = JSON.parse(execFileSync(process.execPath, ["scripts/curriculum-profile.mjs"], { encoding: "utf8" }));
    expect(result.lessons).toBe(tracks.reduce((n, t) => n + t.lessons.length, 0));
    expect(result.minutes).toBe(tracks.flatMap(t => t.lessons).reduce((n, l) => n + l.minutes, 0));
    expect(result.coreMinutes + result.optionalMinutes).toBe(result.minutes);
    expect(result.validation.sumsAgree).toBe(true);
    expect(result.agenticLessonShare).toBeGreaterThanOrEqual(0);
    expect(result.agenticLessonShare).toBeLessThanOrEqual(100);
    for (const field of ["duplicateKeys", "duplicateLessonIds", "duplicateTitles", "nullFields", "invalidMinutes"]) {
      expect(result.validation[field]).toEqual([]);
    }
    for (const concept of result.concepts) {
      expect(concept.rawHits, concept.concept).toBeGreaterThanOrEqual(0);
      // Raw source includes disabled tracks and is not rendered-content coverage.
    }
  });

  it("refuses to overwrite the frozen baseline", () => {
    const before = read("docs/curriculum-baseline.json");
    expect(() => execFileSync(process.execPath, ["scripts/curriculum-profile.mjs", "--baseline"], { encoding: "utf8", stdio: "pipe" })).toThrow(/Baseline already exists/);
    expect(read("docs/curriculum-baseline.json")).toBe(before);
  });

  it("pins the pre-edit baseline, including corrections to assumptions", () => {
    expect([baseline.lessons, baseline.tracks, baseline.minutes, baseline.median]).toEqual([103, 17, 1238, 11]);
    expect([baseline.coreMinutes, baseline.optionalMinutes, baseline.agenticMinutes]).toEqual([896, 342, 166]);
    expect(baseline.starts.agents).toEqual({ minutes: 730, lessons: 62 });
    expect(baseline.starts.workflow.minutes).toBe(847);
    expect(baseline.rawRegistryStarts.agents).toEqual({ minutes: 1072, lessons: 90 });
    expect(baseline.exercises).toEqual({ debug: 9, diff: 4, uniqueDiff: 3, repo: 3, rubric: 8, criteria: 40 });
    expect([baseline.quizOnly.length, baseline.quizOnlyMinutes]).toEqual([25, 270]);
    expect(baseline.agentsRunnable).toEqual([]);
    expect(baseline.agentsDebug).toHaveLength(2);
    expect(baseline.validation.numeralGaps).toEqual([17, 18]);
    expect(baseline.concepts.every((c: { lessons: unknown[]; rawHits: unknown[] }) => !c.lessons.length && !c.rawHits.length)).toBe(true);
    expect(baseline.agenticBodies).toHaveLength(13);
  });

  it("delivers labeled, accessible charts with explicitly estimated scenarios", () => {
    const chart = read("docs/agentic-curriculum-charts.html");
    expect(chart).toContain('role="img"');
    expect(chart).toContain('aria-labelledby="chart-title chart-desc"');
    expect(chart).toContain("Default core minutes before track starts (minutes)");
    expect(chart).toContain("Agentic minutes / core minutes (%)");
    expect(chart).toContain("730 min");
    expect(chart).toContain("847 min");
    expect(chart).toContain("18.5%");
    expect(chart).toContain("Full-plan estimate*");
    expect(chart).toContain("not a delivered or timed result");
  });
});
