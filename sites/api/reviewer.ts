/*
 * The server-graded reviewer assessment.
 *
 * Answers never come from the client: the client submits a choice, the server
 * holds the key, the timing and the plausibility checks. Only a passing first
 * exposure issues the reviewer certificate, and that is decided here.
 */
import type { Ctx } from "./context";
import { requireUser } from "./context";
import { REVIEW_BANK, REVIEW_BANK_VERSION, publicReviewItem } from "./reviewerBank";
import {
  MIN_ATTEMPT_MS_PER_ITEM,
  plausibilityIssues,
  reviewerMetrics,
  type ExerciseAttempt,
} from "../../src/lib/reviewerCertificate";

const MAX_ATTEMPTS = 100;

type AttemptRow = {
  id: string;
  exercise_id: string;
  seen_before: number;
  started_at: number;
  finished_at: number | null;
  score: number | null;
  bank_version: number;
  item_index: number;
  shown_at: number | null;
  decisions: string;
  accepted: number | null;
  issues: string | null;
};

type Decision = { correct: boolean; shownAtMs: number; decidedAtMs: number };

function parseDecisions(raw: string): Decision[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (d): d is Decision =>
        typeof d === "object" &&
        d !== null &&
        typeof (d as Decision).correct === "boolean" &&
        typeof (d as Decision).shownAtMs === "number" &&
        typeof (d as Decision).decidedAtMs === "number",
    );
  } catch {
    return [];
  }
}

async function attemptsFor(ctx: Ctx, userId: string): Promise<AttemptRow[]> {
  return ctx.db.all<AttemptRow>(
    `SELECT id, exercise_id, seen_before, started_at, finished_at, score, bank_version,
            item_index, shown_at, decisions, accepted, issues
       FROM unseen_attempts WHERE user_id = ? ORDER BY started_at ASC LIMIT ?`,
    [userId, MAX_ATTEMPTS + 1],
  );
}

async function certificateFor(ctx: Ctx, userId: string) {
  const row = await ctx.db.first<{ id: string; issued_at: number; score: number }>(
    "SELECT id, issued_at, score FROM reviewer_certificates WHERE user_id = ?",
    [userId],
  );
  return row ? { id: row.id, issuedAt: row.issued_at, score: row.score } : null;
}

/** Start — or resume — the hidden assessment. */
export async function startUnseenExercise(ctx: Ctx) {
  const userId = requireUser(ctx);
  const rows = await attemptsFor(ctx, userId);
  const active = rows.find((r) => r.bank_version === REVIEW_BANK_VERSION && r.finished_at === null);
  if (active) {
    return {
      attemptId: active.id,
      seenBefore: active.seen_before === 1,
      item: publicReviewItem(active.exercise_id, active.item_index),
      minReadMs: MIN_ATTEMPT_MS_PER_ITEM,
    };
  }
  if (rows.length >= MAX_ATTEMPTS) {
    throw new Error("Assessment history limit reached; reset progress to clear it.");
  }

  const exercise =
    REVIEW_BANK.find((e) => !rows.some((r) => r.exercise_id === e.id)) ?? REVIEW_BANK[0];
  const seenBefore = rows.some((r) => r.exercise_id === exercise.id);
  const now = Date.now();
  const attemptId = crypto.randomUUID();

  await ctx.db.run(
    `INSERT INTO unseen_attempts
       (id, user_id, exercise_id, seen_before, started_at, finished_at, score, bank_version,
        item_index, shown_at, decisions, accepted, issues)
     VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, 0, ?, '[]', NULL, NULL)`,
    [attemptId, userId, exercise.id, seenBefore ? 1 : 0, now, REVIEW_BANK_VERSION, now],
  );

  return {
    attemptId,
    seenBefore,
    item: publicReviewItem(exercise.id, 0),
    minReadMs: MIN_ATTEMPT_MS_PER_ITEM,
  };
}

/** Grade one item; the last item finishes the attempt and may issue the badge. */
export async function finishUnseenExercise(
  ctx: Ctx,
  args: { attemptId?: unknown; itemIndex?: unknown; answer?: unknown },
) {
  const userId = requireUser(ctx);
  // Scoped to the caller: an attempt id from another account finds nothing.
  const owned = await ctx.db.first<AttemptRow>(
    `SELECT id, exercise_id, seen_before, started_at, finished_at, score, bank_version,
            item_index, shown_at, decisions, accepted, issues
       FROM unseen_attempts WHERE id = ? AND user_id = ?`,
    [String(args?.attemptId ?? ""), userId],
  );
  if (!owned) {
    const exists = await ctx.db.first<{ user_id: string }>(
      "SELECT user_id FROM unseen_attempts WHERE id = ?",
      [String(args?.attemptId ?? "")],
    );
    throw new Error(exists ? "Not your attempt." : "That assessment could not be found.");
  }
  if (owned.finished_at !== null) throw new Error("This attempt is already finished.");

  const exercise = REVIEW_BANK.find((e) => e.id === owned.exercise_id);
  if (!exercise || owned.bank_version !== REVIEW_BANK_VERSION) {
    throw new Error("This assessment version expired; start a new assessment.");
  }

  const itemIndex = Number(args?.itemIndex);
  const answer = Number(args?.answer);
  if (itemIndex !== owned.item_index) throw new Error("That question is out of date; reload.");
  const item = exercise.items[itemIndex];
  if (!item || !Number.isInteger(answer) || answer < 0 || answer >= item.options.length) {
    throw new Error("That answer is not one of the options.");
  }

  const now = Date.now();
  const shownAt = owned.shown_at ?? owned.started_at;
  if (now - shownAt < MIN_ATTEMPT_MS_PER_ITEM) {
    throw new Error("Read the item before submitting; minimum 20 seconds per item.");
  }

  const decisions = [
    ...parseDecisions(owned.decisions),
    { correct: answer === item.answer, shownAtMs: shownAt, decidedAtMs: now },
  ];
  if (decisions.length !== itemIndex + 1) throw new Error("Invalid assessment history.");

  if (itemIndex + 1 < exercise.items.length) {
    await ctx.db.run(
      "UPDATE unseen_attempts SET decisions = ?, item_index = ?, shown_at = ? WHERE id = ?",
      [JSON.stringify(decisions), itemIndex + 1, now, owned.id],
    );
    return {
      done: false as const,
      item: publicReviewItem(owned.exercise_id, itemIndex + 1),
      minReadMs: MIN_ATTEMPT_MS_PER_ITEM,
    };
  }

  const metrics = reviewerMetrics(decisions);
  const attempt: ExerciseAttempt = {
    exerciseId: owned.exercise_id,
    seenBefore: owned.seen_before === 1,
    score: metrics.accuracy,
    startedAtMs: owned.started_at,
    finishedAtMs: now,
    decisions,
  };
  const issues = plausibilityIssues(attempt);
  const accepted = issues.length === 0;

  await ctx.db.run(
    `UPDATE unseen_attempts
        SET finished_at = ?, score = ?, decisions = ?, accepted = ?, issues = ?
      WHERE id = ?`,
    [now, metrics.accuracy, JSON.stringify(decisions), accepted ? 1 : 0, JSON.stringify(issues), owned.id],
  );

  let certificate = await certificateFor(ctx, userId);
  if (!certificate && accepted && owned.seen_before === 0 && metrics.accuracy >= 0.8) {
    const id = crypto.randomUUID();
    await ctx.db.run(
      `INSERT INTO reviewer_certificates (id, user_id, attempt_id, bank_version, issued_at, score)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, userId, owned.id, REVIEW_BANK_VERSION, now, metrics.accuracy],
    );
    certificate = { id, issuedAt: now, score: metrics.accuracy };
  }

  return {
    done: true as const,
    accepted,
    issues,
    metrics,
    score: metrics.accuracy,
    certificate,
  };
}

/** The caller's assessment history, per-code evidence and any badge. */
export async function reviewerStatus(ctx: Ctx) {
  if (!ctx.userId) return null;
  const rows = await attemptsFor(ctx, ctx.userId);
  const graded = rows.filter((r) => r.bank_version === REVIEW_BANK_VERSION && r.finished_at !== null);
  const decisions = graded.flatMap((r) => parseDecisions(r.decisions));

  let defects = 0;
  let caught = 0;
  let clean = 0;
  let falseAlarms = 0;
  const byCode: Record<
    string,
    { defects: number; caught: number; clean: number; falseAlarms: number; times: number[] }
  > = {};

  for (const row of graded) {
    const exercise = REVIEW_BANK.find((e) => e.id === row.exercise_id);
    for (const [i, decision] of parseDecisions(row.decisions).entries()) {
      const item = exercise?.items[i];
      if (!item) continue;
      const group = (byCode[item.category] ??= {
        defects: 0,
        caught: 0,
        clean: 0,
        falseAlarms: 0,
        times: [],
      });
      group.times.push(Math.max(0, decision.decidedAtMs - decision.shownAtMs));
      if (item.defective) {
        defects++;
        group.defects++;
        if (decision.correct) {
          caught++;
          group.caught++;
        }
      } else {
        clean++;
        group.clean++;
        if (!decision.correct) {
          falseAlarms++;
          group.falseAlarms++;
        }
      }
    }
  }

  return {
    metrics: {
      ...reviewerMetrics(decisions),
      catchRate: defects ? caught / defects : null,
      falseAlarmRate: clean ? falseAlarms / clean : null,
    },
    certificate: await certificateFor(ctx, ctx.userId),
    byCode: Object.entries(byCode).map(([code, group]) => ({
      code,
      count: group.times.length,
      catchRate: group.defects ? group.caught / group.defects : null,
      falseAlarmRate: group.clean ? group.falseAlarms / group.clean : null,
      meanDecisionMs: group.times.reduce((a, b) => a + b, 0) / group.times.length,
    })),
    attempts: graded.length,
  };
}
