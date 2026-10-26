/*
 * Cloud data access for the Codextor Worker API.
 *
 * This is deliberately small: a query cache with subscribers, a fetch call,
 * and the two hooks the pages use. A successful mutation refreshes every
 * query with a live subscriber, which gives the same "the board updates when
 * you act" behaviour the pages had with a reactive backend.
 *
 * Signing out (401) resolves a query to `null` — the signed-out answer every
 * endpoint already has — and clears the cache so the next account never sees
 * the previous one's rows.
 */
import { useCallback, useEffect, useState } from "react";
import type { ApiRef } from "./api";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type CacheEntry = {
  data: unknown;
  error: unknown;
  pending: Promise<void> | null;
  listeners: Set<() => void>;
};

const cache = new Map<string, CacheEntry>();
/**
 * Bumped whenever the signed-in account changes. It is part of every cache
 * key, so one account's rows can never be served to the next one.
 */
let epoch = 0;

function entryFor(key: string): CacheEntry {
  let entry = cache.get(key);
  if (!entry) {
    entry = { data: undefined, error: undefined, pending: null, listeners: new Set() };
    cache.set(key, entry);
  }
  return entry;
}

/** Stable serialization for cache keys: key order must not create a new query. */
function serialize(args: unknown): string {
  if (args === undefined || args === null) return "";
  if (typeof args !== "object") return JSON.stringify(args);
  const record = args as Record<string, unknown>;
  return JSON.stringify(
    Object.keys(record)
      .sort()
      .filter((k) => record[k] !== undefined)
      .map((k) => [k, record[k]]),
  );
}

/** The arguments back out of a cache key, so a refresh can replay the query. */
function decodeArgs(serialized: string): unknown {
  if (!serialized) return {};
  const parsed = JSON.parse(serialized) as unknown;
  return Array.isArray(parsed) ? Object.fromEntries(parsed as [string, unknown][]) : parsed;
}

async function post(name: string, args: unknown): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch("/api/rpc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fn: name, args: args ?? {} }),
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError("The Codextor servers are unreachable right now.", 0);
  }

  const body = (await response.json().catch(() => null)) as
    | { result?: unknown; error?: { message?: string } }
    | null;

  if (!response.ok) {
    throw new ApiError(
      body?.error?.message ?? `That request failed (${response.status}).`,
      response.status,
    );
  }
  return body?.result ?? null;
}

function notify(entry: CacheEntry) {
  for (const listener of entry.listeners) listener();
}

function load(key: string, name: string, args: unknown): Promise<void> {
  const entry = entryFor(key);
  if (entry.pending) return entry.pending;
  entry.pending = post(name, args)
    .then((data) => {
      entry.data = data;
      entry.error = undefined;
    })
    .catch((error) => {
      if (error instanceof ApiError && error.status === 401) {
        entry.data = null;
        entry.error = undefined;
        return;
      }
      entry.error = error;
    })
    .finally(() => {
      entry.pending = null;
      notify(entry);
    });
  return entry.pending;
}

/** Refresh every query that is currently mounted after a write. */
export function refreshQueries() {
  for (const [key, entry] of cache) {
    if (entry.listeners.size === 0) continue;
    // Key shape: `${epoch}|${endpoint}|${serialized args}` — args may contain
    // pipes, so only the first two separators are structural.
    const first = key.indexOf("|");
    const second = key.indexOf("|", first + 1);
    void load(key, key.slice(first + 1, second), decodeArgs(key.slice(second + 1)));
  }
}

/** Drop every cached row (sign-in and sign-out both start from nothing). */
export function resetCloudCache() {
  epoch += 1;
  cache.clear();
}

/**
 * One query. Returns `undefined` until the first answer arrives, exactly like
 * the reactive client this replaced; a signed-out caller gets the endpoint's
 * own signed-out answer.
 */
export function useQuery<A, R>(ref: ApiRef<"query", A, R>, args?: A): R | undefined {
  // Callers pass object literals, so the effect keys off the serialized query —
  // never off object identity, which would refetch on every render.
  const serialized = serialize(args);
  const key = `${epoch}|${ref.name}|${serialized}`;
  const [, bump] = useState(0);

  useEffect(() => {
    let active = true;
    const entry = entryFor(key);
    const listener = () => {
      if (active) bump((n) => n + 1);
    };
    entry.listeners.add(listener);
    // A cached answer is still refreshed so another device's write shows up.
    void load(key, ref.name, decodeArgs(serialized));
    return () => {
      active = false;
      entry.listeners.delete(listener);
    };
  }, [key, ref.name, serialized]);

  const entry = entryFor(key);
  if (entry.data === undefined && entry.error) throw entry.error;
  return entry.data as R | undefined;
}

/** A mutation, plus a refresh of every mounted query on success. */
export function useMutation<A, R>(ref: ApiRef<"mutation", A, R>): (args: A) => Promise<R> {
  return useCallback(
    async (args: A) => {
      const result = (await post(ref.name, args ?? {})) as R;
      refreshQueries();
      return result;
    },
    [ref.name],
  );
}

/**
 * Re-read a single query outside a component's render cycle; used after a
 * sign-in, when the session cookie changed under the mounted pages.
 */
export function refreshAll() {
  refreshQueries();
}
