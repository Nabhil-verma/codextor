/*
 * An in-memory backend for tests.
 *
 * The production backend runs on D1 (SQLite in Workers). This harness applies
 * the exact same schema to Node's built-in SQLite and calls the exact same
 * endpoint handlers, with an explicit signed-in account per call. Seeding
 * helpers write the rows directly, so a test can start from a state the app
 * could only reach over time.
 */
import { DatabaseSync } from "node:sqlite";
import type { ApiRef } from "../../src/lib/api";
import type { AccountRow, Ctx, Db, Row } from "../../sites/api/context";
import { ensureAccount } from "../../sites/api/accounts";
import { endpoints } from "../../sites/api/registry";
import { SCHEMA } from "../../sites/api/schema";

type AnyRef = ApiRef<"query" | "mutation", unknown, unknown>;

export type Caller = {
  query: (ref: AnyRef, args?: unknown) => Promise<unknown>;
  mutation: (ref: AnyRef, args?: unknown) => Promise<unknown>;
};

export type SeedProfile = {
  userId: string;
  name?: string;
  xp?: number;
  xpWeek?: number;
  xpMonth?: number;
  level?: number;
  ascension?: string;
  title?: string | null;
  streakCurrent?: number;
  streakLongest?: number;
  lessonsDone?: number;
  clanId?: string | null;
  memberRole?: "officer" | null;
};

function sqliteDb(file: DatabaseSync): Db {
  return {
    async all<T = Row>(sql: string, params: readonly unknown[] = []): Promise<T[]> {
      return file.prepare(sql).all(...(params as never[])) as T[];
    },
    async first<T = Row>(sql: string, params: readonly unknown[] = []): Promise<T | null> {
      const row = file.prepare(sql).get(...(params as never[]));
      return (row as T | undefined) ?? null;
    },
    async run(sql: string, params: readonly unknown[] = []): Promise<void> {
      file.prepare(sql).run(...(params as never[]));
    },
  };
}

export function createBackend() {
  const file = new DatabaseSync(":memory:");
  for (const statement of SCHEMA) file.exec(statement);
  const db = sqliteDb(file);

  async function contextFor(userId: string | null): Promise<Ctx> {
    let account: AccountRow | null = null;
    if (userId) {
      const row = await db.first<{
        id: string;
        name: string;
        email: string | null;
        picture: string | null;
        created_at: number;
      }>("SELECT id, name, email, picture, created_at FROM accounts WHERE id = ?", [userId]);
      if (row) {
        account = {
          id: row.id,
          name: row.name,
          email: row.email,
          picture: row.picture,
          createdAt: row.created_at,
        };
      }
    }
    return { db, userId, account };
  }

  async function call(userId: string | null, ref: AnyRef, args?: unknown): Promise<unknown> {
    const handler = endpoints[ref.name as keyof typeof endpoints];
    if (!handler) throw new Error(`Unknown endpoint ${ref.name}`);
    return handler(await contextFor(userId), args ?? {});
  }

  async function seedUser(input: {
    id?: string;
    name?: string;
    email?: string;
    /** Account age, for streak clamps. */
    createdAt?: number;
  }): Promise<string> {
    const id = input.id ?? crypto.randomUUID();
    await ensureAccount(db, {
      sub: id,
      name: input.name,
      email: input.email ?? `${id}@example.test`,
    });
    if (input.createdAt !== undefined) {
      await db.run("UPDATE accounts SET created_at = ? WHERE id = ?", [input.createdAt, id]);
    }
    return id;
  }

  async function seedProfile(input: SeedProfile): Promise<string> {
    const id = crypto.randomUUID();
    const now = Date.now();
    await db.run(
      `INSERT INTO profiles (id, user_id, name, xp, xp_week, xp_month, level, ascension, title,
         streak_current, streak_longest, last_active_day, member_role, lessons_done, clan_id,
         updated_at, clamped_at, clamp_log, sync_window_start, sync_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, NULL, NULL, NULL, 0)`,
      [
        id,
        input.userId,
        input.name ?? "Learner",
        input.xp ?? 0,
        input.xpWeek ?? 0,
        input.xpMonth ?? 0,
        input.level ?? 1,
        input.ascension ?? "initiate",
        input.title ?? null,
        input.streakCurrent ?? 0,
        input.streakLongest ?? 0,
        input.memberRole ?? null,
        input.lessonsDone ?? 0,
        input.clanId ?? null,
        now,
      ],
    );
    return id;
  }

  async function seedClan(input: {
    name: string;
    tag: string;
    blurb?: string;
    ownerId: string;
  }): Promise<string> {
    const id = crypto.randomUUID();
    await db.run(
      "INSERT INTO clans (id, name, tag, blurb, owner_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [id, input.name, input.tag, input.blurb ?? "", input.ownerId, Date.now()],
    );
    return id;
  }

  async function seedProgress(userId: string, data: Record<string, number>): Promise<void> {
    await db.run(
      `INSERT INTO progress (user_id, data, claims, attempts, updated_at) VALUES (?, ?, '{}', '{}', ?)
       ON CONFLICT (user_id) DO UPDATE SET data = excluded.data`,
      [userId, JSON.stringify(data), Date.now()],
    );
  }

  return {
    /** Signed-out caller. */
    query: (ref: AnyRef, args?: unknown) => call(null, ref, args),
    mutation: (ref: AnyRef, args?: unknown) => call(null, ref, args),
    /** Signed in as this account. */
    as(userId: string): Caller {
      return {
        query: (ref, args) => call(userId, ref, args),
        mutation: (ref, args) => call(userId, ref, args),
      };
    },
    seedUser,
    seedProfile,
    seedClan,
    seedProgress,
    /** Raw read, for the few assertions that are about stored rows. */
    async rows<T = Row>(sql: string, params: readonly unknown[] = []): Promise<T[]> {
      return db.all<T>(sql, params);
    },
    /** Raw write, for arranging state the handlers don't expose. */
    async sql(sql: string, params: readonly unknown[] = []): Promise<void> {
      await db.run(sql, params);
    },
    close() {
      file.close();
    },
  };
}

export type Backend = ReturnType<typeof createBackend>;
