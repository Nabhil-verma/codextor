import { describe, expect, it } from "vitest";
import { createBackend, type Backend } from "./helpers/backend";
import { api } from "../src/lib/api";

/*
 * The pinned "you" row on the arena must report your real rank. The server
 * only scans a bounded number of profiles ahead of you, so beyond that it must
 * say the rank is unknown (null), never a number that looks exact.
 */

type Board = { me: { rank: number | null; isMe: boolean } | null };

/** Inserts `count` learners with the given XP. */
async function seedAhead(t: Backend, count: number, xp: number) {
  for (let i = 0; i < count; i++) {
    const userId = await t.seedUser({ name: `p${i}`, email: `p${i}@example.com` });
    await t.seedProfile({
      userId,
      name: `p${i}`,
      xp,
      level: 2,
      ascension: "apprentice",
      title: "cadet",
    });
  }
}

async function meFor(t: Backend, xp: number, ahead: number) {
  const ada = await t.seedUser({ name: "Ada", email: "ada@example.com" });
  await t.seedProfile({
    userId: ada,
    name: "Ada",
    xp,
    level: 2,
    ascension: "apprentice",
    title: "cadet",
  });
  await seedAhead(t, ahead, 5000);
  const board = (await t.as(ada).query(api.leaderboard.top, { bracket: "all" })) as Board;
  return board.me;
}

describe("your pinned rank on the arena", () => {
  it("is exact when fewer than 500 learners are ahead", async () => {
    const t = createBackend();
    const me = await meFor(t, 100, 3);
    expect(me?.rank).toBe(4);
    expect(me?.isMe).toBe(true);
  });

  it("is exact at 499 ahead (rank 500)", async () => {
    const t = createBackend();
    const me = await meFor(t, 100, 499);
    expect(me?.rank).toBe(500);
  });

  it("is unknown (null), not 501, once 500 or more learners are ahead", async () => {
    const t = createBackend();
    const me = await meFor(t, 100, 520);
    expect(me?.rank).toBeNull();
    expect(me?.isMe).toBe(true);
  });
});
