/*
 * Account identity rules, shared by the Convex auth provider and the client.
 *
 * Sign-in key: a username, 3–24 characters of a–z, 0–9 or underscore. It is
 * case-insensitive and stored lowercase. Accounts made before usernames
 * existed signed in with an email address; that email still works as their
 * key, and it is also their recovery address.
 *
 * Recovery email: optional. It only receives password-reset codes. It is
 * never shown publicly.
 */

export const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Normalizes whatever the user typed into the key the server stores. */
export function loginKey(raw: string): string {
  return raw.trim().toLowerCase();
}

/** True for a key made of an email address (accounts created before usernames). */
export function isLegacyEmailKey(key: string): boolean {
  return key.includes("@");
}

/** Validates a username chosen at sign-up. Throws a user-facing message. */
export function assertNewUsername(raw: string): string {
  const key = loginKey(raw);
  if (!USERNAME_PATTERN.test(key)) {
    throw new Error("Usernames are 3–24 letters, numbers or underscores.");
  }
  return key;
}

/** Validates the optional recovery email. Blank means none. */
export function normalizeRecoveryEmail(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  const value = String(raw).trim().toLowerCase();
  if (value === "") return undefined;
  if (value.length > 254 || !EMAIL_PATTERN.test(value)) {
    throw new Error("Enter a valid recovery email, or leave it blank.");
  }
  return value;
}

/**
 * Where a reset code for this account is sent, or null when there is no
 * address on file (then no code is sent and the account cannot be recovered).
 */
export function recoveryAddressFor(user: {
  recoveryEmail?: string;
  email?: string;
}): string | null {
  if (user.recoveryEmail) return user.recoveryEmail;
  if (user.email && isLegacyEmailKey(user.email)) return user.email;
  return null;
}

/** The name shown publicly. It is never an email address. */
export function publicDisplayName(
  user: { name?: string; username?: string },
  max = 40,
): string {
  const name = (user.name ?? "").trim();
  if (name) return name.slice(0, max);
  const username = user.username && !isLegacyEmailKey(user.username) ? user.username : "";
  return (username || "Learner").slice(0, max);
}
