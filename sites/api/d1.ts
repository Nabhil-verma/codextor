/*
 * D1 → the backend's `Db` interface.
 *
 * Only the pieces the backend uses are typed. D1 returns column names exactly
 * as written (our selects alias into camelCase), so no row mapping is needed
 * beyond the per-module casts.
 */
import type { Db, Row } from "./context";

type D1Result<T> = { results?: T[] };

/**
 * The subset of a D1 prepared statement this backend relies on. Declared
 * locally so the Worker bundle needs no Workers type package.
 */
export type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T = Row>(): Promise<D1Result<T>>;
  first<T = Row>(): Promise<T | null>;
  run(): Promise<unknown>;
};

export type D1Database = {
  prepare(sql: string): D1PreparedStatement;
};

export function d1(db: D1Database): Db {
  return {
    async all<T = Row>(sql: string, params: readonly unknown[] = []): Promise<T[]> {
      const statement = params.length ? db.prepare(sql).bind(...params) : db.prepare(sql);
      const result = await statement.all<T>();
      return result.results ?? [];
    },
    async first<T = Row>(sql: string, params: readonly unknown[] = []): Promise<T | null> {
      const statement = params.length ? db.prepare(sql).bind(...params) : db.prepare(sql);
      return (await statement.first<T>()) ?? null;
    },
    async run(sql: string, params: readonly unknown[] = []): Promise<void> {
      const statement = params.length ? db.prepare(sql).bind(...params) : db.prepare(sql);
      await statement.run();
    },
  };
}
