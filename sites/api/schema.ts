/*
 * The D1 schema.
 *
 * It is applied lazily, idempotently, by the Worker on first use: the platform
 * provisions the database but not its tables. Every statement is
 * `IF NOT EXISTS`, so concurrent cold starts and the local test database all
 * converge on the same shape.
 *
 * Rows are keyed by the Freebuff account id (`sub`) in `accounts.id` and every
 * `user_id` column. Nothing stores a password, token or session.
 */
import type { Db } from "./context";

export const SCHEMA: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    email TEXT,
    picture TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS progress (
    user_id TEXT PRIMARY KEY,
    data TEXT NOT NULL DEFAULT '{}',
    claims TEXT NOT NULL DEFAULT '{}',
    attempts TEXT NOT NULL DEFAULT '{}',
    updated_at INTEGER NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS atlas (
    user_id TEXT PRIMARY KEY,
    answers TEXT NOT NULL DEFAULT '{}',
    revision INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    xp INTEGER NOT NULL DEFAULT 0,
    xp_week INTEGER NOT NULL DEFAULT 0,
    xp_month INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    ascension TEXT NOT NULL DEFAULT 'initiate',
    title TEXT,
    streak_current INTEGER NOT NULL DEFAULT 0,
    streak_longest INTEGER NOT NULL DEFAULT 0,
    last_active_day TEXT,
    member_role TEXT,
    lessons_done INTEGER NOT NULL DEFAULT 0,
    clan_id TEXT,
    updated_at INTEGER NOT NULL,
    clamped_at INTEGER,
    clamp_log TEXT,
    sync_window_start INTEGER,
    sync_count INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS profiles_xp ON profiles (xp DESC)`,
  `CREATE INDEX IF NOT EXISTS profiles_xp_week ON profiles (xp_week DESC)`,
  `CREATE INDEX IF NOT EXISTS profiles_xp_month ON profiles (xp_month DESC)`,
  `CREATE INDEX IF NOT EXISTS profiles_clan ON profiles (clan_id)`,

  `CREATE TABLE IF NOT EXISTS clans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    tag TEXT NOT NULL UNIQUE,
    blurb TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS clan_quests (
    id TEXT PRIMARY KEY,
    clan_id TEXT NOT NULL,
    week_key TEXT NOT NULL,
    title TEXT NOT NULL,
    detail TEXT NOT NULL,
    metric TEXT NOT NULL,
    target INTEGER NOT NULL,
    reward_xp INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    completed_at INTEGER,
    UNIQUE (clan_id, week_key)
  )`,

  `CREATE TABLE IF NOT EXISTS clan_quest_progress (
    quest_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    contribution INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    user_name TEXT NOT NULL,
    user_level INTEGER NOT NULL,
    user_ascension TEXT NOT NULL,
    PRIMARY KEY (quest_id, user_id)
  )`,

  `CREATE TABLE IF NOT EXISTS clan_quest_claims (
    user_id TEXT NOT NULL,
    week_key TEXT NOT NULL,
    xp INTEGER NOT NULL,
    claimed_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, week_key)
  )`,

  `CREATE TABLE IF NOT EXISTS clan_events (
    id TEXT PRIMARY KEY,
    clan_id TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS clan_events_clan ON clan_events (clan_id, created_at DESC)`,

  `CREATE TABLE IF NOT EXISTS preferences (
    user_id TEXT PRIMARY KEY,
    theme_style TEXT,
    updated_at INTEGER
  )`,

  `CREATE TABLE IF NOT EXISTS certificates (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    track_id TEXT NOT NULL,
    track_title TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    issued_at INTEGER NOT NULL,
    UNIQUE (user_id, track_id)
  )`,
  `CREATE INDEX IF NOT EXISTS certificates_code ON certificates (code)`,

  `CREATE TABLE IF NOT EXISTS unseen_attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    seen_before INTEGER NOT NULL,
    started_at INTEGER NOT NULL,
    finished_at INTEGER,
    score REAL,
    bank_version INTEGER NOT NULL,
    item_index INTEGER NOT NULL,
    shown_at INTEGER,
    decisions TEXT NOT NULL DEFAULT '[]',
    accepted INTEGER,
    issues TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS unseen_attempts_user ON unseen_attempts (user_id)`,

  `CREATE TABLE IF NOT EXISTS reviewer_certificates (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    attempt_id TEXT NOT NULL,
    bank_version INTEGER NOT NULL,
    issued_at INTEGER NOT NULL,
    score REAL NOT NULL
  )`,
];

/** Create anything missing. Safe to call on every cold start. */
export async function ensureSchema(db: Db): Promise<void> {
  for (const statement of SCHEMA) await db.run(statement);
}
