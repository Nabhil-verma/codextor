/* @flagged fieldReports: registered only when VITE_FLAG_FIELD_REPORTS=1 (see index.ts). */
import { ALL_TRANSCRIPT_CASES } from "./transcripts";
const incident = (id: string) => ALL_TRANSCRIPT_CASES.find(trace => trace.id === id)!;
import type { Track, Lesson } from "./types";

const reportCases: Lesson[] = [
  { id: "invented-api-report", trace: incident("transcript-invented-api"), tokens: ["step 2", "groupbyday", "typeerror", "hallucinated", "real api"],
    exemplar: "First bad step: step 2 introduced orders.groupByDay, a hallucinated API. Evidence: the TypeError in step 3 proves this method does not exist. The later catch hid the failure instead of repairing the real cause. Prevention: use the real API with an executable fixture that compares exact daily totals, and require the regression check to pass before allowing the branch to merge. Keep the failing case visible." },
  { id: "missing-test-report", trace: incident("transcript-unverified-claim"), tokens: ["step 4", "tests pass", "not invoked", "missing test", "required ci"],
    exemplar: "First bad step: step 4 claimed all tests pass without execution. Evidence: npm test was not invoked in this session, so the written regression is not a passing receipt. Classification: missing test evidence. Prevention: required CI on the final revision must execute the test and retain its output before merge. A polished report and a test file alone do not prove the rounding repair. Reject the unsupported completion claim." },
  { id: "edge-case-report", trace: incident("transcript-missed-edge"), tokens: ["step 2", "orders.length", "empty", "edge case", "regression"],
    exemplar: "First bad step: step 2 divided by orders.length without an empty collection guard. Evidence: empty input makes the denominator zero, while the happy-path suite never exercises this branch. Classification: missing edge case. Prevention: require an empty-input regression with an explicit expected value and a nonempty control case in CI. Demonstrate that the assertion fails on the draft and passes on the repair, rather than changing the expected result to NaN." },
].map(({ id, trace, tokens, exemplar }) => ({
  id, title: `Field report: ${trace.title}`, minutes: 12, reviewed: "2026-10", toolDependent: true, reviewBy: "2026-12-30",
  body: `Read this public incident and write an evidence-backed report. These checks verify specific cited facts and required prevention terms, not the truth of arbitrary prose.\n\n${trace.steps.map(step => `${step.n} ${step.kind}: ${step.text}`).join("\n\n")}`,
  quiz: [{ q: "What must a report cite?", options: ["The earliest unsupported action and observed evidence", "Only the last symptom", "The model's confidence"], answer: 0, explanation: trace.why },
    { q: "Does a model's critique determine the score?", options: ["No, only the deterministic evidence rubric does", "Yes, if it sounds confident", "Yes, if the learner uses their own key"], answer: 0, explanation: "The rubric is the grader. Commentary is optional and cannot authenticate an incident." }],
  rubric: { id: `report-${id}`, title: "Evidence-backed incident report", prompt: "Name the first fault, quote evidence, classify it, and propose a checkable prevention.", brief: "Each check names a specific fact in this incident. Keywords alone do not establish semantic correctness.", minWords: 60,
    criteria: tokens.map((token, i) => ({id:`fact-${i}`,label:`Cites incident fact: ${token}`,check:`output.includes(${JSON.stringify(token)})`})), exemplar },
}));

export const fieldReportsTrack: Track = {
  id: "field-reports",
  title: "Field Reports",
  blurb: "Turn one agent failure into a short report someone else can act on.",
  numeral: "ⅩⅧ",
  optional: true,
  optionalWhy: "practice track: write the report after you have verified an agent failure",
  lessons: [
    {
      id: "first-fault-report",
      title: "Write the First-Fault Field Report",
      minutes: 12,
      reviewed: "2026-10",
      toolDependent: true,
      reviewBy: "2026-12-30",
      body: `A useful field report is short and checkable. It names the first bad step, not the last visible symptom. It cites the evidence you saw, classifies the failure, and proposes a prevention that is a gate, not a reminder.\n\nThe scenario: task fixes src/date.ts only. Step 2 repairs the parser. Step 3 edits src/billing/invoice.ts outside the task. Step 4 reports tests passed. Cite step 3 and the file; a green test does not authorize scope expansion. The rubric checks the structure and the prevention deterministically; it does not judge your prose style.`,
      quiz: [
        { q: "Which belongs in a field report?", options: ["The last visible symptom", "The first bad step with the evidence that shows it", "A general opinion about the model"], answer: 1, explanation: "The first fault is what prevention must target." },
        { q: "Which prevention is a gate rather than a reminder?", options: ["Add a line to the instruction file", "A required CI check that rejects unrelated file changes", "Tell the team to be careful"], answer: 1, explanation: "A gate enforces; a reminder can be ignored." },
      ],
      rubric: {
        id: "field-report-first-fault",
        title: "A first-fault field report",
        prompt: "Write the report: first bad step, evidence, classification, and a gate-based prevention.",
        brief: "Cover all four parts. Name the step, cite what you observed, use a taxonomy class, and propose a mechanical gate.",
        minWords: 60,
        criteria: [
          {
            id: "first-step",
            label: "Names the first bad step",
            check: 'output.includes("step 3") && output.includes("src/billing/invoice.ts")',
          },
          {
            id: "evidence",
            label: "Cites the transcript, log or test output as evidence",
            check: 'output.includes("transcript") && output.includes("unrelated")',
          },
          {
            id: "classification",
            label: "Classifies the failure (scope creep, invented API, missing test, secret, edge case, race)",
            check: 'output.includes("scope creep")',
            weight: 2,
          },
          {
            id: "gate",
            label: "Proposes a mechanical prevention: a hook, required CI, or protected branch",
            check: 'output.includes("hook") || output.includes("required ci") || output.includes("ci check") || output.includes("protected branch")',
            weight: 2,
          },
        ],
        exemplar: "First bad step: step 3, the agent edited src/billing/invoice.ts, which the task never mentioned. Evidence: the transcript and the diff show the unrelated file change, and the test output passed only because the parser fix was in place. Classification: scope creep. Prevention: a required CI check that fails any pull request touching files outside the declared task scope, plus a protected branch so the change cannot merge without it.",
      },
    },
    {
      id: "secret-incident-report",
      title: "Write the Secret-Exposure Field Report",
      minutes: 12,
      reviewed: "2026-10",
      toolDependent: true,
      reviewBy: "2026-12-30",
      body: `An agent's log line printed a live credential. A report about that must be specific about what leaked, where the copies are, and how to keep it from happening again. Rotation is the first action; deleting the log line is not enough, because downstream summaries and transcripts may still hold the value.\n\nThe rubric checks each part: the exposure itself, the rotation or revocation, the audit of downstream copies, and a prevention at the wrapper boundary.`,
      quiz: [
        { q: "A secret reached a transcript. What is the first action?", options: ["Delete the log line", "Rotate or revoke the credential", "Ask the agent not to do it again"], answer: 1, explanation: "A removed line does not revoke copies already written." },
        { q: "Where should secret redaction be enforced?", options: ["In the instruction file", "At the tool wrapper, before output crosses the context boundary", "In the reviewer's memory"], answer: 1, explanation: "Enforce at the boundary, not by reminder." },
      ],
      rubric: {
        id: "field-report-secret",
        title: "A secret-exposure field report",
        prompt: "Write the report: what leaked, rotation, downstream audit, and a boundary prevention.",
        brief: "Name the exposure, state the rotation or revocation, audit downstream copies, and propose a wrapper-level redaction.",
        minWords: 60,
        criteria: [
          { id: "exposure", label: "Names the exposed secret and where it appeared", check: 'output.includes("credential") && output.includes("log")', weight: 1 },
          { id: "rotate", label: "States rotation or revocation as the first action", check: 'output.includes("first action: rotate") || output.includes("first action: revoke")', weight: 2 },
          { id: "downstream", label: "Audits downstream copies: transcripts, logs, summaries", check: 'output.includes("downstream") && output.includes("transcript")', weight: 2 },
          { id: "boundary", label: "Proposes redaction at the tool wrapper boundary", check: 'output.includes("wrapper") && output.includes("redact")', weight: 2 },
        ],
        exemplar: "Exposure: the wrapper logged the live credential into the run transcript and a CI log. First action: rotate the credential and revoke the old one immediately to invalidate every existing copy. Downstream copies: audit the transcript, CI log and any generated summary. Prevention: redact at the tool wrapper boundary, so output never crosses into context unredacted, with a required check that fails on a secret pattern.",
      },
    },
    ...reportCases,
    {
      id: "own-session-report", title: "Report on Your Own Agent Session", minutes: 12,
      reviewed: "2026-10", toolDependent: true, reviewBy: "2026-12-30",
      body: "Use a real session from your own repository. Paste a redacted spec, transcript summary and diff, then name the failing test and the fail-before/pass-after proof. State the allowed scope and the files actually changed. Nothing is sent to a model or server by this form. Drafts stay on this device. Remove credentials and private customer data first. The deterministic rubric checks the required evidence structure, not whether a pasted receipt is authentic; this is portfolio practice, never certificate evidence.",
      quiz: [
        { q: "What gives this report its score?", options: ["The deterministic artifact rubric", "A model judging your prose", "How confident the agent sounded"], answer: 0, explanation: "Named sections and evidence expressions determine the score; a model is never the grader." },
        { q: "What must you remove before pasting a session?", options: ["The failing assertion", "Credentials and private data", "The declared scope"], answer: 1, explanation: "Use a redacted session; keep the behavioral evidence, not secrets." },
      ],
      rubric: {
        id: "field-report-own-session", title: "Your real-session evidence packet",
        prompt: "Paste your redacted Spec:, Transcript summary:, Diff:, Failing test:, Proof:, and Scope: sections.",
        brief: "Name a test file, include a diff hunk and its assertion, record FAIL before and PASS after, and name changed files. Structural checks cannot authenticate a receipt. Saved only on this device.",
        minWords: 80,
        criteria: [
          { id: "spec", label: "Spec includes an observable acceptance criterion", check: 'output.includes("spec:") && output.includes("acceptance:")' },
          { id: "transcript", label: "Summary cites the first bad step and observed result", check: 'output.includes("transcript summary:") && output.includes("step ") && output.includes("observed:")' },
          { id: "diff", label: "Diff contains a file path and hunk", check: 'output.includes("diff:") && output.includes("+++ ") && output.includes("@@")' },
          { id: "test", label: "Names the failing test and assertion", check: 'output.includes("failing test:") && (output.includes(".test.") || output.includes("test_")) && (output.includes("assert") || output.includes("expect("))' },
          { id: "proof", label: "Cites FAIL before and PASS after on final revision", check: 'output.includes("proof:") && output.includes("before: fail") && output.includes("after: pass") && output.includes("revision:")' },
          { id: "scope", label: "Declares scope and actual changed files", check: 'output.includes("scope:") && output.includes("allowed:") && output.includes("changed:")' },
        ],
        exemplar: "Spec: fix average([]) without changing the API. Acceptance: empty input returns zero and [2,4] returns three. Transcript summary: step 2 divided by length without an empty guard. Observed: the empty-input assertion received NaN. Diff: +++ src/average.ts @@ average @@ adds a zero-length guard before division, without changing the nonempty path. Failing test: tests/average.test.ts uses expect(average([])).toBe(0) and expect(average([2,4])).toBe(3). Proof: before: FAIL on the draft; after: PASS on the repaired implementation. Revision: local final diff reviewed after the last edit. Scope: allowed: src/average.ts and tests/average.test.ts; changed: those two files only. No unrelated dependency or formatting changes were included.",
      },
    },
  ],
};
