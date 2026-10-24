import { describe, it, expect } from "vitest";
import { generatePlan } from "../src/lib/atlasPlan";
import { MANIFEST_TRACKS, findLessonMeta } from "../src/data/manifest";
import { laneById } from "../src/data/roadmap-lanes";
import { defaultPlan } from "../src/lib/atlasInterview";

describe("generatePlan", () => {
  it("returns the lessons of the chosen lane, in lane track order", () => {
    const plan = generatePlan({ goal: "school-project-4w" });
    const lane = laneById("school-project-4w")!;
    const expected = lane.trackIds.flatMap((id) => {
      const track = MANIFEST_TRACKS.find((t) => t.id === id)!;
      return track.lessons.map((l) => `${id}/${l.id}`);
    });
    expect(plan.steps.map((s) => s.key)).toEqual(expected);
  });

  it("uses only lessons that exist in the manifest", () => {
    const plan = generatePlan({ goal: "fullstack-agents" });
    for (const step of plan.steps) {
      expect(findLessonMeta(step.trackId, step.lessonId), step.key).toBeDefined();
    }
  });

  it("gives each lesson at most one step", () => {
    const plan = generatePlan({ goal: "junior-frontend" });
    const keys = plan.steps.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("sums the lesson minutes from the manifest", () => {
    const plan = generatePlan({ goal: "interview-prep" });
    const expected = plan.steps.reduce((sum, s) => sum + s.minutes, 0);
    expect(plan.totalMinutes).toBe(expected);
    expect(plan.totalMinutes).toBeGreaterThan(0);
  });

  it("estimates weeks as total minutes over weekly study time, rounded up", () => {
    const plan = generatePlan({ goal: "junior-frontend", hours: "4-7" });
    const weekMinutes = plan.hoursPerWeek * 60;
    expect(plan.weeks).toBe(Math.ceil(plan.totalMinutes / weekMinutes));
  });

  it("finishes sooner with more hours per week", () => {
    const slow = generatePlan({ goal: "junior-frontend", hours: "1-3" });
    const fast = generatePlan({ goal: "junior-frontend", hours: "13+" });
    expect(fast.weeks).toBeLessThan(slow.weeks);
    expect(fast.totalMinutes).toBe(slow.totalMinutes);
  });

  it("is deterministic: the same answers give the same plan", () => {
    const answers = { goal: "fullstack-agents", hours: "8-12" };
    expect(generatePlan(answers)).toEqual(generatePlan(answers));
  });

  it("gives the default plan when the interview is skipped", () => {
    const plan = generatePlan({});
    expect(plan.laneId).toBe(defaultPlan().laneId);
    expect(plan.steps.length).toBeGreaterThan(0);
  });

  it("carries the lane's milestones", () => {
    const plan = generatePlan({ goal: "junior-frontend" });
    expect(plan.milestoneIds).toEqual(laneById("junior-frontend")!.milestoneIds);
  });
});
