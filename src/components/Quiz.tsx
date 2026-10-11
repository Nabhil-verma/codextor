import { useLayoutEffect, useRef, useState } from "react";
import type { QuizQuestion } from "../data/types";
import { useShuffledOptions } from "../lib/shuffle";

type Props = {
  questions: QuizQuestion[];
  onScore: (score: number) => void;
  /** Random source for the option order. Injected by tests; defaults to Math.random. */
  rng?: () => number;
};

export default function Quiz({ questions, onScore, rng }: Props) {
  /*
   * Selections are stored as AUTHORED option indices. Each question's view maps
   * what is shown back through its `order`, so scoring, and anything persisted
   * later, stays in the authored space the data and the review keys use.
   */
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [round, setRound] = useState(0);

  const allAnswered = questions.every((_, i) => answers[i] !== undefined);
  const score = questions.filter((q, i) => answers[i] === q.answer).length / questions.length;

  const submit = () => {
    setSubmitted(true);
    onScore(score);
  };

  const retry = () => {
    setAnswers({});
    setSubmitted(false);
    setRound((r) => r + 1);
  };

  return (
    <div className="card p-7">
      <h3 className="eyebrow">Quiz — prove it</h3>
      <div className="mt-5 space-y-8">
        {questions.map((q, qi) => (
          <fieldset key={qi}>
            <legend className="mb-3 font-display text-lg font-medium text-ink-950">
              {qi + 1}. {q.q}
            </legend>
            <QuizChoices
              q={q}
              qi={qi}
              round={round}
              chosen={answers[qi]}
              submitted={submitted}
              onPick={(oi) => setAnswers((a) => ({ ...a, [qi]: oi }))}
              rng={rng}
            />
            {submitted && (
              <p className="mt-2.5 text-sm leading-relaxed text-ink-600">
                {q.explanation}
              </p>
            )}
          </fieldset>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        {!submitted ? (
          <button
            onClick={submit}
            disabled={!allAnswered}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            Check answers
          </button>
        ) : (
          <>
            <span
              role="status"
              className={
                "font-mono text-sm font-bold " +
                (score === 1 ? "text-gold-600" : "text-ink-600")
              }
            >
              Score: {questions.filter((q, i) => answers[i] === q.answer).length}/
              {questions.length}
              {score === 1 ? " — flawless." : " — review and retry"}
            </span>
            <button onClick={retry} className="btn-ghost !px-4 !py-1.5 text-sm">
              Retry
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * One question's options in their shuffled order. `chosen` and `onPick` speak
 * authored indices; only the rendering is in displayed order, and the letters
 * A–D name displayed positions.
 */
function QuizChoices({
  q,
  qi,
  round,
  chosen,
  submitted,
  onPick,
  rng,
}: {
  q: QuizQuestion;
  qi: number;
  round: number;
  chosen: number | undefined;
  submitted: boolean;
  onPick: (authoredIndex: number) => void;
  rng?: () => number;
}) {
  const { view, reshuffle } = useShuffledOptions(q.options, q.answer, rng);

  // Retry re-rolls the order. It runs only when the round changes, so the
  // first render of a question is never reshuffled; the layout effect redraws
  // before paint, so the learner never sees the stale order.
  const seenRound = useRef(round);
  useLayoutEffect(() => {
    if (seenRound.current === round) return;
    seenRound.current = round;
    reshuffle();
  }, [round, reshuffle]);

  return (
    <div className="grid gap-2">
      {view.options.map((opt, oi) => {
        const authored = view.order[oi];
        const isChosen = chosen === authored;
        const isCorrect = submitted && authored === q.answer;
        const isWrongPick = submitted && isChosen && authored !== q.answer;
        return (
          <label
            key={authored}
            className={
              "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 text-sm transition " +
              (isCorrect
                ? "border-gold-400 bg-gold-400/10 text-ink-950"
                : isWrongPick
                  ? "border-red-400 bg-red-50 text-red-700"
                  : isChosen
                    ? "border-ink-950 bg-paper-100 text-ink-950"
                    : "border-paper-200 text-ink-700 hover:border-gold-400/60 hover:bg-paper-100")
            }
          >
            <input
              type="radio"
              name={"q" + qi}
              className="accent-gold-500"
              checked={isChosen}
              disabled={submitted}
              onChange={() => onPick(authored)}
            />
            <span className="font-mono text-xs text-gold-600">
              {String.fromCharCode(65 + oi)}
            </span>
            {opt}
          </label>
        );
      })}
    </div>
  );
}
