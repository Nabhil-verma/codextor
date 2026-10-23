// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { tracks } from "../src/data";
import { loadTrack } from "../src/data/loadTrack";
import { JUDGMENT_CONVERSIONS } from "../src/data/judgment-conversions";
import { scoreSelect } from "../src/lib/labGrade";
import { runUserCode } from "../src/lib/runner";
import { requiredExerciseIds, evidenceScore, submitExercise } from "../src/lib/lessonEvidence";
import { recordAttempt, resetTelemetry } from "../src/lib/telemetry";
import { canonicalProgressKey } from "../src/lib/progressKeys";
import { scoreFor } from "../src/lib/progress";

describe("completion integration", () => {
  it("converts exactly the eleven requested stable lesson keys into graded evidence reviews", async () => {
    expect(Object.keys(JUDGMENT_CONVERSIONS)).toHaveLength(11);
    expect(Object.keys(JUDGMENT_CONVERSIONS).sort()).toEqual([
      "git/git-basics", "git/git-branches", "git/git-ci", "web/html-semantic", "web/responsive-deep",
      "backend/rest-auth", "backend/databases", "dsa/linked-lists-stacks-queues", "dsa/trees-recursion",
      "state/server-state", "react/jsx-vdom",
    ].sort());
    for (const [key, repo] of Object.entries(JUDGMENT_CONVERSIONS)) {
      const [trackId, lessonId] = key.split("/");
      const loaded = await loadTrack(trackId);
      expect(loaded?.lessons.find(l => l.id === lessonId)?.repo).toEqual(repo);
      for (const q of repo.questions) {
        if (q.kind !== "select") throw new Error("select required");
        expect(scoreSelect(q, q.options.flatMap((o, i) => o.correct ? [i] : []))).toBe(1);
        expect(scoreSelect(q, [])).toBe(0);
      }
    }
  });
  it("requires the quiz and every artifact instead of granting mastery for one answer", () => {
    resetTelemetry();
    const lesson = tracks.find(t => t.id === "agents")!.lessons.find(l => l.id === "plan-before-code")!;
    const key = "agents/plan-before-code", ids = requiredExerciseIds(lesson);
    recordAttempt({ key, element: "quiz", score: 1, day: "2026-10-12" });
    expect(evidenceScore(key, ids)).toBe(0);
    for (const [i, id] of ids.entries()) {
      submitExercise(key, id, id === lesson.debug?.id ? "debug" : "decision", 1, "2026-10-12");
      expect(evidenceScore(key, ids)).toBe(i === ids.length - 1 ? 1 : 0);
    }
    resetTelemetry();
  });
  it("retains legacy progress while resolving alias-aware reads", () => {
    expect(canonicalProgressKey("python/python-llm-api")).toBe("python/python-llm-api");
    expect(scoreFor({completed:{"python/python-llm-api!2026-10-01":1}}, "python/python-llm-api")).toBe(1);
  });
  it("executes the model mock through the learner fetch interface and resets retries each run", async () => {
    const code = `let tries=0; let res; do { res=await fetch('/api/llm/chat',{method:'POST',body:JSON.stringify({scenario:'ratelimit'})}); tries++; } while(res.status===429 && tries<4); console.log(res.status,tries,(await res.json()).text);`;
    for (let i=0;i<2;i++) {
      const result = await runUserCode(code);
      expect(result.error).toBeNull();
      expect(result.logs).toEqual(["200 3 ready"]);
    }
  });
});
