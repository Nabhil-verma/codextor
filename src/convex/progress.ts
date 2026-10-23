import { REVIEW_BANK, REVIEW_BANK_VERSION, publicReviewItem } from "./reviewerBank";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { MIN_ATTEMPT_MS_PER_ITEM, plausibilityIssues, reviewerMetrics, type ExerciseAttempt } from "../lib/reviewerCertificate";

/**
 * One shipped milestone: the day it was claimed, what was ticked off, and —
 * Fix 8 — the optional artifact (note + proof test) the claim carries. Kept in
 * sync with `src/lib/milestones.ts`.
 */
type MilestoneArtifacts = {
  task: string;
  note: string;
  noteCategory: string;
  proof: { buggy: string; test: string; fixed: string };
};
type Claim = {
  at: string;
  deliverables: number[];
  artifacts?: MilestoneArtifacts;
};
type Claims = Record<string, Claim>;

/**
 * The taxonomy codes a note may carry, mirrored from
 * `src/data/bug-taxonomy.ts` (the Convex bundle should not depend on data
 * modules). A code absent from this list drops the artifact, not the claim.
 */
const REVIEW_CODES = ["RC", "EC", "HA", "ID", "SL", "CX", "SC", "TG", "NM", "DL"];
const MAX_ARTIFACT_NOTE = 4_000;
const MAX_ARTIFACT_CODE = 4_000;
const MAX_ARTIFACT_TASK = 300;

/*
 * A signed-in client is still a trust boundary: `data` and `claims` arrive as
 * `v.any()`, so both maps are capped before they can be stored. Real maps are
 * ~86 lesson keys and 6 milestones, so these ceilings are only ever hit by a
 * bug or a hostile client — and they stop one row from growing unbounded.
 */
const MAX_PROGRESS_ENTRIES = 2_000;
const MAX_CLAIMS = 64;
const MAX_ATTEMPTS = 2_000;
const MAX_KEY_LENGTH = 120;

/**
 * One lesson's aggregated attempt record. The client owns the first-attempt
 * score (it is the only side that sees attempts in order); the server's job is
 * to keep the *earliest* first, the *highest* best and the *largest* count, so
 * a second device can only ever add information — never rewind it. `at` is the
 * latest attempt (freshness); `firstAt` is the earliest, and only `firstAt`
 * may decide whose `first` wins.
 */
type AttemptAgg = {
  first: number;
  best: number;
  attempts: number;
  at: number;
  firstAt: number;
};
type Attempts = Record<string, AttemptAgg>;

/**
 * The Fix 8 artifact, validated: strings capped, the category must be a real
 * taxonomy code, and a structurally broken artifact is dropped while the
 * claim itself survives (it just reads as pre-patch).
 */
function sanitizeArtifacts(raw: unknown): MilestoneArtifacts | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const { task, note, noteCategory, proof } = raw as Record<string, unknown>;
  if (typeof task !== "string" || typeof note !== "string") return undefined;
  if (typeof noteCategory !== "string" || !REVIEW_CODES.includes(noteCategory)) {
    return undefined;
  }
  if (!proof || typeof proof !== "object") return undefined;
  const { buggy, test, fixed } = proof as Record<string, unknown>;
  const code = (v: unknown): string | null =>
    typeof v === "string" && v.trim().length > 0 ? v.slice(0, MAX_ARTIFACT_CODE) : null;
  const b = code(buggy);
  const t = code(test);
  const f = code(fixed);
  if (!b || !t || !f) return undefined;
  const n = note.slice(0, MAX_ARTIFACT_NOTE);
  if (n.trim().length === 0) return undefined;
  return {
    task: task.slice(0, MAX_ARTIFACT_TASK),
    note: n,
    noteCategory,
    proof: { buggy: b, test: t, fixed: f },
  };
}

/**
 * Claims, validated the way `sanitize` validates scores: a malformed client
 * must not be able to store junk that breaks every later merge. The date is
 * normalised to a day key, the deliverables to a sorted set of integers, and
 * the artifact (when present) through `sanitizeArtifacts`.
 */
function sanitizeClaims(raw: unknown): Claims {
  const out: Claims = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (Object.keys(out).length >= MAX_CLAIMS) break;
    if (id.length > MAX_KEY_LENGTH) continue;
    if (!value || typeof value !== "object") continue;
    const { at, deliverables, artifacts } = value as {
      at?: unknown;
      deliverables?: unknown;
      artifacts?: unknown;
    };
    if (typeof at !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(at)) continue;
    if (!Array.isArray(deliverables)) continue;
    const ticks = [
      ...new Set(
        deliverables
          .map((n) => (typeof n === "number" ? n : Number(n)))
          .filter((n) => Number.isInteger(n) && n >= 0)
      ),
    ].sort((a, b) => a - b);
    if (ticks.length === 0) continue;
    const clean = sanitizeArtifacts(artifacts);
    out[id] = clean
      ? { at, deliverables: ticks, artifacts: clean }
      : { at, deliverables: ticks };
  }
  return out;
}

/**
 * Union of two claim logs, matching `mergeClaims` in `src/lib/milestones.ts`
 * exactly: more ticked deliverables wins; ties go to the claim carrying
 * artifacts (Fix 8's resubmission rule); if both (or neither) carry artifacts,
 * the earlier date wins. A deterministic total order, commutative and
 * associative, so a push and a pull converging from either side land on the
 * same log.
 */
function mergeClaims(a: Claims, b: Claims): Claims {
  const out: Claims = { ...a };
  for (const [id, claim] of Object.entries(b)) {
    const mine = out[id];
    if (!mine) {
      out[id] = claim;
      continue;
    }
    const claimTicks = claim.deliverables.length;
    const mineTicks = mine.deliverables.length;
    if (claimTicks > mineTicks) {
      out[id] = claim;
    } else if (claimTicks === mineTicks) {
      const claimHasArtifacts = Boolean(claim.artifacts);
      const mineHasArtifacts = Boolean(mine.artifacts);
      if (claimHasArtifacts !== mineHasArtifacts) {
        if (claimHasArtifacts) out[id] = claim;
      } else if (claim.at < mine.at) {
        out[id] = claim;
      }
    }
  }
  return out;
}

/**
 * Attempts arrive as `v.any()`, so they get the same treatment as scores: a
 * malformed entry is dropped, values are clamped to 0..1, counts are coerced
 * to non-negative integers, and the whole map is capped.
 */
function sanitizeAttempts(raw: unknown): Attempts {
  const out: Attempts = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (Object.keys(out).length >= MAX_ATTEMPTS) break;
    if (key.length === 0 || key.length > MAX_KEY_LENGTH) continue;
    if (!value || typeof value !== "object") continue;
    const { first, best, attempts, at, firstAt } = value as Record<string, unknown>;
    const f = typeof first === "number" ? first : Number(first);
    const b = typeof best === "number" ? best : Number(best);
    const n = typeof attempts === "number" ? attempts : Number(attempts);
    const t = typeof at === "number" ? at : Number(at);
    const fa = typeof firstAt === "number" ? firstAt : Number(firstAt);
    if (!Number.isFinite(f) || !Number.isFinite(b)) continue;
    if (!Number.isFinite(n) || n < 1) continue;
    const last = Number.isFinite(t) ? t : 0;
    out[key] = {
      first: Math.min(1, Math.max(0, f)),
      best: Math.min(1, Math.max(0, b)),
      attempts: Math.min(100_000, Math.floor(n)),
      at: last,
      // Legacy rows only carried `at`; falling back keeps them mergeable.
      firstAt: Number.isFinite(fa) ? fa : last,
    };
  }
  return out;
}

/**
 * Union of two attempt maps. `first` keeps the value from the record whose
 * **first attempt** (`firstAt`) is earlier — the genuinely first attempt wins,
 * whichever device saw it. `best` takes the max, `attempts` the max, `at` and
 * `firstAt` the max/min. Commutative and idempotent in both copies, exactly
 * like the score and claim merges.
 */
function mergeAttempts(a: Attempts, b: Attempts): Attempts {
  const out: Attempts = { ...a };
  for (const [key, next] of Object.entries(b)) {
    const mine = out[key];
    if (!mine) {
      out[key] = next;
      continue;
    }
    // `first` is decided by the earliest *first* attempt, never by `at`
    // (the latest): the latest says when a device went quiet, not who
    // attempted first, and using it biases the pilot's catch rate upward.
    const firstWins = next.firstAt < mine.firstAt ? next.first : mine.first;
    out[key] = {
      first: firstWins,
      best: Math.max(mine.best, next.best),
      attempts: Math.max(mine.attempts, next.attempts),
      at: Math.max(mine.at, next.at),
      firstAt: Math.min(mine.firstAt, next.firstAt),
    };
  }
  return out;
}

/**
 * Progress is a flat `"${track}/${lesson}!${YYYY-MM-DD}" -> 0..1` map. Every
 * value is coerced to a finite number in [0,1] before it touches the database:
 * `Math.max` against a non-number yields NaN, which would then poison the whole
 * map for every future read and merge.
 */
function sanitize(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (Object.keys(out).length >= MAX_PROGRESS_ENTRIES) break;
    if (key.length > MAX_KEY_LENGTH) continue;
    const n = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(n)) out[key] = Math.min(1, Math.max(0, n));
  }
  return out;
}

/** Load the signed-in user's saved progress map, or null when signed out. */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const row = await ctx.db
      .query("progress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    return sanitize(row?.data);
  },
});

/**
 * Upsert the signed-in user's progress map. Merges with whatever is already
 * stored (best score per key wins) so a second device never erases the first.
 */
export const save = mutation({
  args: { data: v.any() },
  handler: async (ctx, { data }) => {
    const userId = await getAuthUserId(ctx);
    // Signed out (e.g. a debounced push that lands after sign-out): drop it.
    // Progress stays local, and there is no account to merge into.
    if (!userId) return;
    const incoming = sanitize(data);
    const row = await ctx.db
      .query("progress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (row) {
      const merged = sanitize(row.data);
      for (const [key, score] of Object.entries(incoming)) {
        merged[key] = Math.max(merged[key] ?? 0, score);
      }
      await ctx.db.patch(row._id, { data: merged, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("progress", {
        userId,
        data: incoming,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Load the signed-in user's milestone claims, or null when signed out.
 * Kept beside `get` rather than folded into it so the two maps keep their own
 * merge rules (best score per key vs. best claim per milestone).
 */
export const getClaims = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const row = await ctx.db
      .query("progress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    return sanitizeClaims(row?.claims);
  },
});

/**
 * Upsert the signed-in user's milestone claims, merged with whatever is
 * already stored so shipping on a second device never erases the first.
 */
export const saveClaims = mutation({
  args: { claims: v.any() },
  handler: async (ctx, { claims }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const incoming = sanitizeClaims(claims);
    if (Object.keys(incoming).length === 0) return;
    const row = await ctx.db
      .query("progress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (row) {
      await ctx.db.patch(row._id, {
        claims: mergeClaims(sanitizeClaims(row.claims), incoming),
        updatedAt: Date.now(),
      });
    } else {
      // A learner can claim a milestone before any lesson score has synced,
      // so the row has to be created here too — with an empty score map.
      await ctx.db.insert("progress", {
        userId,
        data: {},
        claims: incoming,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Load the signed-in user's attempt aggregates, or null when signed out.
 * Kept beside `get`/`getClaims` so each map keeps its own merge rule.
 */
export const getAttempts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const row = await ctx.db
      .query("progress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    return sanitizeAttempts(row?.attempts);
  },
});

/**
 * Upsert attempt aggregates, merged with whatever is stored so a second
 * device's history is folded in rather than overwritten.
 */
export const saveAttempts = mutation({
  args: { attempts: v.any() },
  handler: async (ctx, { attempts }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const incoming = sanitizeAttempts(attempts);
    if (Object.keys(incoming).length === 0) return;
    const row = await ctx.db
      .query("progress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (row) {
      await ctx.db.patch(row._id, {
        attempts: mergeAttempts(sanitizeAttempts(row.attempts), incoming),
        updatedAt: Date.now(),
      });
    } else {
      // Attempts can land before any score or claim has synced.
      await ctx.db.insert("progress", {
        userId,
        data: {},
        attempts: incoming,
        updatedAt: Date.now(),
      });
    }
  },
});

/** Wipe the signed-in user's cloud progress (local reset is client-side). */
export const wipe = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const row = await ctx.db
      .query("progress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (row) await ctx.db.delete(row._id);
    const attempts = await ctx.db.query("unseenAttempts").withIndex("by_user", q => q.eq("userId", userId)).take(101);
    for (const attempt of attempts) await ctx.db.delete(attempt._id);
    const certificate = await ctx.db.query("reviewerCertificates").withIndex("by_user", q => q.eq("userId", userId)).unique();
    if (certificate) await ctx.db.delete(certificate._id);
  },
});

/* Server-assigned, server-graded reviewer assessment. Client submits choices only. */
export const startUnseenExercise = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("sign in to earn a certificate");
    const rows = await ctx.db.query("unseenAttempts").withIndex("by_user", q => q.eq("userId", userId)).take(101);
    const active = rows.find(r => r.bankVersion === REVIEW_BANK_VERSION && r.finishedAt === undefined);
    if (active) return { attemptId: active._id, seenBefore: active.seenBefore, item: publicReviewItem(active.exerciseId, active.itemIndex ?? 0), minReadMs: MIN_ATTEMPT_MS_PER_ITEM };
    if (rows.length >= 100) throw new Error("Assessment history limit reached; reset progress to clear it.");
    const exercise = REVIEW_BANK.find(e => !rows.some(r => r.exerciseId === e.id)) ?? REVIEW_BANK[0];
    const seenBefore = rows.some(r => r.exerciseId === exercise.id);
    const now = Date.now();
    const attemptId = await ctx.db.insert("unseenAttempts", {
      userId, exerciseId: exercise.id, bankVersion: REVIEW_BANK_VERSION, seenBefore,
      startedAt: now, shownAt: now, itemIndex: 0, decisions: [],
    });
    return { attemptId, seenBefore, item: publicReviewItem(exercise.id, 0), minReadMs: MIN_ATTEMPT_MS_PER_ITEM };
  },
});

export const finishUnseenExercise = mutation({
  args: { attemptId: v.id("unseenAttempts"), itemIndex: v.number(), answer: v.number() },
  handler: async (ctx, { attemptId, itemIndex, answer }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("sign in to earn a certificate");
    const row = await ctx.db.get(attemptId);
    if (!row || row.userId !== userId) throw new Error("not your attempt");
    if (row.finishedAt !== undefined) throw new Error("attempt already finished");
    const exercise = REVIEW_BANK.find(e => e.id === row.exerciseId);
    if (!exercise || row.bankVersion !== REVIEW_BANK_VERSION) throw new Error("assessment version expired; start a new assessment");
    if (itemIndex !== row.itemIndex) throw new Error("stale assessment item");
    const item = exercise.items[itemIndex];
    if (!item || !Number.isInteger(answer) || answer < 0 || answer >= item.options.length) throw new Error("invalid answer");
    const now = Date.now();
    const shownAt = row.shownAt ?? row.startedAt;
    if (now - shownAt < MIN_ATTEMPT_MS_PER_ITEM) throw new Error("Read the item before submitting; minimum 20 seconds per item.");
    const decisions = [...(row.decisions ?? []), { correct: answer === item.answer, shownAtMs: shownAt, decidedAtMs: now }];
    if (decisions.length !== itemIndex + 1) throw new Error("invalid assessment history");
    if (itemIndex + 1 < exercise.items.length) {
      await ctx.db.patch(attemptId, { decisions, itemIndex: itemIndex + 1, shownAt: now });
      return { done: false as const, item: publicReviewItem(row.exerciseId, itemIndex + 1), minReadMs: MIN_ATTEMPT_MS_PER_ITEM };
    }
    const metrics = reviewerMetrics(decisions);
    const attempt: ExerciseAttempt = { exerciseId: row.exerciseId, seenBefore: row.seenBefore, score: metrics.accuracy, startedAtMs: row.startedAt, finishedAtMs: now, decisions };
    const issues = plausibilityIssues(attempt);
    const accepted = issues.length === 0;
    await ctx.db.patch(attemptId, { finishedAt: now, score: metrics.accuracy, decisions, accepted, issues });
    let certificate = await ctx.db.query("reviewerCertificates").withIndex("by_user", q => q.eq("userId", userId)).unique();
    if (!certificate && accepted && !row.seenBefore && metrics.accuracy >= 0.8) {
      const id = await ctx.db.insert("reviewerCertificates", { userId, attemptId, bankVersion: REVIEW_BANK_VERSION, issuedAt: now, score: metrics.accuracy });
      certificate = await ctx.db.get(id);
    }
    return { done: true as const, accepted, issues, metrics, score: metrics.accuracy, certificate: certificate ? { id: certificate._id, issuedAt: certificate.issuedAt, score: certificate.score } : null };
  },
});

export const reviewerStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const rows = await ctx.db.query("unseenAttempts").withIndex("by_user", q => q.eq("userId", userId)).take(101);
    const certificate = await ctx.db.query("reviewerCertificates").withIndex("by_user", q => q.eq("userId", userId)).unique();
    const graded = rows.filter(r => r.bankVersion === REVIEW_BANK_VERSION && r.finishedAt !== undefined);
    const decisions = graded.flatMap(r => r.decisions ?? []);
    let defects = 0, caught = 0, clean = 0, falseAlarms = 0;
    const byCode: Record<string, { defects: number; caught: number; clean: number; falseAlarms: number; times: number[] }> = {};
    for (const row of graded) {
      const exercise = REVIEW_BANK.find(e => e.id === row.exerciseId);
      for (const [i, d] of (row.decisions ?? []).entries()) {
        const item = exercise?.items[i];
        if (!item) continue;
        const group = byCode[item.category] ??= { defects: 0, caught: 0, clean: 0, falseAlarms: 0, times: [] };
        group.times.push(Math.max(0, d.decidedAtMs - d.shownAtMs));
        if (item.defective) { defects++; group.defects++; if (d.correct) { caught++; group.caught++; } }
        else { clean++; group.clean++; if (!d.correct) { falseAlarms++; group.falseAlarms++; } }
      }
    }
    return {
      metrics: { ...reviewerMetrics(decisions), catchRate: defects ? caught / defects : null, falseAlarmRate: clean ? falseAlarms / clean : null },
      certificate: certificate ? { id: certificate._id, issuedAt: certificate.issuedAt, score: certificate.score } : null,
      byCode: Object.entries(byCode).map(([code, g]) => ({ code, count: g.times.length,
        catchRate: g.defects ? g.caught / g.defects : null,
        falseAlarmRate: g.clean ? g.falseAlarms / g.clean : null,
        meanDecisionMs: g.times.reduce((a, b) => a + b, 0) / g.times.length,
      })),
      attempts: graded.length,
    };
  },
});
