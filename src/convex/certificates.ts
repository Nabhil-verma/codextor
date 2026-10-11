import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { TRACK_LESSON_KEYS, TRACK_TITLES } from "./curriculum";

/*
 * Verifiable certificates.
 *
 * PUBLIC: a certificate's code, the track it certifies, the display name chosen
 * at issue time, and the issue date. Anyone with the code can check it.
 *
 * PRIVATE: the account behind it. No public function here returns a userId, an
 * email, or anything from the progress map. Issuing requires a signed-in
 * session, and the track to certify is looked up on the server, so a client
 * cannot ask for a certificate on someone else's behalf.
 *
 * Trust: completion is read from the progress map the client synced, which is
 * the same trust level as the XP on the leaderboard. A certificate proves the
 * server stored all of a track's lessons as passed, not that a human did them.
 */

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/1/I/O
const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{12}$/;
const MAX_NAME = 60;

export type PublicCertificate = {
  code: string;
  trackId: string;
  trackTitle: string;
  displayName: string;
  issuedAt: number;
};

/** The only shape a certificate leaves the server in. */
export function publicCertificate(row: Doc<"certificates">): PublicCertificate {
  return {
    code: row.code,
    trackId: row.trackId,
    trackTitle: row.trackTitle,
    displayName: row.displayName,
    issuedAt: row.issuedAt,
  };
}

function randomCode(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return out;
}

/** Lessons in `keys` with no passing score in a progress map. `key` and `key!day` both count. */
export function missingLessons(completed: Record<string, unknown>, keys: string[]): number {
  let missing = 0;
  for (const key of keys) {
    let best = 0;
    for (const [entry, score] of Object.entries(completed)) {
      if (typeof score !== "number") continue;
      if (entry === key || entry.startsWith(key + "!")) best = Math.max(best, score);
    }
    if (best < 1) missing += 1;
  }
  return missing;
}

/**
 * Issue the signed-in learner's certificate for a track. Idempotent: asking
 * again returns the certificate already issued, with the same code.
 */
export const issue = mutation({
  args: { trackId: v.string(), displayName: v.optional(v.string()) },
  handler: async (ctx, { trackId, displayName }): Promise<PublicCertificate> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in to get a certificate.");

    const keys = Object.prototype.hasOwnProperty.call(TRACK_LESSON_KEYS, trackId)
      ? TRACK_LESSON_KEYS[trackId]
      : undefined;
    const trackTitle = Object.prototype.hasOwnProperty.call(TRACK_TITLES, trackId)
      ? TRACK_TITLES[trackId]
      : undefined;
    if (!keys || !trackTitle) throw new Error("That track does not exist.");

    const existing = await ctx.db
      .query("certificates")
      .withIndex("by_user_track", (q) => q.eq("userId", userId).eq("trackId", trackId))
      .unique();
    if (existing) return publicCertificate(existing);

    const progress = await ctx.db
      .query("progress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const completed = (progress?.data ?? {}) as Record<string, unknown>;
    const missing = missingLessons(completed, keys);
    if (missing > 0) {
      throw new Error(
        `Not finished yet: ${missing} lesson${missing === 1 ? "" : "s"} left in ${trackTitle}.`,
      );
    }

    const user = await ctx.db.get(userId);
    const chosen = (displayName ?? "").trim().slice(0, MAX_NAME);
    const name = chosen || (user?.name as string | undefined)?.slice(0, MAX_NAME) || "Learner";

    const id = await ctx.db.insert("certificates", {
      userId,
      trackId,
      trackTitle,
      code: randomCode(),
      displayName: name,
      issuedAt: Date.now(),
    });
    const row = await ctx.db.get(id);
    return publicCertificate(row!);
  },
});

/** Public check of a certificate code. Returns nothing about the account. */
export const verify = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const clean = code.trim().toUpperCase();
    if (!CODE_PATTERN.test(clean)) return { valid: false as const };
    const row = await ctx.db
      .query("certificates")
      .withIndex("by_code", (q) => q.eq("code", clean))
      .unique();
    if (!row) return { valid: false as const };
    return { valid: true as const, ...publicCertificate(row) };
  },
});

/** The certificates a public profile has earned. Looked up by profile, never by account. */
export const listForProfile = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }): Promise<PublicCertificate[]> => {
    const profile = await ctx.db.get(profileId);
    if (!profile) return [];
    return certificatesOf(ctx, profile.userId);
  },
});

async function certificatesOf(ctx: QueryCtx, userId: Doc<"users">["_id"]): Promise<PublicCertificate[]> {
  const rows = await ctx.db
    .query("certificates")
    .withIndex("by_user_track", (q) => q.eq("userId", userId))
    .take(50);
  return rows.map(publicCertificate).sort((a, b) => b.issuedAt - a.issuedAt);
}

/** The signed-in learner's own certificates, with their codes. */
export const mine = query({
  args: {},
  handler: async (ctx): Promise<PublicCertificate[]> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return certificatesOf(ctx, userId);
  },
});
