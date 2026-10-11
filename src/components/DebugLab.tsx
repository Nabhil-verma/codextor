import { useId, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useReducedMotion,
} from "framer-motion";
import { runUserCode, evaluateCheck, type RunResult } from "../lib/runner";
import { taxonomyEntry, type TaxonomyCode } from "../data/bug-taxonomy";
import { summarizeRun } from "../lib/runSummary";
import type { DebugChallenge } from "../data/types";
import ErrorNote from "./ErrorNote";
import { TAB_HINT } from "../lib/useTabTrapEscape";
import { shuffleOrder } from "../lib/shuffle";
import CodeEditor from "./CodeEditor";

/* ═══════════════════════════════════════════════════════════════
   The break-and-fix lab. Unlike a quiz there are no options to
   eliminate — the learner edits the program and the fix is graded
   by executing it. A green run that prints the wrong thing still
   fails, which is exactly the lesson real debugging teaches.
   ═══════════════════════════════════════════════════════════════ */

type Props = {
  challenge: DebugChallenge;
  /** Fired the first time the repaired code passes. */
  onPass?: () => void;
  /**
   * Best score for this exercise, 0..1: 1.0 when the repair passes, 0.5 when
   * the diagnosis is right but the repair isn't finished. Partial credit is
   * recorded while the lesson stays incomplete until the fix passes.
   */
  onScore?: (score: number) => void;
  /** Hand-off to the AI tutor with the error and the hint tier already open. */
  onAskTutor?: (error: string, openHintTier?: number) => void;
};

export default function DebugLab({ challenge, onPass, onScore, onAskTutor }: Props) {
  const [code, setCode] = useState(challenge.broken);
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [passed, setPassed] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [diagPick, setDiagPick] = useState<TaxonomyCode | null>(null);
  const [diagResult, setDiagResult] = useState<"none" | "right" | "wrong">("none");
  const [announce, setAnnounce] = useState("");
  const hintId = useId();

  const shake = useAnimationControls();
  const pop = useAnimationControls();
  const reduceMotion = useReducedMotion();
  const passedOnce = useRef(false);

  const run = async () => {
    setRunning(true);
    const r = await runUserCode(code);
    setResult(r);
    setAnnounce(summarizeRun(r));
    setAttempts((a) => a + 1);
    const ok = !r.error && evaluateCheck(challenge.fixCheck, r.logs.join("\n"));
    setPassed(ok);
    if (ok) {
      // A working repair is full credit, whatever the diagnosis says.
      onScore?.(1);
      if (!reduceMotion) {
        void pop.start({
          scale: [1, 1.015, 1],
          transition: { duration: 0.35, ease: "easeOut" },
        });
      }
      if (!passedOnce.current) {
        passedOnce.current = true;
        onPass?.();
      }
    } else if (!reduceMotion) {
      void shake.start({
        x: [0, -9, 9, -6, 6, -2, 0],
        transition: { duration: 0.4 },
      });
    }
    if (!ok && diagResult === "right") onScore?.(0.5);
    setRunning(false);
  };

  const reset = () => {
    setCode(challenge.broken);
    setResult(null);
    setPassed(false);
    setAttempts(0);
    setRevealed(0);
    setShowSolution(false);
    setDiagPick(null);
    setDiagResult("none");
  };

  const checkDiagnosis = () => {
    if (!challenge.diagnosis || !diagPick) return;
    const right = diagPick === challenge.diagnosis.answer;
    setDiagResult(right ? "right" : "wrong");
    if (right && !passed) onScore?.(0.5);
  };

  const edited = code !== challenge.broken;
  const showHints = !passed && attempts >= 2;
  const allHintsShown = revealed >= challenge.hints.length;

  return (
    <motion.div
      animate={shake}
      className={
        "glass glass-edge overflow-hidden rounded-2xl border transition-colors duration-300 " +
        (passed ? "border-gold-400/70" : "border-paper-200/60")
      }
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-paper-200/60 px-5 py-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-red-500">
            🐛 debug lab
          </p>
          <h3 className="mt-1 font-display text-xl font-semibold text-ink-950">
            {challenge.title}
          </h3>
          <p className="mt-1 max-w-lg text-sm text-ink-600">{challenge.brief}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-paper-200 px-2.5 py-1 font-mono text-[10px] text-ink-500">
            {attempts} {attempts === 1 ? "run" : "runs"}
          </span>
          <button
            type="button"
            onClick={reset}
            className="rounded-full px-3 py-1 font-mono text-xs text-ink-600 transition hover:bg-paper-100 hover:text-ink-950"
          >
            reset
          </button>
          <button
            type="button"
            onClick={() => void run()}
            disabled={running}
            title="Cmd/Ctrl+Enter"
            className="rounded-full bg-gold-400 px-4 py-1 font-mono text-xs font-bold text-ink-950 transition hover:bg-gold-300 disabled:opacity-50"
          >
            {running ? "running…" : "▶ Run & verify"}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="code-window m-5">
        <div className="flex items-center justify-between border-b border-ink-800 px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
            <span className="ml-2 font-mono text-xs text-ink-600">
              buggy.js{edited ? " • edited" : ""}
            </span>
          </div>
          <span className="font-mono text-[11px] text-ink-600">
            {passed ? "fix verified" : "edit the code, then run it"}
          </span>
        </div>
        <CodeEditor
          value={code}
          onChange={setCode}
          onRun={() => void run()}
          label={`Code editor: ${challenge.title}`}
          describedBy={hintId}
          minRows={8}
          maxRows={26}
        />
      </div>

      {/* Console */}
      <div className="code-window mx-5">
        <div className="border-b border-ink-800 px-4 py-2.5 font-mono text-xs text-ink-600">
          console
        </div>
        <div
          role="log"
          aria-label="Console output"
          aria-live="off"
          className="max-h-60 overflow-auto p-5 font-mono text-[13px] leading-relaxed"
        >
          {!result && (
            <p className="text-ink-600">
              // run the program to see what it actually does — the bug is
              often not where you expect
            </p>
          )}
          {result?.error && (
            <ErrorNote
              raw={result.error}
              onAskTutor={
                onAskTutor
                  ? () =>
                      onAskTutor(
                        result.error!,
                        challenge.hints[revealed - 1]?.tier,
                      )
                  : undefined
              }
            />
          )}
          {result?.logs.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap text-paper-300">
              <span className="mr-2 select-none text-gold-500">›</span>
              {line}
            </div>
          ))}
          {result?.error && (
            <div className="mt-2 whitespace-pre-wrap text-red-400">
              ✗ {result.error}
            </div>
          )}
          {result && !result.error && result.logs.length === 0 && (
            <p className="text-ink-600">(no output — did you call console.log?)</p>
          )}
        </div>
      </div>

      <p id={hintId} className="px-5 pt-3 font-mono text-[11px] text-ink-500">
        {TAB_HINT}
      </p>
      <p role="status" className="sr-only">
        {announce}
      </p>

      {/* Verdict */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            role="status"
            key={passed ? "pass" : "fail"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={
              "mx-5 mt-4 rounded-2xl border px-5 py-4 text-sm " +
              (passed
                ? "border-gold-400/60 bg-gold-400/10 text-ink-800"
                : "border-red-300 bg-red-50 text-red-700")
            }
          >
            {passed ? (
              <span>
                <span className="mr-2 text-gold-600">✓</span>
                <strong className="font-semibold text-ink-950">
                  Bug squashed.
                </strong>{" "}
                {challenge.win}
              </span>
            ) : (
              <span>
                <strong className="font-semibold">
                  Not fixed yet.
                </strong>{" "}
                The program ran, but it still doesn't meet the brief. Compare the
                output above with what the brief asks for.
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Diagnosis — right answer earns 0.5 while the repair is unfinished */}
      {challenge.diagnosis && !passed && (
        <div className="mx-5 mt-4 rounded-2xl border border-paper-200 bg-paper-50/60 px-5 py-4">
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink-500">
            diagnosis — what kind of bug is it?
          </p>
          <p className="mt-1 text-sm text-ink-600">{challenge.diagnosis.prompt}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <DiagnosisOptions
              key={challenge.id}
              codes={challenge.diagnosis.codes}
              picked={diagPick}
              disabled={diagResult === "right"}
              onPick={setDiagPick}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={checkDiagnosis}
              disabled={!diagPick || diagResult === "right"}
              className="btn-ghost !px-4 !py-1.5 text-xs disabled:opacity-50"
            >
              {diagResult === "right" ? "diagnosed" : "Check diagnosis"}
            </button>
            {diagResult === "right" && (
              <span className="font-mono text-xs text-gold-600">
                ✓ right — 0.5 recorded. Now fix it for full credit.
              </span>
            )}
            {diagResult === "wrong" && (
              <span className="font-mono text-xs text-red-600">
                ✗ not this one — reread the output before committing to a category.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Hint ladder */}
      <div className="space-y-2 px-5 pb-5 pt-4">
        {challenge.hints.length > 0 && (
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink-500">
            hints ({revealed}/{challenge.hints.length})
          </p>
        )}
        <AnimatePresence initial={false}>
          {challenge.hints.slice(0, revealed).map((h, i) => (
            <motion.div
              key={h.tier}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="rounded-xl border border-gold-400/30 bg-gold-400/5 px-4 py-2.5 text-sm text-ink-700">
                <span className="mr-2 font-mono text-xs text-gold-600">
                  hint {i + 1}
                </span>
                {h.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {!passed && !showHints && (
          <p className="font-mono text-xs text-ink-500">
            stuck? run it a couple of times first — reading the real output
            usually beats guessing
          </p>
        )}

        {!passed && showHints && !allHintsShown && (
          <button
            type="button"
            onClick={() => setRevealed((r) => r + 1)}
            className="font-mono text-xs text-gold-600 hover:text-gold-500"
          >
            reveal next hint →
          </button>
        )}

        {/* Solution — deliberately the last resort */}
        {!passed && (
          <div className="pt-1">
            {!showSolution ? (
              <button
                type="button"
                onClick={() => setShowSolution(true)}
                className="rounded-full border border-red-300 px-4 py-1.5 font-mono text-xs text-red-600 transition hover:bg-red-50"
              >
                give up — show the bug
              </button>
            ) : (
              <div className="rounded-xl border border-green-300 bg-green-50 p-4">
                <p className="font-mono text-[11px] uppercase tracking-widest text-green-600">
                  the bug
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-ink-700">
                  {challenge.solution}
                </p>
                <p className="mt-2 text-xs text-ink-500">
                  Now fix it yourself and run it — seeing the answer isn't the
                  same as being able to write it.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * The diagnosis codes in a shuffled order, drawn once per challenge (the key on
 * the call site). Picks are codes, not positions, so scoring is unchanged.
 */
function DiagnosisOptions({
  codes,
  picked,
  disabled,
  onPick,
}: {
  codes: TaxonomyCode[];
  picked: TaxonomyCode | null;
  disabled: boolean;
  onPick: (code: TaxonomyCode) => void;
}) {
  const [order] = useState(() => shuffleOrder(codes));
  return (
    <>
      {order.map((i) => {
        const code = codes[i];
        const entry = taxonomyEntry(code);
        const on = picked === code;
        return (
          <button
            key={code}
            type="button"
            aria-pressed={on}
            disabled={disabled}
            onClick={() => onPick(code)}
            className={
              "rounded-xl border px-3.5 py-2 text-left text-sm transition disabled:opacity-60 " +
              (on
                ? "border-gold-400 bg-gold-400/10"
                : "border-paper-200 hover:border-gold-400/60 hover:bg-paper-100")
            }
          >
            <span className="font-mono text-xs font-bold text-gold-600">{code}</span>
            <span className="ml-2 text-ink-800">{entry.label}</span>
          </button>
        );
      })}
    </>
  );
}
