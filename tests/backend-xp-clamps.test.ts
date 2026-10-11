import { afterEach, describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../src/convex/schema";
import { api } from "../src/convex/_generated/api";
import { clampProfile, levelForXp, maxXpFor } from "../src/convex/xpRules";
import { TOTAL_LESSONS } from "../src/convex/curriculum";

/*
 * #5: the player card is recomputed on the client and pushed, so the server
 * bounds what a forged payload can claim. Clamping ships in LOG-ONLY mode
 * first (violations recorded, values untouched) because a legitimate
 * multi-device merge can look impossible before there is evidence to tune
 * against. CODEXTOR_XP_CLAMPS=enforce turns the clamps on.
 */

const modules = import.meta.glob("../src/convex/**/*.ts");

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

async function makeUser(t: ReturnType<typeof convexTest>) {
  return await t.run((ctx) =>
    ctx.db.insert("users", { name: "Ada", email: "ada@example.com" }),
  );
}

const readCard = async (t: ReturnType<typeof convexTest>) =>
  await t.run((ctx) => ctx.db.query("profiles").collect());

afterEach(() => {
  delete process.env.CODEXTOR_XP_CLAMPS;
});

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

describe("profiles.sync in log-only mode (the default)", () => {
  it("records the violation but stores what the client sent", async () => {
    const t = convexTest(schema, modules);
    const userId = await makeUser(t);
    await t.withIdentity({ subject: userId }).mutation(api.profiles.sync, forged);

    const [card] = await readCard(t);
    expect(card.xp).toBe(forged.xp);
    expect(card.level).toBe(999);
    expect(card.lessonsDone).toBe(forged.lessonsDone);
    expect(card.clampedAt).toBeTypeOf("number");
    expect(card.clampLog).toContain("xp>curriculum");
    expect(card.clampLog).toContain("streak>account-age");
  });

  it("a legitimate multi-device merge is stored in full", async () => {
    const t = convexTest(schema, modules);
    const userId = await makeUser(t);
    const as = t.withIdentity({ subject: userId });

    await as.mutation(api.profiles.sync, {
      ...forged,
      xp: 350,
      xpWeek: 350,
      xpMonth: 350,
      level: 2,
      streakCurrent: 1,
      streakLongest: 1,
      lessonsDone: 5,
      ascension: "initiate",
    });
    // The phone was offline for two days; it pushes the merged total.
    const [first] = await readCard(t);
    await t.run((ctx) =>
      ctx.db.patch(first._id, { updatedAt: Date.now() - 48 * 3_600_000 }),
    );

    await as.mutation(api.profiles.sync, {
      ...forged,
      xp: 1_500,
      xpWeek: 900,
      xpMonth: 1_500,
      level: levelForXp(1_500),
      streakCurrent: 1,
      streakLongest: 3,
      lessonsDone: 20,
      ascension: "initiate",
    });

    const [card] = await readCard(t);
    expect(card.xp).toBe(1_500);
    expect(card.lessonsDone).toBe(20);
    expect(card.level).toBe(levelForXp(1_500));
    expect(card.clampLog).toBeUndefined();
  });
});

describe("profiles.sync with CODEXTOR_XP_CLAMPS=enforce", () => {
  it("bounds a forged payload to what the curriculum allows", async () => {
    process.env.CODEXTOR_XP_CLAMPS = "enforce";
    const t = convexTest(schema, modules);
    const userId = await makeUser(t);
    await t.withIdentity({ subject: userId }).mutation(api.profiles.sync, forged);

    const [card] = await readCard(t);
    expect(card.lessonsDone).toBe(TOTAL_LESSONS);
    expect(card.xp).toBeLessThanOrEqual(maxXpFor(TOTAL_LESSONS));
    expect(card.level).toBe(levelForXp(card.xp));
    expect(card.xpWeek).toBeLessThanOrEqual(card.xpMonth);
    expect(card.xpMonth).toBeLessThanOrEqual(card.xp);
    // The account is minutes old, so a 5,000-day streak is impossible.
    expect(card.streakCurrent).toBe(1);
    expect(card.clampLog).toContain("lessons>total");
  });

  it("still accepts a real merge from another device", async () => {
    process.env.CODEXTOR_XP_CLAMPS = "enforce";
    const t = convexTest(schema, modules);
    const userId = await makeUser(t);
    const as = t.withIdentity({ subject: userId });

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
    await t.run((ctx) =>
      ctx.db.patch(first._id, { updatedAt: Date.now() - 12 * 3_600_000 }),
    );

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
    expect(card.lessonsDone).toBe(30);
    expect(card.clampLog).toBeUndefined();
  });

  it("drops a runaway sync loop instead of overwriting the card", async () => {
    process.env.CODEXTOR_XP_CLAMPS = "enforce";
    const t = convexTest(schema, modules);
    const userId = await makeUser(t);
    const as = t.withIdentity({ subject: userId });

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
    expect(card.clampLog).toContain("rate-limit");
    // The push that tripped the limit did not land.
    expect(card.xp).toBeLessThan(124);
  });
});
