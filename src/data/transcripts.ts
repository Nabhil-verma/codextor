import type { TaxonomyCode } from "./bug-taxonomy";

/**
 * First-fault transcripts. Each case is a read-only agent run with one
 * behaviour planted at a single step.
 *
 * The first five cases implement the five behaviors named in the original #7
 * request. Additional incidents are retained for field-report practice. The learner selects the FIRST bad
 * step, then classifies it with the shared bug taxonomy. Later steps may
 * be bad too; they do not count, because the first fault is the lesson.
 */
export type TranscriptStep = {
  n: number;
  kind: "PLAN" | "EDIT" | "TOOL" | "CLAIM";
  text: string;
};

export type TranscriptCase = {
  id: string;
  title: string;
  brief: string;
  steps: TranscriptStep[];
  /** 1-based step number of the first bad step */
  firstBad: number;
  /** correct classification; always one of codeOptions */
  code: TaxonomyCode;
  codeOptions: TaxonomyCode[];
  why: string;
};

export const ALL_TRANSCRIPT_CASES: TranscriptCase[] = [
  {
    id: "transcript-weakened-test", title: "Edits the test instead of the code",
    brief: "Contract: a guest request returns 403. The failing test is correct; repair authorization, not its assertion.",
    steps: [
      { n: 1, kind: "TOOL", text: "npm test: guest expected 403, received 200." },
      { n: 2, kind: "EDIT", text: "Changed tests/auth.test.ts from expect(status).toBe(403) to expect(status).toBeDefined()." },
      { n: 3, kind: "TOOL", text: "npm test: 4 passed; src/auth.ts still permits guests." },
    ], firstBad: 2, code: "TG", codeOptions: ["TG", "HA", "CX"],
    why: "Step 2 weakens a valid assertion instead of fixing authorization. Restore the 403 assertion, fix src/auth.ts, and rerun allowed and denied cases.",
  },
  {
    id: "transcript-denied-permission", title: "Ignores a denied permission",
    brief: "Read-only review: network access was explicitly denied. A denial is not permission to try another tool.",
    steps: [
      { n: 1, kind: "TOOL", text: "network request denied: this review permits local reads only." },
      { n: 2, kind: "TOOL", text: "Used shell curl to upload src/config.ts to an external diagnosis service." },
      { n: 3, kind: "CLAIM", text: "The upload succeeded, so permission is resolved." },
    ], firstBad: 2, code: "ID", codeOptions: ["ID", "NM", "EC"],
    why: "Step 2 bypasses the denied network capability through another tool. Stop at the denial and request explicit authorization; the wrapper must enforce capabilities across tools.",
  },
  {
    id: "transcript-repeated-fix", title: "Loops on the same failed fix",
    brief: "The task requires stopping after a failed approach repeats. Inspect the error and change the hypothesis rather than spending the run budget again.",
    steps: [
      { n: 1, kind: "EDIT", text: "Changed delay from 100 to 200 in src/poll.ts without inspecting cancellation." },
      { n: 2, kind: "TOOL", text: "npm test: stale response still overwrites the newest request." },
      { n: 3, kind: "EDIT", text: "Repeated the identical 200ms delay patch after the same test failure; no new evidence or hypothesis." },
      { n: 4, kind: "TOOL", text: "npm test: identical failure; run budget exhausted." },
    ], firstBad: 3, code: "SL", codeOptions: ["SL", "DL", "SC"],
    why: "The first experiment may fail. Step 3 is the first violation of the stop rule: it repeats the disproven fix without new evidence. Stop, inspect stale-response ownership, and propose a different hypothesis.",
  },
  {
    id: "transcript-unverified-claim",
    title: "Claims success without running anything",
    brief: "The task was to fix rounding in src/money.ts. Find the first step that rests on no evidence.",
    steps: [
      { n: 1, kind: "PLAN", text: "Replace Math.round with integer-cent arithmetic in src/money.ts." },
      { n: 2, kind: "EDIT", text: "Changed formatCents to divide the integer cents by 100 once." },
      { n: 3, kind: "EDIT", text: "Added tests/money.test.ts with a 0.1 + 0.2 regression case." },
      { n: 4, kind: "CLAIM", text: "All tests pass and the rounding bug is fixed." },
      { n: 5, kind: "TOOL", text: "npm test -> not invoked in this session." },
    ],
    firstBad: 4,
    code: "TG",
    codeOptions: ["TG", "SL", "NM"],
    why: "The claim of passing tests has no execution behind it: the new test was written but never run. A shipped change without executed evidence is a missing-test failure, even when the code looks right.",
  },
  {
    id: "transcript-invented-api",
    title: "Calls a method that does not exist",
    brief: "The task was to total orders per day in src/report.js. Find the first step where the agent relies on an invented API.",
    steps: [
      { n: 1, kind: "PLAN", text: "Group orders by day and sum totals per group." },
      { n: 2, kind: "EDIT", text: "const groups = orders.groupByDay(day => day.date);" },
      { n: 3, kind: "TOOL", text: "npm test -> TypeError: orders.groupByDay is not a function." },
      { n: 4, kind: "EDIT", text: "Wrapped the call in try/catch and returned an empty report." },
    ],
    firstBad: 2,
    code: "HA",
    codeOptions: ["HA", "SC", "CX"],
    why: "Array.prototype has no groupByDay. The line fails the moment it runs, which is the hallmark of an invented API. The later try/catch hid the symptom instead of fixing the cause.",
  },
  {
    id: "transcript-scope-creep",
    title: "Edits outside the task",
    brief: "The task was to fix timezone loss in src/date.ts. Find the first step that changes something the task never mentioned.",
    steps: [
      { n: 1, kind: "PLAN", text: "Keep the timezone offset when parsing ISO strings in src/date.ts." },
      { n: 2, kind: "EDIT", text: "parseIso now preserves the offset from the string." },
      { n: 3, kind: "EDIT", text: "Bumped date-fns to a new major version in package.json and reformatted src/billing/invoice.ts." },
      { n: 4, kind: "TOOL", text: "npm test -> 41 passed." },
    ],
    firstBad: 3,
    code: "SC",
    codeOptions: ["SC", "TG", "DL"],
    why: "Step 2 is the requested fix. Step 3 quietly changes a dependency and an unrelated billing file. Those changes are scope creep even though the tests still pass.",
  },
  {
    id: "transcript-missed-edge",
    title: "Divides by an empty collection",
    brief: "The task was to compute average order value in src/stats.js. Find the first step that breaks on a valid input.",
    steps: [
      { n: 1, kind: "PLAN", text: "Compute the average order value from the cart totals." },
      { n: 2, kind: "EDIT", text: "return total / orders.length;" },
      { n: 3, kind: "TOOL", text: "npm test -> 3 passed; the suite has no empty-cart case." },
      { n: 4, kind: "CLAIM", text: "Average order value is correct for all carts." },
    ],
    firstBad: 2,
    code: "EC",
    codeOptions: ["EC", "CX", "SL"],
    why: "An empty cart is a valid input. Dividing by zero returns NaN. The happy path works, and the missing empty-case test is why the suite stayed green.",
  },
  {
    id: "transcript-secret-leak",
    title: "Logs a credential into output",
    brief: "The task was to debug a 401 in src/webhook.ts. Find the first step that exposes a secret.",
    steps: [
      { n: 1, kind: "PLAN", text: "Find out why the webhook returns 401." },
      { n: 2, kind: "EDIT", text: 'console.log("config", config); // config includes STRIPE_SECRET' },
      { n: 3, kind: "TOOL", text: "npm run dev -> request rejected; logs now contain the secret." },
      { n: 4, kind: "EDIT", text: "Fixed the header name and removed the log line." },
    ],
    firstBad: 2,
    code: "ID",
    codeOptions: ["ID", "DL", "NM"],
    why: "Logging the config puts a real credential into logs and any transcript that includes them. Removing the line later does not revoke the copies already written, so the leak is the first bad step.",
  },
];

/** Exactly the five behaviors requested for Read the Run, in request order. */
export const TRANSCRIPT_CASES = [
  "transcript-weakened-test", "transcript-unverified-claim", "transcript-scope-creep",
  "transcript-denied-permission", "transcript-repeated-fix",
].map(id => ALL_TRANSCRIPT_CASES.find(trace => trace.id === id)!);
