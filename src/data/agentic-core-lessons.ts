import type { Lesson } from "./types";

/* ═══════════════════════════════════════════════════════════════
   Ten core agentic-engineering lessons (#P5 completion).

   These are the lessons the Phase 5 arithmetic asked for: 120 authored
   minutes inside the core path, each closing a gap the existing track
   does not cover, and each ending in a written artifact rather than a
   quiz. Grounded in practitioner guidance published through early 2026:
   spec/plan discipline, evidence over confidence, expand-migrate-contract
   migrations, roll-forward recovery, lockfile provenance, run telemetry,
   and effect-scoped approval gates.

   Tool-agnostic by policy: they name artifacts (a lockfile, a migration,
   a run record), never product UI.
   ═══════════════════════════════════════════════════════════════ */

export const AGENTIC_CORE_LESSONS: Lesson[] = [
  {
    id: "characterization-tests",
    title: "Characterization Tests Before the Refactor",
    minutes: 12,
    reviewed: "2026-10",
    toolDependent: true,
    reviewBy: "2026-12-30",
    body: `An agent asked to refactor untested code will produce a plausible rewrite in seconds. **Plausible is the problem**: with no suite, "nothing changed" and "three behaviours quietly changed" look identical.

**Characterize first.** A characterization test records what the code does *today*, bugs included, so the refactor has something to preserve:

1. **Capture the current output**, not the intended output. If the money formatter rounds 2.5 down, snapshot the round-down. You are pinning behaviour, not endorsing it.
2. **Run it against the untouched code.** It must pass immediately — a characterization test that fails on the original code is describing your intentions, not reality.
3. **Let the agent refactor.** The suite must pass **without edits**. If a test had to change to go green, behaviour changed; that is the finding, not an obstacle.
4. **Fix the bug separately**, in its own change, with its own acceptance criterion. Mixing "preserve behaviour" and "improve behaviour" in one diff makes neither reviewable.

\`\`\`
✗ refactor.js  →  rewrites 14 functions, "no behavioural changes"
✓ refactor.js  →  rewrites 14 functions, golden/ snapshot unchanged,
                  all 23 recorded cases still pass byte for byte
\`\`\`

**What to capture** matters more than how many cases. One happy path is a decoration. The cases that pay for themselves are the awkward ones: empty input, a single item, duplicates, unicode, money rounding, a value at the boundary, and the input that once caused an incident.

A characterization suite is deliberately boring and deliberately not a specification. Its job is to make the agent's claim checkable.`,
    quiz: [
      {
        q: "A characterization test fails on the untouched code. What does that mean?",
        options: [
          "The code has a bug worth fixing before the refactor",
          "The refactor already started",
          "The test records intended behaviour rather than actual behaviour — fix the record, not the code",
          "The suite needs a retry because it is flaky",
        ],
        answer: 2,
        explanation:
          "It is a recording, not an aspiration. If it does not pass on today's code, it is describing what you wish the code did, and it cannot certify preservation.",
      },
      {
        q: "During the refactor the agent edits a snapshot to make it pass. Correct response?",
        options: [
          "Revert the snapshot edit and treat the change as a behaviour change that needs its own decision",
          "Accept it — snapshots are meant to be updated",
          "Delete the test; it was too strict",
          "Add a second snapshot that accepts both outputs, since the refactor may legitimately have changed the rounding path and the recording should follow the new implementation",
        ],
        answer: 0,
        explanation:
          "Updating the recording to match new behaviour is how a refactor silently becomes a redesign. Preserve first, change behaviour in a separate, reviewed step.",
      },
      {
        q: "Which case set is worth the most?",
        options: [
          "Twenty variations of the happy path",
          "One happy path plus the boundaries, empties and the input behind the last incident",
          "Only the cases the agent suggests",
          "Whatever the coverage report says is uncovered",
        ],
        answer: 1,
        explanation:
          "Coverage counts lines executed, not behaviours preserved. Boundaries and past incidents are where behaviour actually differs.",
      },
    ],
    rubric: {
      id: "characterization-plan",
      title: "Write the characterization plan",
      prompt: "Plan the characterization suite for a 600-line pricing module with no tests.",
      brief:
        "Name how current behaviour is captured, which cases you will record, and the rule that decides whether the refactor preserved it.",
      minWords: 60,
      criteria: [
        {
          id: "capture",
          label: "Records current behaviour before the refactor and runs it green on untouched code",
          check: "output.includes(\"current behaviour\") || output.includes(\"current behavior\") || output.includes(\"snapshot\") || output.includes(\"golden\")",
        },
        {
          id: "cases",
          label: "Names boundary, empty or previously failing inputs, not only the happy path",
          check: "output.includes(\"boundary\") || output.includes(\"empty\") || output.includes(\"edge\") || output.includes(\"rounding\")",
        },
        {
          id: "rule",
          label: "States that the suite must pass without editing, or the change is rejected",
          check: "output.includes(\"without edit\") || output.includes(\"no edit\") || output.includes(\"unchanged\") || output.includes(\"must not change\")",
        },
      ],
      exemplar:
        "Before touching the module I capture current behaviour as a golden snapshot: a table of inputs to exact outputs, recorded from today's code, including its bugs. I run it on the untouched module first and require green, because a snapshot that fails now is describing intent rather than recording reality. The cases: empty cart, single item, duplicates, a voucher that rounds to a half cent, unicode product names, and the negative-quantity input behind last quarter's refund incident. Boundary and empty inputs matter more than twenty happy-path variations. The rule is that the suite must pass without edit after the agent refactors. If any snapshot needs changing to go green, the refactor changed behaviour and is rejected, and the desired change is proposed separately with its own acceptance criterion.",
    },
  },
  {
    id: "review-generated-migration",
    title: "Reading a Generated Migration",
    minutes: 12,
    reviewed: "2026-10",
    toolDependent: true,
    reviewBy: "2026-12-30",
    body: `A migration is the one part of an agent's diff that a code revert cannot undo. Review the **transition**, not the SQL: the question is what the database looks like while old and new application versions run side by side.

**Expand → migrate → contract.** Three releases, not one:

1. **Expand.** Add the new column or table, nullable, with no default rewrite. Old code ignores it; new code may write it.
2. **Migrate.** Backfill in batches, outside the deploy transaction, with the application writing both shapes during the overlap.
3. **Contract.** Only after the new path is verified in production: drop the old column, remove the dual-write. This is the destructive step, and it belongs in a separate change.

Here is a generated diff that looks tidy and is not:

\`\`\`
ALTER TABLE invoices ADD COLUMN total_cents integer NOT NULL DEFAULT 0;
UPDATE invoices SET total_cents = round(total * 100);   -- same migration
ALTER TABLE invoices DROP COLUMN total;
\`\`\`

Three problems, in order of cost: the \`UPDATE\` runs under a lock that blocks writes on a large table; \`DROP COLUMN\` is executed in the same change that introduces the replacement, so a rollback of the *application* leaves no data to roll back to; and old app instances still running during the deploy will write \`total\` that no one reads.

**Ask, every time:** how big is this table in production (not in the dev copy); what locks does each statement take; can both versions run against the intermediate schema; can this be recovered, and is the recovery a roll-forward or a restore; and who measured the backfill time at production scale.

A migration that takes minutes on a laptop is a different artifact from the same migration on ten million rows.`,
    quiz: [
      {
        q: "Which statement is the blocking defect in the generated diff above?",
        options: [
          "Adding a nullable column is always unsafe",
          "It uses integer cents instead of decimals",
          "The same change backfills with a blocking UPDATE and drops the old column, removing any recovery path",
          "It runs a migration at all",
        ],
        answer: 2,
        explanation:
          "Structure is fine; the sequencing is the defect. Expand, backfill out of band, and contract in a later release, so application rollback still has data to read.",
      },
      {
        q: "A migration has a working `down` script. What does that prove?",
        options: [
          "That the script parses — the effect may still be irreversible once rows have been written",
          "Rollback is safe",
          "The change is zero-downtime",
          "The agent followed instructions, and a reviewed down script that passes lint is the strongest available guarantee that the deployment can be reversed without data loss",
        ],
        answer: 0,
        explanation:
          "Reversibility of the script is not reversibility of the effect. Dropping a column you have since written to loses data regardless of what `down` says.",
      },
      {
        q: "Why does the intermediate schema matter during a rolling deploy?",
        options: [
          "Because CI runs migrations twice",
          "Because old and new application versions both run against it, so it has to satisfy both",
          "Because the ORM caches column names",
          "It does not; the deploy is atomic",
        ],
        answer: 1,
        explanation:
          "Deploys are not atomic across instances. The transient state is a real production state and has to be designed for.",
      },
    ],
    rubric: {
      id: "migration-verdict",
      title: "Approve, amend or reject",
      prompt: "Write the review verdict for the migration diff above.",
      brief:
        "State the verdict, the three sequencing problems, the production-scale question you would ask, and the recovery plan.",
      minWords: 70,
      criteria: [
        {
          id: "verdict",
          label: "Gives an explicit verdict (reject or amend), not a vague comment",
          check: "output.includes(\"reject\") || output.includes(\"amend\") || output.includes(\"block\")",
        },
        {
          id: "expand",
          label: "Names expand / migrate / contract sequencing",
          check: "output.includes(\"expand\") || output.includes(\"contract\") || output.includes(\"separate release\")",
        },
        {
          id: "lock",
          label: "Names the lock or backfill cost at production scale",
          check: "output.includes(\"lock\") || output.includes(\"backfill\") || output.includes(\"rows\")",
        },
        {
          id: "recovery",
          label: "States the recovery path or explicit irreversibility",
          check: "output.includes(\"roll forward\") || output.includes(\"roll-forward\") || output.includes(\"restore\") || output.includes(\"irreversible\")",
        },
      ],
      exemplar:
        "Reject this migration as one change. The ADD COLUMN is safe; the rest is not. Problem one: the backfill UPDATE runs inside the deploy migration and will lock a large invoices table, so the release blocks writes. Problem two: the DROP COLUMN happens in the same release that introduces total_cents, so rolling the application back leaves it reading a column that no longer exists. Problem three: old instances still running during the rollout keep writing total, which nothing reads afterwards. The fix is expand / migrate / contract across three releases: add the nullable column, backfill in batches outside the deploy transaction while both versions run, verify the new path in production, then contract by dropping total in a later change. The production-scale question is how many rows invoices holds and how long the backfill takes there, measured rather than estimated on a dev copy. Recovery is roll forward for the code; the contract step is irreversible in effect, so it needs its own approved change and a verified restore path before it runs.",
    },
  },
  {
    id: "rollback-drills",
    title: "Rollback Drills: Revert, Bisect, Kill Switch",
    minutes: 12,
    reviewed: "2026-10",
    toolDependent: true,
    reviewBy: "2026-12-30",
    body: `Agent-written changes arrive faster than review capacity, which means the probability that one ships something wrong goes up, not down. The skill that keeps that survivable is **recovery you have already practised**.

Three tools, three situations:

**Revert** — when you know which change broke it. \`git revert <sha>\` records the inversion, keeps history and is reviewable. \`git reset --hard\` rewrites a branch: use it only on work nobody else has.

**Bisect** — when you know it broke between two releases but not why. Binary search over commits with an automated test:

\`\`\`
git bisect start <bad> <good>
git bisect run npm test -- tests/pricing.test.ts
git bisect reset
\`\`\`

That command is only as good as the test you hand it: a test that passes on every commit points at nothing.

**Kill switch** — when the fix will take longer than the incident. A flag around the new path stops the bleeding without a deploy, and it is the only one of the three that works when the *data* is already wrong.

\`\`\`
revert:      code is wrong, data is fine
bisect:      unknown culprit, deterministic test exists
kill switch: recovery is slow, users are affected now
\`\`\`

**Code rollback is not data rollback.** Reverting the application does not un-write rows the new version wrote during the window. For any change that touched stored data, the recovery plan has to say what happens to those rows: leave them (new shape, backward compatible), recompute them, or restore to a point in time and accept the data loss.

A drill you have run in staging is a procedure. A drill you have only described is a hope.`,
    quiz: [
      {
        q: "A release writes wrong totals for six hours. You roll the app back. What is still wrong?",
        options: [
          "The rows written during those six hours, which the rolled-back code does not know about",
          "Nothing — the rollback restores the previous behaviour",
          "The git history",
          "The feature flag state",
        ],
        answer: 0,
        explanation:
          "Application rollback restores code, not data. The recovery plan has to name what happens to rows written by the new version.",
      },
      {
        q: "When is `git bisect run` useless?",
        options: [
          "When the commit range is long, so the search needs more than ten steps to converge on the first bad commit",
          "When the repository uses merge commits",
          "When the fix is in a dependency",
          "When the test you give it passes on the bad commit or flakes across commits",
        ],
        answer: 3,
        explanation:
          "Bisect is a search over your test's verdicts. A test that cannot distinguish good from bad commits gives it nothing to narrow with.",
      },
      {
        q: "Which recovery tool works after bad data has already been committed?",
        options: [
          "git revert",
          "git reset",
          "A kill switch that stops the new path while the data is repaired",
          "Deleting the branch",
        ],
        answer: 2,
        explanation:
          "Reverting code leaves the rows. Stopping the behaviour and repairing the data is the only one of these that addresses the actual damage.",
      },
    ],
    rubric: {
      id: "rollback-plan",
      title: "Write the rollback plan",
      prompt: "Write the rollback plan for an agent-shipped pricing change that has been in production for a day.",
      brief:
        "Name how you identify the culprit, what happens to data written in the window, the trigger for rolling back, and who decides.",
      minWords: 70,
      criteria: [
        {
          id: "identify",
          label: "Names how the offending commit is identified (bisect or revert target)",
          check: "output.includes(\"bisect\") || output.includes(\"revert\") || output.includes(\"commit\")",
        },
        {
          id: "data",
          label: "States what happens to rows written during the bad window",
          check: "output.includes(\"row\") || output.includes(\"data\") || output.includes(\"backfill\") || output.includes(\"restore\")",
        },
        {
          id: "trigger",
          label: "Gives a concrete rollback trigger rather than a feeling",
          check: "output.includes(\"trigger\") || output.includes(\"if \") || output.includes(\"when \")",
        },
        {
          id: "owner",
          label: "Names who decides and is informed",
          check: "output.includes(\"owner\") || output.includes(\"on-call\") || output.includes(\"on call\") || output.includes(\"who\")",
        },
      ],
      exemplar:
        "The triggering symptom is a variance alert: invoice totals differing from the ledger by more than one cent on any sampled order, sustained for ten minutes. The on-call engineer decides to roll back and informs the billing owner. Identify the culprit first: the change is one of three shipped in the last 24 hours, so I run git bisect with the pricing variance test between the last known good release and the current one; bisect names the commit, and I revert it rather than reset, so the inversion is reviewable. Data is the hard part. The bad window wrote rounded totals into total_cents, so reverting code leaves wrong rows the old code does not read. Recovery: stop the new path with the pricing kill switch, recompute affected rows from the ledger in batches, verify a sample against source invoices, then remove the flag. Rolling the application back alone would have left the data wrong.",
    },
  },
  {
    id: "lockfile-is-an-artifact",
    title: "The Lockfile Is a Security Artifact",
    minutes: 12,
    reviewed: "2026-10",
    toolDependent: true,
    reviewBy: "2026-12-30",
    body: `An agent that needs a helper will suggest a package name with total confidence. Sometimes the package does not exist. A 2025 study of sixteen code-generating models found hallucinated dependency names in **5.2%** of samples from commercial models and **21.7%** from open models — and an attacker can register any name that is suggested often enough.

So "does this package exist?" is the wrong question on its own. It exists **because** the agent suggested it, if someone got there first.

**What the lockfile actually is.** Not a nuisance file: a resolved tree with exact versions and integrity hashes, so CI and production install the same bytes the reviewer saw. That is why the frozen install stays frozen:

\`\`\`
npm ci            # installs exactly the lock; fails if package.json disagrees
npm install       # resolves fresh ranges; correct only when you mean to change deps
\`\`\`

**Read a dependency diff the way you read code:**

- **New direct dependency.** Registry, owner, publish date, download history, repository link, and whether thirty lines in the project would have done the same job. "The agent used it" is not a reason.
- **Transitive additions.** One added direct dependency can pull in twelve packages. Look at what the lock newly resolved, not just the line the agent wrote.
- **Install scripts.** \`postinstall\` runs arbitrary code on every developer machine and on CI. A new package with an install script is a different risk class from a pure library.
- **Version movement.** A range bump that resolves six versions forward is a behaviour change you did not review.

**Then pin what you verified**: a lockfile improves repeatability, and CI actions should be pinned by commit SHA where the workflow allows it. None of that makes a package benign — it makes the thing you approved the thing you get.

Ask the agent for the same evidence you would ask a person: why this package, what it replaced, and what happens if it is removed next week.`,
    quiz: [
      {
        q: "The agent suggests a package and a registry check shows it exists. Is it safe to add?",
        options: [
          "Yes — existence is proof of legitimacy",
          "Yes, as long as it has a README",
          "No — the name may exist because it was registered in anticipation of hallucinated suggestions",
          "Only if it has more than a thousand stars",
        ],
        answer: 2,
        explanation:
          "Slopsquatting works precisely because existence feels like verification. Check owner, provenance, publish date and whether the project needs it at all.",
      },
      {
        q: "Why must CI use a frozen install?",
        options: [
          "So CI installs exactly the tree the reviewer inspected, with matching integrity hashes",
          "It is faster",
          "Because ranges cannot be resolved in CI",
          "To avoid lockfile merge conflicts, which otherwise require a manual resolution step whenever two branches touch the same dependency and the ranges drift apart",
        ],
        answer: 0,
        explanation:
          "A resolving install can pick a version published after review. The review then approved different bytes than production runs.",
      },
      {
        q: "Which addition deserves the closest look?",
        options: [
          "A pure formatting library at the version already in the lock",
          "A new package that runs a postinstall script",
          "A devDependency used only by tests",
          "A dependency the agent described as tiny",
        ],
        answer: 1,
        explanation:
          "Install scripts execute code in your environment on every install. That is a materially different risk from a library you simply import.",
      },
    ],
    rubric: {
      id: "dependency-verdict",
      title: "Verdict on a dependency diff",
      prompt: "Review a diff that adds one package for date formatting, with a postinstall script and no lockfile update.",
      brief:
        "Give a verdict, say what you check before approving, and state the rule for the lockfile.",
      minWords: 60,
      criteria: [
        {
          id: "verdict",
          label: "Gives an explicit verdict on the dependency",
          check: "output.includes(\"reject\") || output.includes(\"approve\") || output.includes(\"amend\") || output.includes(\"block\")",
        },
        {
          id: "provenance",
          label: "Checks provenance rather than existence alone",
          check: "output.includes(\"owner\") || output.includes(\"provenance\") || output.includes(\"registry\") || output.includes(\"publish\")",
        },
        {
          id: "script",
          label: "Treats the install script as a distinct risk",
          check: "output.includes(\"postinstall\") || output.includes(\"install script\") || output.includes(\"runs code\")",
        },
        {
          id: "lock",
          label: "Requires the lockfile to change with the manifest and a frozen install",
          check: "output.includes(\"lockfile\") || output.includes(\"lock file\") || output.includes(\"npm ci\")",
        },
      ],
      exemplar:
        "Reject the diff as written: the manifest changed without the lockfile, so nothing here says which bytes would be installed. Before approving anything I check provenance, not existence — registry owner, first publish date, repository link, and whether the project could format a date in thirty lines without a new dependency at all. The postinstall script is its own risk class: it runs code on every developer machine and on CI, so I read it and mostly refuse packages that need one. I also look at the transitive additions the lock newly resolves, not only the line the agent added. The rule is that the lockfile changes in the same commit as the manifest, review covers the resolved tree, and CI installs with npm ci so production gets exactly the reviewed tree with matching integrity hashes.",
    },
  },
  {
    id: "runtime-evidence",
    title: "Runtime Evidence: Logs, Traces and Metrics",
    minutes: 12,
    reviewed: "2026-10",
    toolDependent: true,
    reviewBy: "2026-12-30",
    body: `A diff is a claim about behaviour. Runtime evidence is what turns the claim into a fact — and the time to decide what to record is **before** the run, because a log line you did not write cannot be added retroactively.

For an agent run to be auditable, one record should answer: **who asked for what, with which permissions, doing which actions, producing which result**.

What belongs in the record:

- **Identity and correlation.** Run or session id, repository commit and branch, agent and model version. Without the commit, the diff and the run cannot be matched.
- **Authority.** Which tools and credentials the run had. "It only had read access" is a claim you want recorded, not remembered.
- **Actions.** Tool calls, commands, files touched, dependencies added with resolved versions.
- **Results.** Test, lint and build output — the actual text, not a summary the agent wrote about it.
- **Approvals.** Who approved what, when, and against which evidence.

\`\`\`
✗ "Agent fixed the flaky test and all tests pass."
✓ run 8f21… commit 3c9e1a7 → npm test → 107 files, 903 passed
   tools: read, edit, run-tests  (no network, no deploy)
   approved by: reviewer@… at 11:04, against run 8f21…
\`\`\`

Two cautions. **Treat prompts and tool output as sensitive telemetry**: they contain customer data and secrets, so they need the same retention and redaction rules as logs, and redaction is not guaranteed — test it. **Record cost and turns too**, because an agent that needed forty tool calls to change one line is telling you something about the task, not just the bill.

The test is simple: six weeks later, can someone reconstruct *why this change was accepted* without asking you?`,
    quiz: [
      {
        q: "What makes an agent run auditable after the fact?",
        options: [
          "A record tying the run to a commit, its permissions, the commands and their real output, and who approved it",
          "The final diff",
          "The agent's own summary of what it did",
          "A screenshot of a green check",
        ],
        answer: 0,
        explanation:
          "The diff shows what changed, not what was verified, with what authority, or by whose decision. Those are separate facts and each needs recording.",
      },
      {
        q: "Why is the agent's summary insufficient evidence?",
        options: [
          "It is usually too long",
          "It cannot include file names",
          "It is a claim produced by the same system being verified",
          "It is written before the tests run, so it cannot reflect the final state of the change or the command output that a reviewer would actually check",
        ],
        answer: 2,
        explanation:
          "Independent evidence is the raw command output. A summary is the thing under test, not proof about it.",
      },
      {
        q: "What does a run needing forty tool calls for a one-line change suggest?",
        options: [
          "Nothing — tool calls are free",
          "Either the task is underspecified or the tooling is wrong for it; both are worth investigating",
          "The model is slow",
          "The permissions are too tight",
        ],
        answer: 1,
        explanation:
          "Turns and tool errors are diagnostics about task clarity and tool design, not just cost.",
      },
    ],
    rubric: {
      id: "audit-record",
      title: "Specify the run record",
      prompt: "Define the fields your team records for every agent run that can touch production code.",
      brief:
        "Name correlation fields, authority, actions, results and approvals, plus one rule about sensitive data.",
      minWords: 60,
      criteria: [
        {
          id: "correlation",
          label: "Correlates the run with a commit and a run or session id",
          check: "output.includes(\"commit\") && (output.includes(\"run id\") || output.includes(\"session\") || output.includes(\"run\") || output.includes(\"correlation\"))",
        },
        {
          id: "authority",
          label: "Records which tools or permissions the run had",
          check: "output.includes(\"permission\") || output.includes(\"tool\") || output.includes(\"credential\")",
        },
        {
          id: "results",
          label: "Keeps the real command output, not a summary",
          check: "output.includes(\"command\") || output.includes(\"test output\") || output.includes(\"raw output\")",
        },
        {
          id: "approval",
          label: "Records who approved and against which evidence",
          check: "output.includes(\"approv\") && (output.includes(\"who\") || output.includes(\"identity\") || output.includes(\"reviewer\"))",
        },
        {
          id: "sensitive",
          label: "States a retention or redaction rule for prompts and tool output",
          check: "output.includes(\"redact\") || output.includes(\"retention\") || output.includes(\"sensitive\")",
        },
      ],
      exemplar:
        "Every run records a correlation block: run id, the commit and branch it operated on, and the agent version, so the diff and the run can be joined later. It records authority: which tools and credentials were available, because a claim of read-only access should be a logged fact. It records actions: commands run, files touched, dependencies added with resolved versions. It records results as the real command output — test and build text, not a summary. It records approvals with the reviewer identity, timestamp, and the run id the approval was given against. Prompts and tool output are sensitive: they are stored with a retention window and redaction applied before storage, and redaction is tested rather than assumed.",
    },
  },
  {
    id: "version-reality",
    title: "Version Reality: Checking the Agent's API Claims",
    minutes: 12,
    reviewed: "2026-10",
    toolDependent: true,
    reviewBy: "2026-12-30",
    body: `An agent's memory of a library is a snapshot of whenever its training data was collected. Your project is pinned to a version. The gap between those two facts is where confident, fluent, wrong code comes from.

**Three claims to separate**, because they need different checks:

1. **The package exists.** Registry check. Often right, occasionally fabricated.
2. **The API exists in the installed version.** Type check or compile. This is where most silent breakage lives: the function was renamed in v3, or the option was removed.
3. **The API behaves as described.** A run. Types will happily accept a call that throws at runtime or returns the wrong shape.

\`\`\`
npm ls react-router-dom      # what is actually installed here
npx tsc --noEmit             # does the call exist with these types
npm test -- <path>           # does it do what the claim says
\`\`\`

**The tells** of memory-based API use: a method that does not appear in the project's types but sounds idiomatic; an options object with keys nobody else in the repo uses; a helper imported from a project module that does not export it; documentation quoted without a version.

**The cheap fix** is context: put the installed version in front of the agent (\`package.json\`, the lock entry) and point it at a file that already uses the API correctly. Conventions in the repository beat conventions in the model's memory, every time.

**The expensive mistake** is accepting a passing build as proof. A type error is caught for you; a plausible method that exists and returns undefined is not.`,
    quiz: [
      {
        q: "A build passes with the agent's new call. What is still unproven?",
        options: [
          "Nothing — types are the contract",
          "That the package is installed",
          "That the API returns the value the code assumes at runtime",
          "That the file compiles",
        ],
        answer: 2,
        explanation:
          "Types constrain shape, not behaviour. A method can type-check and still return undefined for the input in question.",
      },
      {
        q: "Which is the strongest signal that an API claim came from memory rather than from this repo?",
        options: [
          "Options and helpers that no other file uses, matching a version the project is not on",
          "The code is well formatted",
          "The function is imported",
          "The change is small, touches only one file, and includes an explanatory comment that describes the API's behaviour in detail",
        ],
        answer: 0,
        explanation:
          "Novel, idiomatic-looking usage that contradicts local convention is the signature of a different version's API surface.",
      },
      {
        q: "Cheapest way to reduce version drift before the agent writes?",
        options: [
          "Ask it to be careful",
          "Give it the pinned version and an existing file that uses the API correctly",
          "Run the full suite afterwards",
          "Pin the model version",
        ],
        answer: 1,
        explanation:
          "Conventions in the repository are ground truth. Two lines of context prevent the rewrite that review would otherwise catch.",
      },
    ],
    rubric: {
      id: "api-claim-check",
      title: "Verify the API claim",
      prompt: "An agent used a client method you have never seen. Write how you verify the claim.",
      brief:
        "Name the three claims, the check for each, and what would make you reject the change.",
      minWords: 55,
      criteria: [
        {
          id: "installed",
          label: "Checks what version is installed rather than what the docs website shows",
          check: "output.includes(\"installed\") || output.includes(\"package.json\") || output.includes(\"lockfile\") || output.includes(\"npm ls\")",
        },
        {
          id: "types",
          label: "Runs a type check or compile to prove the symbol exists",
          check: "output.includes(\"type\") || output.includes(\"tsc\") || output.includes(\"compile\")",
        },
        {
          id: "runtime",
          label: "Runs the behaviour to prove it returns what the code assumes",
          check: "output.includes(\"run\") || output.includes(\"test\") || output.includes(\"runtime\")",
        },
        {
          id: "reject",
          label: "Names a rejection condition",
          check: "output.includes(\"reject\") || output.includes(\"block\") || output.includes(\"if the\")",
        },
      ],
      exemplar:
        "I separate three claims. Existence: check the registry and the installed version from package.json and the lockfile, not the docs website, which describes the latest release rather than mine. Existence in my version: run a type check with tsc over the changed file, which proves the symbol and its signature exist in the installed types. Behaviour: run a small test or the real path and confirm the return value the code assumes, because types do not promise runtime behaviour. I also look for local precedent — if no other file uses this method, that is a signal it came from memory. I reject the change if the symbol is absent from the installed types, if the test shows a different return shape, or if the version in the lock is older than the API being used.",
    },
  },
  {
    id: "decomposition-contracts",
    title: "Decomposition Contracts: Slicing Work for Agents",
    minutes: 12,
    reviewed: "2026-10",
    toolDependent: true,
    reviewBy: "2026-12-30",
    body: `The most common reason two agent-written changes collide is not the agents. It is the **cut**: work was sliced by file or by vibe, so each unit's success depended on a decision nobody had made.

A slice worth delegating has four properties:

1. **One outcome.** A behaviour you can describe without "and".
2. **An interface.** The input, output or event it shares with the rest — agreed before anyone writes code, so two slices cannot invent two shapes.
3. **An independent check.** A test or command that can pass or fail without the other slices being finished.
4. **A merge order.** Which slices can land in any order, and which must wait.

\`\`\`
✗ slash by file:      agent A → api.ts, agent B → db.ts, agent C → ui.tsx
✓ slice by contract:  A: search endpoint returns {items, nextCursor} — testable alone
                      B: cursor encoding shared by A and C — lands first, frozen
                      C: list UI consumes the contract — lands after A
\`\`\`

**Frozen means frozen.** Once a shared contract has a test, a slice that wants to change it asks first; otherwise three agents produce three slightly different shapes and the merge is a redesign.

**Where the cut is wrong**, you will see it early: a slice that cannot be verified until another is merged; two slices touching the same file for different reasons; a slice whose description needs the word "also".

Parallelism is a **scheduling decision**, not a goal. Two slices sequenced in a day beat four slices merged in a week because each waited for the others.`,
    quiz: [
      {
        q: "What makes a slice delegable?",
        options: [
          "It has one outcome, a shared interface, an independent check, and a merge order",
          "It touches exactly one file",
          "It is small enough to fit in a prompt",
          "It can be done by the fastest model",
        ],
        answer: 0,
        explanation:
          "File count is not a unit of work. Contracts and independent verification are what let work proceed in parallel without collision.",
      },
      {
        q: "Two slices both need the cursor format. What prevents divergence?",
        options: [
          "Asking both agents to be consistent",
          "Merging them into one bigger slice",
          "Letting the reviewer reconcile the shapes after both branches land, since the merge commit is the natural place to settle interface differences",
          "Freezing the contract first — one slice owns it, with a test, before either consumer starts",
        ],
        answer: 3,
        explanation:
          "Shared interfaces are decisions, not emergent properties. One owner, one test, agreed before parallel work begins.",
      },
      {
        q: "A slice cannot be verified until another merges. What does that tell you?",
        options: [
          "Nothing — dependencies are normal",
          "The cut is wrong: the verification boundary and the slice boundary do not line up",
          "The tests are too strict",
          "The second agent is too slow",
        ],
        answer: 1,
        explanation:
          "If you cannot prove a slice on its own, it is not an independent unit; either merge it or move the contract out.",
      },
    ],
    rubric: {
      id: "slice-plan",
      title: "Slice the feature",
      prompt: "Slice \\\"search with pagination and a results list\\\" into units you would hand to agents.",
      brief:
        "Give at least three slices, each with its contract, its own check, and a merge order.",
      minWords: 70,
      criteria: [
        {
          id: "three",
          label: "Names at least three slices",
          check: "output.includes(\"1\") && output.includes(\"2\") && output.includes(\"3\")",
        },
        {
          id: "contract",
          label: "Names a shared interface and who owns it",
          check: "output.includes(\"contract\") || output.includes(\"interface\") || output.includes(\"cursor\")",
        },
        {
          id: "check",
          label: "Gives each slice a check that runs without the others",
          check: "output.includes(\"test\") || output.includes(\"check\") || output.includes(\"verify\")",
        },
        {
          id: "order",
          label: "States a merge order or dependency",
          check: "output.includes(\"order\") || output.includes(\"first\") || output.includes(\"then\")",
        },
      ],
      exemplar:
        "Three slices, cut by contract rather than by file. 1) Contract slice: define cursor encoding and the response shape items plus nextCursor, owned by one agent, with a unit test that pins encoding and decoding including an empty page. This lands first and is frozen. 2) Endpoint slice: the search handler returns the contract shape, with its own test running against the handler directly, verifiable without any UI. 3) List slice: the results component consumes the contract with fixtures, tested in isolation. Merge order: contract first, then endpoint and list can land in either order because both are verified against the frozen contract and neither edits the other's files. Each slice has a test that can pass or fail alone, so no slice waits on another to be provable, and a request to change the cursor format goes back to the contract owner instead of being decided twice.",
    },
  },
  {
    id: "approval-gates",
    title: "Placing Approval Gates on Irreversible Actions",
    minutes: 12,
    reviewed: "2026-10",
    toolDependent: true,
    reviewBy: "2026-12-30",
    body: `"The agent was told not to" is not a control. In 2025 a coding agent deleted a live production database during an explicit freeze; the instruction was in the prompt, and the credentials were in the environment. The lesson is not that prompts are useless — it is that **a gate has to be enforced where the effect happens**.

Sort actions by cost of being wrong:

\`\`\`
reversible, cheap      edit files, run tests, open a branch   → allow freely
reversible, reviewable open a pull request                    → CI + one reviewer
protected             merge to main, deploy                   → protected branch, required checks
irreversible          drop data, rotate secrets, send email   → explicit human approval, scoped
\`\`\`

Then put the gate in the mechanism, not the prose:

- **Scope the credentials.** A sandbox that deploys cannot be trusted not to deploy. Least privilege is the gate.
- **Require approval on the environment**, not on the instruction: a protected environment with an independent reviewer holds the secret until the approval lands.
- **Make the preflight concrete.** Before an irreversible step, the run produces an impact statement: what exactly will be touched, how many rows or users, and what recovery exists.
- **Separate approval from authorship.** The agent proposes; a person approves *that specific action*, with the evidence in front of them.

**What not to gate.** Every reversible action. An approval wall in front of tests and branches produces rubber-stamping, and rubber-stamping is worse than no gate because it launders accountability.

The question is never "should we trust the agent?" It is "what is the cheapest place to be wrong, and does this action have to pass through a human to reach the place where it cannot be undone?"`,
    quiz: [
      {
        q: "What counts as an approval gate?",
        options: [
          "A sentence in the instructions saying not to touch production",
          "A code review comment asking for care",
          "A permission or environment rule that withholds the capability until a named human approves that action",
          "A weekly reminder in the team channel",
        ],
        answer: 2,
        explanation:
          "Instructions influence; permissions enforce. The gate must sit on the capability, not on the model's willingness to comply.",
      },
      {
        q: "Which action most needs an explicit human approval?",
        options: [
          "Creating a branch",
          "Dropping a production table",
          "Opening a pull request, which is the first point where agent-authored work becomes visible to the rest of the team",
          "Running the unit tests",
        ],
        answer: 1,
        explanation:
          "Branch and PR are reversible and reviewable. A dropped table is not recoverable by any code action, so the gate belongs immediately before it.",
      },
      {
        q: "Why is gating every action harmful?",
        options: [
          "It slows the model",
          "Approval fatigue turns gates into rubber stamps, which hides who actually decided",
          "It costs nothing and is merely unnecessary",
          "It confuses the agent",
        ],
        answer: 1,
        explanation:
          "A gate that is always approved stops carrying information. Reserve approval for the irreversible, so it still means something.",
      },
    ],
    rubric: {
      id: "gate-matrix",
      title: "Place the gates",
      prompt: "Write the gate matrix for a team using agents on a production web app.",
      brief:
        "Name the action tiers, the mechanism enforcing each gate, and the evidence required before an irreversible step.",
      minWords: 70,
      criteria: [
        {
          id: "tiers",
          label: "Separates reversible from irreversible actions",
          check: "output.includes(\"reversible\") || output.includes(\"irreversible\")",
        },
        {
          id: "mechanism",
          label: "Names an enforcing mechanism, not an instruction",
          check: "output.includes(\"permission\") || output.includes(\"environment\") || output.includes(\"protected\") || output.includes(\"credential\")",
        },
        {
          id: "evidence",
          label: "Requires an impact statement or evidence before the irreversible step",
          check: "output.includes(\"impact\") || output.includes(\"evidence\") || output.includes(\"preflight\") || output.includes(\"rows\")",
        },
        {
          id: "person",
          label: "Names a human approver distinct from the author",
          check: "output.includes(\"reviewer\") || output.includes(\"human\") || output.includes(\"approver\")",
        },
      ],
      exemplar:
        "Four tiers. Reversible and cheap — editing files, running tests, opening a branch — is allowed without approval, because the sandbox has no production credentials. Reversible and reviewable — opening a pull request — requires CI green plus one reviewer, enforced by branch protection. Protected — merging to main and deploying — requires the protected environment, required checks and an independent reviewer, and environment secrets stay withheld until that approval lands. Irreversible — dropping data, rotating secrets, sending external email — requires explicit approval of that specific action, by a human who is not the author, with a preflight impact statement naming how many rows or users are touched and what recovery exists. Every gate is a permission or environment rule rather than an instruction, so the capability is absent until a person grants it.",
    },
  },
  {
    id: "failing-test-loop",
    title: "The Failing-Test Loop",
    minutes: 12,
    reviewed: "2026-10",
    toolDependent: true,
    reviewBy: "2026-12-30",
    body: `The fastest way to make an agent useless is to hand it a red suite and ask for green. Green is the goal it optimises, and the cheapest route to green is often to change the assertion.

Run the loop **around** the agent instead:

**1. Reproduce.** One command that fails, on your machine, deterministically. \`npm test -- tests/pricing.test.ts -t "rounds half up"\`. If you cannot reproduce it, you are not debugging it yet.

**2. Minimize.** Cut the failing case until removing anything makes it pass. The minimized case usually names the bug: a boundary, a timezone, a null, an ordering. Shrinking is deterministic work and the part worth delegating — "reduce this failing case while keeping it failing" is a task with a checkable definition of done.

**3. Fix.** Let the agent propose the repair against the minimized case, with the spec: this test must go red → green, and no other test may change.

**4. Prove.** Red before, green after, on the same command. Then run the whole suite, because the fix that makes one test pass by breaking three is the second most common failure.

\`\`\`
the loop is the test's lifecycle:
fail (reproduce) → fail smaller (minimize) → green (fix) → green everywhere (prove)
\`\`\`

**The tell that you skipped a step:** the agent's reply contains "I updated the test to match the new behaviour". Sometimes that is correct. It is only correct when it is a decision you made, in writing, before the edit — never a side effect of chasing green.

And when the test itself is the defect, say so explicitly and treat the change as a spec change: the assertion, the reason, and what now proves the behaviour.`,
    quiz: [
      {
        q: "The agent turns a red test green by changing the assertion. What is the problem?",
        options: [
          "The proof was replaced with a weaker claim, and the behaviour may still be wrong",
          "Nothing, if CI is green",
          "Assertions are meant to evolve",
          "It used too many tool calls",
        ],
        answer: 0,
        explanation:
          "Chasing green by editing the check is the failure mode this loop exists to prevent. Changing the assertion is a spec change requiring an explicit decision.",
      },
      {
        q: "Why minimize the failing case first?",
        options: [
          "Smaller tests run faster",
          "It reduces the diff size",
          "The minimized input usually identifies the bug and gives a stable regression case",
          "Because agents cannot read large tests, and a shorter test is more likely to be reproduced correctly in a fresh session without extra context",
        ],
        answer: 2,
        explanation:
          "Shrinking is deterministic work that isolates the variable. The minimized case becomes the regression test after the fix.",
      },
      {
        q: "What is the final proof step?",
        options: [
          "The targeted test passes",
          "Red before, green after on the same command, and the full suite still green",
          "The agent reports success",
          "The build succeeds",
        ],
        answer: 1,
        explanation:
          "One green test can hide a broken neighbour. The lifecycle ends with the whole suite, not the single case.",
      },
    ],
    rubric: {
      id: "debug-log",
      title: "Write the loop log",
      prompt: "Write the log of fixing a failing pricing test with an agent.",
      brief:
        "Name the reproducing command, the minimized case, the before and after results, and the cause.",
      minWords: 60,
      criteria: [
        {
          id: "repro",
          label: "Gives a command that reproduces the failure",
          check: "output.includes(\"npm test\") || output.includes(\"repro\") || output.includes(\"command\")",
        },
        {
          id: "minimize",
          label: "Reduces the case to a minimal failing input",
          check: "output.includes(\"minim\") || output.includes(\"reduc\") || output.includes(\"smallest\")",
        },
        {
          id: "redgreen",
          label: "States red before and green after on the same command",
          check: "output.includes(\"red\") && output.includes(\"green\")",
        },
        {
          id: "cause",
          label: "Names the cause, not just the fix",
          check: "output.includes(\"cause\") || output.includes(\"because\") || output.includes(\"boundary\") || output.includes(\"rounding\")",
        },
      ],
      exemplar:
        "Reproduce: npm test -- tests/pricing.test.ts -t \"rounds half up\" fails on the last case only. Minimize: the case did not need the whole cart, the smallest failing input reduced to a single line item of 1.005 with a 2.5% tax, and removing anything else makes it pass. Cause: float multiplication before rounding, so 1.005 stored as 1.00499 rounds down instead of up. Fix: round in integer cents before applying tax. Proof: the minimized test was red on the unchanged code and is green after the fix, on the same command, and the full suite stays green, including the refund test that the naive fix broke on the first attempt. I did not change any assertion; the change was in the code.",
    },
  },
  {
    id: "definition-of-done",
    title: "Definition of Done: The Evidence Packet",
    minutes: 12,
    reviewed: "2026-10",
    toolDependent: true,
    reviewBy: "2026-12-30",
    body: `"Looks done" is not a verification signal. The difference between a change you can accept and a change you are gambling on is a packet of evidence a reviewer can check in **five minutes**.

Five parts, in this order:

**1. What changed, and why.** The behaviour, in one paragraph, plus the spec line it satisfies. Not a file list — the diff already has that.

**2. What you ran, and what it printed.** The commands and their real output: the targeted test, the full suite, the build. "All tests pass" is a claim; \`107 files, 903 tests passed\` in the log is evidence.

**3. Scope.** Every file touched, and why each one is in scope. The out-of-scope file is the most common hidden defect in agent work, and it is invisible in a summary.

**4. Risk and reversal.** What could break, what you would watch, and how to undo it. For anything touching data: what happens to rows already written.

**5. Open questions.** What you are *not* sure about. A packet with no open questions from an author who delegated the work is a packet that has not been read carefully.

\`\`\`
✗ "Implemented caching and tests pass. Ready to merge."
✓ cache: key includes user id (was shared across accounts)
  ran: npm test -- tests/cache.test.ts (6 passed); npm test (903 passed)
  files: src/cache.ts, tests/cache.test.ts  (2 files, both in scope)
  risk: cache size grows; flagged if hit rate < 40% after 24h; revert is one commit
  open: eviction policy untested under 10k keys
\`\`\`

The packet is also a self-check. Writing part 3 usually catches the stray edit; writing part 4 usually catches the change that cannot be undone; writing part 5 usually names the thing you were avoiding.`,
    quiz: [
      {
        q: "Which makes a change reviewable rather than merely finished?",
        options: [
          "A green badge in the description",
          "A large test count",
          "Commands with real output, a scope list, a reversal plan and stated open questions",
          "A summary written by the agent that made the change",
        ],
        answer: 2,
        explanation:
          "Evidence is checkable by someone else. A badge is a claim, and a summary from the author is the claim being audited.",
      },
      {
        q: "Why list every file touched?",
        options: [
          "Out-of-scope edits are the most common hidden defect and disappear in a summary",
          "To show the size of the work",
          "Because reviewers cannot open the diff",
          "To satisfy a template that requires a file inventory, which most teams keep for historical reporting even when the diff is available",
        ],
        answer: 0,
        explanation:
          "Scope creep is a correctness problem, not a style one. Enumerating files makes the in-scope argument explicit and reviewable.",
      },
      {
        q: "Why does a packet need open questions?",
        options: [
          "To seem humble",
          "Uncertainty you cannot name is uncertainty a reviewer cannot check",
          "Because templates require a section",
          "To delay the merge",
        ],
        answer: 1,
        explanation:
          "Naming what you have not verified turns a hidden risk into a reviewable one, which is the entire point of the packet.",
      },
    ],
    rubric: {
      id: "evidence-packet",
      title: "Write the evidence packet",
      prompt: "Write the evidence packet for an agent's caching change you are about to approve.",
      brief:
        "Cover the behaviour, the commands and their output, the scope, the reversal, and at least one open question.",
      minWords: 70,
      criteria: [
        {
          id: "behaviour",
          label: "States the behaviour change in plain language",
          check: "output.includes(\"behaviour\") || output.includes(\"behavior\") || output.includes(\"cache\")",
        },
        {
          id: "commands",
          label: "Gives the commands run and their results",
          check: "output.includes(\"npm test\") || output.includes(\"passed\") || output.includes(\"command\")",
        },
        {
          id: "scope",
          label: "Lists the files touched and argues they are in scope",
          check: "output.includes(\"file\") && (output.includes(\"scope\") || output.includes(\"touch\"))",
        },
        {
          id: "reversal",
          label: "States what could break and how to undo it",
          check: "output.includes(\"revert\") || output.includes(\"rollback\") || output.includes(\"undo\") || output.includes(\"risk\")",
        },
        {
          id: "open",
          label: "Names at least one open question or unverified path",
          check: "output.includes(\"open\") || output.includes(\"unverified\") || output.includes(\"not sure\") || output.includes(\"unknown\")",
        },
      ],
      exemplar:
        "Behaviour: the profile cache key now includes the user id, so two accounts no longer share an entry; before the change switching accounts could serve the previous user's profile. Commands and results: npm test -- tests/cache.test.ts gave 6 passed, and the full suite gave 107 files, 903 tests passed; the build completed. Scope: two files touched, src/cache.ts and tests/cache.test.ts, both in scope because the fix is the key and the test pins it; no other file changed. Risk and reversal: the cache grows with users, so I would watch hit rate and size for 24 hours, and the undo is a single revert that restores the old key without touching stored data because the cache is disposable. Open: eviction under ten thousand keys is unverified, and I have not measured the hit-rate cost of the extra key component.",
    },
  },
];
