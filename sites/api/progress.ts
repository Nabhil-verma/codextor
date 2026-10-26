/*
 * Per-account learning state: the score map, milestone claims and attempt
 * aggregates.
 *
 * All three are merged, never overwritten, so a second device can only add
 * information. A signed-in client is still a trust boundary, so every map is
 * capped and coerced before it touches the database.
 */
import type { Ctx, Db, Row } from "./context";
import { requireUser } from "./context";
import { mergeClaims, type Claims } from "../../src/lib/milestones";
import type { AttemptAgg } from "../../src/lib/apiTypes";

const MAX_PROGRESS_ENTRIES = 2_000;
const MAX_CLAIMS = 64;
const MAX_ATTEMPTS = 2_000;
const MAX_KEY_LENGTH = 120;

const REVIEW_CODES = ["RC", "EC", "HA", "ID", "SL", "CX", "SC", "TG", "NM", "DL"];
const MAX_ARTIFACT_NOTE = 4_000;
const MAX_ARTIFACT_CODE = 4_000;
const MAX_ARTIFACT_TASK = 300;

type Attempts = Record<string, AttemptAgg>;
type ProgressRow = { data: string; claims: string; attempts: string };

/** Progress is `"${track}/${lesson}!${day}" -> 0..1`; every value is clamped. */
export function sanitizeProgress(raw: unknown): Record<string, number> {
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

function sanitizeArtifacts(raw: unknown): Claims[string]["artifacts"] | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const { task, note, noteCategory, proof } = raw as Record<string, unknown>;
  if (typeof task !== "string" || typeof note !== "string") return undefined;
  if (typeof noteCategory !== "string" || !REVIEW_CODES.includes(noteCategory)) return undefined;
  if (!proof || typeof proof !== "object") return undefined;
  const { buggy, test, fixed } = proof as Record<string, unknown>;
  const code = (value: unknown): string | null =>
    typeof value === "string" && value.trim().length > 0 ? value.slice(0, MAX_ARTIFACT_CODE) : null;
  const b = code(buggy);
  const t = code(test);
  const f = code(fixed);
  if (!b || !t || !f) return undefined;
  const trimmed = note.slice(0, MAX_ARTIFACT_NOTE);
  if (trimmed.trim().length === 0) return undefined;
  return {
    task: task.slice(0, MAX_ARTIFACT_TASK),
    note: trimmed,
    noteCategory: noteCategory as NonNullable<Claims[string]["artifacts"]>["noteCategory"],
    proof: { buggy: b, test: t, fixed: f },
  };
}

export function sanitizeClaims(raw: unknown): Claims {
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
          .filter((n) => Number.isInteger(n) && n >= 0),
      ),
    ].sort((a, b) => a - b);
    if (ticks.length === 0) continue;
    const clean = sanitizeArtifacts(artifacts);
    out[id] = clean ? { at, deliverables: ticks, artifacts: clean } : { at, deliverables: ticks };
  }
  return out;
}

export function sanitizeAttempts(raw: unknown): Attempts {
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
      firstAt: Number.isFinite(fa) ? fa : last,
    };
  }
  return out;
}

/**
 * Union of two attempt maps. `first` comes from the earlier first attempt
 * (`firstAt`), `best` and counts take the max, `at` is the latest. Commutative
 * and idempotent, so two devices converge from either side.
 */
export function mergeAttempts(a: Attempts, b: Attempts): Attempts {
  const out: Attempts = { ...a };
  for (const [key, next] of Object.entries(b)) {
    const mine = out[key];
    if (!mine) {
      out[key] = next;
      continue;
    }
    out[key] = {
      first: next.firstAt < mine.firstAt ? next.first : mine.first,
      best: Math.max(mine.best, next.best),
      attempts: Math.max(mine.attempts, next.attempts),
      at: Math.max(mine.at, next.at),
      firstAt: Math.min(mine.firstAt, next.firstAt),
    };
  }
  return out;
}

async function rowFor(db: Db, userId: string): Promise<ProgressRow | null> {
  return db.first<ProgressRow>("SELECT data, claims, attempts FROM progress WHERE user_id = ?", [
    userId,
  ]);
}

/** Insert an empty row when a claims or attempts push arrives first. */
async function ensureRow(db: Db, userId: string): Promise<void> {
  await db.run(
    "INSERT OR IGNORE INTO progress (user_id, data, claims, attempts, updated_at) VALUES (?, '{}', '{}', '{}', ?)",
    [userId, Date.now()],
  );
}

function parse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/* --------------------------------- queries -------------------------------- */

export async function get(ctx: Ctx) {
  if (!ctx.userId) return null;
  const row = await rowFor(ctx.db, ctx.userId);
  return sanitizeProgress(parse<Row>(row?.data ?? "{}", {}));
}

export async function getClaims(ctx: Ctx) {
  if (!ctx.userId) return null;
  const row = await rowFor(ctx.db, ctx.userId);
  return sanitizeClaims(parse<Row>(row?.claims ?? "{}", {}));
}

export async function getAttempts(ctx: Ctx) {
  if (!ctx.userId) return null;
  const row = await rowFor(ctx.db, ctx.userId);
  return sanitizeAttempts(parse<Row>(row?.attempts ?? "{}", {}));
}

/* -------------------------------- mutations ------------------------------- */

/** Upsert the score map, keeping the best score per key. */
export async function save(ctx: Ctx, args: { data?: unknown }) {
  // A debounced push can land after sign-out: drop it, progress stays local.
  if (!ctx.userId) return null;
  const incoming = sanitizeProgress(args?.data);
  const row = await rowFor(ctx.db, ctx.userId);
  if (!row) {
    await ctx.db.run(
      "INSERT INTO progress (user_id, data, claims, attempts, updated_at) VALUES (?, ?, '{}', '{}', ?)",
      [ctx.userId, JSON.stringify(incoming), Date.now()],
    );
    return null;
  }
  const stored = sanitizeProgress(parse<Row>(row.data, {}));
  for (const [key, score] of Object.entries(incoming)) {
    stored[key] = Math.max(stored[key] ?? 0, score);
  }
  await ctx.db.run("UPDATE progress SET data = ?, updated_at = ? WHERE user_id = ?", [
    JSON.stringify(stored),
    Date.now(),
    ctx.userId,
  ]);
  return null;
}

/** Upsert milestone claims with the shared merge rule. */
export async function saveClaims(ctx: Ctx, args: { claims?: unknown }) {
  if (!ctx.userId) return null;
  const incoming = sanitizeClaims(args?.claims);
  if (Object.keys(incoming).length === 0) return null;
  await ensureRow(ctx.db, ctx.userId);
  const row = await rowFor(ctx.db, ctx.userId);
  const stored = sanitizeClaims(parse<Row>(row?.claims ?? "{}", {}));
  await ctx.db.run("UPDATE progress SET claims = ?, updated_at = ? WHERE user_id = ?", [
    JSON.stringify(mergeClaims(stored, incoming)),
    Date.now(),
    ctx.userId,
  ]);
  return null;
}

/** Upsert attempt aggregates with the max/first-attempt merge rule. */
export async function saveAttempts(ctx: Ctx, args: { attempts?: unknown }) {
  if (!ctx.userId) return null;
  const incoming = sanitizeAttempts(args?.attempts);
  if (Object.keys(incoming).length === 0) return null;
  await ensureRow(ctx.db, ctx.userId);
  const row = await rowFor(ctx.db, ctx.userId);
  const stored = sanitizeAttempts(parse<Row>(row?.attempts ?? "{}", {}));
  await ctx.db.run("UPDATE progress SET attempts = ?, updated_at = ? WHERE user_id = ?", [
    JSON.stringify(mergeAttempts(stored, incoming)),
    Date.now(),
    ctx.userId,
  ]);
  return null;
}

/** Wipe the account's cloud progress, assessment history and reviewer badge. */
export async function wipe(ctx: Ctx) {
  const userId = requireUser(ctx);
  await ctx.db.run("DELETE FROM progress WHERE user_id = ?", [userId]);
  await ctx.db.run("DELETE FROM unseen_attempts WHERE user_id = ?", [userId]);
  await ctx.db.run("DELETE FROM reviewer_certificates WHERE user_id = ?", [userId]);
  return null;
}
