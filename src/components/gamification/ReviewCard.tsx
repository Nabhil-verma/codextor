import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { loadTrack } from "../../data/loadTrack";
import type { Lesson } from "../../data/types";
import { useProgressState } from "../../lib/progress";
import { useReviews, useReviewDays, addReviewItems, recordReviewAnswer } from "../../lib/reviewStore";
import {
  MAX_QUEUE,
  REVIEW_XP,
  dueItems,
  nextDueDay,
  reviewXp,
  shakyLessons,
  type ReviewItem,
  type ReviewSnapshot,
} from "../../lib/review";
import { queuedLessons, seededItems, shakyRefs } from "../../lib/reviewQueue";
import { todayKey } from "../../lib/gamification";
import { isAnswerIndex, useShuffledOptions } from "../../lib/shuffle";

/* ═══════════════════════════════════════════════════════════════
   Spaced review — the "Review 5" card.

   Five items a day, drawn from lessons the learner has opened and
   not aced. Right answers move an item up a Leitner box and pay a
   little XP (capped per day so the queue can't be farmed); wrong
   ones drop it back to tomorrow and flag the lesson as shaky.
   ═══════════════════════════════════════════════════════════════ */

type Feedback = { correct: boolean; xp: number; explanation?: string; prompt: string };

export default function ReviewCard() {
  const progress = useProgressState();
  const reviews = useReviews();
  const reviewDays = useReviewDays();
  const today = todayKey();

  const refs = useMemo(() => shakyRefs(progress), [progress]);
  const queued = useMemo(() => queuedLessons(reviews), [reviews]);
  const due = useMemo(() => dueItems(reviews, today), [reviews, today]);
  const shaky = useMemo(() => shakyLessons(reviews), [reviews]);
  const soonest = useMemo(() => nextDueDay(reviews, today), [reviews, today]);

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [open, setOpen] = useState(false);
  const seedRun = useRef<string>("");

  /*
   * Seed the queue from the shaky lessons. Lesson bodies are loaded a track at
   * a time (the same path the lesson route uses), and the whole effect is keyed
   * on the set of lessons still missing from the queue so it settles after one
   * pass instead of looping.
   */
  const missing = useMemo(
    () => refs.filter((r) => !queued.has(r.key)).slice(0, 12),
    [refs, queued],
  );
  const missingKey = missing.map((r) => r.key).join(",");

  useEffect(() => {
    if (!missingKey || seedRun.current === missingKey) return;
    seedRun.current = missingKey;
    let cancelled = false;
    void (async () => {
      const lessonsByTrack = new Map<string, Lesson[]>();
      for (const trackId of new Set(missing.map((r) => r.trackId))) {
        const track = await loadTrack(trackId);
        if (track) lessonsByTrack.set(trackId, track.lessons);
      }
      if (cancelled) return;
      addReviewItems(seededItems(missing, lessonsByTrack, today, Date.now()));
    })();
    return () => {
      cancelled = true;
    };
  }, [missingKey, missing, today]);

  const todayCount = reviewDays[today] ?? 0;
  const todayXp = reviewXp(todayCount);
  const current: ReviewItem | undefined = due[0];

  function answer(choice: number) {
    if (!current || feedback || current.snapshot === undefined) return;
    const correct = choice === current.snapshot.answer;
    const graded = recordReviewAnswer(current, correct, today);
    setFeedback({
      correct,
      xp: graded.xp,
      explanation: current.snapshot.explanation,
      prompt: current.snapshot.prompt,
    });
  }

  const queueSize = Object.keys(reviews).length;
  const cleared = open && !current && Boolean(feedback);

  return (
    <div className="glass glass-edge relative overflow-hidden rounded-2xl border border-paper-200/60">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper-200/60 px-5 py-4">
        <div>
          <p className="eyebrow">spaced review</p>
          <p className="mt-1 font-display text-lg font-semibold text-ink-950">
            {due.length > 0
              ? "Review " + Math.min(due.length, MAX_QUEUE) + " — " + due.length + " due"
              : queueSize > 0
                ? "Queue cleared — " + queueSize + " in the box"
                : "Nothing queued yet"}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm font-bold text-gold-600">
            {todayXp > 0 ? "+" + todayXp + " XP today" : REVIEW_XP + " XP per recall"}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-500">
            {todayCount > 0 ? todayCount + " recalled today" : "capped each day"}
          </p>
        </div>
      </div>

      <div className="px-5 py-4">
        {refs.length === 0 && queueSize === 0 && (
          <p className="text-sm text-ink-600">
            Review items are drawn from lessons you have opened and not aced. Finish a quiz —
            anything you miss lands here tomorrow.
          </p>
        )}

        {open && current?.snapshot && (
          <div aria-live="polite">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-500">
              {current.label} · box {current.box + 1}
            </p>
            <p className="mt-2 font-display text-base font-semibold text-ink-950">
              {current.snapshot.prompt}
            </p>
            <ul className="mt-3 grid gap-2">
              {isAnswerIndex(current.snapshot.answer, current.snapshot.options.length) ? (
                <ShuffledReviewOptions
                  key={current.id}
                  snapshot={current.snapshot}
                  disabled={Boolean(feedback)}
                  onPick={answer}
                />
              ) : (
                current.snapshot.options.map((option, i) => (
                  <ReviewOption
                    key={option + i}
                    option={option}
                    disabled={Boolean(feedback)}
                    onClick={() => answer(i)}
                  />
                ))
              )}
            </ul>
          </div>
        )}

        {feedback && (
          <div className="mt-3 rounded-lg border border-paper-200 bg-paper-50/60 px-3 py-2">
            <p className="font-mono text-xs font-bold text-ink-900">
              {feedback.correct ? "Correct" : "Not quite"} · {feedback.xp > 0 ? "+" + feedback.xp + " XP" : "no XP"}
            </p>
            {feedback.explanation && (
              <p className="mt-1 text-xs text-ink-600">{feedback.explanation}</p>
            )}
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="mt-2 font-mono text-[10px] uppercase tracking-widest text-gold-600 underline"
            >
              {due.length > 1 ? "next item" : "done"}
            </button>
          </div>
        )}

        {cleared && !current && (
          <p className="mt-3 text-sm text-ink-600">
            That's the queue for today.
            {soonest ? " Next items come back on " + soonest + "." : ""}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={due.length === 0 || Boolean(feedback)}
            onClick={() => setOpen(true)}
            className="rounded-full border border-gold-400/50 bg-gold-400/10 px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-widest text-gold-700 transition hover:bg-gold-400/20 disabled:opacity-50"
          >
            {open && current ? "continue" : "start review"}
          </button>
          {shaky.length > 0 && (
            <Link
              to={"/lesson/" + shaky[0].trackId + "/" + shaky[0].lessonId}
              className="font-mono text-[10px] uppercase tracking-widest text-ink-500 underline"
            >
              re-open {shaky[0].label}
            </Link>
          )}
          {queueSize > 0 && (
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-400">
              {shaky.length} shaky · {queueSize} queued
            </span>
          )}
        </div>

        {refs.length > 0 && (
          <p className="mt-3 text-xs text-ink-500">
            {refs.length} lesson{refs.length === 1 ? "" : "s"} below 100% feed this queue.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * The item's options in a shuffled order, redrawn per queue item (the key on
 * the call site). Picks are reported as authored indices, which is what the
 * stored snapshot's `answer` and the recall grading compare against.
 */
function ShuffledReviewOptions({
  snapshot,
  disabled,
  onPick,
}: {
  snapshot: ReviewSnapshot;
  disabled: boolean;
  onPick: (authoredIndex: number) => void;
}) {
  const { view } = useShuffledOptions(snapshot.options, snapshot.answer);
  return (
    <>
      {view.options.map((option, oi) => {
        const authored = view.order[oi];
        return (
          <ReviewOption
            key={authored}
            option={option}
            disabled={disabled}
            onClick={() => onPick(authored)}
          />
        );
      })}
    </>
  );
}

function ReviewOption({
  option,
  disabled,
  onClick,
}: {
  option: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="w-full rounded-lg border border-paper-200 px-3 py-2 text-left text-sm text-ink-800 transition hover:border-gold-400/60 hover:bg-gold-400/5 disabled:opacity-60"
      >
        {option}
      </button>
    </li>
  );
}
