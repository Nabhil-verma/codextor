import { MANIFEST_TRACKS } from "../data/manifest";
import type { Lesson } from "../data/types";
import { scoreFor, type Progress } from "./progress";
import { questionId, refixId, seedItem, type ReviewItem, type ReviewState } from "./review";

/*
 * Where the review queue comes from.
 *
 * The queue is not a separate chore the learner has to remember to feed: it is
 * built from the lessons they have already opened and not yet aced. A lesson
 * whose best score is below 100% and which has an attempt in the progress map
 * is "shaky", and the first question of its quiz (or its predict step) becomes
 * a review item — scheduled for the same day, so a session that just went badly
 * can be cleared in the same sitting.
 *
 * Pure by design: given a progress map and the loaded lesson bodies, it returns
 * items. Writing them is the store's job (`reviewStore.addReviewItems`).
 */

/** One shaky lesson, in curriculum order. */
export type QueueRef = {
  key: string; // `${trackId}/${lessonId}`
  trackId: string;
  lessonId: string;
  label: string;
};

/** Lessons that appear in the progress map at all, aced or not. */
export function attemptedLessons(progress: Progress): Set<string> {
  const seen = new Set<string>();
  for (const key of Object.keys(progress.completed)) {
    const lessonKey = key.split("!")[0];
    if (lessonKey.includes("/")) seen.add(lessonKey);
  }
  return seen;
}

/**
 * Lessons the learner has started and not aced, in curriculum order. Lessons
 * with neither a quiz nor a predict step have nothing to re-ask, so they never
 * enter the queue.
 */
export function shakyRefs(progress: Progress, limit = 40): QueueRef[] {
  const attempted = attemptedLessons(progress);
  const out: QueueRef[] = [];
  for (const track of MANIFEST_TRACKS) {
    for (const lesson of track.lessons) {
      if (out.length >= limit) return out;
      const key = track.id + "/" + lesson.id;
      if (!attempted.has(key)) continue;
      if (scoreFor(progress, key) >= 1) continue;
      if (lesson.quizCount === 0 && !lesson.hasPredict) continue;
      out.push({ key, trackId: track.id, lessonId: lesson.id, label: lesson.title });
    }
  }
  return out;
}

/** `track/lesson` keys already represented in the queue, whatever their box. */
export function queuedLessons(state: ReviewState): Set<string> {
  const seen = new Set<string>();
  for (const item of Object.values(state)) seen.add(item.trackId + "/" + item.lessonId);
  return seen;
}

/** The question a shaky lesson is reviewed on: its quiz, else its predict step. */
export function seededItems(
  refs: QueueRef[],
  lessonsByTrack: Map<string, Lesson[]>,
  today: string,
  now: number,
  limit = 20,
): ReviewItem[] {
  const out: ReviewItem[] = [];
  for (const ref of refs) {
    if (out.length >= limit) break;
    const lesson = lessonsByTrack.get(ref.trackId)?.find((l) => l.id === ref.lessonId);
    if (!lesson) continue;
    const quiz = lesson.quiz?.[0];
    if (quiz) {
      out.push(
        seedItem(
          {
            id: questionId(ref.trackId, ref.lessonId, quiz.q),
            kind: "quiz",
            trackId: ref.trackId,
            lessonId: ref.lessonId,
            label: ref.label,
            snapshot: {
              prompt: quiz.q,
              options: quiz.options,
              answer: quiz.answer,
              explanation: quiz.explanation,
            },
          },
          today,
          now,
        ),
      );
      continue;
    }
    const predict = lesson.predict?.[0];
    if (!predict) continue;
    out.push(
      seedItem(
        {
          id: questionId(ref.trackId, ref.lessonId, predict.prompt),
          kind: "predict",
          trackId: ref.trackId,
          lessonId: ref.lessonId,
          label: ref.label,
          snapshot: {
            prompt: predict.prompt,
            options: predict.options,
            answer: predict.answer,
            explanation: predict.explanation,
          },
        },
        today,
        now,
      ),
    );
  }
  return out;
}

/**
 * A break-and-fix lab the learner failed as a queue item. The lab is re-run in
 * the lesson, so the item carries the debug id rather than a question snapshot;
 * `refixId` keeps it stable and distinct from the lesson's quiz item.
 */
export function refixItem(ref: QueueRef, code: string | undefined, today: string, now: number): ReviewItem {
  return seedItem(
    {
      id: refixId(ref.trackId, ref.lessonId),
      kind: "refix",
      trackId: ref.trackId,
      lessonId: ref.lessonId,
      label: ref.label,
      code,
    },
    today,
    now,
  );
}
