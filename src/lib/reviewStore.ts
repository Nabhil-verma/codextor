import { createLocalStore, useLocalStore } from "./localStore";
import type { ReviewItem, ReviewState } from "./review";
import { MAX_BOX, mergeReviews } from "./review";

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
