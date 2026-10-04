import { useState } from "react";
import { motion } from "framer-motion";
import { runUserCode } from "../lib/runner";
import { gradeProofRun } from "../lib/labGrade";

/* ═══════════════════════════════════════════════════════════════
   The milestone ProofRunner (Fix 8, §8.3): a test-of-the-test.

   The claim's proof is graded by *execution*, not attestation: the
   learner submits the agent's draft, their test, and their fix. The
   runner executes draft + test and expects a failure, then fix +
   test and expects success — through the same sandbox as every other
   exercise. Both sides verified → 1.0; one side → 0.5 recorded and
   the artifact stays incomplete.

   Honest limits, stated in the UI: the agent session itself is
   unobservable, the note is self-authored, and a minimal repro is
   portfolio evidence — not trustless proof.
   ═══════════════════════════════════════════════════════════════ */

type Proof = { buggy: string; test: string; fixed: string };

type Verdict = {
  buggyFailed: boolean;
  fixedPassed: boolean;
  score: number;
  /** the draft's failure message, shown so a typo isn't mistaken for a proof */
  buggyError: string | null;
};

type Props = {
  proof: Proof;
  /** Fires after every run with the dual-run score (0 / 0.5 / 1). */
  onScore?: (score: number) => void;
};

export default function ProofRunner({ proof, onScore }: Props) {
  const [running, setRunning] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);

  const run = async () => {
    if (running) return;
    setRunning(true);
    try {
      const buggyRun = await runUserCode(proof.buggy + "\n\n" + proof.test);
      const fixedRun = await runUserCode(proof.fixed + "\n\n" + proof.test);
      const buggyFailed = buggyRun.error !== null;
      const fixedPassed = fixedRun.error === null;
      const score = gradeProofRun(buggyFailed, fixedPassed);
      setVerdict({ buggyFailed, fixedPassed, score, buggyError: buggyRun.error });
      onScore?.(score);
    } finally {
      setRunning(false);
    }
  };

  const ready =
    proof.buggy.trim().length > 0 &&
    proof.test.trim().length > 0 &&
    proof.fixed.trim().length > 0;

  return (
    <div className="rounded-2xl border border-paper-200 bg-paper-50/50 p-5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-gold-600">
        ⚖ proof runner — the test of the test
      </p>
      <p className="mt-1 text-sm text-ink-600">
        Your test must <strong className="text-ink-800">fail on the agent's draft</strong> and{" "}
        <strong className="text-ink-800">pass on your fix</strong>. Fill the three
        fields in the form above, then run both sides here.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={!ready || running}
          className="btn-primary !px-5 !py-2 text-sm disabled:opacity-50"
        >
          {running ? "running both sides…" : "Run the proof"}
        </button>
        {!ready && (
          <span className="font-mono text-[11px] text-ink-500">
            draft + test + fix are all required
          </span>
        )}
      </div>

      {verdict && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 space-y-2"
        >
          <div
            className={
              "rounded-xl border px-4 py-3 text-sm " +
              (verdict.buggyFailed
                ? "border-gold-400/50 bg-gold-400/5 text-ink-800"
                : "border-red-300 bg-red-50 text-red-700")
            }
          >
            {verdict.buggyFailed ? "✓" : "✗"} draft + test —{" "}
            {verdict.buggyFailed ? "failed, as a proof requires" : "did not fail"}
            {verdict.buggyError && (
              <span className="mt-1 block font-mono text-[11px] text-ink-500">
                {verdict.buggyError.split("\n")[0]}
              </span>
            )}
          </div>
          <div
            className={
              "rounded-xl border px-4 py-3 text-sm " +
              (verdict.fixedPassed
                ? "border-gold-400/50 bg-gold-400/5 text-ink-800"
                : "border-red-300 bg-red-50 text-red-700")
            }
          >
            {verdict.fixedPassed ? "✓" : "✗"} fix + test —{" "}
            {verdict.fixedPassed ? "passed" : "still failing"}
          </div>
          <p
            className={
              "font-mono text-xs " +
              (verdict.score >= 1 ? "text-gold-600" : "text-ink-600")
            }
          >
            {verdict.score >= 1
              ? "dual run verified — this proof counts."
              : verdict.score > 0
                ? "partial: 0.5 recorded — a proof needs both sides."
                : "0 recorded — the test does not distinguish draft from fix yet."}
          </p>
        </motion.div>
      )}
    </div>
  );
}
