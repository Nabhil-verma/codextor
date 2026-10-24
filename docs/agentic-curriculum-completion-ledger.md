# Agentic curriculum completion ledger

Verified against restored repository state on **2026-10-23**. This replaces earlier completion claims; historical receipts remain historical, not proof of the current code.

**Local implementation and acceptance checks pass. This is not a fully verified hosted release.** Convex deployment is blocked because `CONVEX_DEPLOY_KEY` is not set. Interactive browser/sign-in, a real BYOK provider request, and a hosted GitHub Actions run are unverified. Commit and deployment are recorded under *Release and push status*; the push to `main` is still outstanding, so none of this is hosted-release proof.

## Final checks

Receipts: `docs/verification/final/` holds the original run logs; the test rows below were re-measured on 2026-10-24 and are not backed by those logs.

| Command / configuration | Result |
| --- | --- |
| `npm ci` | Restored dependencies; initial audit found two moderate advisories |
| Targeted Vitest update | `vitest@4.1.12`; fixes GHSA-qxg6-89mg-rqv8 / GHSA-xp26-3454-mjgp |
| `npm run typecheck` | PASS, exit 0; final sequential gate 11.93 s; rerun after restoring default manifest also passes |
| `npm test` default | PASS, 107 files / 903 tests, 26.6 s (re-measured 2026-10-24) |
| `npm run build` default | PASS, exit 0, 11.31 s command wall time |
| `npm test` all flags on | PASS, 107 files / 903 tests (2026-10-24) |
| All-on checks after final worktree safeguard | 8 affected route/worktree tests pass; all-on production build passes |
| `node scripts/check-features.mjs` | PASS: off, five individual flags, all on; actual loader/DOM routes and syllabus rollback |
| `npm audit --package-lock-only` and `npm audit --json` | PASS, zero advisories |
| `bun install --frozen-lockfile` | PASS; both lockfiles match the patched dependency inputs |
| Profile CLI, default and all-on | PASS; separate JSON profiles retained |
| Review freshness, actual date | 0 / 108 overdue; exit 0 |
| Review freshness, 2027-03-01 | 18 / 108 warning annotations; exit 0 |
| Dev HTTP | Port 3000 on 0.0.0.0; permitted preview Host 200, foreign Host 403, entry module JavaScript 200 |

Both full suites and production builds were rerun on the final code, including the WorktreeLab final-state safeguard and plan/permission interaction repairs. The matrix restores default generated source. The final `dist/` is the all-on build used to verify experimental bundling, not a deployment. Dev preview uses default flags, matching generated source.

Non-fatal build warning: entry bundle about 616–618 kB exceeds Vite's 500 kB advisory threshold. No threshold was raised or warning suppressed. Global `git diff --check` is noisy from pre-existing CRLF conversion, existing skill-file trailing spaces and literal instructional conflict markers in `track-git.ts`. Targeted changed-source checks with `core.whitespace=cr-at-eol` pass; unrelated files were not rewritten.

## Mandatory item-by-item ledger

“Done and verified” below means the stated local behavior has evidence, not that hosted CI, deployed backend or visual review occurred.

| Item | Status | Evidence | Next step / limitation |
| --- | --- | --- | --- |
| 0.1 Understand | done and verified | `agentic-curriculum-analysis.md`; frozen 103-row lesson grain | Baseline remains immutable |
| 0.2 Gather/profile | done and verified | `curriculum-profile.mjs`; profile tests; baseline 103 / 17 / 1,238 | Current profiles distinguish enabled lessons from raw source |
| 0.3 Analyze | done and verified | Analysis subsections (a)–(e); source-backed sequence/coverage tables | No keyword-depth or effectiveness inference |
| 0.4 Validate | done and verified | Null, identity, duration, aggregation, numeral checks; profile/matrix tests | Stable numerals are identities, not new path positions |
| 0.5 Present | done and verified | Formal analysis and reproducible queries | Historical baseline text explicitly labeled |
| 0.6 Visualize | done and verified locally | Two labeled accessible SVG chart panels; chart tests | Interactive visual inspection pending |
| Caveat 1: presence ≠ depth | done and verified locally | Exercise reference repairs, concept-body scan and actual controls | Content efficacy still needs learners |
| Caveat 2: read all 13 bodies | done and verified | Full baseline body inventory and lengths in analysis | No depth score inferred from word count |
| Caveat 3: order/access | done and verified | Core selector, prefetch, fresh-account DOM tests | Baseline 1,072-minute raw Up-next correction retained |
| Caveat 4: pilot evidence | done and verified as absence finding | Repo/docs/telemetry inspection; software tests separated from learner outcomes | No measured cohort Gate A dataset available |
| Caveat 5: 12-minute estimates | done and verified as accounting | Authored durations recomputed, not learner timing | Calibrate with consented learner measurements |
| #1 Re-spine | done and verified | `agentic-spine.test.ts`; Agents fourth at 241 min; state/dsa optional | All original lesson identities retained or alias-resolved |
| #2 Review dates / CI warnings | done and verified locally | Metadata tests, visible `<time>`, freshness script and CI step | Hosted warning annotation run not observed |
| #3 Name the thing | done and verified locally | Lesson zero, six-choice placement, README/hero; generated counts/table | Legacy Codexter storage keys retained for compatibility only |
| #4 Guardrails | done and verified locally | `guardrails.ts`; injection, fabricated dependency, secrets and executed wrapper tests | No live agent or real secret used |
| #5 Review Gym | done and verified | 14 new diffs; SC/TG/NM/DL twice each; HA/ID/CX; two clean PRs | First-exposure practice and server assessment are distinct |
| #6 Write catching tests | done and verified | Four dual-run fixtures; real ProofRunner controls | Debounce race is deterministic response-order replay |
| #7 Read the run | done and verified | Five exact requested behaviors; `transcript-lab.test.tsx` | Extra historical incidents retained for field reports |
| #8 Artifacts | done and verified locally | Three stable lessons; flawed-plan approve/amend/reject; capability replay; cost decisions; UI tests | Existing quizzes retained as checks; cannot bypass artifacts |
| #9 Reviewer profile/certificate | locally verified; hosted blocked | Practice first-exposure metrics; server per-code metrics; choice-only grading; persisted issuance; real Convex mutations through UI test | Deploy key required; real sign-in and production issuance pending |
| #10 Rules/headless | done and verified locally | Two lessons with deterministic decision artifacts/quizzes; required CI/hooks/budgets/stop policy | Core rose to 910 minutes with the ten operation lessons; +24 min from these two disclosed |
| #11 Eleven conversions | done and verified | Exact original eleven keys; adverse-draft review questions; loader integration test | No lessons folded; no measured time savings claimed |
| #12 Agent Internals | done and verified locally behind flag | Six lessons; five JS practices and original Python fixture; mock fetch path; Pyodide tests; schema/MCP/RAG/evals content | MCP+schema combined; Python client becomes applied failure anatomy; original URL/key/certificate preserved |
| #13 Parallel/merge | done and verified locally behind flag | GitSim parallel mode; staged conflict resolution; help; current-final-state guard; two sequential PR reviews | Parallel state machine remains separate internally; original GitSim mode unchanged |
| #14 Field Reports | done and verified locally behind flag | Five incidents plus own-repository redacted packet; actual Rubric grader, local draft persistence and remount test | Structural evidence checks do not authenticate pasted prose; optional BYOK critique not required |
| #15 Interrogate agent | constrained local implementation verified behind flag | Scripted overconfidence + learner question + BYOK exact event citations + approve/reject; fabricated outcomes withheld; fallback tests | Not arbitrary model narration: only exact cited evidence rendered; real provider request requires user key |
| Do not delete DSA/state/Tailwind | done and verified | Tracks retained, depth certificates and original identities tested | Optional, not deleted |
| Do not build a live coding agent | done and verified | Deterministic runners, mock endpoint, scripted terminal | No model filesystem/tool execution |
| Do not use LLM main grader | done and verified | Rubric expressions, fixed answer keys, dual-run and server choice grading | BYOK never changes grades |
| Do not build SQL/interview first | skipped by design | No SQL/interview implementation | Secondary tracks remain future work |
| Do not add run-volume streaks | done and verified | Existing streak/XP model; reviewer decisions separate | No reward per model call |
| Keep Git/Testing/Security/TS/Workflow | done and verified | Registry and spine/milestone tests | Existing stable IDs unchanged |
| Phase 5 additions | done and verified locally | Default +5 lessons; all-on +16 net; labs reuse stable lessons | Counts differ from forecast because labs reuse lessons and new tracks are optional |
| Phase 5 optional demotion | done and verified | State 83 + DSA 83 = 166 minutes; certificates retained | No progress erased |
| Phase 5 eleven conversions | done and verified | Exact named list; none of three Agents artifact lessons included | Additive conversion, not fictional time saving |
| Phase 5 ~900 min / ~37% | done and verified | Core 910; 334 / 910 = 36.7%; ten lessons in `src/data/agentic-core-lessons.ts` | none |
| Final taxonomy coverage | done and verified | Every ten codes >=1 rendered debug AND >=1 diff; matrix asserts it | Four previously review-only codes now have executable adverse contracts |
| Final concept coverage | done and verified with all flags on | MCP, evals, worktrees, schema, RAG, injection, vibe coding in body scan and exercises | Five concept groups intentionally hidden in default rollback configuration |
| Final core order / quiz-only | done and verified | Core exact requested order; 25 → 12 quiz-only; 270 → 134 authored minutes | Lesson zero intentionally remains reading + placement/quiz |
| Final preview | HTTP verified, interactive unverified | Port 3000, exact Host allowlist, JS content type, Browser panel opened | No browser automation available in current runtime; visual/sign-in review pending |
| Dependency advisories | done and verified | Audit zero; patched Vitest 4.1.12; synchronized npm/Bun locks | A future advisory can change this result |
| Hosted CI | blocked | Workflow default/all-on full checks exist and local commands pass | No authorized push or connected GitHub app/run |
| Convex deployment | blocked | `CONVEX_DEPLOY_KEY` not set; never ran interactive login | Owner must configure key in project Secrets |

## Exact #7 and #11 content

The original specification was recovered in the continued context. Earlier claims that its lists were unavailable were wrong.

- #7: edits the test instead of code; claims tests pass without running; touches out-of-scope files; ignores denied permission; loops on the same failed fix.
- #11: `git/git-basics`, `git/git-branches`, `git/git-ci`, `web/html-semantic`, `web/responsive-deep`, `backend/rest-auth`, `backend/databases`, `dsa/linked-lists-stacks-queues`, `dsa/trees-recursion`, `state/server-state`, `react/jsx-vdom`.

## Measured final profile

Minutes are authored estimates. Timing of verification commands is measured separately.

| Metric | Baseline | Default | All five flags on |
| --- | --- | --- | --- |
| Tracks | 17 | 17 | 19 |
| Lessons | 103 | 118 | 129 |
| Total minutes | 1,238 | 1,418 | 1,540 |
| Core minutes | 896 | 910 | 910 |
| Optional minutes | 342 | 508 | 630 |
| Agents + Workflow minutes | 166 | 334 | 334 |
| Agentic share of core | 18.5% | 36.7% | 36.7% |
| Agents starts | 730 min / 62 lessons | 241 / 21 | 241 / 21 |
| Workflow starts | 847 min / 71 lessons | 526 / 44 | 526 / 44 |
| Quiz-only | 25 / 270 min | 12 / 134 min | 12 / 134 min |
| Duplicate keys/IDs/titles/nulls | 0 | 0 | 0 |
| Missing numeral identities | XVII, XVIII | XVII, XVIII intentionally disabled | none |

All-on adds 26 net lessons over the 103-lesson baseline and 11 over the default build: twelve optional lessons in the two flagged tracks, minus the 14-minute Python lesson that moves rather than duplicates. Default growth is 15 lessons and 120 core minutes, all inside Agents. The two depth tracks hold 350 topical minutes alongside Agents+Workflow, of which 136 are optional; the honest core numerator is 334. Stable legacy numerals are deliberately not sorted after the core reorder.

### Phase 5 target arithmetic (2026-10-24)

The Phase 5 line "core stays near 900 minutes, agentic share ~37%" was not reachable from the content that existed on 2026-10-23. With 214 agentic minutes inside 790 core minutes, reaching 37% means solving `(214 + x) / (790 + x) = 0.37`, which gives `x ≈ 124.3`: about ten further 12-minute agentic core lessons, and a core of 914 minutes. Nine such lessons land at 898 core minutes / 35.9%; eleven at 922 / 37.5%.

The gap was closed on 2026-10-24 by authoring those lessons rather than by relabelling: ten 12-minute operation lessons now sit inside Agents (`src/data/agentic-core-lessons.ts`), taking core to **910 minutes** with **334 agentic minutes = 36.7%**. That is the closest honest fit to "~900 / ~37%"; eleven lessons would print 922 / 37.5%, and the extra one would be padding. Relabelling the 136 optional depth minutes as core would print 37.8% and remains refused: depth stays optional and authored durations are unchanged.

### The ten operation lessons (built 2026-10-24)

These are authored in `src/data/agentic-core-lessons.ts`, wired into the Agents track ahead of the capstone, and covered by the curriculum-integrity, rubric-exemplar and quiz-bias tests plus `tests/lab-graders.test.ts` ordering. Each is 12 authored minutes, ships a written artifact graded by the same rubric engine as the rest of the curriculum, and is tagged `reviewed: 2026-10` / `toolDependent` for the 90-day review warning. The "nearest existing" column is the overlap that was judged before writing; a lesson that only restates a neighbour would be padding, not content.

| # | Working title | What it teaches | Why the core needs it / nearest existing |
| --- | --- | --- | --- |
| 1 | Characterization tests before you let the agent refactor | Pin current behaviour of untested code with snapshots, then let the agent change it and prove nothing moved | `agents/verifying-agent-output` assumes a suite exists; legacy repos are the common case |
| 2 | Reading a generated migration | Reversibility, backfills, locks and destructive defaults in schema diffs; approve, amend or reject | No lesson anywhere covers data migrations; they are the costliest agent mistake in production |
| 3 | Rollback drills | `git revert` vs `reset`, bisect to the first bad commit, kill switches for shipped features | `workflow` teaches writing changes, not undoing them; `git/git-branches` stops at branching |
| 4 | The lockfile is a security artifact | Reviewing dependency and lockfile diffs, provenance, why `npm ci` must stay frozen | `agents/instruction-files` covers fabricated names, not version pinning or transitive churn |
| 5 | Runtime evidence: logs, traces and metrics for agent runs | Deciding what to log so a run can be proven after the fact, and reading it as evidence | `agents/headless-and-scheduled` sets budgets and kill switches, not observability |
| 6 | Version reality | Checking an agent's API claim against installed types and versions instead of trusting fluent prose | Distinct from hinted-at existence: this is drift between the model's memory and the installed tree |
| 7 | Decomposition contracts | Slicing work into units an agent can finish and verify independently, with explicit interfaces | The mechanics stay flagged in `git-workflow-lab`; the decision of where to cut is core |
| 8 | Placing approval gates | Which irreversible actions need a human checkpoint, and how to place one without blocking the loop | Nearest: `agents/permissions-and-sandbox`, which sets permissions but not checkpoint placement |
| 9 | The failing-test loop | Reproduce, minimize, fix, prove — the loop to run with an agent instead of around it | Nearest: `agents/write-the-catching-test`, which writes the proof but not the debugging path |
| 10 | Definition of done | The evidence packet (diff, run output, scope note, rollback line) that lets a reviewer accept instead of hope | Nearest: `workflow` PR intent and decision records; this closes the loop with evidence |

#7 and #10 were the two closest to existing material; both were kept because they carry distinct artifacts (a merge-order contract plan, an evidence packet) rather than restating the neighbours. Cutting them would give core 886 minutes and 34.3% — the fallback if review disagrees.

Profiles: `docs/curriculum-profile.json`, `docs/curriculum-profile-all-on.json`. Baseline: `docs/curriculum-baseline.json`.

## Feature flags and rollback

All are OFF by default; set to `1` for generation, build and dev consistently:

- `VITE_FLAG_AGENT_INTERNALS`
- `VITE_FLAG_GIT_WORKTREE_LAB`
- `VITE_FLAG_FIELD_REPORTS`
- `VITE_FLAG_REVIEWER_CERTIFICATE`
- `VITE_FLAG_BYOK_INTERROGATION`

Regenerate/rebuild with `0` to roll back. The generator removes only generated experimental syllabus directories when disabled, not authored lessons or learner data. The matrix verifies that rollback. The Python lesson resolves to its original storage key even from its new route, avoiding duplicate XP. Python certificates still require the original lesson after the move. Prior `agent-internals/mock-endpoint` URLs resolve to the applied Python lesson when enabled.

## Phase summaries

### Phase 0

Files: analysis, immutable baseline, profile script/JSON, chart artifact and compiler asset plugin. Tests: profile and compiler-asset tests. Verified baseline figures and final profile invariants. Caveats: no learner pilot result or timed lesson dataset; original build OOM fixed by separating the installed TypeScript compiler asset.

### Phase 1

Files: registry, state/dsa metadata, selectors, review helpers/script/CI, lesson zero/placement, landing/README and generated manifest. Tests: spine, fresh-account selector, metadata, dates/warning output, placement, manifest/site generator. Measured Agents start 241 minutes; core checkpoint 730 before new content, 790 after the first wave, 910 once the ten operation lessons landed. No stable content identity deleted. Interactive visual conformance pending.

### Phase 2

Files: review gym, guardrails, catch-agent fixtures/UI, five-behavior transcripts, decision artifacts, eleven named review conversions, lesson evidence integration. Tests: all corresponding UI/data graders, taxonomy and completion tests. 14 gym diffs, four dual-run tests, five requested traces. Exact eleven keys now converted. No measured savings; #10 kept core with explicit accounting rather than false blocker.

### Phase 3

Files: flags/feature generator, Agent Internals/mock endpoint/Python relocation, GitSim parallel engine and staged resolution/reviews, reviewer server bank/schema/mutations/UI/telemetry, Field Reports own-session path, trace citation interrogation. Tests: reference repairs including Pyodide, route matrix, actual UI-to-convexTest issuance, first-exposure metrics, rebase staging and sequential PR review, report persistence, citation rejection. Unseen means not previously assigned through this server; not proof a learner never saw the open-source question bank. Reset deletes assessment history, so this is not anti-cheat identity certification. BYOK exact evidence quotes are intentionally more constrained than free narration.

### Phases 4–5

Dropped features remain dropped. Baseline and final targets recomputed rather than rounded to forecasts. Final default suite 107 files / 903 tests, re-measured 2026-10-24; the all-flags suite passes all 903 after the quiz-bias baseline gained per-configuration entries. Final build, audit and matrix pass as detailed above. Hosted integration checks still need credentials and interactive review.

## Corrections to previous claims

- The old certificate accepted client grades. Now clients submit only choices; server assigns fixtures, times submissions, computes correctness and persists issuance.
- Old flag registration did not make routes reachable. Generation, loading, static output and real DOM routes now share configuration and are checked in a seven-configuration matrix.
- Unsupported narration was formerly displayed before validation. Trace interrogation now buffers and renders only validated exact quotes; reference validation is not semantic truth checking.
- The Python alias was previously empty. It now maps the new route to original storage identity, with URL/certificate/XP compatibility tests.
- “36 non-Agents candidates,” missing named lists, and “0 vulnerabilities” without a fresh audit were not reliable. Current exact conversions and fresh audit/profile replace them.
- The earlier saved ledger and baseline-report ending were stale; this document and the analysis's final-state addendum supersede those status claims.

## Remaining external actions and risks

1. **Convex:** open the Convex dashboard, pick the intended project's Production deployment, Settings → Deploy Keys, generate a key, and add it under this project's Settings → Secrets as `CONVEX_DEPLOY_KEY`; ask to deploy again. The client currently targets the existing hard-coded `accomplished-hyena-726` deployment; confirm the intended target before deployment. Never paste keys into chat. No interactive `convex login`/`convex dev` was attempted.
2. **Hosted CI:** authorize a commit/push or connect GitHub and run the workflow; local runs are not hosted run evidence.
3. **Interactive acceptance:** check both visual styles/light-dark/reduced motion and real sign-in in the preview; configure BYOK through Settings → AI and try a provider request. Those cannot be established by HTTP or mocked provider tests. The Igloo reference returns only a JS shell to the available reader; no direct rendered comparison is claimed.

## Merge with `origin/main` (2026-10-24)

`main` had moved on without this branch: `3c4251e` (atlas learning paths, adds `three`) and `a6620e2` (rotated Convex secret in CI). The branch merged it in `e5505e3` and resolved the three conflicts in favour of the newer toolchain kept here (`react-router-dom` 7, Vite 6, Tailwind 4) plus the atlas additions (`three` 0.186.1, `@types/three` 0.186.0).

Checks after the merge: `npx tsc -b --noEmit` exit 0; `npm test` 107 files / 903 tests pass; `npm run build` exit 0. The 616-test figures that used to sit in the Final checks table recorded this pre-merge state and were replaced by the 2026-10-24 measurements above.

## Release and push status (2026-10-24)

**Production site.** `https://codextor.freebuff.page` (Sites production environment; subdomain attached 09:17). The 08:50 deploy carries the merge described above.

**Reported symptom.** With JavaScript disabled for the site, the homepage rendered as a long plain page. Cause: `index.html` held a complete second copy of the landing copy inside `<noscript>`, with its own inline `.nojs` styles. Nothing had been deleted, and `/assets/index-*.js` still returned 200 `text/javascript` with the stylesheet at 200 `text/css`; the app never booted, so the fallback copy was all the browser had to show.

**Fix.** That duplicate was replaced by one short notice: "Codextor needs JavaScript — every lesson runs real code in your browser. Turn JavaScript on for this site, then reload." The generated `counts:hero` markers were left intact, so `scripts/gen-site.mjs` and `tests/site-gen.test.ts` are unaffected (`d3e6614`).

**Verified after redeploy,** on both the `site-a79080c5….freebuff.page` URL and the custom domain: `/` 200 serving the notice and bundle `index-D80MAKod.js`, `/manifest.json` 200, `/syllabus/` 200. Chromium on this VM lacks the font libraries it needs, so no screenshot was taken; the owner confirmed the rendered page in their own browser.

**Push outstanding.** `main` is 10 commits behind this branch and 0 ahead, so the push from the branch tip is a plain fast-forward. Two credential attempts failed the same way: `GH_TOKEN` and `GH_TOKEN_2` were added under Sites → Secrets, which are Worker runtime secrets for the deployed site. The cloud shell sees 13 system variables and no injected secret, and Sites secret values are never exposed to tools. No site code reads `GH_TOKEN`; both entries only consume the 25-variable allowance.

**Fallback.** `artifacts/codextor-main-full.bundle` (3.2 MB, untracked, packed from the branch tip at export — `git bundle list-heads` prints the commit it carries) was verified by cloning it and fast-forwarding a `main` at `a6620e2` to that tip:

    git checkout main && git pull --ff-only
    git fetch ~/Downloads/codextor-main-full.bundle HEAD:codextor-work
    git merge --ff-only codextor-work && git push origin main

## Repo state

The work is committed, not an uncommitted worktree: `c5a84b6`, `4dceeca`, the merge `b469c92`, the merge `e5505e3`, `d3e6614`, `c2de005`, the ledger updates and the operation-lessons commit that adds `src/data/agentic-core-lessons.ts` — 10 commits ahead of `origin/main`, 0 behind. Imported restoration showed widespread pre-existing CRLF changes and unrelated modified skill files, which were not staged. Hosted CI, the Convex deployment and interactive browser checks remain unverified for the reasons above.
