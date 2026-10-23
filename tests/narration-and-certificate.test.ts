import { describe, expect, it } from "vitest";
import { validateNarration } from "../src/lib/narrationCheck";
import { certificateFor, plausibilityIssues, reviewerMetrics, type ExerciseAttempt } from "../src/lib/reviewerCertificate";

const facts = { steps: [1, 2, 3, 4], tools: ["read_file", "run_tests"], files: ["src/app.ts"] };

describe("narration validator", () => {
  it("accepts narration whose references all exist in the trace", () => {
    expect(validateNarration("Step 2 read `src/app.ts` and then `run_tests` passed.", facts).ok).toBe(true);
  });
  it("rejects an invented step, tool, or file", () => {
    const r = validateNarration("Step 9 called `run_migrations` on `db/schema.sql`.", facts);
    expect(r.ok).toBe(false);
    expect(r.unsupported).toEqual(["step 9", "run_migrations", "db/schema.sql"]);
  });
});

const attempt = (over: Partial<ExerciseAttempt> = {}): ExerciseAttempt => ({
  exerciseId: "x", seenBefore: false, score: 1, startedAtMs: 0, finishedAtMs: 120_000,
  decisions: [{ correct: true, shownAtMs: 0, decidedAtMs: 10_000 }, { correct: true, shownAtMs: 10_000, decidedAtMs: 25_000 }],
  ...over,
});

describe("reviewer metrics and certificate", () => {
  it("computes accuracy and median decision time", () => {
    const m = reviewerMetrics([{ correct: true, shownAtMs: 0, decidedAtMs: 5000 }, { correct: false, shownAtMs: 0, decidedAtMs: 9000 }, { correct: true, shownAtMs: 0, decidedAtMs: 7000 }]);
    expect(m).toEqual({ accuracy: 2 / 3, medianMs: 7000, count: 3 });
  });
  it("a plausible unseen attempt earns the certificate", () => {
    expect(certificateFor([attempt()])).toEqual({ eligible: true, reasons: [] });
  });
  it("rejects an attempt finished implausibly fast", () => {
    expect(plausibilityIssues(attempt({ finishedAtMs: 3000 }))).toContain("finished faster than a human could read the items");
    expect(certificateFor([attempt({ finishedAtMs: 3000 })]).eligible).toBe(false);
  });
  it("rejects a decision made faster than the reading minimum", () => {
    const a = attempt({ decisions: [{ correct: true, shownAtMs: 0, decidedAtMs: 500 }, { correct: true, shownAtMs: 500, decidedAtMs: 30_000 }] });
    expect(plausibilityIssues(a)).toContain("a decision was made faster than the minimum reading time");
  });
  it("seen exercises never earn the certificate", () => {
    expect(certificateFor([attempt({ seenBefore: true })]).reasons).toContain("no unseen exercise");
  });
  it("requires the unseen score to reach the threshold", () => {
    expect(certificateFor([attempt({ score: 0.5, decisions: [{correct:false,shownAtMs:0,decidedAtMs:10000},{correct:true,shownAtMs:10000,decidedAtMs:25000}] })]).reasons.join()).toContain("unseen score below");
  });
});

 it("rejects the prior fabricated score and timestamps bypass", () => {
   expect(certificateFor([attempt({ decisions: [{correct:false,shownAtMs:0,decidedAtMs:10000}] })]).eligible).toBe(false);
   expect(plausibilityIssues(attempt({startedAtMs:20000,decisions:[{correct:true,shownAtMs:0,decidedAtMs:6000}]}))).toContain("decision timestamps fall outside the attempt");
 });

import { validateCitations } from "../src/lib/narrationCheck";
it("rejects unquoted invented references and fabricated citation outcomes", () => {
  expect(validateNarration("Step 2 ran run_migrations on db/schema.sql", facts).ok).toBe(false);
  const trace = {...facts, events:[{step:2,text:"run_tests returned 2 failures in src/app.ts"}]};
  expect(validateCitations('[{"step":2,"quote":"run_tests returned 2 failures"}]',trace)).toHaveLength(1);
  expect(()=>validateCitations('[{"step":2,"quote":"run_tests passed all tests"}]',trace)).toThrow("not in");
  expect(()=>validateCitations('[{"step":2,"quote":"run_tests returned 2 failures","claim":"all green"}]',trace)).toThrow("schema");
});
