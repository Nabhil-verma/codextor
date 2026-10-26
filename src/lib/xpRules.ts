/**
 * The XP rules the backend enforces.
 *
 * This module is deliberately dependency-free: Convex functions cannot bundle
 * the curriculum registry (`src/data`), so the level curve and the ceilings
 * live here and `src/lib/gamification.ts` imports them, keeping one curve for
 * the client and the server. Only the two numbers that describe how big the
 * curriculum is come from the generated `./curriculum`.
 *
 * The client recomputes XP locally and pushes it, which is convenient but also
 * means any client can push anything. Everything below exists to bound what a
 * forged payload can claim, not to verify it: client-side grading means
 * `progress.save` scores can still be forged, and the real fix is
 * server-verified grading (out of scope).
 */
import { TOTAL_LESSONS } from "./curriculum.generated";

/** 250 XP ≈ 4 lessons — one level. */
export const XP_PER_LEVEL = 250;

/** XP for one lesson: base 50, +25 for a flawless (100%) quiz. */
export const LESSON_XP_BASE = 50;
export const LESSON_XP_FLAWLESS_BONUS = 25;
export const MAX_XP_PER_LESSON = LESSON_XP_BASE + LESSON_XP_FLAWLESS_BONUS;

/** Daily quest bonuses and the consistency bonus scale with lessons done. */
export const BONUS_XP_PER_LESSON = 40;
/** Milestone and quest bonuses that don't scale with volume. */
export const BONUS_XP_FLAT = 2_000;

/** Ceiling on XP gained per hour of wall-clock time. */
export const MAX_XP_PER_HOUR = 2_000;
/**
 * Slack on top of the hourly ceiling for a device that was offline and is now
 * merging days of progress into an account another device just updated. Worth
 * logging before it is trusted, but without it the hourly cap would punish
 * exactly the multi-device behaviour the app encourages.
 */
export const MERGE_GRACE_XP = 3_000;
/** Sync pushes accepted per user per minute. */
export const MAX_SYNCS_PER_MINUTE = 20;

export const MAX_ASCENSION = 999;

export function levelForXp(xp: number): number {
  return Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1;
}

export function maxBonusXp(lessonsDone: number): number {
  return lessonsDone * BONUS_XP_PER_LESSON + BONUS_XP_FLAT;
}

export function maxXpFor(lessonsDone: number): number {
  const lessons = Math.min(Math.max(0, Math.floor(lessonsDone)), TOTAL_LESSONS);
  return lessons * MAX_XP_PER_LESSON + maxBonusXp(lessons);
}

export type ClampInput = {
  xp: number;
  xpWeek: number;
  xpMonth: number;
  level: number;
  lessonsDone: number;
  streakCurrent: number;
  streakLongest: number;
  /** Whole days since the account was created. */
  accountAgeDays: number;
  /** The stored card, when one exists — the baseline for the hourly gain cap. */
  previous?: { xp: number; xpWeek: number; xpMonth: number; updatedAt: number };
  now: number;
};

export type ClampResult = {
  xp: number;
  xpWeek: number;
  xpMonth: number;
  level: number;
  lessonsDone: number;
  streakCurrent: number;
  streakLongest: number;
  /** Codes for every ceiling that was hit, e.g. "xp>curriculum". */
  reasons: string[];
};

/**
 * Clamps a pushed card to what the curriculum can plausibly have produced.
 * Never rejects: a legitimate multi-device merge that looks odd is bounded,
 * not dropped, so a learner never loses progress to a false positive.
 */
export function clampProfile(input: ClampInput): ClampResult {
  const reasons: string[] = [];
  const clamp = (value: number, max: number, code: string) => {
    if (value > max) {
      reasons.push(code);
      return max;
    }
    return value;
  };

  const lessonsDone = clamp(input.lessonsDone, TOTAL_LESSONS, "lessons>total");

  let xp = clamp(input.xp, maxXpFor(lessonsDone), "xp>curriculum");

  // An account can't out-earn the clock: XP is bounded by the time since the
  // previous sync. At least a minute is assumed so two pushes in the same
  // millisecond don't divide by zero.
  if (input.previous) {
    const elapsedHours = Math.max((input.now - input.previous.updatedAt) / 3_600_000, 1 / 60);
    const ceiling =
      input.previous.xp + MERGE_GRACE_XP + Math.ceil(MAX_XP_PER_HOUR * elapsedHours);
    xp = clamp(xp, ceiling, "xp>hourly-gain");
  }

  let xpMonth = clamp(input.xpMonth, xp, "xpMonth>xp");
  let xpWeek = clamp(input.xpWeek, xpMonth, "xpWeek>xpMonth");
  xpMonth = Math.max(0, xpMonth);
  xpWeek = Math.max(0, xpWeek);

  const curveMax = Math.min(levelForXp(xp), MAX_ASCENSION);
  const level = clamp(input.level, curveMax, "level>curve");

  // A streak can't be longer than the account has existed.
  const maxStreak = Math.max(1, Math.floor(input.accountAgeDays) + 1);
  const streakCurrent = clamp(input.streakCurrent, maxStreak, "streak>account-age");
  const streakLongest = Math.max(input.streakLongest, streakCurrent);

  return {
    xp,
    xpWeek,
    xpMonth,
    level,
    lessonsDone,
    streakCurrent,
    streakLongest,
    reasons,
  };
}
