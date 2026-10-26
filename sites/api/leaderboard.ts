/*
 * Leaderboard reads.
 *
 * Bounded scans: the board reads at most `cap` rows, and the caller's own rank
 * is only reported when the number of learners ahead of them fits inside the
 * scan. A capped count is never presented as an exact rank.
 */
import type { Ctx } from "./context";
import type { ProfileRow } from "./profiles";
import type { LeaderboardRow } from "../../src/lib/apiTypes";

export type Bracket = "week" | "month" | "all";

const SCAN_CAP = 500;

const COLUMN: Record<Bracket, string> = {
  week: "xp_week",
  month: "xp_month",
  all: "xp",
};

const COLUMNS = `id, user_id, name, xp, xp_week, xp_month, level, ascension, title,
  streak_current, streak_longest, lessons_done`;

function bracketOf(raw: unknown): Bracket {
  return raw === "week" || raw === "month" ? raw : "all";
}

async function topProfiles(ctx: Ctx, bracket: Bracket, cap: number): Promise<ProfileRow[]> {
  // `COLUMN[bracket]` is one of three fixed names, never request text.
  return ctx.db.all<ProfileRow>(
    `SELECT ${COLUMNS} FROM profiles ORDER BY ${COLUMN[bracket]} DESC, updated_at ASC LIMIT ?`,
    [cap],
  );
}

/** How many learners sit strictly above this total, or null when capped. */
async function aheadOf(ctx: Ctx, bracket: Bracket, xp: number): Promise<number | null> {
  const rows = await ctx.db.all<{ id: string }>(
    `SELECT id FROM profiles WHERE ${COLUMN[bracket]} > ? LIMIT ?`,
    [xp, SCAN_CAP],
  );
  return rows.length < SCAN_CAP ? rows.length : null;
}

function xpOf(profile: ProfileRow, bracket: Bracket): number {
  if (bracket === "week") return profile.xp_week;
  if (bracket === "month") return profile.xp_month;
  return profile.xp;
}

function toRow(
  profile: ProfileRow,
  rank: number | null,
  bracket: Bracket,
  meId: string | null,
): LeaderboardRow {
  return {
    rank,
    profileId: profile.id,
    name: profile.name,
    xp: xpOf(profile, bracket),
    level: profile.level,
    ascension: profile.ascension,
    title: profile.title,
    streak: profile.streak_current,
    isMe: meId !== null && profile.user_id === meId,
  };
}

/** One ranked board plus the caller's own standing. */
export async function top(ctx: Ctx, args: { bracket?: unknown; limit?: unknown }) {
  const bracket = bracketOf(args?.bracket);
  const limit = typeof args?.limit === "number" && Number.isFinite(args.limit) ? args.limit : 20;
  const cap = Math.min(Math.max(Math.floor(limit), 1), 100);
  const meId = ctx.userId;

  const rows = await topProfiles(ctx, bracket, cap);
  const board = rows.map((row, i) => toRow(row, i + 1, bracket, meId));

  let me: LeaderboardRow | null = null;
  if (meId) {
    const mine = board.find((row) => row.isMe);
    if (mine) {
      me = mine;
    } else {
      const profile = await ctx.db.first<ProfileRow>(
        `SELECT ${COLUMNS} FROM profiles WHERE user_id = ?`,
        [meId],
      );
      if (profile) {
        const ahead = await aheadOf(ctx, bracket, xpOf(profile, bracket));
        me = toRow(profile, ahead === null ? null : ahead + 1, bracket, meId);
      }
    }
  }

  return { bracket, board, me };
}

/** The top three of each bracket, for the hero podium. */
export async function podium(ctx: Ctx) {
  const meId = ctx.userId;
  const out: Record<Bracket, LeaderboardRow[]> = { week: [], month: [], all: [] };
  for (const bracket of ["week", "month", "all"] as const) {
    const rows = await topProfiles(ctx, bracket, 3);
    out[bracket] = rows.map((row, i) => toRow(row, i + 1, bracket, meId));
  }
  return out;
}
