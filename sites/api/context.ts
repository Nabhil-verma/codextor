/*
 * The backend's database surface.
 *
 * Rows live in a Freebuff Sites D1 database (SQLite). Everything below is the
 * smallest interface both D1 and the in-memory test database can satisfy; every
 * statement is parameterized, never built from user input.
 */

export type Row = Record<string, unknown>;

export interface Db {
  /** Every matching row. */
  all<T = Row>(sql: string, params?: readonly unknown[]): Promise<T[]>;
  /** The first matching row, or null. */
  first<T = Row>(sql: string, params?: readonly unknown[]): Promise<T | null>;
  /** A write. */
  run(sql: string, params?: readonly unknown[]): Promise<void>;
}

/** The signed-in learner's account row. */
export type AccountRow = {
  id: string;
  name: string;
  email: string | null;
  picture: string | null;
  createdAt: number;
};

/**
 * What every endpoint receives. `userId` is always the session's own account —
 * never a value taken from the request body — so handlers cannot be talked
 * into touching someone else's rows.
 */
export type Ctx = {
  db: Db;
  userId: string | null;
  account: AccountRow | null;
};

/** An error that becomes a JSON response with a status and a readable message. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** The caller's account id, or a 401. */
export function requireUser(ctx: Ctx): string {
  if (!ctx.userId) throw new ApiError("Sign in to do that.", 401);
  return ctx.userId;
}

/** Trim, collapse whitespace and cap a user-supplied string. */
export function cleanText(raw: unknown, max: number): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/g, " ").trim().slice(0, max);
}

/** Coerce anything to a finite, non-negative integer the database can sort on. */
export function count(raw: unknown, hi = 10_000_000): number {
  const n = typeof raw === "number" && Number.isFinite(raw) ? Math.floor(raw) : 0;
  return Math.min(hi, Math.max(0, n));
}

/** `YYYY-MM-DD` in UTC. */
export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** JSON columns arrive as text; a damaged value reads as empty rather than throwing. */
export function parseJson<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== "string" || raw === "") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
