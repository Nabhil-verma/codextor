import { describe, expect, it } from "vitest";
import { createBackend } from "./helpers/backend";
import { api } from "../src/lib/api";
import { clampProfile, levelForXp, maxXpFor } from "../src/lib/xpRules";
import { TOTAL_LESSONS } from "../src/lib/curriculum.generated";

/*
 * The player card is recomputed on the client and pushed, so the server bounds
 * what a forged payload can claim. Clamps are enforced: a card that claims more
 * XP than the curriculum can produce is stored at the ceiling with an audit
 * trail instead of being rejected.
 */

const forged = {
  xp: 9_999_999,
  xpWeek: 9_999_999,
  xpMonth: 9_999_999,
  level: 999,
  ascension: "mythic",
  streakCurrent: 5_000,
  streakLongest: 5_000,
  lessonsDone: 100_000,
};

async function makeUser(t: ReturnType<typeof createBackend>) {
  return t.seedUser({ name: "Ada", email: "ada@example.com" });
}

type CardRow = {
  id: string;
  xp: number;
  level: number;
  lessons_done: number;
  xp_week: number;
  xp_month: number;
  streak_current: number;
  last_active_day: string | null;
  clamped_at: number | null;
  clamp_log: string | null;
};

const readCard = async (t: ReturnType<typeof createBackend>) =>
  await t.rows<CardRow>("SELECT * FROM profiles");

describe("clampProfile (pure)", () => {
  it("leaves a plausible card alone", () => {
    const result = clampProfile({
      xp: 1_200,
      xpWeek: 400,
      xpMonth: 900,
      level: levelForXp(1_200),
      lessonsDone: 20,
      streakCurrent: 5,
      streakLongest: 7,
      accountAgeDays: 30,
      now: Date.now(),
    });
    expect(result.reasons).toEqual([]);
    expect(result.xp).toBe(1_200);
    expect(result.level).toBe(levelForXp(1_200));
  });

  it("caps XP at what the whole curriculum can pay", () => {
    const result = clampProfile({
      xp: 50_000_000,
      xpWeek: 0,
      xpMonth: 0,
      level: 999,
      lessonsDone: TOTAL_LESSONS,
      streakCurrent: 1,
      streakLongest: 1,
      accountAgeDays: 400,
      now: Date.now(),
    });
    expect(result.xp).toBe(maxXpFor(TOTAL_LESSONS));
    expect(result.reasons).toContain("xp>curriculum");
  });

  it("orders the week inside the month inside all-time", () => {
    const result = clampProfile({
      xp: 1_000,
      xpWeek: 900,
      xpMonth: 100,
      level: 5,
      lessonsDone: 10,
      streakCurrent: 1,
      streakLongest: 1,
      accountAgeDays: 30,
      now: Date.now(),
    });
    expect(result.xpWeek).toBeLessThanOrEqual(result.xpMonth);
    expect(result.xpMonth).toBeLessThanOrEqual(result.xp);
    expect(result.reasons).toContain("xpWeek>xpMonth");
  });

  it("keeps the level on the curve", () => {
    const result = clampProfile({
      xp: 1_000,
      xpWeek: 0,
      xpMonth: 0,
      level: 999,
      lessonsDone: 0,
      streakCurrent: 1,
      streakLongest: 1,
      accountAgeDays: 30,
      now: Date.now(),
    });
    expect(result.level).toBe(levelForXp(1_000));
    expect(result.reasons).toContain("level>curve");
  });

  it("bounds a streak by the age of the account", () => {
    const result = clampProfile({
      xp: 100,
      xpWeek: 0,
      xpMonth: 0,
      level: 1,
      lessonsDone: 1,
      streakCurrent: 400,
      streakLongest: 500,
      accountAgeDays: 3,
      now: Date.now(),
    });
    expect(result.streakCurrent).toBe(4);
    expect(result.reasons).toContain("streak>account-age");
  });

  it("bounds XP by the time since the last sync, with grace for an offline merge", () => {
    const now = 1_000_000_000_000;
    const jump = clampProfile({
      xp: 100_000,
      xpWeek: 0,
      xpMonth: 0,
      level: levelForXp(100_000),
      lessonsDone: 60,
      streakCurrent: 1,
      streakLongest: 1,
      accountAgeDays: 60,
      previous: { xp: 5_000, xpWeek: 0, xpMonth: 0, updatedAt: now - 1_000 },
      now,
    });
    expect(jump.reasons).toContain("xp>hourly-gain");
    // 5,000 + grace + one minute of earning.
    expect(jump.xp).toBeLessThan(5_000 + 3_000 + 100);
  });
});

describe("profiles.sync bounds a forged payload", () => {
  it("clamps a forged payload to what the curriculum allows", async () => {
    const t = createBackend();
    const userId = await makeUser(t);
    await t.as(userId).mutation(api.profiles.sync, forged);

    const [card] = await readCard(t);
    expect(card.lessons_done).toBe(TOTAL_LESSONS);
    expect(card.xp).toBeLessThanOrEqual(maxXpFor(TOTAL_LESSONS));
    expect(card.level).toBe(levelForXp(card.xp));
    expect(card.xp_week).toBeLessThanOrEqual(card.xp_month);
    expect(card.xp_month).toBeLessThanOrEqual(card.xp);
    // The account is minutes old, so a 5,000-day streak is impossible.
    expect(card.streak_current).toBe(1);
    expect(card.clamp_log).toContain("lessons>total");
    expect(card.clamped_at).toBeTypeOf("number");
  });

  it("records the violation it clamped", async () => {
    const t = createBackend();
    const userId = await makeUser(t);
    await t.as(userId).mutation(api.profiles.sync, forged);

    const [card] = await readCard(t);
    expect(card.clamp_log).toContain("xp>curriculum");
    expect(card.clamp_log).toContain("streak>account-age");
  });

  it("still accepts a real merge from another device", async () => {
    const t = createBackend();
    const userId = await makeUser(t);
    const as = t.as(userId);

    await as.mutation(api.profiles.sync, {
      ...forged,
      xp: 500,
      xpWeek: 500,
      xpMonth: 500,
      level: levelForXp(500),
      streakCurrent: 1,
      streakLongest: 1,
      lessonsDone: 7,
      ascension: "initiate",
    });
    const [first] = await readCard(t);
    // The phone was offline for half a day; it pushes the merged total.
    await t.sql("UPDATE profiles SET updated_at = ? WHERE id = ?", [
      Date.now() - 12 * 3_600_000,
      first.id,
    ]);

    await as.mutation(api.profiles.sync, {
      ...forged,
      xp: 2_250,
      xpWeek: 1_500,
      xpMonth: 2_250,
      level: levelForXp(2_250),
      streakCurrent: 1,
      streakLongest: 2,
      lessonsDone: 30,
      ascension: "initiate",
    });

    const [card] = await readCard(t);
    expect(card.xp).toBe(2_250);
    expect(card.lessons_done).toBe(30);
    expect(card.clamp_log).toBeNull();
  });

  it("drops a runaway sync loop instead of overwriting the card", async () => {
    const t = createBackend();
    const userId = await makeUser(t);
    const as = t.as(userId);

    for (let i = 0; i < 25; i++) {
      await as.mutation(api.profiles.sync, {
        ...forged,
        xp: 100 + i,
        xpWeek: 100 + i,
        xpMonth: 100 + i,
        level: 1,
        streakCurrent: 1,
        streakLongest: 1,
        lessonsDone: 2,
        ascension: "initiate",
      });
    }

    const [card] = await readCard(t);
    expect(card.clamp_log).toContain("rate-limit");
    // The push that tripped the limit did not land.
    expect(card.xp).toBeLessThan(124);
  });
});

describe("profiles.sync is a no-op when signed out", () => {
  it("writes no card", async () => {
    const t = createBackend();
    expect(await t.mutation(api.profiles.sync, forged)).toBeNull();
    expect(await readCard(t)).toHaveLength(0);
  });
});
