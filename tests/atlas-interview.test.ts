import { describe, it, expect } from "vitest";
import {
  INTERVIEW_QUESTIONS,
  DEFAULT_ANSWERS,
  defaultPlan,
  planFromAnswers,
  mergeAnswers,
  type InterviewAnswers,
} from "../src/lib/atlasInterview";
import { LANES, laneById } from "../src/data/roadmap-lanes";

describe("interview questions", () => {
  it("asks in the three groups from the brief", () => {
    const groups = [...new Set(INTERVIEW_QUESTIONS.map((q) => q.group))];
    expect(groups).toEqual(["start", "planet", "weekly"]);
  });

  it("asks the seven start questions", () => {
    const start = INTERVIEW_QUESTIONS.filter((q) => q.group === "start");
    expect(start.map((q) => q.id)).toEqual([
      "goal",
      "level",
      "hours",
      "deadline",
      "device",
      "stack",
      "ship",
    ]);
  });

  it("gives every choice question a non-empty option list with unique ids", () => {
    for (const q of INTERVIEW_QUESTIONS) {
      if (q.kind !== "choice") continue;
      expect(q.options.length, q.id).toBeGreaterThan(0);
      const ids = q.options.map((o) => o.id);
      expect(new Set(ids).size, q.id).toBe(ids.length);
    }
  });

  it("keeps every user-facing question short", () => {
    for (const q of INTERVIEW_QUESTIONS) {
      expect(q.prompt.length, q.id).toBeLessThanOrEqual(80);
    }
  });
});

describe("skipping the interview", () => {
  it("gives the default plan: the junior-frontend lane", () => {
    const plan = defaultPlan();
    expect(plan.laneId).toBe("junior-frontend");
    expect(laneById(plan.laneId)).toBeDefined();
  });

  it("uses the default plan when nothing is answered", () => {
    expect(planFromAnswers(DEFAULT_ANSWERS)).toEqual(defaultPlan());
  });

  it("answers can be left blank without breaking the plan", () => {
    const plan = planFromAnswers({ goal: "junior-frontend" });
    expect(laneById(plan.laneId)).toBeDefined();
    expect(plan.hoursPerWeek).toBeGreaterThan(0);
  });
});

describe("planFromAnswers", () => {
  it("picks the lane the learner chose as their goal", () => {
    const plan = planFromAnswers({ goal: "interview-prep" });
    expect(plan.laneId).toBe("interview-prep");
  });

  it("only ever returns a lane that exists", () => {
    for (const lane of LANES) {
      expect(planFromAnswers({ goal: lane.id }).laneId).toBe(lane.id);
    }
    expect(planFromAnswers({ goal: "not-a-lane" }).laneId).toBe("junior-frontend");
  });

  it("maps hours per week to a number and never returns zero", () => {
    expect(planFromAnswers({ hours: "1-3" }).hoursPerWeek).toBe(2);
    expect(planFromAnswers({ hours: "13+" }).hoursPerWeek).toBe(14);
    expect(planFromAnswers({ hours: "bogus" }).hoursPerWeek).toBeGreaterThan(0);
  });

  it("is deterministic: the same answers give the same plan", () => {
    const answers: InterviewAnswers = { goal: "fullstack-agents", hours: "8-12", level: "some" };
    expect(planFromAnswers(answers)).toEqual(planFromAnswers(answers));
  });
});

describe("mergeAnswers", () => {
  const a: InterviewAnswers = { goal: "interview-prep", hours: "4-7" };
  const b: InterviewAnswers = { goal: "junior-frontend", device: "laptop" };

  it("is commutative: order of merge does not matter", () => {
    expect(mergeAnswers(a, b)).toEqual(mergeAnswers(b, a));
  });

  it("is idempotent: merging twice changes nothing", () => {
    const once = mergeAnswers(a, b);
    expect(mergeAnswers(once, b)).toEqual(once);
    expect(mergeAnswers(once, once)).toEqual(once);
  });

  it("resolves a conflict the same way from either side", () => {
    const x: InterviewAnswers = { goal: "junior-frontend" };
    const y: InterviewAnswers = { goal: "interview-prep" };
    expect(mergeAnswers(x, y).goal).toBe(mergeAnswers(y, x).goal);
  });

  it("keeps a question skipped on both sides as skipped", () => {
    expect(mergeAnswers({}, {})).toEqual({});
    expect(mergeAnswers({ goal: "interview-prep" }, {})).toEqual({ goal: "interview-prep" });
  });
});
