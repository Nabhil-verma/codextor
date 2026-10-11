import { createLocalStore, useLocalStore } from "./localStore";
import type { ReviewDays, ReviewItem, ReviewState } from "./review";
import { MAX_BOX, gradeReview, mergeReviews } from "./review";

/*
 * The review queue lives beside the other local-first stores and merges with
 * the account copy the same way progress does. The parser is strict: a
 * half-written entry (or a hand-edited one) is dropped rather than trusted,
 * because the box number drives everything else.
 */

function sanitizeItem(raw: unknown): ReviewItem | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Partial<ReviewItem>;
  if (typeof item.id !== "string" || typeof item.dueDay !== "string") return null;
  if (typeof item.trackId !== "string" || typeof item.lessonId !== "string") return null;
  const kind = item.kind;
  if (kind !== "quiz" && kind !== "predict" && kind !== "refix" && kind !== "drill") return null;
  const box = typeof item.box === "number" && Number.isFinite(item.box) ? Math.floor(item.box) : 0;
  const snapshot =
    item.snapshot && typeof item.snapshot.prompt === "string" && Array.isArray(item.snapshot.options)
      ? {
          prompt: item.snapshot.prompt,
          options: item.snapshot.options.filter((o): o is string => typeof o === "string"),
          answer: typeof item.snapshot.answer === "number" ? item.snapshot.answer : -1,
          explanation:
            typeof item.snapshot.explanation === "string" ? item.snapshot.explanation : undefined,
        }
      : undefined;
  return {
    id: item.id,
    kind,
    trackId: item.trackId,
    lessonId: item.lessonId,
    label: typeof item.label === "string" ? item.label : item.lessonId,
    box: Math.min(Math.max(0, box), MAX_BOX),
    dueDay: item.dueDay.slice(0, 10),
    lastAt: typeof item.lastAt === "number" && Number.isFinite(item.lastAt) ? item.lastAt : 0,
    snapshot,
    debugId: typeof item.debugId === "string" ? item.debugId : undefined,
    code: typeof item.code === "string" ? item.code : undefined,
    shaky: item.shaky === true,
  };
}

function parseReviews(raw: string | null): ReviewState {
  if (raw === null || raw === "") return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: ReviewState = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      const item = sanitizeItem(value);
      if (item) out[id] = item;
    }
    return out;
  } catch {
    return {};
  }
}

/** Bounded so one learner's queue cannot grow without limit. */
export const MAX_REVIEW_ITEMS = 200;

export const reviewStore = createLocalStore<ReviewState>("cl_codextor_reviews", parseReviews);

export function loadReviews(): ReviewState {
  return reviewStore.get();
}

export function saveReviews(state: ReviewState): void {
  const entries = Object.entries(state)
    .sort((a, b) => b[1].lastAt - a[1].lastAt)
    .slice(0, MAX_REVIEW_ITEMS);
  reviewStore.set(Object.fromEntries(entries));
}

/** Records (or refreshes) one item without clobbering a higher box. */
export function upsertReview(item: ReviewItem): void {
  const current = loadReviews();
  const existing = current[item.id];
  const next = existing && existing.box > item.box ? { ...item, box: existing.box } : item;
  saveReviews({ ...current, [item.id]: next });
}

/** Folds the account's copy into the local queue. */
export function mergeRemoteReviews(remote: ReviewState): void {
  const merged = mergeReviews(loadReviews(), remote);
  saveReviews(merged);
}

export function useReviews(): ReviewState {
  return useLocalStore(reviewStore);
}

/* ------------------------------------------------------------------ */
/* Day log                                                             */
/*                                                                     */
/* The daily cap on review XP is per calendar day, so the count of     */
/* correct recalls has to survive a reload — otherwise every visit     */
/* would pay the cap again. Same store contract as the queue: parse,   */
/* validate, ignore anything that is not a sane count.                 */
/* ------------------------------------------------------------------ */

/** Bounded: 400 days of history is more than any learner accumulates. */
export const MAX_REVIEW_DAYS = 400;

function parseDays(raw: string | null): ReviewDays {
  if (raw === null || raw === "") return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: ReviewDays = {};
    for (const [day, count] of Object.entries(parsed as Record<string, unknown>)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
      if (typeof count !== "number" || !Number.isFinite(count) || count <= 0) continue;
      out[day] = Math.floor(count);
    }
    return out;
  } catch {
    return {};
  }
}

export const reviewDayStore = createLocalStore<ReviewDays>("cl_codextor_review_days", parseDays);

export function loadReviewDays(): ReviewDays {
  return reviewDayStore.get();
}

export function saveReviewDays(days: ReviewDays): void {
  const kept = Object.entries(days)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, MAX_REVIEW_DAYS);
  reviewDayStore.set(Object.fromEntries(kept));
}

export function useReviewDays(): ReviewDays {
  return useLocalStore(reviewDayStore);
}

/** Adds one graded answer to today's tally; returns the lifetime review XP. */
export function logReviewAnswer(correct: boolean, today: string): void {
  if (!correct) return;
  const days = loadReviewDays();
  saveReviewDays({ ...days, [today]: (days[today] ?? 0) + 1 });
}

export type GradedReview = { xp: number; dueDay: string; box: number };

/**
 * The one path that mutates the queue: grade an answer, persist the new box,
 * and pay the XP. Everything else reads.
 */
export function recordReviewAnswer(
  item: ReviewItem,
  correct: boolean,
  today: string,
  now: number = Date.now(),
): GradedReview {
  const graded = gradeReview(item, correct, today, now);
  upsertReview(graded.item);
  logReviewAnswer(correct, today);
  return { xp: graded.xp, dueDay: graded.item.dueDay, box: graded.item.box };
}

/** Inserts seeded items without clobbering boxes already earned. */
export function addReviewItems(items: ReviewItem[]): void {
  if (items.length === 0) return;
  const current = loadReviews();
  const next = { ...current };
  let changed = false;
  for (const item of items) {
    // An item already on the queue keeps the box it earned (and its due day).
    if (next[item.id]) continue;
    next[item.id] = item;
    changed = true;
  }
  if (changed) saveReviews(next);
}
