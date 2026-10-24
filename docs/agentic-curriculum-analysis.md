# Agentic curriculum analysis

> **Reading this report:** the baseline sections below intentionally describe the pre-change 103-lesson dataset. The final-state addendum at the end supersedes historical delivery/blocker claims; the completion ledger contains current verification receipts.

## Key finding

**Judgment exists, but it is not the curriculum spine.** At the pre-edit baseline, Agents + Workflow occupy **166 of 896 core minutes (18.5%)**. Agents starts after **730 core minutes (12.2 hours), 62 lessons** in the *displayed core catalog*. There are **25 quiz-only lessons (270 minutes)**. Four taxonomy codes—SC, TG, NM, DL—have no debug or diff exercise. All six requested new concept groups, plus “vibe coding”, have zero lesson-text or raw-data hits.

Two assumptions require correction: **“Up next” actually includes optional tracks**, so its initial baseline route reaches Agents after **1,072 minutes / 90 lessons**, not 730. Also, **0 runnable Agents exercises means 0 starter + check exercises**, not no execution: two Agents DebugLabs already execute repairs. Four rendered diffs are **three distinct fixtures**, because the search-race fixture is reused.

## 0.1 Understand: question and grain

Question: Where does the curriculum stand on agentic engineering; what is missing; what should be added, demoted, or trimmed? Grain: one row per wired lesson, with key `trackId/lessonId`. Population: all tracks in `src/data/index.ts`, not just the generated manifest. Definitions for the work ahead:

- Vibe coding: accepting AI output because it looks right.
- Agentic engineering: directing an agent through spec → context → plan → delegate → verify → operate, with the human accountable for the result.
- V2 thesis: **judgment over authorship**. Proof is the verification artifact, not a substitute for operating the result.

## 0.2 Gather and profile

### Dataset summary (pre-edit snapshot)

| Metric | Verified value |
| --- | --- |
| Lessons / tracks | 103 / 17 |
| Duplicate keys / global lesson ids / titles | 0 / 0 / 0 |
| Null or empty core fields | 0 |
| Authored minutes / median | 1,238 / 11 |
| Core / optional minutes | 896 / 342 (5 optional tracks) |
| Agentic lessons / minutes | 13 / 166 |
| Agentic share of lessons / all minutes / core minutes | 12.6% / 13.4% / 18.5% |
| Debug / rendered diff / distinct diff / repo / rubric | 9 / 4 / 3 / 3 / 8 |
| Rubric criteria | 40 |
| Quiz-only lessons / minutes | 25 / 270 |
| Agents starter + check exercises / executable DebugLabs | 0 / 2 |

### Per-track profile

| Registry position | Track | Numeral | Core? | Lessons | Minutes |
| --- | --- | --- | --- | --- | --- |
| 1 | web | Ⅰ | core | 10 | 119 |
| 2 | react | Ⅱ | core | 4 | 43 |
| 3 | backend | Ⅲ | core | 5 | 55 |
| 4 | dsa | Ⅳ | core | 8 | 83 |
| 5 | python | Ⅴ | optional | 4 | 46 |
| 6 | git | Ⅵ | core | 4 | 40 |
| 7 | testing | Ⅶ | core | 7 | 82 |
| 8 | devops | Ⅷ | optional | 6 | 69 |
| 9 | security | Ⅸ | core | 6 | 60 |
| 10 | architecture | Ⅹ | optional | 6 | 72 |
| 11 | tailwind | Ⅺ | optional | 6 | 77 |
| 12 | state | Ⅻ | core | 6 | 83 |
| 13 | api | XIII | core | 6 | 83 |
| 14 | typescript | XIV | core | 6 | 82 |
| 15 | performance | XV | optional | 6 | 78 |
| 16 | agents | ⅩⅥ | core | 9 | 117 |
| 17 | workflow | ⅩⅨ | core | 4 | 49 |

### Default-path starts (not hard gates)

| Selector | Agents starts | Workflow starts |
| --- | --- | --- |
| Displayed core-only array order | 730 min / 62 lessons | 847 min / 71 lessons |
| Actual baseline Up next / prefetch registry order | 1,072 min / 90 lessons | 1,189 min / 99 lessons |
| Proposed #1 core order (same authored minutes) | 241 min / 21 lessons | 358 min / 30 lessons |

### Taxonomy: rendered lesson elements, not unused library fixtures

| Code | Debug | Diff review |
| --- | --- | --- |
| RC | 2 | 2 |
| EC | 1 | 1 |
| SL | 2 | 1 |
| CX | 2 | 0 |
| HA | 1 | 0 |
| ID | 1 | 0 |
| SC | 0 | 0 |
| TG | 0 | 0 |
| NM | 0 | 0 |
| DL | 0 | 0 |

SC = scope creep; TG = missing or vacuous tests; NM = misleading names; DL = leftover debug code. The taxonomy declares these four **review-only** in `src/data/bug-taxonomy.ts`; the final request for one debug of *every* code conflicts with that existing contract. A later item must explicitly reconcile this rather than silently weaken `taxonomy-coverage` tests. No prevalence claim about which errors agents make most often is measured here.

### Concept scan

| Concept group | Full lesson-text hits | Body hits | Independent raw grep |
| --- | --- | --- | --- |
| MCP | 0 | 0 | 0 |
| evals | 0 | 0 | 0 |
| worktrees / parallel agents | 0 | 0 | 0 |
| structured output / JSON schema | 0 | 0 | 0 |
| RAG | 0 | 0 | 0 |
| prompt injection | 0 | 0 | 0 |
| vibe coding | 0 | 0 | 0 |

The script traverses all string fields of every wired lesson, including exercises. The independent command is:

```sh
grep -RInEi 'mcp|\bevals?\b|worktrees?|parallel agents?|structured outputs?|json schemas?|\bRAG\b|retrieval[- ]augmented|prompt injection|vibe coding' src/data
# Exit 1, no matches at baseline.
```

No broad `hook`, `token`, or ordinary function-call count is used; React hooks, auth tokens, and normal function calls are not evidence of teaching agent hooks, model tokens, or model tool calls.

### Quiz-only lessons

An exercise is any nonempty starter, debug, diff, repo, rubric, preview, sandbox, Git simulator, predict, or sort element. The `reading` flag is **not** this predicate: its type comment says “no runnable exercise — body + quiz only”, but reading lessons can have preview, debug, prediction or sorting. The manifest instead labels “reading” whenever no starter, gitSim or sandbox exists. The three quiz-only Agents lessons do not set reading at all. Count actual elements, not the flag.

| Key | Minutes | reading flag |
| --- | --- | --- |
| web/html-semantic | 10 | true |
| web/responsive-deep | 10 | true |
| react/jsx-vdom | 10 | true |
| react/react-styling-routing | 11 | true |
| backend/rest-auth | 12 | true |
| backend/databases | 12 | true |
| dsa/linked-lists-stacks-queues | 10 | true |
| dsa/trees-recursion | 11 | true |
| python/pandas-numpy | 12 | true |
| git/git-basics | 9 | true |
| git/git-branches | 10 | true |
| git/git-ci | 9 | true |
| testing/tdd-mocking | 11 | true |
| devops/processes-services | 10 | true |
| devops/nginx-ssl-ci | 12 | true |
| architecture/monolith-vs-microservices | 11 | true |
| architecture/websockets-realtime | 10 | true |
| tailwind/design-tokens | 11 | true |
| state/server-state | 12 | true |
| api/optimistic | 12 | true |
| typescript/interfaces-types | 11 | true |
| performance/web-vitals | 11 | true |
| agents/plan-before-code | 11 | absent |
| agents/permissions-and-sandbox | 12 | absent |
| agents/when-not-to-use-agents | 10 | absent |

### All thirteen agentic bodies read and inspected

| Lesson key | Whitespace-delimited body words | Exercise elements | Depth finding |
| --- | --- | --- | --- |
| agents/specs-and-prompts | 178 | rubric | Concrete scope/acceptance/non-goal spec; rubric includes a self-attested target. |
| agents/codebase-archaeology | 185 | repo | Request trace, blast radius, repo-as-evidence; uses a shop repo. |
| agents/managing-context | 180 | rubric | Minimal pack, compaction loss, stale context; rubric has self-attested log pruning. |
| agents/instruction-files | 180 | rubric | Durable commands, directory ownership, boundaries; conventions rubric. |
| agents/plan-before-code | 180 | none | Plan fault categories described; only per-step quiz choices, no editable approval artifact. |
| agents/permissions-and-sandbox | 201 | none | Capability profiles and human-only actions described; only classification quizzes. |
| agents/verifying-agent-output | 194 | debug, diff | Fail-draft/pass-fix habit described; repairs CSV and reviews a search race, but learner writes no test. |
| agents/when-not-to-use-agents | 165 | none | Task triage described; only quizzes, no delegation-cost replay. |
| agents/capstone-agent-loop | 130 | debug, rubric | Spec/context/draft/verify/fix/proof articulated; repair plus written note, not learner-owned test. |
| workflow/pull-requests | 327 | rubric | Intent, alternatives, boundaries, test plan; rubric partly self-attested. |
| workflow/reviewing-diffs | 226 | diff | Blocking/nonblocking/question distinction; retry diff. No clean PR false-alarm calibration. |
| workflow/vague-request-ticket | 207 | rubric | Measurement, scope, unknowns, verification; written ticket rubric. |
| workflow/decision-records | 207 | rubric | Decision/alternative/cost/revisit; written record rubric. |

Word counts locate inspected content; they are not teaching-depth scores. These lessons teach meaningful supervision practices but omit the requested protocols, context retrieval and evaluation topics. Several rubric criteria are self-attested, and auto checks are primarily lexical. They measure a local structural bar, not external truth.

### Designed but not built

- `CURRICULUM-V2.md` §4 specifies Track XVII, Building with LLMs (six lessons); §5 specifies XVIII, SQL; §7 specifies XX, Interview Prep. None exists in the registry or loader modules.
- Track identities run XVI → XIX; XVII and XVIII are absent. No duplicate numerals.
- No `/api/llm/chat` mock endpoint in `src/lib/runner.ts`; the runner has mock REST. V2 §1.4 and §10.2 explicitly list the mock LLM as build work.
- The only LLM-titled lesson is `python/python-llm-api`, in optional Python. **Correction:** it does contain a deterministic Python client fixture via `pythonPrelude` and executes in Pyodide. “No mock endpoint” does not mean no mock model fixture.

## 0.3 Analyze

(a) **Sequencing:** web (119) + git (40) + testing (82) gets Agents to **241 minutes**, a **489-minute** earlier start than the displayed baseline; Workflow to **358**, also 489 earlier. Reordering the registry also fixes the optional-before-core Up next mismatch.

(b) **Judgment density:** nine debug placements, four diff placements (three distinct answer keys), three traces, eight rubrics. Zero false-alarm calibration on clean diffs. Expand SC/TG/NM/DL, then HA/ID/CX; add learner-owned dual-run tests and first-bad-step transcripts, not more vocabulary-only quizzes.

(c) **Missing concepts:** teach schemas and tool validation, MCP read-only, budgets and RAG trust boundaries, eval harnesses, parallel worktree ownership and injection mitigations with deterministic evidence. Keyword matches later must be manually checked for teaching depth.

(d) **Trim candidates:** the eleven named candidates total **115 authored minutes**. Additive judgment conversion removes them from the quiz-only set but saves **zero measured minutes** unless duration estimates are deliberately revised after content changes. Do not invent time savings; do not fold away progress keys. The three Agents artifacts belong to #8, not #11.

(e) **Proposed mix:** #1 retains 17 tracks / 103 lessons / 1,238 total minutes; core becomes **730**, optional **508** across seven tracks. Agentic core share becomes **166 / 730 = 22.7%**. A full-plan scenario adding 14 × 12 estimated agentic core minutes produces **898 core minutes**, **334 agentic minutes / 898 = 37.2%**, **117 lessons / 18 tracks** if exactly one new track is added. Moving Python's LLM lesson without an alias would change a progress key; preserve old lookup and ownership when implementing #12. The 14-lesson count, duration, placement and flag-enabled core are forecasts, not observations.

## 0.4 Validate

| Check | Result |
| --- | --- |
| Row sanity | PASS: 103 lessons / 17 tracks |
| Uniqueness and nulls | PASS: no duplicate keys, global ids, lesson titles, track ids or numerals; no missing id/title/minutes/body/quiz |
| Magnitude | PASS: positive finite minutes; median 11; all shares in 0–100% |
| Track aggregation | PASS: per-track sum 1,238; 896 + 342 = 1,238 |
| Pre-agent recomputation | PASS: displayed core preceding agents sums 730, 62 lessons |
| Trend continuity | FLAG: XVI → XIX, missing 17 and 18; optional tracks interspersed in baseline registry |
| Core order assumption | CORRECTED: catalog splits core first, Up next and nextLessonRef follow raw array |
| Lesson access | No sequential lock on Lesson route; SkillTree has its own visual prerequisite links (not curriculum access gates) |
| Independent zero-hit validation | PASS: traversed lesson strings and raw grep both return zero |

### Five caveats

1. **Presence is not depth.** No quantitative teaching-depth claim from regex. Every added concept still needs a meaningful lesson objective and exercise check.
2. **Partial reading resolved.** All nine Agents and all four Workflow bodies were read in full; the inventory above records each body and its current exercise limitations.
3. **Order assumption corrected.** `Learn.tsx` core/optional catalog grouping differs from its `outer: for (const t of tracks)` Up next selector. `nextLessonRef` also uses raw manifest order; Lesson next/prev stays within track. Fresh learner starts at web/html-semantic. The 12.2 hours is a displayed-path estimate, not a hard gate or current Up next total.
4. **Pilot evidence unavailable.** Searched V2 docs, source telemetry, tests and checked-in files. No learner cohort/result dataset or reported catch-rate measurement found. Docs' 257/257 and 319/319 are historical *software test* results, not Gates A/B. `telemetry.ts` and Convex progress contain attempts and aggregates; tests use synthetic attempts. Account/production telemetry was not accessed. Cloud aggregates discard element attribution; that can mix quiz/rubric/diff and cannot substantiate per-exercise reviewer metrics. Wave 0 graders/Agents, Wave 1 Pyodide/diff propagation, Wave 2 production traces/logs/timeline/data boundaries, and Wave 3 milestone artifacts/ProofRunner/export all have code and tests. V2 trims are **partial**: ES6 and sorting gained judgment DebugLabs but still retain syntax/merge-sort TODO starters; Python recall quizzes were rebalanced, matplotlib-ml replaced, testing has multi-station judgments. No blanket trim completion claim.
5. **Duration is estimated.** Existing minutes are authored values, not timed learner measurements. New-lesson 12-minute assumptions and the 37.2% full-plan scenario are explicitly estimates. Report final authored minutes separately from measured tests/build timings.

## 0.5 Present and reproducibility

Run from the repo root after `npm ci`:

```sh
node scripts/curriculum-profile.mjs --baseline # original data only; refuses to overwrite existing baseline
node scripts/curriculum-profile.mjs            # rerun after each curriculum change
npm run typecheck
npm test
npm run build
```

`scripts/curriculum-profile.mjs` is the executable query: bundles the wired registry using existing esbuild; flattens lessons; sums minutes; sorts for the median; checks unique keys/global ids/titles, required fields and positive minutes; partitions optional; sums core prefixes; counts **rendered** elements and distinct diff ids; normalizes Unicode Roman numerals; traverses all string fields and scans every raw data file. Query logic is exported as `profile`; CLI validation fails on broken uniqueness/null/aggregation invariants. Baseline is frozen in `docs/curriculum-baseline.json`; rerunnable current results in `docs/curriculum-profile.json`. Never overwrite the baseline after editing data.

Follow-up decisions: How will real Gate A learner cohorts and unseen exercises be collected? What counts as a meaningful false-alarm denominator for clean PRs? Should review-only codes be taught in executed instrumented wrappers to reconcile the final taxonomy criterion? Which big-bet flags should be enabled by default? Who will time new lessons and calibrate duration estimates?

## 0.6 Visualize

Open [the chart artifact](agentic-curriculum-charts.html): two horizontal-bar panels show baseline vs proposed-order start minutes (zero-origin, minutes axis) and agentic core share (0–100% axis). Exact labels, SVG accessible title/description, stable no-motion layout and light/dark adaptation. The full-plan bar is labeled **estimate**, never delivered output. Text tables remain the authoritative accessible numeric alternative.

## Risks

Baseline installation reports **16 dependency advisories (7 moderate, 7 high, 2 critical)** and deprecated dependencies. No upgrades were made under the no-new-dependency rule. Full browser visual review and production learner outcomes cannot be established with this environment's HTTP-only preview tools. The early Testing path retains production-debugging content that mentions optional DevOps literacy; monitor beginner usability rather than silently remove it.

## Phase 0 verification and delivery status

Artifacts: `scripts/curriculum-profile.mjs`; this report; `docs/curriculum-baseline.json`; `docs/curriculum-profile.json`; `docs/agentic-curriculum-charts.html`; `tests/curriculum-profile.test.ts`. At the original Phase 0 checkpoint, no curriculum or application source had changed. Four added tests exercise the actual CLI, immutable baseline, baseline figures, and accessible chart labels.

At the original Phase 0 checkpoint, the phase was **partial**, because the required production build failed on the existing baseline. This historical failure is resolved in the final-state addendum below. Initial full tests: **515/515, 55 files, 108.46 s**. Typecheck passed. Standard Node and Bun production builds were killed (exit 137); constrained Node heaps of 384/512/640/700 MiB produced explicit heap-out-of-memory errors (exit 134). The large real TypeScript compiler is in the build graph; exact peak memory and sole causal module were not established. No workaround, dependency change, skipped test or assertion suppression was applied. No later phase was started, consistent with the required per-item build gate.

Final check results and every remaining task are recorded in [the completion ledger](agentic-curriculum-completion-ledger.md). Chart/table figures are reproducible data measurements; learner time, browser visuals and pilot effectiveness remain unmeasured. The design reference research could fetch [Igloo](https://www.igloo.inc/) text but not its JS-rendered visuals; no claim of direct visual inspection is made. The chart is deliberately static rather than a scroll-linked product UI.

## Final-state addendum — 2026-10-23

The original build OOM is resolved with `scripts/compiler-asset.mjs`: the same installed TypeScript compiler is emitted separately and tested with a real type error. Current receipts are in `docs/verification/final/`; the exhaustive [completion ledger](agentic-curriculum-completion-ledger.md) supersedes historical completion claims.

| Profile | Default | All five experimental flags on |
| --- | --- | --- |
| Tracks / lessons | 17 / 108 | 19 / 119 |
| Authored total / core / optional minutes | 1,298 / 790 / 508 | 1,420 / 790 / 630 |
| Agents + Workflow core minutes / share | 214 / 27.1% | 214 / 27.1% |
| Agents / Workflow starts | 241 / 406 core minutes | 241 / 406 core minutes |
| Quiz-only lessons / authored minutes | 12 / 134 | 12 / 134 |
| Missing numeral identities | XVII, XVIII disabled intentionally | none |

Core order: web → git → testing → agents → workflow → security → typescript → backend → react → api. State and DSA retain certificates as optional depth tracks. Stable numeral identities are not array positions. All ten defect codes have at least one debug and one diff placement; the four former review-only codes now have executable contracts for unauthorized membership removal, vacuous tests, dollar-unit naming and a debug authorization bypass. Keyword matches are not the proof: tests execute each bad draft/reference repair, and the flag matrix opens actual lesson controls.

All previously zero-hit concepts are taught with all flags enabled: schemas/structured output and read-only MCP (`tool-schemas-mcp`), budgets/context (`context-budgets`), retrieval-augmented generation (`retrieval-rag`), evals (`evals`), parallel worktrees/rebase (`git-workflow-lab`), prompt injection (`agent-guardrails`), and vibe coding by name (`agentic-loop-zero`). The raw scan includes flagged source; body coverage separately reports enabled content. The chart now labels the delivered order and core share, while retaining the 37.2% forecast explicitly as a forecast.

The original exact eleven #11 candidates are converted without folding/deleting identities. Agent Internals uses six lessons: schema/MCP are combined, RAG is explicit, and the original Python LLM client is the applied failure-analysis lesson. When enabled, the old Python route redirects and the original progress/XP identity and certificate requirement remain. Field Reports includes five public incidents and a locally saved redacted own-repository evidence packet. These are additive exercises, not measured time savings.

The final forecast gap is real: sixteen net lessons rather than ~14, but only five new core lessons (+60 minutes after the 166-minute demotion), giving 790 rather than ~900 core minutes. Optional Agent Internals/Field Reports are not miscounted as core to manufacture 37%. All-on agentic topical minutes including optional depth are 350, a different denominator from the 214 core numerator.

The forecast was also arithmetically under-specified. “Core stays near 900 minutes, agentic share ~37%” only holds together if core itself grows: solving `(214 + x) / (790 + x) = 0.37` gives `x ≈ 124.3`, a core of 914 minutes, which is roughly ten further 12-minute agentic core lessons rather than the five that arrived. Nine such lessons give 898 core minutes at 35.9%; eleven give 922 at 37.5%. The delivered state is therefore recorded as a corrected target, not a shortfall to be closed by padding: 790 core minutes, 214 agentic, 27.1%.

Verification: 616 tests / 77 files pass by default and all-on, on the final code including the staged-resolution safeguard and plan/capability replay repairs; typecheck and both production builds pass; npm audit reports zero vulnerabilities. The Vite entry-chunk size warning remains non-fatal. Port 3000 preview passes exact-host HTTP and module checks. Hosted CI, Convex deployment, real sign-in, BYOK provider interaction, visual style/reduced-motion review and learner pilot effectiveness are **not verified**. No deployment key is set. No production write, commit, push or deployment was performed.
