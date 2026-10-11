import { getAuthUserId } from "@convex-dev/auth/server";
import { internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  loginKey,
  normalizeRecoveryEmail,
  recoveryAddressFor,
} from "../lib/accountIdentity";

/**
 * Who am I? Returns the signed-in user's own name, username and recovery
 * address (visible only to them), or null. Legacy accounts show their email as
 * their username because that is their sign-in key.
 */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return {
      name: (user.name as string | undefined) ?? "",
      username: user.username ?? user.email ?? "",
      recoveryEmail: user.recoveryEmail ?? null,
    };
  },
});

/** Sets or clears (blank) the recovery address for the signed-in account. */
export const setRecoveryEmail = mutation({
  args: { email: v.optional(v.string()) },
  handler: async (ctx, { email }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const recoveryEmail = normalizeRecoveryEmail(email);
    await ctx.db.patch(userId, { recoveryEmail });
  },
});

/**
 * Internal only: the address a reset code for this login key goes to, or null.
 * Never exposed to clients.
 */
export const recoveryEmailFor = internalQuery({
  args: { identifier: v.string() },
  handler: async (ctx, { identifier }) => {
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", loginKey(identifier)),
      )
      .unique();
    if (!account) return null;
    const user = await ctx.db.get(account.userId);
    if (!user) return null;
    return recoveryAddressFor(user);
  },
});

/** Called once right after sign-up to persist the learner's display name. */
export const setName = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    await ctx.db.patch(userId, { name: name.trim().slice(0, 60) });
  },
});
