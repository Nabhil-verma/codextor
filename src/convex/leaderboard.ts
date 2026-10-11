import { getAuthUserId } from "@convex-dev/auth/server";
import { query, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

/**
 * Leaderboard reads. Convex queries are reactive subscriptions, so a board
 * refresh pushes straight into every open page — no polling, no sockets to
 * babysit. Brackets keep newcomers competitive: a learner who joined today can
 * still top the weekly board.
 */

const BRACKET = v.union(
  v.literal("week"),
  v.literal("month"),
  v.literal("all")
);
export type Bracket = "week" | "month" | "all";

/** Cap on how many rows we sort/scan in one read. */
const SCAN_CAP = 500;

async function topProfiles(
  ctx: QueryCtx,
  bracket: Bracket,
  cap: number
): Promise<Doc<"profiles">[]> {
  // Branches stay concrete so Convex can type the index field accessor.
  if (bracket === "week") {
    return ctx.db.query("profiles").withIndex("by_xpWeek").order("desc").take(cap);
  }
  if (bracket === "month") {
    return ctx.db.query("profiles").withIndex("by_xpMonth").order("desc").take(cap);
  }
  return ctx.db.query("profiles").withIndex("by_xp").order("desc").take(cap);
}

/**
 * How many players sit strictly above this XP total in the bracket, or null
 * when there are SCAN_CAP or more: the scan stops there, so the exact rank is
 * unknown. A capped count must never be reported as a rank.
 */
async function aheadOf(ctx: QueryCtx, bracket: Bracket, xp: number): Promise<number | null> {
  let rows: Doc<"profiles">[];
  if (bracket === "week") {
    rows = await ctx.db
      .query("profiles")
      .withIndex("by_xpWeek", (q) => q.gt("xpWeek", xp))
      .take(SCAN_CAP);
  } else if (bracket === "month") {
    rows = await ctx.db
      .query("profiles")
      .withIndex("by_xpMonth", (q) => q.gt("xpMonth", xp))
      .take(SCAN_CAP);
  } else {
    rows = await ctx.db
      .query("profiles")
      .withIndex("by_xp", (q) => q.gt("xp", xp))
      .take(SCAN_CAP);
  }
  return rows.length < SCAN_CAP ? rows.length : null;
}

function xpOf(p: Doc<"profiles">, bracket: Bracket): number {
  if (bracket === "week") return p.xpWeek;
  if (bracket === "month") return p.xpMonth;
  return p.xp;
}

/**
 * One public board row. `profileId` is the row's identity (it links to the
 * public profile); the account id is deliberately absent, so the board never
 * hands out the accounts behind its rows. `isMe` is computed on the server.
 * `rank` is null only for a pinned row beyond the scan cap (see aheadOf).
 */
export type LeaderboardRow = {
  rank: number | null;
  profileId: Id<"profiles">;
  name: string;
  xp: number;
  level: number;
  ascension: string;
  title: string | null;
  streak: number;
  isMe: boolean;
};

function toRow(
  p: Doc<"profiles">,
  rank: number | null,
  bracket: Bracket,
  meId: Id<"users"> | null
): LeaderboardRow {
  return {
    rank,
    profileId: p._id,
    name: p.name,
    xp: xpOf(p, bracket),
    level: p.level,
    ascension: p.ascension,
    title: p.title ?? null,
    streak: p.streakCurrent,
    isMe: meId !== null && p.userId === meId,
  };
}

/**
 * Ranked board for one bracket, plus the caller's own standing so the UI can
 * either highlight their row or pin it to the bottom when they're outside the
 * visible top N.
 */
export const top = query({
  args: { bracket: BRACKET, limit: v.optional(v.number()) },
  handler: async (ctx, { bracket, limit }) => {
    const cap = Math.min(Math.max(limit ?? 20, 1), 100);
    const meId = await getAuthUserId(ctx);

    const rows = await topProfiles(ctx, bracket, cap);
    const board = rows.map((p, i) => toRow(p, i + 1, bracket, meId));

    let me: LeaderboardRow | null = null;
    if (meId) {
      const mine = board.find((r) => r.isMe);
      if (mine) {
        me = mine;
      } else {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", meId))
          .unique();
        if (profile) {
          const ahead = await aheadOf(ctx, bracket, xpOf(profile, bracket));
          const rank = ahead === null ? null : ahead + 1;
          me = toRow(profile, rank, bracket, meId);
        }
      }
    }

    return { bracket, board, me };
  },
});

/**
 * The top three across all brackets are shown as a hero podium. Returns the
 * top row per bracket — three reads, one subscription.
 */
export const podium = query({
  args: {},
  handler: async (ctx) => {
    const meId = await getAuthUserId(ctx);
    const brackets: Bracket[] = ["week", "month", "all"];
    const out: Record<string, LeaderboardRow[]> = {};
    for (const b of brackets) {
      const rows = await topProfiles(ctx, b, 3);
      out[b] = rows.map((p, i) => toRow(p, i + 1, b, meId));
    }
    return out;
  },
});
