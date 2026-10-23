/**
 * Deterministic decision artifacts. The learner classifies each item against
 * a written policy; grading is exact match. No model judges the answer.
 * Minute figures are authored estimates, labelled as such in the UI.
 */
export type DecisionOption = { value: string; label: string };

export type DecisionItem = {
  id: string;
  text: string;
  answer: string;
  why: string;
  /** Delegation items only. delegate=null means the result cannot be verified. */
  costs?: { human: number; delegate: number | null };
};

export type DecisionArtifact = {
  id: string;
  kind: "approval" | "permission" | "delegation" | "enforcement" | "headless";
  title: string;
  brief: string;
  options: DecisionOption[];
  items: DecisionItem[];
};

/** Delegate only when the result is verifiable and the estimated path is cheaper. */
export function delegationAnswer(costs: { human: number; delegate: number | null }): "DELEGATE" | "BY HAND" {
  return costs.delegate !== null && costs.delegate < costs.human ? "DELEGATE" : "BY HAND";
}

export const PLAN_APPROVAL: DecisionArtifact = {
  id: "plan-approval",
  kind: "approval",
  title: "Plan approval artifact",
  brief: "Task: add integer-cent rounding in src/billing/round.ts and persist roundingMode with a migration. Existing rows must keep their old behavior; no pricing or public-API change. Review this agent's proposed plan step by step, before it runs.",
  options: [{ value: "APPROVE", label: "Approve" }, { value: "AMEND", label: "Amend before running" }, { value: "REJECT", label: "Reject: outside contract" }],
  items: [
    { id: "map-flow", text: "Read the billing call path and schema before choosing the owning helper.", answer: "APPROVE", why: "This gathers the relevant evidence without changing behavior." },
    { id: "wrong-file", text: "Implement the rounding fix in src/billing/pricing.ts because the filename sounds relevant.", answer: "AMEND", why: "The approved owner is round.ts; trace callers before editing a guessed file." },
    { id: "missing-migration", text: "Add roundingMode as a required field and skip migration because new accounts have it.", answer: "AMEND", why: "Existing rows do not have the field. Include a compatible migration/backfill and rollback before shipping." },
    { id: "add-test", text: "Add empty, negative and fractional-cent regression assertions; run on the draft and repair.", answer: "APPROVE", why: "These checks pin the accepted behavior independently of the agent's implementation." },
    { id: "rename-api", text: "Rename the exported pricing API while editing neighboring code.", answer: "REJECT", why: "An unrelated public-contract change is outside this task." },
    { id: "prod-migration", text: "Deploy the migration to production immediately without owner approval or a dry run.", answer: "REJECT", why: "A plan is not authorization for a shared-data mutation. Require a reviewed migration, local verification and explicit deployment approval." },
  ],
};

export const PERMISSION_SIM: DecisionArtifact = {
  id: "permission-simulator",
  kind: "permission",
  title: "Permissions simulator",
  brief: "Policy: workspace reads, workspace writes and local test or build commands are ALLOW. Deleting files needs CONFIRM. Secrets, force pushes and unapproved network calls are DENY.",
  options: [{ value: "ALLOW", label: "Allow" }, { value: "CONFIRM", label: "Confirm" }, { value: "DENY", label: "Deny" }],
  items: [
    { id: "read-readme", text: "read README.md", answer: "ALLOW", why: "Workspace read." },
    { id: "npm-test", text: "npm test", answer: "ALLOW", why: "Local verification." },
    { id: "write-app", text: "write src/app.ts", answer: "ALLOW", why: "Workspace write inside the task." },
    { id: "delete-build", text: "delete the build/ directory", answer: "CONFIRM", why: "Deletion needs an explicit yes." },
    { id: "read-env", text: "read .env", answer: "DENY", why: "Secrets never enter context." },
    { id: "force-push", text: "git push --force origin main", answer: "DENY", why: "Rewrites shared history." },
    { id: "post-external", text: "POST the diff to an unknown external host", answer: "DENY", why: "Unapproved network egress." },
  ],
};

export const DELEGATION_REPLAY: DecisionArtifact = {
  id: "delegation-cost-replay",
  kind: "delegation",
  title: "Triage and delegation-cost replay",
  brief: "Rule: delegate only when the result can be verified and the estimated delegated path (agent time plus verification) is cheaper than doing it by hand. Minutes are authored estimates, not measurements.",
  options: [{ value: "DELEGATE", label: "Delegate" }, { value: "BY HAND", label: "By hand" }],
  items: [
    { id: "rename-local", text: "Rename one local variable in one file.", answer: "", why: "Delegated path is not cheaper once verification is counted.", costs: { human: 3, delegate: 4 } },
    { id: "formatter-tests", text: "Generate 40 unit tests for a pure formatter with a reference implementation.", answer: "", why: "Verifiable against the reference; the delegated path is far cheaper.", costs: { human: 60, delegate: 20 } },
    { id: "pricing-policy", text: "Decide the company pricing model.", answer: "", why: "No executable check exists, so the result cannot be verified.", costs: { human: 90, delegate: null } },
    { id: "migrate-calls", text: "Mechanically migrate 200 call sites where tests already cover behaviour.", answer: "", why: "Verifiable by the existing suite, and cheaper overall.", costs: { human: 240, delegate: 75 } },
  ].map(item => ({ ...item, answer: delegationAnswer(item.costs!) })),
};

export const ENFORCEMENT_RULES: DecisionArtifact = {
  id: "enforcement-ladder",
  kind: "enforcement",
  title: "Enforcement ladder",
  brief: "Policy: assign each rule the weakest mechanism that really enforces it. TEXT for judgment calls, HOOK for fast local checks, CI for checks that must pass before merge, BRANCH for who may write to a branch.",
  options: [
    { value: "TEXT", label: "Text only" },
    { value: "HOOK", label: "Pre-commit hook" },
    { value: "CI", label: "Required CI" },
    { value: "BRANCH", label: "Protected branch" },
  ],
  items: [
    { id: "small-diffs", text: "Keep diffs small and focused.", answer: "TEXT", why: "A judgment call; no machine measures it reliably." },
    { id: "no-secrets", text: "Never commit a file containing an API key.", answer: "HOOK", why: "Blocks at commit time, before the secret enters history. CI scanning backs it up." },
    { id: "checks-before-merge", text: "Every pull request must pass typecheck and tests before merge.", answer: "CI", why: "A required status check blocks the merge for everyone." },
    { id: "no-direct-main", text: "Nobody pushes directly to main.", answer: "BRANCH", why: "A protected branch refuses the push itself." },
    { id: "agent-done", text: "The agent may not report done until typecheck passes.", answer: "CI", why: "The agent's own claim is not evidence; a required check is." },
    { id: "existing-helper", text: "Prefer an existing helper over a new dependency.", answer: "TEXT", why: "Preference with judgment; a lint rule can flag but cannot decide." },
  ],
};

export const UNATTENDED_RUNS: DecisionArtifact = {
  id: "unattended-runs",
  kind: "headless",
  title: "Unattended run policy",
  brief: "Policy: a scheduled or headless agent may run without a human only when its effects are read-only or confined to the workspace. Anything that merges, deploys, rotates credentials, deletes shared refs or changes shared state needs a human gate.",
  options: [{ value: "UNATTENDED", label: "Unattended" }, { value: "HUMAN GATE", label: "Human gate" }],
  items: [
    { id: "outdated-report", text: "Nightly: list outdated dependencies and write a report file.", answer: "UNATTENDED", why: "Read-only plus a workspace report." },
    { id: "lint-artifact", text: "Nightly: run lint and save failures as a CI artifact.", answer: "UNATTENDED", why: "Nothing shared changes; the output is reviewable later." },
    { id: "bump-pr", text: "Nightly: open a pull request that bumps a dependency.", answer: "HUMAN GATE", why: "Creates shared state; a person reviews before anything merges." },
    { id: "auto-merge", text: "Nightly: merge a pull request whose checks passed.", answer: "HUMAN GATE", why: "Merging is hard to undo and bypasses review." },
    { id: "rotate-credential", text: "Nightly: rotate the production database credential.", answer: "HUMAN GATE", why: "Credential changes need an owner and a rollback plan." },
    { id: "delete-branches", text: "Nightly: delete branches older than 90 days.", answer: "HUMAN GATE", why: "Deletes shared refs; a human decides what is stale." },
  ],
};
