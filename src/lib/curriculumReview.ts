import type { Lesson } from "../data/types";
export const REVIEW_WINDOW_DAYS = 90;
/** Month-grain reviews use the first of the month, a conservative, deterministic warning boundary. */
export function reviewAgeDays(lesson: Pick<Lesson, "reviewed">, now: Date): number | null {
  if (!lesson.reviewed || !/^\d{4}-(0[1-9]|1[0-2])$/.test(lesson.reviewed)) return null;
  const reviewed = Date.parse(`${lesson.reviewed}-01T00:00:00Z`);
  return Math.floor((now.getTime() - reviewed) / 86_400_000);
}
export function needsToolReview(lesson: Pick<Lesson, "reviewed" | "toolDependent">, now: Date): boolean {
  if (!lesson.toolDependent) return false;
  const age = reviewAgeDays(lesson, now);
  return age === null || age > REVIEW_WINDOW_DAYS;
}

export type StaleReview = {
  trackId: string;
  lessonId: string;
  reviewed: string | undefined;
  ageDays: number | null;
};

/** Every tool-dependent lesson whose review is missing or outside the window. */
export function staleReviews(
  tracks: { id: string; lessons: Pick<Lesson, "id" | "reviewed" | "toolDependent">[] }[],
  now: Date
): StaleReview[] {
  const out: StaleReview[] = [];
  for (const t of tracks)
    for (const l of t.lessons)
      if (needsToolReview(l, now))
        out.push({ trackId: t.id, lessonId: l.id, reviewed: l.reviewed, ageDays: reviewAgeDays(l, now) });
  return out;
}

/** GitHub Actions workflow command. A warning annotation never fails the job. */
export function reviewWarningLine(s: StaleReview): string {
  const why =
    s.ageDays === null
      ? "has no valid reviewed month"
      : `last reviewed ${s.reviewed}, ${s.ageDays} days ago`;
  return `::warning title=Tool-dependent lesson review overdue::${s.trackId}/${s.lessonId} ${why} (window ${REVIEW_WINDOW_DAYS} days)`;
}
