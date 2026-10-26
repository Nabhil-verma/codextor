/*
 * The public "player card".
 *
 * The client recomputes every number from its progress map and pushes it here,
 * so leaderboard reads stay cheap: sorting never walks anybody's progress blob.
 * The server's job is to bound what a forged push can claim (see
 * `src/lib/xpRules.ts`), rate-limit the pushes, and keep the guild feed's
 * level-up moments.
 */
import type { Ctx } from "./context";
import type { ClanEventKind } from "../../src/lib/apiTypes";
import { accountName } from "./accounts";
import { cleanText, count } from "./context";
import { MAX_SYNCS_PER_MINUTE, clampProfile } from "../../src/lib/xpRules";

const MAX_NAME = 40;
const MAX_TITLE = 24;
const SYNC_WINDOW_MS = 60_000;

/**
 * Plausibility clamps are enforced, not advisory: a card that claims more XP
 * than the curriculum can produce is stored at the ceiling with an audit trail
 * (`clamped_at`, `clamp_log`) instead of being rejected, so an honest
 * multi-device merge is never lost.
 */
const CLAMPS_ENFORCED = true;

export type ProfileRow = {
  id: string;
  user_id: string;
  name: string;
  xp: number;
  xp_week: number;
  xp_month: number;
  level: number;
  ascension: string;
  title: string | null;
  streak_current: number;
  streak_longest: number;
  last_active_day: string | null;
  member_role: string | null;
  lessons_done: number;
  clan_id: string | null;
  updated_at: number;
  clamped_at: number | null;
  clamp_log: string | null;
  sync_window_start: number | null;
  sync_count: number | null;
};

const COLUMNS = `id, user_id, name, xp, xp_week, xp_month, level, ascension, title,
  streak_current, streak_longest, last_active_day, member_role, lessons_done, clan_id,
  updated_at, clamped_at, clamp_log, sync_window_start, sync_count`;

export async function profileForUser(ctx: Ctx, userId: string): Promise<ProfileRow | null> {
  return ctx.db.first<ProfileRow>(`SELECT ${COLUMNS} FROM profiles WHERE user_id = ?`, [userId]);
}

async function postEvent(
  ctx: Ctx,
  clanId: string,
  actorId: string,
  kind: ClanEventKind,
  text: string,
): Promise<void> {
  await ctx.db.run(
    "INSERT INTO clan_events (id, clan_id, actor_id, kind, text, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [crypto.randomUUID(), clanId, actorId, kind, text, Date.now()],
  );
}

export type SyncArgs = {
  xp?: unknown;
  xpWeek?: unknown;
  xpMonth?: unknown;
  level?: unknown;
  ascension?: unknown;
  streakCurrent?: unknown;
  streakLongest?: unknown;
  lastActiveDay?: unknown;
  lessonsDone?: unknown;
  sourceDay?: unknown;
};

/** Upsert the caller's player card and return its id (null until it's worth one). */
export async function sync(ctx: Ctx, args: SyncArgs) {
  if (!ctx.userId) return null;
  const userId = ctx.userId;
  const now = Date.now();
  const name = accountName(ctx.account);
  const existing = await profileForUser(ctx, userId);

  /* ------------------------- per-user sync limit ------------------------ */
  const inWindow =
    existing?.sync_window_start != null && now - existing.sync_window_start < SYNC_WINDOW_MS;
  const syncCount = inWindow ? (existing?.sync_count ?? 0) + 1 : 1;
  if (inWindow && syncCount > MAX_SYNCS_PER_MINUTE) {
    console.warn(`profiles.sync: rate limit hit for ${userId}`);
    if (CLAMPS_ENFORCED && existing) {
      // Record the attempt, but do not let a runaway loop overwrite a good card.
      await ctx.db.run(
        "UPDATE profiles SET sync_count = ?, clamped_at = ?, clamp_log = ? WHERE id = ?",
        [syncCount, now, JSON.stringify(["rate-limit"]), existing.id],
      );
      return existing.id;
    }
  }
  const syncWindowStart = inWindow && existing?.sync_window_start != null ? existing.sync_window_start : now;

  /* --------------------------- plausibility ---------------------------- */
  const raw = {
    xp: count(args?.xp),
    xpWeek: count(args?.xpWeek),
    xpMonth: count(args?.xpMonth),
    level: Math.max(1, count(args?.level, 999)),
    ascension: cleanText(args?.ascension, MAX_TITLE) || "initiate",
    streakCurrent: count(args?.streakCurrent, 10_000),
    streakLongest: count(args?.streakLongest, 10_000),
    lastActiveDay: typeof args?.lastActiveDay === "string" ? args.lastActiveDay.slice(0, 10) : null,
    lessonsDone: count(args?.lessonsDone, 100_000),
  };

  const createdAt = ctx.account?.createdAt ?? now;
  const clamped = clampProfile({
    ...raw,
    accountAgeDays: Math.max(0, (now - createdAt) / 86_400_000),
    previous: existing
      ? {
          xp: existing.xp,
          xpWeek: existing.xp_week,
          xpMonth: existing.xp_month,
          updatedAt: existing.updated_at,
        }
      : undefined,
    now,
  });

  if (clamped.reasons.length) {
    console.warn(`profiles.sync: clamped [${clamped.reasons.join(", ")}] for ${userId}`);
  }

  const stored = CLAMPS_ENFORCED
    ? {
        xp: clamped.xp,
        xpWeek: clamped.xpWeek,
        xpMonth: clamped.xpMonth,
        level: clamped.level,
        streakCurrent: clamped.streakCurrent,
        streakLongest: clamped.streakLongest,
        lessonsDone: clamped.lessonsDone,
      }
    : raw;

  const next = {
    ...stored,
    name: cleanText(name, MAX_NAME) || "Learner",
    ascension: raw.ascension,
    lastActiveDay: raw.lastActiveDay,
    updatedAt: now,
    clampedAt: clamped.reasons.length ? now : null,
    clampLog: clamped.reasons.length ? JSON.stringify(clamped.reasons) : null,
  };

  if (!existing) {
    // An empty card is worse than a small board: wait for something earned.
    if (next.xp === 0 && next.lessonsDone === 0) return null;
    const id = crypto.randomUUID();
    await ctx.db.run(
      `INSERT INTO profiles (id, user_id, name, xp, xp_week, xp_month, level, ascension, title,
         streak_current, streak_longest, last_active_day, member_role, lessons_done, clan_id,
         updated_at, clamped_at, clamp_log, sync_window_start, sync_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, NULL, ?, NULL, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        next.name,
        next.xp,
        next.xpWeek,
        next.xpMonth,
        next.level,
        next.ascension,
        next.streakCurrent,
        next.streakLongest,
        next.lastActiveDay,
        next.lessonsDone,
        now,
        next.clampedAt,
        next.clampLog,
        syncWindowStart,
        syncCount,
      ],
    );
    return id;
  }

  // A level-up is a social moment for the guild. Compare against the SERVER's
  // stored level, and fire at most once per (level, day).
  const sourceDay = typeof args?.sourceDay === "string" ? args.sourceDay : null;
  if (
    next.level > existing.level &&
    next.xp >= existing.xp &&
    sourceDay !== null &&
    sourceDay !== existing.last_active_day &&
    existing.clan_id
  ) {
    await postEvent(ctx, existing.clan_id, userId, "level-up", `${next.name} reached level ${next.level}`);
  }

  const unchanged =
    existing.xp === next.xp &&
    existing.xp_week === next.xpWeek &&
    existing.xp_month === next.xpMonth &&
    existing.level === next.level &&
    existing.ascension === next.ascension &&
    existing.streak_current === next.streakCurrent &&
    existing.streak_longest === next.streakLongest &&
    existing.last_active_day === next.lastActiveDay &&
    existing.lessons_done === next.lessonsDone &&
    existing.name === next.name;
  if (unchanged && !clamped.reasons.length) return existing.id;

  await ctx.db.run(
    `UPDATE profiles SET name = ?, xp = ?, xp_week = ?, xp_month = ?, level = ?, ascension = ?,
       streak_current = ?, streak_longest = ?, last_active_day = ?, lessons_done = ?,
       updated_at = ?, clamped_at = ?, clamp_log = ?, sync_window_start = ?, sync_count = ?
     WHERE id = ?`,
    [
      next.name,
      next.xp,
      next.xpWeek,
      next.xpMonth,
      next.level,
      next.ascension,
      next.streakCurrent,
      next.streakLongest,
      next.lastActiveDay,
      next.lessonsDone,
      now,
      next.clampedAt,
      next.clampLog,
      syncWindowStart,
      syncCount,
      existing.id,
    ],
  );
  return existing.id;
}

/** The caller's own card plus the guild they belong to. */
export async function me(ctx: Ctx) {
  if (!ctx.userId) return null;
  const profile = await profileForUser(ctx, ctx.userId);
  if (!profile) return null;
  const clan = profile.clan_id
    ? await ctx.db.first<{ id: string; name: string; tag: string; owner_id: string }>(
        "SELECT id, name, tag, owner_id FROM clans WHERE id = ?",
        [profile.clan_id],
      )
    : null;
  const role = clan
    ? clan.owner_id === ctx.userId
      ? ("owner" as const)
      : profile.member_role === "officer"
        ? ("officer" as const)
        : ("member" as const)
    : ("none" as const);

  return {
    name: profile.name,
    xp: profile.xp,
    xpWeek: profile.xp_week,
    xpMonth: profile.xp_month,
    level: profile.level,
    ascension: profile.ascension,
    title: profile.title,
    streakCurrent: profile.streak_current,
    streakLongest: profile.streak_longest,
    lessonsDone: profile.lessons_done,
    clan: clan ? { id: clan.id, name: clan.name, tag: clan.tag } : null,
    clanRole: role,
  };
}

/** Choose which unlocked title is displayed. */
export async function setTitle(ctx: Ctx, args: { title?: unknown }) {
  if (!ctx.userId) return null;
  const title = cleanText(args?.title, MAX_TITLE);
  await ctx.db.run("UPDATE profiles SET title = ? WHERE user_id = ?", [
    title || null,
    ctx.userId,
  ]);
  return null;
}

/**
 * The public profile page: already-public facts only. Unknown ids return null,
 * and no account id, email or guild role is included.
 */
export async function publicCard(ctx: Ctx, args: { profileId?: unknown }) {
  const profile = await ctx.db.first<ProfileRow>(`SELECT ${COLUMNS} FROM profiles WHERE id = ?`, [
    String(args?.profileId ?? ""),
  ]);
  if (!profile) return null;
  const clan = profile.clan_id
    ? await ctx.db.first<{ name: string; tag: string }>(
        "SELECT name, tag FROM clans WHERE id = ?",
        [profile.clan_id],
      )
    : null;
  return {
    name: profile.name,
    level: profile.level,
    ascension: profile.ascension,
    title: profile.title,
    xp: profile.xp,
    streakLongest: profile.streak_longest,
    lessonsDone: profile.lessons_done,
    clan: clan ? { name: clan.name, tag: clan.tag } : null,
  };
}

/** `profiles.sync` needs a profile row before a guild can be joined. */
export async function ensureProfile(ctx: Ctx, userId: string): Promise<ProfileRow> {
  const existing = await profileForUser(ctx, userId);
  if (existing) return existing;
  const name = cleanText(accountName(ctx.account), MAX_NAME) || "Learner";
  const id = crypto.randomUUID();
  const now = Date.now();
  await ctx.db.run(
    `INSERT INTO profiles (id, user_id, name, xp, xp_week, xp_month, level, ascension, title,
       streak_current, streak_longest, last_active_day, member_role, lessons_done, clan_id,
       updated_at, clamped_at, clamp_log, sync_window_start, sync_count)
     VALUES (?, ?, ?, 0, 0, 0, 1, 'initiate', NULL, 0, 0, NULL, NULL, 0, NULL, ?, NULL, NULL, NULL, 0)`,
    [id, userId, name, now],
  );
  const created = await profileForUser(ctx, userId);
  if (!created) throw new Error("Could not create your player card.");
  return created;
}

export { postEvent as postClanEvent };
