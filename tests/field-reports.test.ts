import { describe, expect, it } from "vitest";
import { fieldReportsTrack } from "../src/data/track-field-reports";
import { evaluateCheck } from "../src/lib/runner";
import { flagEnabled } from "../src/lib/flags";

const rubric = fieldReportsTrack.lessons[0].rubric!;
const grade = (text: string) => {
  const output = text.toLowerCase();
  const total = rubric.criteria.reduce((n, c) => n + (c.weight ?? 1), 0);
  const got = rubric.criteria.reduce((n, c) => n + (c.check && evaluateCheck(c.check, output) ? (c.weight ?? 1) : 0), 0);
  return got / total;
};

describe("field report rubric", () => {
  it("the exemplar meets every criterion", () => {
    expect(grade(rubric.exemplar)).toBe(1);
  });
  it("a bare symptom with no gate scores below full credit", () => {
    expect(grade("The tests fail. Please be more careful next time.")).toBeLessThan(0.5);
  });
  it("is registered only behind the fieldReports flag", () => {
    expect(flagEnabled("fieldReports", {})).toBe(false);
    expect(flagEnabled("fieldReports", { VITE_FLAG_FIELD_REPORTS: "1" })).toBe(true);
  });
});

describe("second field report rubric", () => {
  const lessons = fieldReportsTrack.lessons;
  it("has five incidents and an own-repository report with unique rubrics", () => {
    expect(lessons).toHaveLength(6);
    expect(new Set(lessons.map(l => l.id)).size).toBe(6);
    expect(new Set(lessons.map(l => l.rubric?.id)).size).toBe(6);
  });
  it("the secret report's exemplar meets every criterion and a bare claim does not", () => {
    const r = lessons[1].rubric!;
    const score = (text: string) => {
      const out = text.toLowerCase();
      const total = r.criteria.reduce((n, c) => n + (c.weight ?? 1), 0);
      return r.criteria.reduce((n, c) => n + (c.check && evaluateCheck(c.check, out) ? (c.weight ?? 1) : 0), 0) / total;
    };
    expect(score(r.exemplar)).toBe(1);
    expect(score("Be more careful with keys.")).toBeLessThan(0.5);
  });
});

import { evaluateRubric } from "../src/lib/labGrade";
it("every report exemplar passes the real grader, meets length, and rejects unrelated keyword soup",()=>{
 for(const lesson of fieldReportsTrack.lessons){const r=lesson.rubric!;
 expect(r.exemplar.trim().split(/\s+/).length,lesson.id).toBeGreaterThanOrEqual(r.minWords!);
 expect(evaluateRubric(r,r.exemplar,{}).score,lesson.id).toBe(1);
 expect(evaluateRubric(r,"first bad transcript secret scope creep hook required ci",{}).score,lesson.id).toBeLessThan(1);
 }
});
