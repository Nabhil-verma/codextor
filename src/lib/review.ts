import type { Attempt } from "./telemetry";

/*
 * Spaced review — the "Review 5" queue.
 *
 * A Leitner box per item: answer it right and it moves up a box and comes back
 * later; get it wrong and it drops to the first box and comes back tomorrow.
 * Everything here is pure, so the schedule, the merge rule and the weak-spot
 * map are testable without a browser or a backend.
 *
 * Items are keyed by a content hash of the question (or by the lesson, for a
 * re-fix), which is stable across releases without adding ids to every quiz in
 * the curriculum. If `QuizQuestion` ever grows an `id`, the key helper is the
 * one place to change.
 */

/** Days until an item in box N is due again. Box 0 is "just missed". */
export const REVIEW_INTERVALS = [1, 3, 7, 21, 60];

export const MAX_BOX = REVIEW_INTERVALS.length - 1;

/** The queue is a daily habit, not a backlog: five items a day, at most. */
export const MAX_QUEUE = 5;

/** Correct recall is worth a little; a wrong one is worth nothing. */
export const REVIEW_XP = 15;
/** Ceiling on review XP per day, so the queue can't be farmed. */
export const DAILY_REVIEW_XP_CAP = 60;

export type ReviewKind = "quiz" | "predict" | "refix" | "drill";

export type ReviewSnapshot = {
  prompt: string;
  options: string[];
  answer: number;
  explanation?: string;
};

export type ReviewItem = {
  id: string;
  kind: ReviewKind;
  trackId: string;
  lessonId: string;
  /** Short line shown in the queue, e.g. the lesson or question title. */
  label: string;
  /** 0 = just missed; each correct recall moves it up one. */
  box: number;
  /** `YYYY-MM-DD` it becomes due. */
  dueDay: string;
  /** epoch ms of the last review (or of the miss that created it). */
  lastAt: number;
  /** Enough to re-ask a quiz/predict question without loading a lesson body. */
  snapshot?: ReviewSnapshot;
  /** Debug challenge to re-fix, for `refix`/`drill` items. */
  debugId?: string;
  /** Taxonomy code, when the item came from a diagnosed break-and-fix lab. */
  code?: string;
  /** Set when the learner last got this wrong — the lesson is "shaky". */
  shaky?: boolean;
};

export type ReviewState = Record<string, ReviewItem>;

/* ------------------------------------------------------------------ */
/* Day keys                                                            */
/* ------------------------------------------------------------------ */

export function addDaysKey(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const ms = Date.UTC(y, (m ?? 1) - 1, d ?? 1) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

export function daysBetweenKeys(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round(
    (Date.UTC(ty, (tm ?? 1) - 1, td ?? 1) - Date.UTC(fy, (fm ?? 1) - 1, fd ?? 1)) / 86_400_000,
  );
}

/* ------------------------------------------------------------------ */
/* Stable item keys                                                    */
/* ------------------------------------------------------------------ */

/** FNV-1a, 32-bit — enough to key a queue by content. */
export function hashString(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** One quiz/predict question, keyed by its text so reordering can't break it. */
export function questionId(trackId: string, lessonId: string, prompt: string): string {
  return `q:${hashString(`${trackId}/${lessonId}/${prompt}`)}`;
}

/** The re-fix item for a lesson's break-and-fix lab. */
export function refixId(trackId: string, lessonId: string): string {
  return `x:${trackId}/${lessonId}`;
}

/* ------------------------------------------------------------------ */
/* Scheduling                                                          */
/* ------------------------------------------------------------------ */

export function dueDayFor(box: number, today: string): string {
  const interval = REVIEW_INTERVALS[Math.min(Math.max(0, Math.round(box)), MAX_BOX)];
  return addDaysKey(today, interval);
}

type NewItemInput = Omit<ReviewItem, "box" | "dueDay" | "lastAt" | "shaky"> & {
  /** A brand-new item is due tomorrow, not today. */
  dueToday?: string;
};

export function newReviewItem(input: NewItemInput, today: string, now: number): ReviewItem {
  return {
    ...input,
    box: 0,
    dueDay: addDaysKey(input.dueToday ?? today, REVIEW_INTERVALS[0]),
    lastAt: now,
  };
}

export type Grade = { item: ReviewItem; xp: number };

/** Right → up a box. Wrong → box 0, due tomorrow, lesson marked shaky. */
export function gradeReview(item: ReviewItem, correct: boolean, today: string, now: number): Grade {
  const box = correct ? Math.min(item.box + 1, MAX_BOX) : 0;
  return {
    item: {
      ...item,
      box,
      dueDay: dueDayFor(box, today),
      lastAt: now,
      shaky: !correct,
    },
    xp: correct ? REVIEW_XP : 0,
  };
}

/** Items due today or earlier, oldest first, capped at the daily queue size. */
export function dueItems(state: ReviewState, today: string, limit = MAX_QUEUE): ReviewItem[] {
  return Object.values(state)
    .filter((item) => daysBetweenKeys(item.dueDay, today) >= 0)
    .sort((a, b) => (a.dueDay === b.dueDay ? a.lastAt - b.lastAt : a.dueDay < b.dueDay ? -1 : 1))
    .slice(0, Math.max(0, limit));
}

/** Lessons the learner got wrong recently — the "shaky" shelf. */
export function shakyLessons(state: ReviewState): ReviewItem[] {
  return Object.values(state).filter((item) => item.shaky);
}

/* ------------------------------------------------------------------ */
/* XP                                                                  */
/* ------------------------------------------------------------------ */

/** Reviews are paid from the same thin wallet every day, and capped. */
export function reviewXp(correctToday: number): number {
  return Math.min(Math.max(0, correctToday) * REVIEW_XP, DAILY_REVIEW_XP_CAP);
}

/* ------------------------------------------------------------------ */
/* Merge                                                              */
/* ------------------------------------------------------------------ */

/**
 * Two devices, one queue: the higher box wins (progress is never thrown away)
 * and the later timestamp settles ties, so the merge is commutative.
 */
export function mergeReviews(local: ReviewState, remote: ReviewState): ReviewState {
  const out: ReviewState = { ...remote };
  for (const [id, mine] of Object.entries(local)) {
    const theirs = out[id];
    if (!theirs) {
      out[id] = mine;
      continue;
    }
    if (mine.box > theirs.box || (mine.box === theirs.box && mine.lastAt >= theirs.lastAt)) {
      out[id] = mine;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Weak spots                                                          */
/* ------------------------------------------------------------------ */

export type WeakSpot = {
  code: string;
  misses: number;
  trackId: string;
  lessonId: string;
  label: string;
};

/**
 * Aggregates misses by taxonomy code and points at a lesson to re-fix.
 * `codeOf` is looked up in the manifest (generated from each debug lab's
 * declared diagnosis), so nothing here needs a lesson body.
 */
export function weakSpots(
  attempts: Attempt[],
  codeOf: (trackId: string, lessonId: string) => string | undefined,
  labelOf: (trackId: string, lessonId: string) => string | undefined,
  limit = 3,
): WeakSpot[] {
  const counts = new Map<string, WeakSpot>();
  for (const attempt of attempts) {
    if (attempt.score >= 1) continue;
    const [trackId, lessonId] = attempt.key.split("/");
    if (!trackId || !lessonId) continue;
    const code = codeOf(trackId, lessonId);
    if (!code) continue;
    const existing = counts.get(code);
    if (existing) {
      existing.misses += 1;
      continue;
    }
    counts.set(code, {
      code,
      misses: 1,
      trackId,
      lessonId,
      label: labelOf(trackId, lessonId) ?? lessonId,
    });
  }
  return [...counts.values()]
    .sort((a, b) => b.misses - a.misses || a.code.localeCompare(b.code))
    .slice(0, Math.max(0, limit));
}

/** The queue is noise for someone who has not finished a lesson yet. */
export function reviewQueueVisible(completedLessons: number): boolean {
  return completedLessons > 0;
}
