import { describe, it, expect } from "vitest";
import { generatePlan, paceForecast } from "../src/lib/atlasPlan";

const TODAY = "2026-10-23";

describe("paceForecast", () => {
  it("counts only lessons not yet finished", () => {
    const plan = generatePlan({ goal: "school-project-4w" });
    const done = new Set([plan.steps[0].key]);
    const f = paceForecast(plan, done, TODAY);
    const remaining = plan.steps.slice(1).reduce((s, x) => s + x.minutes, 0);
    expect(f.remainingMinutes).toBe(remaining);
  });

  it("gives a finish date that is the start date plus whole weeks", () => {
    const plan = generatePlan({ goal: "junior-frontend", hours: "4-7" });
    const f = paceForecast(plan, new Set(), TODAY);
    const weekMinutes = plan.hoursPerWeek * 60;
    const weeks = Math.ceil(plan.totalMinutes / weekMinutes);
    expect(f.weeks).toBe(weeks);
    const expected = new Date(Date.UTC(2026, 9, 23) + weeks * 7 * 86_400_000).toISOString().slice(0, 10);
    expect(f.finishDate).toBe(expected);
  });

  it("finishes the same day when everything is already done", () => {
    const plan = generatePlan({ goal: "interview-prep" });
    const all = new Set(plan.steps.map((s) => s.key));
    const f = paceForecast(plan, all, TODAY);
    expect(f.remainingMinutes).toBe(0);
    expect(f.weeks).toBe(0);
    expect(f.finishDate).toBe(TODAY);
  });

  it("is deterministic for the same inputs", () => {
    const plan = generatePlan({ goal: "fullstack-agents", hours: "8-12" });
    expect(paceForecast(plan, new Set(), TODAY)).toEqual(paceForecast(plan, new Set(), TODAY));
  });

  it("gives a later date with fewer hours per week", () => {
    const slow = generatePlan({ goal: "junior-frontend", hours: "1-3" });
    const fast = generatePlan({ goal: "junior-frontend", hours: "13+" });
    const a = paceForecast(slow, new Set(), TODAY).finishDate;
    const b = paceForecast(fast, new Set(), TODAY).finishDate;
    expect(a > b).toBe(true);
  });
});
