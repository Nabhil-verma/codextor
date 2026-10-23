import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../src/convex/schema";
import { api } from "../src/convex/_generated/api";

/*
 * The pinned "you" row on the arena must report your real rank. The server
 * only scans a bounded number of profiles ahead of you, so beyond that it must
 * say the rank is unknown (null), never a number that looks exact.
 */

const modules = import.meta.glob("../src/convex/**/*.ts");

function setup() {
  return convexTest(schema, modules);
}

/** Inserts `count` learners with the given XP and returns their profile ids. */
async function seedAhead(t: ReturnType<typeof setup>, count: number, xp: number) {
  return t.run(async (ctx) => {
    for (let i = 0; i < count; i++) {
      const userId = await ctx.db.insert("users", { name: `p${i}`, email: `p${i}@example.com` });
      await ctx.db.insert("profiles", {
        userId,
        name: `p${i}`,
        xp,
        xpWeek: 0,
        xpMonth: 0,
        level: 2,
        ascension: "apprentice",
        title: "cadet",
        streakCurrent: 0,
        streakLongest: 0,
        lessonsDone: 0,
        updatedAt: Date.now(),
        clampLog: [],
        syncCount: 0,
      });
    }
  });
}

async function meFor(t: ReturnType<typeof setup>, xp: number, ahead: number) {
  const ada = await t.run((ctx) => ctx.db.insert("users", { name: "Ada", email: "ada@example.com" }));
  await t.run((ctx) =>
    ctx.db.insert("profiles", {
      userId: ada,
      name: "Ada",
      xp,
      xpWeek: 0,
      xpMonth: 0,
      level: 2,
      ascension: "apprentice",
      title: "cadet",
      streakCurrent: 0,
      streakLongest: 0,
      lessonsDone: 0,
      updatedAt: Date.now(),
      clampLog: [],
      syncCount: 0,
    }),
  );
  await seedAhead(t, ahead, 5000);
  const board = await t.withIdentity({ subject: ada }).query(api.leaderboard.top, { bracket: "all" });
  return board.me;
}

describe("your pinned rank on the arena", () => {
  it("is exact when fewer than 500 learners are ahead", async () => {
    const t = setup();
    const me = await meFor(t, 100, 3);
    expect(me?.rank).toBe(4);
    expect(me?.isMe).toBe(true);
  });

  it("is exact at 499 ahead (rank 500)", async () => {
    const t = setup();
    const me = await meFor(t, 100, 499);
    expect(me?.rank).toBe(500);
  });

  it("is unknown (null), not 501, once 500 or more learners are ahead", async () => {
    const t = setup();
    const me = await meFor(t, 100, 520);
    expect(me?.rank).toBeNull();
    expect(me?.isMe).toBe(true);
  });
});
