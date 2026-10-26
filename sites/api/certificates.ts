/*
 * Verifiable certificates.
 *
 * PUBLIC: a code, the track it certifies, the display name chosen at issue
 * time, and the issue date. PRIVATE: the account behind it — no function here
 * returns a user id or anything from the progress map.
 *
 * Completion is read from the score map the client synced, which is the same
 * trust level as the XP on the leaderboard: a certificate proves the server
 * stored every lesson of a track as passed.
 */
import type { Ctx } from "./context";
import { accountName } from "./accounts";
import { cleanText, requireUser } from "./context";
import { TRACK_LESSON_KEYS, TRACK_TITLES } from "../../src/lib/curriculum.generated";
import type { PublicCertificate } from "../../src/lib/apiTypes";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/1/I/O
const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{12}$/;
const MAX_NAME = 60;

type CertificateRow = {
  code: string;
  track_id: string;
  track_title: string;
  display_name: string;
  issued_at: number;
};

/** The only shape a certificate leaves the server in. */
function publicCertificate(row: CertificateRow): PublicCertificate {
  return {
    code: row.code,
    trackId: row.track_id,
    trackTitle: row.track_title,
    displayName: row.display_name,
    issuedAt: row.issued_at,
  };
}

function randomCode(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return out;
}

/** Lessons in `keys` with no passing score. `key` and `key!day` both count. */
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

/** Issue the caller's certificate for a track. Idempotent: same code on retry. */
export async function issue(ctx: Ctx, args: { trackId?: unknown; displayName?: unknown }) {
  const userId = requireUser(ctx);
  const trackId = String(args?.trackId ?? "");
  const keys = Object.prototype.hasOwnProperty.call(TRACK_LESSON_KEYS, trackId)
    ? TRACK_LESSON_KEYS[trackId]
    : undefined;
  const trackTitle = Object.prototype.hasOwnProperty.call(TRACK_TITLES, trackId)
    ? TRACK_TITLES[trackId]
    : undefined;
  if (!keys || !trackTitle) throw new Error("That track does not exist.");

  const existing = await ctx.db.first<CertificateRow>(
    `SELECT code, track_id, track_title, display_name, issued_at
       FROM certificates WHERE user_id = ? AND track_id = ?`,
    [userId, trackId],
  );
  if (existing) return publicCertificate(existing);

  const progress = await ctx.db.first<{ data: string }>(
    "SELECT data FROM progress WHERE user_id = ?",
    [userId],
  );
  let completed: Record<string, unknown> = {};
  try {
    completed = progress?.data ? (JSON.parse(progress.data) as Record<string, unknown>) : {};
  } catch {
    completed = {};
  }
  const missing = missingLessons(completed, keys);
  if (missing > 0) {
    throw new Error(
      `Not finished yet: ${missing} lesson${missing === 1 ? "" : "s"} left in ${trackTitle}.`,
    );
  }

  const chosen = cleanText(args?.displayName, MAX_NAME);
  const displayName = chosen || cleanText(ctx.account?.name, MAX_NAME) || accountName(ctx.account);
  const issuedAt = Date.now();
  const code = randomCode();
  await ctx.db.run(
    `INSERT INTO certificates (id, user_id, track_id, track_title, code, display_name, issued_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), userId, trackId, trackTitle, code, displayName, issuedAt],
  );
  return { code, trackId, trackTitle, displayName, issuedAt };
}

/** Public check of a code. Returns nothing about the account. */
export async function verify(ctx: Ctx, args: { code?: unknown }) {
  const clean = String(args?.code ?? "").trim().toUpperCase();
  if (!CODE_PATTERN.test(clean)) return { valid: false as const };
  const row = await ctx.db.first<CertificateRow>(
    `SELECT code, track_id, track_title, display_name, issued_at FROM certificates WHERE code = ?`,
    [clean],
  );
  if (!row) return { valid: false as const };
  return { valid: true as const, ...publicCertificate(row) };
}

async function certificatesOf(ctx: Ctx, userId: string): Promise<PublicCertificate[]> {
  const rows = await ctx.db.all<CertificateRow>(
    `SELECT code, track_id, track_title, display_name, issued_at
       FROM certificates WHERE user_id = ? ORDER BY issued_at DESC LIMIT 50`,
    [userId],
  );
  return rows.map(publicCertificate);
}

/** The certificates a public profile has earned, looked up by profile id. */
export async function listForProfile(ctx: Ctx, args: { profileId?: unknown }) {
  const profile = await ctx.db.first<{ user_id: string }>(
    "SELECT user_id FROM profiles WHERE id = ?",
    [String(args?.profileId ?? "")],
  );
  if (!profile) return [];
  return certificatesOf(ctx, profile.user_id);
}

/** The caller's own certificates, with their codes. */
export async function mine(ctx: Ctx) {
  if (!ctx.userId) return [];
  return certificatesOf(ctx, ctx.userId);
}
