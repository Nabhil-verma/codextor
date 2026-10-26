/*
 * Display preferences that follow the learner across devices.
 *
 * The appearance style (glass ⇄ minimal) is read from localStorage before the
 * bundle loads, so the local copy stays authoritative while signed out. This
 * table is a mirror for signed-in accounts, one row per user, last write wins.
 */
import type { Ctx } from "./context";

export async function get(ctx: Ctx) {
  if (!ctx.userId) return null;
  const row = await ctx.db.first<{ theme_style: string | null }>(
    "SELECT theme_style FROM preferences WHERE user_id = ?",
    [ctx.userId],
  );
  return { themeStyle: row?.theme_style === "minimal" ? "minimal" : row?.theme_style === "glass" ? "glass" : null };
}

/** A debounced push can land after sign-out: drop it, the local copy is kept. */
export async function save(ctx: Ctx, args: { themeStyle?: unknown }) {
  if (!ctx.userId) return null;
  const themeStyle = args?.themeStyle === "minimal" ? "minimal" : args?.themeStyle === "glass" ? "glass" : null;
  if (!themeStyle) throw new Error("Unknown appearance style.");
  await ctx.db.run(
    `INSERT INTO preferences (user_id, theme_style, updated_at) VALUES (?, ?, ?)
     ON CONFLICT (user_id) DO UPDATE SET theme_style = excluded.theme_style, updated_at = excluded.updated_at`,
    [ctx.userId, themeStyle, Date.now()],
  );
  return null;
}
