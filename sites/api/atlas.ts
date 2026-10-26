/*
 * Atlas interview answers, one row per account.
 *
 * Newer revisions win; equal revisions break ties on sorted content, so a push
 * and a pull converge from either side. An empty snapshot is deliberate (every
 * question is skippable) and must survive the merge.
 */
import type { Ctx } from "./context";

import { mergeAtlasState, sanitizeAtlasAnswers } from "../../src/lib/atlasInterview";

export async function get(ctx: Ctx) {
  if (!ctx.userId) return null;
  const row = await ctx.db.first<{ answers: string; revision: number }>(
    "SELECT answers, revision FROM atlas WHERE user_id = ?",
    [ctx.userId],
  );
  let answers: unknown = {};
  try {
    answers = row ? JSON.parse(row.answers) : {};
  } catch {
    answers = {};
  }
  return { answers: sanitizeAtlasAnswers(answers), revision: row?.revision ?? 0 };
}

export async function save(ctx: Ctx, args: { answers?: unknown; revision?: unknown }) {
  // Signed out (a debounced write landing after sign-out): drop it, exactly
  // like the progress push. The device keeps its own copy.
  if (!ctx.userId) return null;
  const userId = ctx.userId;
  const revision = args?.revision === undefined ? 0 : args.revision;
  if (typeof revision !== "number" || !Number.isSafeInteger(revision) || revision < 0) {
    throw new Error("Invalid plan revision.");
  }
  const incoming = { answers: sanitizeAtlasAnswers(args?.answers), revision };

  const row = await ctx.db.first<{ answers: string; revision: number }>(
    "SELECT answers, revision FROM atlas WHERE user_id = ?",
    [userId],
  );
  // With no stored snapshot there is nothing to weigh the first save against:
  // merging an empty revision-0 state would pick a winner by JSON shape.
  let next = incoming;
  if (row) {
    let stored: unknown = {};
    try {
      stored = JSON.parse(row.answers);
    } catch {
      stored = {};
    }
    next = mergeAtlasState(
      { answers: sanitizeAtlasAnswers(stored), revision: row.revision },
      incoming,
    );
  }

  await ctx.db.run(
    `INSERT INTO atlas (user_id, answers, revision, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT (user_id) DO UPDATE SET
       answers = excluded.answers, revision = excluded.revision, updated_at = excluded.updated_at`,
    [userId, JSON.stringify(next.answers), next.revision, Date.now()],
  );
  return null;
}
