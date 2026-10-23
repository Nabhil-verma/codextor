import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { MAX_SYNCS_PER_MINUTE, clampProfile } from "./xpRules";
import { publicDisplayName } from "../lib/accountIdentity";

/**
 * The public "player card". The client recomputes every number from its
 * progress map and pushes it here, so leaderboard queries stay cheap: sorting
 * never has to walk anybody's full progress blob.
 */

const MAX_NAME = 40;
const MAX_TITLE = 24;

/**
 * The plausibility clamps are ENFORCED by default: a sync whose XP, level or
 * streak is implausible is clamped to the curriculum's bounds, and the
 * violation is recorded on the card (`clampedAt` / `clampLog`). Setting the
 * deployment environment variable CODEXTOR_XP_CLAMPS=log switches back to
 * log-only: violations are recorded and logged, and the client's numbers are
 * stored unchanged.
 */
function clampsEnforced(): boolean {
  return process.env.CODEXTOR_XP_CLAMPS !== "log";
}

/** The sync rate-limit window. */
const SYNC_WINDOW_MS = 60_000;

/** Coerce anything to a finite, non-negative integer the DB can sort on. */
function count(raw: unknown, hi = 10_000_000): number {
  const n = typeof raw === "number" && Number.isFinite(raw) ? Math.floor(raw) : 0;
  return Math.min(hi, Math.max(0, n));
}

function shortString(raw: unknown, max: number): string {
  return typeof raw === "string" ? raw.trim().slice(0, max) : "";
}

/** Upsert the signed-in learner's player card and return its id. */
export const sync = mutation({
  args: {
    xp: v.number(),
    xpWeek: v.number(),
    xpMonth: v.number(),
    level: v.number(),
    ascension: v.string(),
    streakCurrent: v.number(),
    streakLongest: v.number(),
    lastActiveDay: v.optional(v.string()),
    lessonsDone: v.number(),
    /** day key of the progress snapshot that produced this push (dedupes level-up events) */
    sourceDay: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const now = Date.now();

    // The display name is owned by the auth user so a rename propagates.
    const user = await ctx.db.get(userId);
    // Never an email address: a legacy account's email is private.
    const name = shortString(publicDisplayName(user ?? {}, MAX_NAME), MAX_NAME) || "Learner";

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    const enforce = clampsEnforced();

    /* ---------------- per-user sync rate limit ---------------- */
    const inWindow =
      existing?.syncWindowStart !== undefined &&
      now - existing.syncWindowStart < SYNC_WINDOW_MS;
    const syncCount = inWindow ? (existing?.syncCount ?? 0) + 1 : 1;
    const rateLimited = inWindow && syncCount > MAX_SYNCS_PER_MINUTE;

    if (rateLimited) {
      console.warn(
        `profiles.sync: rate limit hit for ${userId} (${syncCount}/${MAX_SYNCS_PER_MINUTE} per minute)`,
      );
      if (enforce && existing) {
        // The attempt is recorded so the client can be told, but the push is
        // dropped: a runaway loop must not overwrite a good card.
        await ctx.db.patch(existing._id, {
          syncWindowStart: existing.syncWindowStart,
          syncCount,
          clampedAt: now,
          clampLog: ["rate-limit"],
        });
        return existing._id;
      }
    }
    const syncWindowStart = inWindow ? existing!.syncWindowStart! : now;

    /* ---------------- plausibility clamps ---------------- */
    const raw = {
      xp: count(args.xp),
      xpWeek: count(args.xpWeek),
      xpMonth: count(args.xpMonth),
      level: Math.max(1, count(args.level, 999)),
      ascension: shortString(args.ascension, MAX_TITLE) || "initiate",
      streakCurrent: count(args.streakCurrent, 10_000),
      streakLongest: count(args.streakLongest, 10_000),
      lastActiveDay: args.lastActiveDay?.slice(0, 10),
      lessonsDone: count(args.lessonsDone, 100_000),
    };

    const clamped = clampProfile({
      ...raw,
      accountAgeDays: Math.max(0, (now - (user?._creationTime ?? now)) / 86_400_000),
      previous: existing
        ? {
            xp: existing.xp,
            xpWeek: existing.xpWeek,
            xpMonth: existing.xpMonth,
            updatedAt: existing.updatedAt,
          }
        : undefined,
      now,
    });

    if (clamped.reasons.length) {
      console.warn(
        `profiles.sync: ${enforce ? "clamped" : "would clamp"} [${clamped.reasons.join(", ")}] for ${userId}`,
      );
    }

    const stored = enforce
      ? {
          xp: clamped.xp,
          xpWeek: clamped.xpWeek,
          xpMonth: clamped.xpMonth,
          level: clamped.level,
          streakCurrent: clamped.streakCurrent,
          streakLongest: clamped.streakLongest,
          lessonsDone: clamped.lessonsDone,
        }
      : {
          xp: raw.xp,
          xpWeek: raw.xpWeek,
          xpMonth: raw.xpMonth,
          level: raw.level,
          streakCurrent: raw.streakCurrent,
          streakLongest: raw.streakLongest,
          lessonsDone: raw.lessonsDone,
        };

    // NOTE: `memberRole` is deliberately absent from this payload. Officer
    // status is granted server-side by `clans.setRole`; letting a progress
    // push carry the field would either clear a real officer (when omitted)
    // or let any client mint one (when spoofed), so sync never touches it.
    const next = {
      name,
      ...stored,
      ascension: raw.ascension,
      lastActiveDay: raw.lastActiveDay,
      syncWindowStart,
      syncCount,
      updatedAt: now,
      // The audit trail is written in both modes: in log-only mode this is
      // exactly the evidence needed to decide whether to turn clamping on.
      clampedAt: clamped.reasons.length ? now : undefined,
      clampLog: clamped.reasons.length ? clamped.reasons : undefined,
    };

    if (!existing) {
      // Only create a card once the learner has actually earned something —
      // an empty board is worse than a small one.
      if (next.xp === 0 && next.lessonsDone === 0) return null;
      return await ctx.db.insert("profiles", { userId, ...next });
    }

    // A level-up is a social moment — the guild feed gets it. Level can move
    // down after a reset, so compare against the SERVER's stored level: the
    // client's XP is already the union of all devices and can't say whether
    // this is a first ascent or a re-earn. Fires at most once per
    // (source level, source day): a second push for the same day/level is
    // either unchanged (skipped below) or a higher level with a new day.
    if (
      next.level > existing.level &&
      next.xp >= existing.xp &&
      args.sourceDay !== undefined &&
      args.sourceDay !== existing.lastActiveDay &&
      existing.clanId
    ) {
      await ctx.db.insert("clanEvents", {
        clanId: existing.clanId,
        actorId: userId,
        kind: "level-up",
        text: name + " reached level " + next.level,
        createdAt: Date.now(),
      });
    }

    // Skip the write when nothing moved (progress events fire often).
    const unchanged =
      existing.xp === next.xp &&
      existing.xpWeek === next.xpWeek &&
      existing.xpMonth === next.xpMonth &&
      existing.level === next.level &&
      existing.ascension === next.ascension &&
      existing.streakCurrent === next.streakCurrent &&
      existing.streakLongest === next.streakLongest &&
      existing.lastActiveDay === next.lastActiveDay &&
      existing.lessonsDone === next.lessonsDone &&
      existing.name === next.name;
    if (unchanged && !clamped.reasons.length) return existing._id;

    await ctx.db.patch(existing._id, next);
    return existing._id;
  },
});

/**
 * The signed-in learner's own card, plus the guild they belong to. Returns
 * null for signed-out visitors and for accounts that have never synced.
 */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) return null;
    const clan = profile.clanId ? await ctx.db.get(profile.clanId) : null;
    const role = clan
      ? clan.ownerId === userId
        ? ("owner" as const)
        : profile.memberRole === "officer"
          ? ("officer" as const)
          : ("member" as const)
      : ("none" as const);
    return {
      name: profile.name,
      xp: profile.xp,
      xpWeek: profile.xpWeek,
      xpMonth: profile.xpMonth,
      level: profile.level,
      ascension: profile.ascension,
      title: profile.title ?? null,
      streakCurrent: profile.streakCurrent,
      streakLongest: profile.streakLongest,
      lessonsDone: profile.lessonsDone,
      clan: clan ? { id: clan._id, name: clan.name, tag: clan.tag } : null,
      clanRole: role,
    };
  },
});

/** Choose which unlocked title is displayed on the leaderboard. */
export const setTitle = mutation({
  args: { title: v.string() },
  handler: async (ctx, { title }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const clean = shortString(title, MAX_TITLE);
    const row = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (row) await ctx.db.patch(row._id, { title: clean || undefined });
  },
});

/**
 * The public profile page. Everything it returns is already public on the
 * leaderboard — name, level, title, XP, streak, lessons, guild name and tag —
 * and nothing that identifies the account: no userId, no email, no sync
 * bookkeeping, no clamp audit, no guild role. Unknown ids return null.
 */
export const publicCard = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    const p = await ctx.db.get(profileId);
    if (!p) return null;
    const clan = p.clanId ? await ctx.db.get(p.clanId) : null;
    return {
      name: p.name,
      level: p.level,
      ascension: p.ascension,
      title: p.title ?? null,
      xp: p.xp,
      streakLongest: p.streakLongest,
      lessonsDone: p.lessonsDone,
      clan: clan ? { name: clan.name, tag: clan.tag } : null,
    };
  },
});
