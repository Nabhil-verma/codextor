import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Nav from "../components/Nav";
import { PageFade, Reveal } from "../components/motion";
import LivePreview from "../components/LivePreview";
import Playground from "../components/Playground";
import ProofRunner from "../components/ProofRunner";
import { useProgressState } from "../lib/progress";
import { todayKey } from "../lib/gamification";
import {
  MILESTONES,
  PORTFOLIO_PROJECT,
  PORTFOLIO_XP,
  allMilestoneStatus,
  artifactRubric,
  milestonesClaimed,
} from "../lib/milestones";
import { claimMilestone, useClaims } from "../lib/milestoneStore";
import { evaluateRubric } from "../lib/labGrade";
import { recordAttempt } from "../lib/telemetry";
import { REVIEW_CODES, taxonomyEntry, type TaxonomyCode } from "../data/bug-taxonomy";

/* ═══════════════════════════════════════════════════════════════
   The project board. Every milestone shows what to build, which
   lessons unlock it, the functional components to tick off, and —
   where it's verifiable — a real sandbox that grades the work.
   Since Fix 8 (Wave 3) each claim also carries an artifact: a note
   on what the agent got wrong and the proof test that demonstrated
   it, graded by the rubric and ProofRunner respectively.
   ═══════════════════════════════════════════════════════════════ */

const ARTIFACT_CODE_FIELD =
  "block w-full resize-y rounded-xl border border-paper-200 bg-paper-50/70 p-3 font-mono text-[12.5px] leading-relaxed text-ink-900 outline-hidden transition focus:border-gold-400";

export default function Projects() {
  const progress = useProgressState();
  const claims = useClaims();
  const statuses = useMemo(
    () => allMilestoneStatus(progress, claims),
    [progress, claims]
  );

  const claimedCount = milestonesClaimed(claims);
  const pct = Math.round((claimedCount / MILESTONES.length) * 100);
  const xpEarned = statuses
    .filter((s) => s.claimed)
    .reduce((sum, s) => sum + s.milestone.xp, 0);

  return (
    <div className="min-h-screen">
      <Nav />
      <PageFade>
        <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="eyebrow">The project</p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink-950 sm:text-5xl">
              {PORTFOLIO_PROJECT.title}
            </h1>
            <p className="mt-4 max-w-2xl text-ink-600">{PORTFOLIO_PROJECT.blurb}</p>
            <p className="mt-2 font-mono text-xs text-gold-600">
              {PORTFOLIO_PROJECT.repoHint}
            </p>
          </motion.div>

          {/* Progress rail */}
          <Reveal className="mt-10">
            <div className="glass glass-edge rounded-2xl border border-paper-200/60 p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p className="font-display text-lg font-semibold text-ink-950">
                  {claimedCount} of {MILESTONES.length} milestones shipped
                </p>
                <p className="font-mono text-xs text-ink-600">
                  <span className="gradient-text font-bold">{xpEarned}</span> /{" "}
                  {PORTFOLIO_XP} XP
                </p>
              </div>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-paper-200">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-300"
                  initial={{ width: 0 }}
                  animate={{ width: pct + "%" }}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <ol className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {statuses.map((s) => (
                  <li key={s.milestone.id} className="flex items-center gap-2">
                    <span
                      className={
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] " +
                        (s.claimed
                          ? "border-gold-400 bg-gold-400/20 text-gold-700"
                          : s.unlocked
                            ? "border-ink-300 text-ink-700"
                            : "border-paper-300 text-ink-400")
                      }
                    >
                      {s.claimed ? "✓" : s.milestone.icon}
                    </span>
                    <span className="truncate font-mono text-[11px] text-ink-600">
                      {s.milestone.phase.split("·")[0].trim()}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>

          {/* How it works */}
          <Reveal className="mt-6">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  n: "1",
                  t: "Unlock it with lessons",
                  d: "Each milestone is gated behind the lessons that teach the skill — not the quiz alone.",
                },
                {
                  n: "2",
                  t: "Build the components",
                  d: "Tick off the functional pieces once they genuinely work in your project.",
                },
                {
                  n: "3",
                  t: "Verify and claim",
                  d: "Pass the sandbox where one exists, then claim the XP and the badge.",
                },
              ].map((s) => (
                <div
                  key={s.n}
                  className="rounded-2xl border border-paper-200/60 bg-paper-50/60 p-5"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-950 font-mono text-xs font-bold text-gold-400">
                    {s.n}
                  </span>
                  <p className="mt-3 font-display text-sm font-semibold text-ink-950">
                    {s.t}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-600">{s.d}</p>
                </div>
              ))}
            </div>
          </Reveal>

          {/* Milestones */}
          <div className="mt-12 space-y-8">
            {statuses.map((status, i) => (
              <MilestoneCard key={status.milestone.id} status={status} index={i} />
            ))}
          </div>

          <p className="mt-12 text-center text-sm text-ink-600">
            Finished the project?{" "}
            <Link to="/portfolio" className="text-gold-600 hover:text-gold-500">
              See it on your profile →
            </Link>
          </p>
        </main>
      </PageFade>
    </div>
  );
}

/* ------------------------------ One card ------------------------------ */

function MilestoneCard({
  status,
  index,
}: {
  status: ReturnType<typeof allMilestoneStatus>[number];
  index: number;
}) {
  const {
    milestone: m,
    unlocked,
    claimed,
    claimedAt,
    missingSkills,
    missingKeys,
    hasArtifacts,
    legacyClaim,
  } = status;
  const [ticked, setTicked] = useState<number[]>(claimed ? m.deliverables.map((_, i) => i) : []);
  const [proofPassed, setProofPassed] = useState(false);

  /* Fix 8's artifact: the note (rubric-graded) and the proof test (dual-run). */
  const [note, setNote] = useState("");
  const [category, setCategory] = useState<TaxonomyCode | "">("");
  const [draft, setDraft] = useState("");
  const [proofTest, setProofTest] = useState("");
  const [fixed, setFixed] = useState("");
  const [attested, setAttested] = useState(false);
  const [proofScore, setProofScore] = useState<number | null>(null);

  const allTicked = ticked.length === m.deliverables.length;
  const proofDone = !m.proof || proofPassed;
  const rubric = category ? artifactRubric(m, category) : null;
  const rubricResult =
    rubric && note.trim()
      ? evaluateRubric(rubric, note, { defensible: attested })
      : null;
  const noteReady = (rubricResult?.score ?? 0) >= 1;
  const artifactReady = noteReady && proofScore === 1;
  // A fresh claim needs the artifact; a pre-patch claim can resubmit one.
  const canClaim =
    unlocked &&
    allTicked &&
    artifactReady &&
    (claimed ? !hasArtifacts : proofDone);

  const toggle = (i: number) =>
    setTicked((t) => (t.includes(i) ? t.filter((x) => x !== i) : [...t, i]));

  const claim = () => {
    if (!canClaim || category === "") return;
    claimMilestone(m.id, ticked, todayKey(), {
      task: m.artifact.task,
      note,
      noteCategory: category,
      proof: { buggy: draft, test: proofTest, fixed },
    });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay: Math.min(index * 0.06, 0.24), ease: [0.22, 1, 0.36, 1] }}
      className={
        "glass glass-edge overflow-hidden rounded-2xl border transition-colors duration-300 " +
        (claimed
          ? "border-gold-400/70"
          : unlocked
            ? "border-paper-200/60"
            : "border-paper-200/40")
      }
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-paper-200/60 px-6 py-5">
        <div className="flex items-start gap-4">
          <span
            className={
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-mono text-lg " +
              (claimed
                ? "bg-gold-400/20 text-gold-700"
                : unlocked
                  ? "bg-ink-950 text-gold-400"
                  : "bg-paper-200 text-ink-500")
            }
          >
            {claimed ? "✓" : unlocked ? m.icon : "🔒"}
          </span>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-500">
              {m.phase}
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold text-ink-950">
              {m.title}
            </h2>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-600">
              {m.brief}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="rounded-full border border-gold-400/50 bg-gold-400/10 px-3 py-1 font-mono text-xs font-bold text-gold-700">
            +{m.xp} XP
          </span>
          {claimed ? (
            <span className="font-mono text-[10px] text-gold-600">
              shipped {claimedAt ?? ""}
            </span>
          ) : (
            <span className="font-mono text-[10px] text-ink-500">
              {status.skillsDone}/{status.skillsTotal} skills
            </span>
          )}
        </div>
      </div>

      {/* Locked: show exactly what's standing in the way */}
      {!unlocked && (
        <div className="px-6 py-5">
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink-500">
            unlocks after these lessons
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {m.skills.map((key) => {
              const [trackId, lessonId] = key.split("/");
              const done = !missingKeys.includes(key);
              return (
                <Link
                  key={key}
                  to={"/learn/" + trackId + "/" + lessonId}
                  className={
                    "rounded-full border px-3 py-1.5 font-mono text-[11px] transition " +
                    (done
                      ? "border-gold-400/50 bg-gold-400/10 text-gold-700"
                      : "border-paper-200 text-ink-600 hover:border-gold-400 hover:text-gold-600")
                  }
                >
                  {done ? "✓" : "○"} {lessonId} →
                </Link>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-ink-500">
            {missingSkills.length} lesson{missingSkills.length === 1 ? "" : "s"} still
            needed: {missingSkills.slice(0, 3).join(", ")}
            {missingSkills.length > 3 ? "…" : ""}
          </p>
        </div>
      )}

      {unlocked && (
        <>
          {/* Deliverables */}
          <div className="px-6 py-5">
            <p className="font-mono text-[11px] uppercase tracking-widest text-ink-500">
              functional components · {ticked.length}/{m.deliverables.length}
            </p>
            <ul className="mt-3 space-y-2">
              {m.deliverables.map((d, i) => {
                const on = ticked.includes(i);
                return (
                  <li key={d}>
                    <button
                      type="button"
                      disabled={claimed}
                      onClick={() => toggle(i)}
                      aria-pressed={on}
                      className={
                        "flex w-full items-start gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition " +
                        (on
                          ? "border-gold-400/60 bg-gold-400/10 text-ink-800"
                          : "border-paper-200 text-ink-700 hover:border-gold-400/50 hover:bg-paper-50") +
                        (claimed ? " cursor-default opacity-80" : "")
                      }
                    >
                      <span
                        className={
                          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border font-mono text-[10px] " +
                          (on
                            ? "border-gold-500 bg-gold-400 text-ink-950"
                            : "border-paper-300 text-transparent")
                        }
                      >
                        ✓
                      </span>
                      <span>{d}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Functional proof */}
          {m.proof && !claimed && (
            <div className="px-6 pb-5">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-ink-500">
                prove it works
              </p>
              <p className="mb-4 max-w-2xl text-sm text-ink-600">{m.proof.brief}</p>
              {m.proof.kind === "preview" ? (
                <LivePreview spec={m.proof.spec} onPass={() => setProofPassed(true)} />
              ) : (
                <Playground
                  starter={m.proof.starter}
                  check={m.proof.check}
                  onPass={() => setProofPassed(true)}
                />
              )}
            </div>
          )}

          {/* Portfolio artifact — the agent loop (Fix 8) */}
          {!claimed || legacyClaim ? (
            <div className="border-t border-paper-200/60 px-6 py-5">
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-mono text-[11px] uppercase tracking-widest text-ink-500">
                  portfolio artifact · the agent loop
                </p>
                {legacyClaim ? (
                  <span className="rounded-full border border-gold-400/50 bg-gold-400/10 px-2.5 py-0.5 font-mono text-[10px] text-gold-700">
                    pre-patch claim — resubmit with an artifact
                  </span>
                ) : (
                  <span className="rounded-full border border-paper-200 px-2.5 py-0.5 font-mono text-[10px] text-ink-500">
                    required for new claims
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm text-ink-700">
                <strong className="font-semibold text-ink-900">Delegate:</strong>{" "}
                {m.artifact.task}
              </p>
              <p className="mt-1 text-xs text-ink-500">
                The note must name {m.artifact.noteMust}. The proof test should
                catch {m.artifact.testCatches}.
              </p>

              <label className="mt-4 block">
                <span className="font-mono text-[10px] uppercase tracking-widest text-ink-500">
                  the note — what the agent got wrong
                </span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={5}
                  aria-label="The note: what the agent got wrong"
                  placeholder="Describe the failure concretely — what broke, and on which input."
                  className="mt-1.5 block w-full resize-y rounded-xl border border-paper-200 bg-paper-50/70 p-4 text-sm leading-relaxed text-ink-900 outline-hidden transition focus:border-gold-400"
                />
              </label>

              <label className="mt-3 block max-w-sm">
                <span className="font-mono text-[10px] uppercase tracking-widest text-ink-500">
                  the category it belongs to
                </span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TaxonomyCode | "")}
                  className="mt-1.5 block w-full rounded-xl border border-paper-200 bg-paper-50 px-3 py-2 font-mono text-xs text-ink-900 outline-hidden focus:border-gold-400"
                >
                  <option value="">choose a category…</option>
                  {REVIEW_CODES.map((code) => (
                    <option key={code} value={code}>
                      {code} · {taxonomyEntry(code).label}
                    </option>
                  ))}
                </select>
              </label>

              {rubricResult && (
                <ul className="mt-3 space-y-1.5">
                  {rubricResult.results.map((r) => (
                    <li key={r.id} className="flex items-start gap-2 text-xs">
                      {r.auto ? (
                        <span
                          className={
                            "mt-0.5 font-mono " + (r.met ? "text-gold-600" : "text-red-500")
                          }
                        >
                          {r.met ? "✓" : "✗"}
                        </span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={attested}
                          onChange={() => setAttested((v) => !v)}
                          className="mt-0.5 accent-gold-500"
                          aria-label={r.label}
                        />
                      )}
                      <span className={r.met ? "text-ink-700" : "text-ink-500"}>
                        {r.label}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-ink-500">
                the proof test — draft · test · fix
              </p>
              <div className="mt-2 space-y-3">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={4}
                  aria-label="The agent's draft — a minimal repro"
                  placeholder="// the agent's draft, reduced to the failing part"
                  className={ARTIFACT_CODE_FIELD}
                />
                <textarea
                  value={proofTest}
                  onChange={(e) => setProofTest(e.target.value)}
                  rows={4}
                  aria-label="Your test — it must throw on the draft"
                  placeholder="// your test: throw when the draft behaves wrong"
                  className={ARTIFACT_CODE_FIELD}
                />
                <textarea
                  value={fixed}
                  onChange={(e) => setFixed(e.target.value)}
                  rows={4}
                  aria-label="Your fix — the same test must pass"
                  placeholder="// your fix: the same test now passes"
                  className={ARTIFACT_CODE_FIELD}
                />
              </div>
              <div className="mt-3">
                <ProofRunner
                  proof={{ buggy: draft, test: proofTest, fixed }}
                  onScore={(score) => {
                    setProofScore(score);
                    recordAttempt({
                      key: "project/" + m.id,
                      element: "proof",
                      score,
                      day: todayKey(),
                    });
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="border-t border-paper-200/60 px-6 py-4">
              <p className="font-mono text-[11px] text-ink-500">
                artifact attached — it renders as a judgment card on your{" "}
                <Link to="/portfolio" className="text-gold-600 hover:text-gold-500">
                  profile
                </Link>
                .
              </p>
            </div>
          )}

          {/* Claim */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-paper-200/60 bg-paper-50/50 px-6 py-4">
            <p className="font-mono text-[11px] text-ink-500">
              {claimed
                ? hasArtifacts
                  ? "claimed — this one is on your record"
                  : "pre-patch claim — add the artifact to complete it"
                : !allTicked
                  ? `tick all ${m.deliverables.length} components to claim`
                  : !proofDone
                    ? "pass the sandbox above to claim"
                    : !artifactReady
                      ? "run the proof and pass the note checks to claim"
                      : "everything checks out"}
            </p>
            <AnimatePresence>
              {claimed && hasArtifacts ? (
                <span className="flex items-center gap-2 font-mono text-xs text-gold-600">
                  <span className="text-lg">🏅</span> {m.badge.title}
                </span>
              ) : (
                <motion.button
                  type="button"
                  onClick={claim}
                  disabled={!canClaim}
                  whileTap={canClaim ? { scale: 0.97 } : undefined}
                  className={
                    canClaim
                      ? "btn-gold !px-5 !py-2 text-sm"
                      : "rounded-full border border-paper-200 px-5 py-2 font-mono text-xs text-ink-400"
                  }
                >
                  {claimed ? "Submit artifact" : `Claim ${m.xp} XP`}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </motion.section>
  );
}
