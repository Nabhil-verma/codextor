import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { mergeAtlasState, sanitizeAtlasAnswers, type AtlasState } from "../lib/atlasInterview";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const row = await ctx.db.query("atlas").withIndex("by_user", (q) => q.eq("userId", userId)).unique();
    return { answers: sanitizeAtlasAnswers(row?.answers), revision: row?.revision ?? 0 };
  },
});

export const save = mutation({
  args: { answers: v.record(v.string(), v.string()), revision: v.optional(v.number()) },
  handler: async (ctx, { answers, revision = 0 }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    if (!Number.isSafeInteger(revision) || revision < 0) throw new Error("Invalid plan revision");
    const incoming: AtlasState = { answers: sanitizeAtlasAnswers(answers), revision };
    const row = await ctx.db.query("atlas").withIndex("by_user", (q) => q.eq("userId", userId)).unique();
    if (row) {
      const next = mergeAtlasState({ answers: sanitizeAtlasAnswers(row.answers), revision: row.revision ?? 0 }, incoming);
      await ctx.db.patch(row._id, { ...next, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("atlas", { userId, ...incoming, updatedAt: Date.now() });
    }
  },
});
