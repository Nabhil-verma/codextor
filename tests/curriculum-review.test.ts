import { describe, expect, it } from "vitest";
import { tracks } from "../src/data";
import { needsToolReview, reviewAgeDays } from "../src/lib/curriculumReview";

describe("agent/tool content review cadence", () => {
  it("validates dates and tags every Agents and Workflow lesson", () => {
    for (const t of tracks.filter(t => ["agents","workflow"].includes(t.id))) for (const l of t.lessons) {
      expect(l.reviewed,`${t.id}/${l.id}`).toBe("2026-10");
      expect(l.toolDependent).toBe(true);
      expect(l.reviewBy).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const ref of l.toolRefs ?? []) expect(ref.asOf).toMatch(/^\d{4}-\d{2}/);
    }
  });
  it("warns after 90 days, not at 90, and fails closed for missing/invalid dates", () => {
    const l = { reviewed: "2026-10", toolDependent: true };
    expect(needsToolReview(l,new Date("2026-12-30T00:00:00Z"))).toBe(false);
    expect(needsToolReview(l,new Date("2026-12-31T00:00:00Z"))).toBe(true);
    expect(reviewAgeDays({ reviewed:"2026-13" },new Date())).toBeNull();
    expect(needsToolReview({toolDependent:true},new Date())).toBe(true);
    expect(needsToolReview({toolDependent:false},new Date())).toBe(false);
  });
  it("emits actionable non-failing CI warnings for stale tool-dependent content", () => {
    const now = new Date();
    for (const t of tracks) for (const l of t.lessons) if(needsToolReview(l,now)) {
      console.warn(`::warning file=src/data/track-${t.id}.ts::${t.id}/${l.id}: agent/tool content reviewed ${l.reviewed ?? 'never'}; review overdue (>90 days).`);
    }
  });
});

import { tracks as curriculum } from "../src/data";
import { spawnSync } from "node:child_process";
import { staleReviews, reviewWarningLine } from "../src/lib/curriculumReview";

describe("CI freshness warnings", () => {
  const tracks = [
    { id: "t", lessons: [
      { id: "fresh", reviewed: "2026-10", toolDependent: true },
      { id: "old", reviewed: "2026-01", toolDependent: true },
      { id: "missing", toolDependent: true },
      { id: "static", reviewed: "2020-01", toolDependent: false },
    ] },
  ];
  it("flags only tool-dependent lessons outside the window or without a valid month", () => {
    const now = new Date("2026-10-11T00:00:00Z");
    expect(staleReviews(tracks, now).map(s => s.lessonId)).toEqual(["old", "missing"]);
  });
  it("formats a GitHub warning annotation that names the lesson and its age", () => {
    const line = reviewWarningLine({ trackId: "t", lessonId: "old", reviewed: "2026-01", ageDays: 283 });
    expect(line).toBe("::warning title=Tool-dependent lesson review overdue::t/old last reviewed 2026-01, 283 days ago (window 90 days)");
  });
  it("the CI script warns for stale lessons and still exits 0", () => {
    const r = spawnSync(process.execPath, ["scripts/review-freshness.mjs", "--now=2027-03-01"], { encoding: "utf8" });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("::warning title=Tool-dependent lesson review overdue::workflow/vague-request-ticket");
    const expected = staleReviews(curriculum, new Date("2027-03-01T00:00:00Z")).length;
    expect(r.stdout).toContain(`review-freshness: ${expected} of ${curriculum.reduce((n, t) => n + t.lessons.length, 0)} lessons need re-verification`);
  });
});
