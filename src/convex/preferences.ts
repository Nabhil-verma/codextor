import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/*
 * Display preferences that follow the learner across devices.
 *
 * The appearance style (glass ⇄ minimal) was per-browser only: the local
 * copy is what the pre-paint script and the store read, so it stays the source
 * of truth while signed out — this table is a mirror for signed-in accounts,
 * never a requirement. One row per user; a display choice is last-write-wins
 * (unlike scores and claims, it has no merge story).
 */

const styleValidator = v.union(v.literal("glass"), v.literal("minimal"));

/** The signed-in learner's saved preference, or null when signed out. */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const row = await ctx.db
      .query("preferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    return { themeStyle: row?.themeStyle ?? null };
  },
});

/**
 * Upsert the account's appearance style. Signed-out writes (a debounced push
 * that lands after sign-out) are dropped — there is no account to write to,
 * and the local copy already remembers the choice.
 */
export const save = mutation({
  args: { themeStyle: styleValidator },
  handler: async (ctx, { themeStyle }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const row = await ctx.db
      .query("preferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (row) {
      await ctx.db.patch(row._id, { themeStyle, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("preferences", { userId, themeStyle, updatedAt: Date.now() });
    }
  },
});
