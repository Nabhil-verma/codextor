# Implementation evidence and decisions

## Build prerequisite
The existing installed TypeScript compiler is prebundled by esbuild and emitted as a content-hashed ESM asset. The pre-enforced Vite plugin bypasses Rollup's 9 MB CJS transform, without replacing the real compiler or changing grading. `compiler-asset.test.ts` runs its emitted source in a browser-like realm and checks valid/invalid programs. Full gates: `docs/verification/phase0/results.json`.

## #1 Order audit
- Registry and generated manifest now have core `web, git, testing, agents, workflow, security, typescript, backend, react, api`, then optional tracks. State/DSA are optional, with the exact requested explanation.
- Learn's raw-array Up next and core-first display now agree. Fresh account test pins web/html-semantic, Agents fourth. Cross-track prefetch follows manifest; lesson previous/next intentionally remains within track.
- Ascension tiers, daily/guild quests use XP/level/completion counts, not track position: no change needed. Their existing suites rerun.
- Milestones gate by stable literal lesson keys (some intentionally require optional Tailwind/State); all keys still resolve. No milestone gate relaxed.
- Certificates and badges look up track IDs and lesson keys, not core/optional: State/DSA certificate tests pass. No IDs, titles, progress or certificate keys removed.
- Landing/TrackCard display indexes follow registry. Roman numerals remain track identity until the explicit numeral work in #12; no numeral migration in #1.
- SkillTree's old dependency diagram is a separate advisory surface, not the curriculum sequence; lesson routes remain unlocked. Rework it with the agentic labs rather than silently changing prerequisites during copy-free #1.
- Authored-minute targets: Agents 241, Workflow 358, core 730, agentic core 22.7%. These are not timed learner outcomes.

## #2 Review dates
The requested `reviewed` month and `toolDependent` flags are added alongside V2-PATCH's distinct `reviewBy` deadline and dated optional `toolRefs`; they are not conflated. All 13 Agents/Workflow lessons depend on agent capabilities despite tool-agnostic prose, so all receive `2026-10`, true, and a 90-day deadline. Month-grain age uses October 1 conservatively, warns on day 91 (December 31), and treats missing/invalid dates as overdue. A scheduled weekly CI run emits non-failing GitHub annotations. No named product sidebar is invented. The lesson UI uses semantic time markup, existing theme variables and no added animation. Browser visual review remains pending, not implied by DOM tests.

## #3 Name and entry point
`agents/agentic-loop-zero` is an additive 12-authored-minute reading lesson with both exact definitions and the spec/context/plan/delegate/verify/operate loop; proof is the verify artifact. Placement is six deterministic scenarios, ≥5 correct recommends specs, otherwise web; it never writes completion/XP or locks a route. README and landing hero now use judgment over authorship. Historical V2 naming corrected to Codextor; generated README/social/manifest/Convex counts and sample stats derive from registry (104 lessons). Hero retains atmospheric depth/oversized identity and scroll behavior inspired by Igloo, not copied assets; new headline motion explicitly respects reduced motion. All old pilot lesson IDs remain. Workflow start rises from the #1 checkpoint 358 to 370 with lesson zero; core to 742. Visual checks remain user-pending.

### Phase 1 summary
Changed registry, State/DSA optional metadata, lesson type/review logic/page, CI cadence, orientation/placement, README/hero and count generator; generated artifacts regenerated. Tests: spine/key/certificate/milestone/next targets, fresh account UI, review boundaries/date UI, placement route and form, production compiler. Per-item measured results are in verification/item1–item3/results.json. No real pilot outcomes or learner timing invented. Remaining risks: advisory SkillTree still reflects old dependency map (to address with parallel/internals work), large compiler asset still loads lazily, npm advisories untouched, interactive four-appearance review pending.

## #5 Review Gym
Fourteen authored exercises on reviewing-diffs: two each SC/TG/NM/DL, two HA, one ID, one CX, two clean approvals. DiffExercise's planted value is explicitly nullable for clean PRs; blocking fixtures retain the 0/0.4/0.7/1 ladder. Clean approval earns 1; false alarms and missed blockers earn 0. Same-file decoys and scoped briefs explain why. Gym attempts use per-exercise keys and do not grant the whole lesson completion for one answer. This increases independent fixtures, not demonstrated statistical power: actual Gate A cohort outcomes still need collection. Coverage tests pin all intended minimums; DOM test submits a clean approval through DiffLab. The profiling CLI includes all rendered review elements rather than just the singular diff property.

## #4 Guardrails
One 12-minute security lesson: full indirect-injection transcript (first boundary crossing), fabricated-dependency helper diff, context-secret handling and executable read/path/source/confirmation/output allowlist wrapper. Fixtures use SECRET_SENTINEL only and never call network/filesystem. Mutation tests prove omitting confirmation or returning raw tool output fails. Existing debug-library broken/reference/hint invariants also execute it. Scores remain deterministic. Existing data-boundaries lesson remains intact.

## #6 Write the catching test
A 12-minute Agents lesson hosts four learner-editable test artifacts: CSV quoted comma, deterministic newest/stale response replay, pagination boundary, missing-role denial. Read-only draft/fix fixtures prevent changing the answer to fit the test; ProofRunner requires an intentional ASSERTION: failure on the draft and no error on the fixed version. Empty tests earn only incomplete partial credit; typos cannot count as a catch. Tests run all reference tests through the real runner and use the actual editor/Run proof UI. Attempts are exercise-attributed, not a single proof's automatic lesson completion. Educational sandbox proof is not tamper-proof certification.
