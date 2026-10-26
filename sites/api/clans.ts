/*
 * Guilds ("clans"): teams whose pooled XP unlocks collective rewards, plus the
 * weekly co-op quest, officer roles and the activity feed.
 *
 * Membership lives on the profile row, so leaving a guild can never orphan a
 * member, and every officer action is authorized against the server's own rows.
 */
import type { Ctx } from "./context";
import { cleanText, requireUser, todayKey } from "./context";
import { ensureProfile, postClanEvent, profileForUser, type ProfileRow } from "./profiles";
import {
  MAX_GUILD_MEMBERS,
  guildTierFor,
  isoWeekKey,
  questDefForWeek,
  questTargetFor,
} from "../../src/lib/guild";
import type {
  ClanEventKind,
  ClanMember,
  ClanQuest,
  ClanView,
  FeedEvent,
} from "../../src/lib/apiTypes";

const MAX_NAME = 28;
const MAX_BLURB = 140;

export type ClanRow = {
  id: string;
  name: string;
  tag: string;
  blurb: string;
  owner_id: string;
  created_at: number;
};

type QuestRow = {
  id: string;
  clan_id: string;
  week_key: string;
  title: string;
  detail: string;
  metric: "lessons" | "xp" | "flawless";
  target: number;
  reward_xp: number;
  status: "active" | "complete";
  created_by: string;
  created_at: number;
  completed_at: number | null;
};

const PROFILE_COLUMNS = `id, user_id, name, xp, xp_week, xp_month, level, ascension, title,
  streak_current, streak_longest, member_role`;

async function clanFor(ctx: Ctx, clanId: string): Promise<ClanRow | null> {
  return ctx.db.first<ClanRow>("SELECT * FROM clans WHERE id = ?", [clanId]);
}

async function membersOf(ctx: Ctx, clanId: string): Promise<ProfileRow[]> {
  return ctx.db.all<ProfileRow>(
    `SELECT ${PROFILE_COLUMNS} FROM profiles WHERE clan_id = ? ORDER BY xp DESC LIMIT ?`,
    [clanId, MAX_GUILD_MEMBERS + 5],
  );
}

function roleOf(profile: ProfileRow, clan: ClanRow): ClanMember["role"] {
  if (clan.owner_id === profile.user_id) return "owner";
  return profile.member_role === "officer" ? "officer" : "member";
}

function view(clan: ClanRow, members: ProfileRow[], meId: string | null): ClanView {
  const sorted = [...members].sort((a, b) => b.xp - a.xp);
  const totalXp = sorted.reduce((n, m) => n + m.xp, 0);
  const mine = meId === null ? undefined : sorted.find((m) => m.user_id === meId);
  // Account ids are shown only to people who are in this guild.
  const seesIds = mine !== undefined;
  return {
    id: clan.id,
    name: clan.name,
    tag: clan.tag,
    blurb: clan.blurb,
    memberCount: sorted.length,
    totalXp,
    weekXp: sorted.reduce((n, m) => n + m.xp_week, 0),
    tier: guildTierFor(totalXp).tier.name,
    tierPerk: guildTierFor(totalXp).tier.perk,
    isMine: mine !== undefined,
    isOwner: meId !== null && clan.owner_id === meId,
    myRole: mine ? roleOf(mine, clan) : "member",
    members: sorted.slice(0, 12).map((m) => ({
      profileId: m.id,
      userId: seesIds ? m.user_id : null,
      name: m.name,
      xp: m.xp,
      level: m.level,
      ascension: m.ascension,
      role: roleOf(m, clan),
      isMe: meId !== null && m.user_id === meId,
    })),
  };
}

/** Every guild, ranked by pooled XP. */
export async function list(ctx: Ctx) {
  const meId = ctx.userId;
  const clans = await ctx.db.all<ClanRow>("SELECT * FROM clans LIMIT 40");
  const out: ClanView[] = [];
  for (const clan of clans) out.push(view(clan, await membersOf(ctx, clan.id), meId));
  out.sort((a, b) => b.totalXp - a.totalXp || b.weekXp - a.weekXp);
  return out;
}

/** The caller's own guild, or null when they're a free agent. */
export async function mine(ctx: Ctx) {
  if (!ctx.userId) return null;
  const profile = await profileForUser(ctx, ctx.userId);
  if (!profile?.clan_id) return null;
  const clan = await clanFor(ctx, profile.clan_id);
  if (!clan) return null;
  return view(clan, await membersOf(ctx, clan.id), ctx.userId);
}

/** Found a guild. One guild per learner. */
export async function create(ctx: Ctx, args: { name?: unknown; tag?: unknown; blurb?: unknown }) {
  const userId = requireUser(ctx);
  const name = cleanText(args?.name, MAX_NAME);
  const tag = cleanText(args?.tag, 5)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (name.length < 3) throw new Error("Guild name needs at least 3 characters.");
  if (tag.length < 2) throw new Error("Guild tag needs 2–5 letters or numbers.");

  const profile = await ensureProfile(ctx, userId);
  if (profile.clan_id) throw new Error("Leave your current guild first.");

  const nameTaken = await ctx.db.first<{ id: string }>("SELECT id FROM clans WHERE name = ?", [name]);
  if (nameTaken) throw new Error("That guild name is taken.");
  const tagTaken = await ctx.db.first<{ id: string }>("SELECT id FROM clans WHERE tag = ?", [tag]);
  if (tagTaken) throw new Error("That guild tag is taken.");

  const clanId = crypto.randomUUID();
  await ctx.db.run(
    "INSERT INTO clans (id, name, tag, blurb, owner_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [clanId, name, tag, cleanText(args?.blurb, MAX_BLURB) || "No motto yet — recruiting builders.", userId, Date.now()],
  );
  await ctx.db.run("UPDATE profiles SET clan_id = ?, member_role = NULL WHERE id = ?", [
    clanId,
    profile.id,
  ]);
  await postClanEvent(ctx, clanId, userId, "join", `${profile.name} founded the guild`);
  return clanId;
}

/** Join a guild (capacity-checked). */
export async function join(ctx: Ctx, args: { clanId?: unknown }) {
  const userId = requireUser(ctx);
  const clan = await clanFor(ctx, String(args?.clanId ?? ""));
  if (!clan) throw new Error("That guild no longer exists.");

  const profile = await ensureProfile(ctx, userId);
  if (profile.clan_id === clan.id) return null;

  const members = await membersOf(ctx, clan.id);
  if (members.length >= MAX_GUILD_MEMBERS) throw new Error("That guild is full.");
  await ctx.db.run("UPDATE profiles SET clan_id = ?, member_role = NULL WHERE id = ?", [
    clan.id,
    profile.id,
  ]);
  await postClanEvent(ctx, clan.id, userId, "join", `${profile.name} joined the guild`);
  return null;
}

/**
 * Leave the current guild. If the owner leaves, the highest-XP remaining
 * member is promoted; an empty guild is disbanded.
 */
export async function leave(ctx: Ctx) {
  const userId = requireUser(ctx);
  const profile = await profileForUser(ctx, userId);
  if (!profile?.clan_id) return null;
  const clan = await clanFor(ctx, profile.clan_id);
  await ctx.db.run("UPDATE profiles SET clan_id = NULL, member_role = NULL WHERE id = ?", [profile.id]);
  if (!clan) return null;
  await postClanEvent(ctx, clan.id, userId, "leave", `${profile.name} left the guild`);

  const remaining = await membersOf(ctx, clan.id);
  if (remaining.length === 0) {
    await ctx.db.run("DELETE FROM clans WHERE id = ?", [clan.id]);
    await ctx.db.run("DELETE FROM clan_quests WHERE clan_id = ?", [clan.id]);
    await ctx.db.run("DELETE FROM clan_events WHERE clan_id = ?", [clan.id]);
    return null;
  }
  if (clan.owner_id === userId) {
    const heir = [...remaining].sort((a, b) => b.xp - a.xp)[0];
    await ctx.db.run("UPDATE clans SET owner_id = ? WHERE id = ?", [heir.user_id, clan.id]);
    await ctx.db.run("UPDATE profiles SET member_role = NULL WHERE id = ?", [heir.id]);
  }
  return null;
}

/* ------------------------------ weekly quest ------------------------------ */

async function questFor(ctx: Ctx, clanId: string, weekKey: string): Promise<QuestRow | null> {
  return ctx.db.first<QuestRow>(
    "SELECT * FROM clan_quests WHERE clan_id = ? AND week_key = ?",
    [clanId, weekKey],
  );
}

async function questProgressRows(ctx: Ctx, questId: string) {
  return ctx.db.all<{
    user_id: string;
    contribution: number;
    user_name: string;
    user_level: number;
    user_ascension: string;
  }>(
    `SELECT user_id, contribution, user_name, user_level, user_ascension
       FROM clan_quest_progress WHERE quest_id = ? ORDER BY contribution DESC`,
    [questId],
  );
}

async function questViewFor(ctx: Ctx, clanId: string, meId: string): Promise<ClanQuest | null> {
  const quest = await questFor(ctx, clanId, isoWeekKey(todayKey()));
  if (!quest) return null;
  const rows = await questProgressRows(ctx, quest.id);
  return {
    questId: quest.id,
    title: quest.title,
    detail: quest.detail,
    metric: quest.metric,
    target: quest.target,
    pooled: rows.reduce((n, r) => n + r.contribution, 0),
    status: quest.status,
    rewardXp: quest.reward_xp,
    weekKey: quest.week_key,
    isComplete: quest.status === "complete",
    contributors: rows.slice(0, 12).map((r) => ({
      userId: r.user_id,
      name: r.user_name,
      level: r.user_level,
      ascension: r.user_ascension,
      contribution: r.contribution,
      isMe: r.user_id === meId,
    })),
  };
}

/** This week's quest for the caller's guild. */
export async function questView(ctx: Ctx) {
  if (!ctx.userId) return null;
  const me = await profileForUser(ctx, ctx.userId);
  if (!me?.clan_id) return null;
  return questViewFor(ctx, me.clan_id, ctx.userId);
}

export async function activeQuest(ctx: Ctx) {
  return questView(ctx);
}

/**
 * Lazy quest creation, rotated deterministically off the week key so every
 * member's client and the server agree on the same quest.
 */
export async function ensureActiveQuest(ctx: Ctx) {
  const userId = requireUser(ctx);
  const me = await profileForUser(ctx, userId);
  if (!me?.clan_id) return null;
  const weekKey = isoWeekKey(todayKey());
  const existing = await questFor(ctx, me.clan_id, weekKey);
  if (existing) return existing.id;

  const clan = await clanFor(ctx, me.clan_id);
  if (!clan) return null;
  const def = questDefForWeek(weekKey);
  const memberCount = (await membersOf(ctx, clan.id)).length;
  const id = crypto.randomUUID();
  await ctx.db.run(
    `INSERT INTO clan_quests
       (id, clan_id, week_key, title, detail, metric, target, reward_xp, status, created_by, created_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, NULL)`,
    [
      id,
      clan.id,
      weekKey,
      def.title,
      def.detail,
      def.metric,
      questTargetFor(def, memberCount),
      def.rewardXp,
      userId,
      Date.now(),
    ],
  );
  return id;
}

/**
 * Report the caller's cumulative weekly number for the active metric. Merged
 * max per member per quest, so repeat pushes are idempotent. Completion is
 * guarded server-side, so the feed event fires exactly once.
 */
export async function reportContribution(
  ctx: Ctx,
  args: { lessons?: unknown; xp?: unknown; flawless?: unknown },
) {
  if (!ctx.userId) return null;
  const me = await profileForUser(ctx, ctx.userId);
  if (!me?.clan_id) return null;
  const quest = await questFor(ctx, me.clan_id, isoWeekKey(todayKey()));
  if (!quest || quest.status !== "active") return null;

  const value =
    quest.metric === "lessons" ? args?.lessons : quest.metric === "xp" ? args?.xp : args?.flawless;
  const amount = Math.max(0, Math.floor(typeof value === "number" && Number.isFinite(value) ? value : 0));
  if (amount <= 0) return null;

  const existing = await ctx.db.first<{ contribution: number }>(
    "SELECT contribution FROM clan_quest_progress WHERE quest_id = ? AND user_id = ?",
    [quest.id, ctx.userId],
  );
  if (existing && existing.contribution >= amount) return null;

  await ctx.db.run(
    `INSERT INTO clan_quest_progress
       (quest_id, user_id, contribution, updated_at, user_name, user_level, user_ascension)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (quest_id, user_id) DO UPDATE SET
       contribution = excluded.contribution,
       updated_at = excluded.updated_at,
       user_level = excluded.user_level,
       user_ascension = excluded.user_ascension`,
    [quest.id, ctx.userId, amount, Date.now(), me.name, me.level, me.ascension],
  );

  const rows = await questProgressRows(ctx, quest.id);
  const pooled = rows.reduce((n, r) => n + r.contribution, 0);
  if (pooled >= quest.target) {
    await ctx.db.run("UPDATE clan_quests SET status = 'complete', completed_at = ? WHERE id = ?", [
      Date.now(),
      quest.id,
    ]);
    await postClanEvent(
      ctx,
      quest.clan_id,
      ctx.userId,
      "quest-done",
      `${me.name} completed the last leg of “${quest.title}”`,
    );
  }
  return null;
}

/** Weekly quest rewards the caller has already banked. */
export async function questClaims(ctx: Ctx) {
  if (!ctx.userId) return [];
  return ctx.db.all<{ weekKey: string; xp: number }>(
    "SELECT week_key AS weekKey, xp FROM clan_quest_claims WHERE user_id = ? ORDER BY claimed_at DESC LIMIT 60",
    [ctx.userId],
  );
}

/** Bank the reward for a completed weekly quest. One claim per (user, week). */
export async function claimQuestReward(ctx: Ctx) {
  const userId = requireUser(ctx);
  const me = await profileForUser(ctx, userId);
  if (!me?.clan_id) throw new Error("Join a guild first.");
  const weekKey = isoWeekKey(todayKey());
  const quest = await questFor(ctx, me.clan_id, weekKey);
  if (!quest || quest.status !== "complete") throw new Error("This week's quest is not complete yet.");

  const claimed = await ctx.db.first<{ week_key: string }>(
    "SELECT week_key FROM clan_quest_claims WHERE user_id = ? AND week_key = ?",
    [userId, weekKey],
  );
  if (claimed) throw new Error("You already claimed this reward.");

  const contributors = await questProgressRows(ctx, quest.id);
  const share = Math.floor(quest.reward_xp / Math.max(1, contributors.length));
  await ctx.db.run(
    "INSERT INTO clan_quest_claims (user_id, week_key, xp, claimed_at) VALUES (?, ?, ?, ?)",
    [userId, weekKey, share, Date.now()],
  );
  return share;
}

/* -------------------------------- roles ---------------------------------- */

/** Owner grants or revokes the officer role. */
export async function setRole(ctx: Ctx, args: { userId?: unknown; officer?: unknown }) {
  const meId = requireUser(ctx);
  const me = await profileForUser(ctx, meId);
  if (!me?.clan_id) throw new Error("You're not in a guild.");
  const clan = await clanFor(ctx, me.clan_id);
  if (!clan) throw new Error("That guild no longer exists.");
  if (clan.owner_id !== meId) throw new Error("Only the founder can manage roles.");

  const targetId = String(args?.userId ?? "");
  if (targetId === meId) throw new Error("You already own this guild.");
  const target = await profileForUser(ctx, targetId);
  if (!target || target.clan_id !== clan.id) throw new Error("That learner isn't in your guild.");

  if (args?.officer === true) {
    await ctx.db.run("UPDATE profiles SET member_role = 'officer' WHERE id = ?", [target.id]);
    await postClanEvent(ctx, clan.id, meId, "promotion", `${target.name} was promoted to officer`);
  } else {
    await ctx.db.run("UPDATE profiles SET member_role = NULL WHERE id = ?", [target.id]);
    await postClanEvent(ctx, clan.id, meId, "demotion", `${target.name} is a member again`);
  }
  return null;
}

/** Owner or an officer removes a member (officers can only remove members). */
export async function kick(ctx: Ctx, args: { userId?: unknown }) {
  const meId = requireUser(ctx);
  const me = await profileForUser(ctx, meId);
  if (!me?.clan_id) throw new Error("You're not in a guild.");
  const clan = await clanFor(ctx, me.clan_id);
  if (!clan) throw new Error("That guild no longer exists.");
  const myRole = roleOf(me, clan);
  if (myRole === "member") throw new Error("Only the founder or an officer can do that.");

  const targetId = String(args?.userId ?? "");
  const target = await profileForUser(ctx, targetId);
  if (!target || target.clan_id !== clan.id) throw new Error("That learner isn't in your guild.");
  if (targetId === meId) throw new Error("Use “Leave guild” instead.");
  if (roleOf(target, clan) !== "member" && myRole !== "owner") {
    throw new Error("Officers can only remove regular members.");
  }
  await ctx.db.run("UPDATE profiles SET clan_id = NULL, member_role = NULL WHERE id = ?", [target.id]);
  await postClanEvent(ctx, clan.id, meId, "kick", `${target.name} was removed from the guild`);
  return null;
}

/* --------------------------------- feed ---------------------------------- */

/** The guild's recent activity, newest first. */
export async function feed(ctx: Ctx) {
  if (!ctx.userId) return [];
  const me = await profileForUser(ctx, ctx.userId);
  if (!me?.clan_id) return [];
  const events = await ctx.db.all<{
    id: string;
    actor_id: string;
    kind: string;
    text: string;
    created_at: number;
  }>(
    `SELECT id, actor_id, kind, text, created_at FROM clan_events
      WHERE clan_id = ? ORDER BY created_at DESC LIMIT 15`,
    [me.clan_id],
  );

  const actors = new Map<string, { name: string; ascension: string | null; level: number }>();
  const out: FeedEvent[] = [];
  for (const event of events) {
    let actor = actors.get(event.actor_id);
    if (!actor) {
      const profile = await profileForUser(ctx, event.actor_id);
      actor = profile
        ? { name: profile.name, ascension: profile.ascension, level: profile.level }
        : { name: "A former member", ascension: null, level: 1 };
      actors.set(event.actor_id, actor);
    }
    out.push({
      _id: event.id,
      kind: event.kind as ClanEventKind,
      text: event.text,
      createdAt: event.created_at,
      actorName: actor.name,
      actorAscension: actor.ascension,
      actorLevel: actor.level,
      isMe: event.actor_id === ctx.userId,
    });
  }
  return out;
}
