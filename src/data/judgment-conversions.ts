import type { RepoExercise } from "./types";

/** The eleven lessons named in #11, including optional depth tracks; stable IDs and durations. */
const cases = [
  ["web/html-semantic", "A clickable div", "index.html", '<div onclick="save()">Save</div>', "button", "A button supplies keyboard activation and an accessible role; a clickable div does not."],
  ["web/responsive-deep", "The fixed-width phone layout", "styles.css", '.page { width: 1200px; }', "max-width", "Use a fluid width with a max-width; verify at 320px without horizontal scrolling."],
  ["git/git-basics", "The indiscriminate staging command", "session.sh", 'git add . # includes .env and unrelated edits', "named files", "Stage named files after inspecting the diff; credentials must never enter history."],
  ["git/git-branches", "The force push after conflict", "session.sh", 'git push --force origin main', "review branch", "Resolve and test on a review branch; never rewrite shared main to hide divergence."],
  ["git/git-ci", "The pipeline that always passes", "ci.yml", 'test: npm test || true', "preserve exit", "Preserve the test exit status and require the check before merge."],
  ["dsa/linked-lists-stacks-queues", "The queue that pops the newest job", "queue.js", 'const nextJob = jobs.pop(); // contract: oldest job first', "remove from front", "A FIFO queue removes the oldest item. Test two distinct jobs so a stack implementation cannot pass."],
  ["dsa/trees-recursion", "The traversal that forgets a subtree", "tree.js", 'function size(node) { return node ? 1 + size(node.left) : 0; }', "visit both subtrees", "Count both children and test a right-only tree as well as an empty tree; a left-only traversal misses valid nodes."],
  ["backend/rest-auth", "The claimed administrator", "auth.js", 'const isAdmin = request.headers["x-user-role"] === "admin";', "session role", "Derive the role from the verified server session, not an attacker-controlled header."],
  ["backend/databases", "The interpolated query", "query.js", 'db.query(`SELECT * FROM users WHERE email = ${email}`);', "bound parameters", "Keep SQL structure separate from input using bound parameters; test hostile input."],
  ["react/jsx-vdom", "The unstable list identity", "List.tsx", 'items.map((item, i) => <Editor key={i} item={item} />)', "stable id", "A stable item ID preserves editor state through reorder; an index key attaches state to position."],
  ["state/server-state", "The cache shared across accounts", "cache.ts", 'const key = ["profile"]; // request depends on currentUserId', "include user identity", "A cache key must include every input to the request. Switch between two accounts and verify one never sees the other profile."],
] as const;

export const JUDGMENT_CONVERSIONS: Record<string, RepoExercise> = Object.fromEntries(cases.map(([key, title, path, content, fix, why]) => [key, {
  id: `judge-${key.replace(/\//g, "-")}`,
  title,
  brief: "Review the agent draft against its contract. Pick the repair that addresses the defect, then identify the evidence required before accepting it.",
  files: [{ path, content }, { path: "contract.txt", content: why }],
  questions: [
    { kind: "select", single: true, prompt: "Which repair addresses the contract?", options: [
      { label: "Reformat the draft without changing behavior", correct: false },
      { label: fix, correct: true },
      { label: "Suppress the error or remove the check", correct: false },
    ], why },
    { kind: "select", single: true, prompt: "What evidence should approval require?", options: [
      { label: "The agent says it tested the change", correct: false },
      { label: "A screenshot of a green badge from an earlier version", correct: false },
      { label: "A contract-specific regression check on the final change", correct: true },
    ], why: "Run the adverse case against the draft and repair; preserve the assertion and inspect the final diff." },
  ],
}]));
