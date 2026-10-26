/*
 * Account rows.
 *
 * The identity itself is Freebuff's: `sub` is the stable account id, and the
 * name/email/picture are profile data we may or may not receive. We keep a row
 * per account so a learner can choose the display name that appears on the
 * leaderboard and on certificates, independent of the name in their Freebuff
 * profile.
 */
import type { AccountRow, Ctx, Db } from "./context";
import { ApiError, cleanText, requireUser } from "./context";

export const MAX_DISPLAY_NAME = 40;

type AccountDbRow = {
  id: string;
  name: string;
  email: string | null;
  picture: string | null;
  created_at: number;
};

function toAccount(row: AccountDbRow): AccountRow {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    picture: row.picture,
    createdAt: row.created_at,
  };
}

/**
 * Record (or refresh) the account behind a verified session. Called by the
 * Worker after it validates the session cookie; `sub` comes from the identity
 * provider, never from the request.
 *
 * The display name is seeded from the profile once and then left alone: a
 * learner who renames themselves keeps their choice even if their Freebuff
 * profile name changes later.
 */
export async function ensureAccount(
  db: Db,
  user: { sub: string; name?: string; email?: string; picture?: string },
): Promise<AccountRow> {
  const existing = await db.first<AccountDbRow>(
    "SELECT id, name, email, picture, created_at FROM accounts WHERE id = ?",
    [user.sub],
  );
  const now = Date.now();
  const seeded = cleanText(user.name, MAX_DISPLAY_NAME);

  if (!existing) {
    await db.run(
      "INSERT INTO accounts (id, name, email, picture, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      [user.sub, seeded, user.email ?? null, user.picture ?? null, now, now],
    );
    return {
      id: user.sub,
      name: seeded,
      email: user.email ?? null,
      picture: user.picture ?? null,
      createdAt: now,
    };
  }

  const name = existing.name || seeded;
  const email = user.email ?? existing.email;
  const picture = user.picture ?? existing.picture;
  if (name !== existing.name || email !== existing.email || picture !== existing.picture) {
    await db.run("UPDATE accounts SET name = ?, email = ?, picture = ?, updated_at = ? WHERE id = ?", [
      name,
      email,
      picture,
      now,
      user.sub,
    ]);
  }
  return { ...toAccount(existing), name, email, picture };
}

/** The learner's own account row, and the name shown publicly. */
export function accountName(account: AccountRow | null): string {
  const name = cleanText(account?.name, MAX_DISPLAY_NAME);
  if (name) return name;
  const email = account?.email ?? "";
  const local = email.includes("@") ? email.slice(0, email.indexOf("@")) : "";
  return cleanText(local, MAX_DISPLAY_NAME) || "Learner";
}

/** `users.me` — only ever the caller's own row. */
export async function me(ctx: Ctx) {
  if (!ctx.account) return null;
  return {
    handle: ctx.account.id,
    name: ctx.account.name,
    email: ctx.account.email,
    picture: ctx.account.picture,
  };
}

/** `users.setName` — the display name used by the board and certificates. */
export async function setName(ctx: Ctx, args: { name?: unknown }) {
  const userId = requireUser(ctx);
  const name = cleanText(args?.name, MAX_DISPLAY_NAME);
  if (name.length < 2) throw new ApiError("Pick a display name with at least 2 characters.");
  await ctx.db.run("UPDATE accounts SET name = ?, updated_at = ? WHERE id = ?", [
    name,
    Date.now(),
    userId,
  ]);
  return null;
}
