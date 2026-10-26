import { describe, expect, it } from "vitest";
import { createBackend, type Backend } from "./helpers/backend";
import { api } from "../src/lib/api";
import { MAX_GUILD_MEMBERS } from "../src/lib/guild";

/*
 * The guild guard rails nobody exercises on the happy path.
 *
 * Each one is a way a shared roster can go wrong silently: a guild founded
 * twice under one name, a 26th member slipping past the cap, a stale officer
 * badge surviving a move between guilds, a kick aimed at the wrong person, a
 * freed member banking a reward, or a repeat profile sync parking progress on
 * a quest that isn't running.
 */

async function makeUser(t: Backend, name: string) {
  return t.seedUser({ name, email: `${name.toLowerCase()}@codexter.test` });
}

/** Fills a roster with synthetic members (faster than running the real join). */
async function addMembers(t: Backend, clanId: string, count: number) {
  for (let i = 0; i < count; i++) {
    const userId = await t.seedUser({
      name: `Filler ${i}`,
      email: `filler${i}@codexter.test`,
    });
    await t.seedProfile({ userId, name: `Filler ${i}`, xp: i, clanId });
  }
}

describe("founding a guild", () => {
  it("refuses a name or tag that can't be told apart", async () => {
    const t = createBackend();
    const ada = await makeUser(t, "Ada");
    const me = t.as(ada);

    await expect(
      me.mutation(api.clans.create, { name: "AB", tag: "AB", blurb: "" }),
    ).rejects.toThrow(/at least 3 characters/);
    await expect(
      me.mutation(api.clans.create, { name: "   ", tag: "AB", blurb: "" }),
    ).rejects.toThrow(/at least 3 characters/);
    await expect(
      me.mutation(api.clans.create, { name: "Nightly", tag: "A", blurb: "" }),
    ).rejects.toThrow(/letters or numbers/);
    // "@@@" sanitizes to nothing at all.
    await expect(
      me.mutation(api.clans.create, { name: "Nightly", tag: "@@@", blurb: "" }),
    ).rejects.toThrow(/letters or numbers/);

    // A valid submission is normalized, not rejected: whitespace is collapsed,
    // the tag is uppercased and stripped to letters/numbers, and an empty
    // blurb becomes the default motto.
    await me.mutation(api.clans.create, {
      name: "  Nightly   Builders  ",
      tag: "n.b!",
      blurb: "   ",
    });
    const mine = (await me.query(api.clans.mine, {})) as { name: string; tag: string; blurb: string };
    expect(mine.name).toBe("Nightly Builders");
    expect(mine.tag).toBe("NB");
    expect(mine.blurb).toBe("No motto yet — recruiting builders.");
  });

  it("keeps cleaned names and tags unique across guilds", async () => {
    const t = createBackend();
    const ada = await makeUser(t, "Ada");
    const lin = await makeUser(t, "Lin");
    await t.as(ada).mutation(api.clans.create, {
      name: "Nightly Builders",
      tag: "NB",
      blurb: "ship nightly",
    });

    // Same name once whitespace is collapsed (the form the server stores).
    await expect(
      t.as(lin).mutation(api.clans.create, {
        name: "  Nightly   Builders ",
        tag: "XY",
        blurb: "",
      }),
    ).rejects.toThrow(/name is taken/);

    // Different name, but the tag sanitizes to the same badge.
    await expect(
      t.as(lin).mutation(api.clans.create, { name: "Day Builders", tag: "n.b", blurb: "" }),
    ).rejects.toThrow(/tag is taken/);
  });

  it("makes a founder leave the current guild before founding another", async () => {
    const t = createBackend();
    const ada = await makeUser(t, "Ada");
    const me = t.as(ada);
    await me.mutation(api.clans.create, { name: "Nightly Builders", tag: "NB", blurb: "" });

    await expect(
      me.mutation(api.clans.create, { name: "Second Thoughts", tag: "ST", blurb: "" }),
    ).rejects.toThrow(/Leave your current guild first/);
  });
});

describe("joining and leaving a guild", () => {
  it("refuses a join into a vanished or full guild, but lets a member re-join", async () => {
    const t = createBackend();
    const owner = await makeUser(t, "Owner");
    const lin = await makeUser(t, "Lin");
    const rey = await makeUser(t, "Rey");
    const clanId = (await t.as(owner).mutation(api.clans.create, {
      name: "Nightly Builders",
      tag: "NB",
      blurb: "",
    })) as string;

    // A clan id that used to exist: the row is gone but the id is well formed.
    const gone = await t.seedClan({ name: "Ghost Guild", tag: "GG", ownerId: owner });
    await t.sql("DELETE FROM clans WHERE id = ?", [gone]);
    await expect(t.as(rey).mutation(api.clans.join, { clanId: gone })).rejects.toThrow(
      /no longer exists/,
    );

    // Fill the roster to exactly the cap: owner + 24 fillers = 25.
    await addMembers(t, clanId, MAX_GUILD_MEMBERS - 1);
    await expect(t.as(rey).mutation(api.clans.join, { clanId })).rejects.toThrow(/full/);

    // An existing member re-joining their own (now full) guild is a no-op,
    // never a "guild is full" error — the panel re-syncs freely.
    await expect(t.as(owner).mutation(api.clans.join, { clanId })).resolves.toBeNull();

    // One seat short of the cap, the same outsider gets in.
    const other = (await t.as(lin).mutation(api.clans.create, {
      name: "Day Shift",
      tag: "DS",
      blurb: "",
    })) as string;
    await addMembers(t, other, MAX_GUILD_MEMBERS - 2);
    await t.as(rey).mutation(api.clans.join, { clanId: other });
    expect(((await t.as(rey).query(api.clans.mine, {})) as { id: string }).id).toBe(other);
  });

  it("disbands an empty guild when its founder walks out", async () => {
    const t = createBackend();
    const ada = await makeUser(t, "Ada");
    const clanId = await t.as(ada).mutation(api.clans.create, {
      name: "Nightly Builders",
      tag: "NB",
      blurb: "",
    });

    await t.as(ada).mutation(api.clans.leave, {});

    expect(await t.rows("SELECT * FROM clans WHERE id = ?", [clanId])).toHaveLength(0);
    expect(await t.as(ada).query(api.clans.mine, {})).toBeNull();
    expect(await t.as(ada).query(api.clans.list, {})).toEqual([]);
  });

  it("leaving with nothing to leave is a silent no-op", async () => {
    const t = createBackend();
    const free = await makeUser(t, "Free");
    const noCard = await makeUser(t, "Ghost"); // not even a player card
    await t.seedProfile({ userId: free, name: "Free" });

    await expect(t.as(free).mutation(api.clans.leave, {})).resolves.toBeNull();
    await expect(t.as(noCard).mutation(api.clans.leave, {})).resolves.toBeNull();
  });
});

describe("roles and removal", () => {
  it("keeps role management founder-only even for officers", async () => {
    const t = createBackend();
    const ada = await makeUser(t, "Ada");
    const lin = await makeUser(t, "Lin");
    const sam = await makeUser(t, "Sam");
    const clanId = (await t.as(ada).mutation(api.clans.create, {
      name: "Nightly Builders",
      tag: "NB",
      blurb: "",
    })) as string;
    await t.as(lin).mutation(api.clans.join, { clanId });
    await t.as(sam).mutation(api.clans.join, { clanId });
    await t.as(ada).mutation(api.clans.setRole, { userId: lin, officer: true });

    await expect(
      t.as(lin).mutation(api.clans.setRole, { userId: sam, officer: true }),
    ).rejects.toThrow(/Only the founder/);
    const samView = (await t.as(sam).query(api.clans.mine, {})) as {
      members: { userId: string | null; role: string }[];
    };
    expect(samView.members.find((m) => m.userId === sam)?.role).toBe("member");
  });

  it("tells the founder to leave rather than kick themselves, and guards outsiders", async () => {
    const t = createBackend();
    const ada = await makeUser(t, "Ada");
    const lin = await makeUser(t, "Lin");
    const rey = await makeUser(t, "Rey");
    const clanId = (await t.as(ada).mutation(api.clans.create, {
      name: "Nightly Builders",
      tag: "NB",
      blurb: "",
    })) as string;
    await t.as(lin).mutation(api.clans.join, { clanId });

    await expect(t.as(ada).mutation(api.clans.kick, { userId: ada })).rejects.toThrow(
      /Leave guild/,
    );

    // An outsider has no membership to remove — the founder is told, not obeyed.
    await expect(t.as(ada).mutation(api.clans.kick, { userId: rey })).rejects.toThrow(
      /isn't in your guild/,
    );
    // An officer gets the same guard, before any role comparison.
    await t.as(ada).mutation(api.clans.setRole, { userId: lin, officer: true });
    await expect(t.as(lin).mutation(api.clans.kick, { userId: rey })).rejects.toThrow(
      /isn't in your guild/,
    );

    // A free agent has no powers at all.
    await expect(t.as(rey).mutation(api.clans.kick, { userId: lin })).rejects.toThrow(
      /not in a guild/,
    );
  });

  it("fails closed when a stale card points at a vanished guild", async () => {
    const t = createBackend();
    const ada = await makeUser(t, "Ada");
    const ghost = await t.seedClan({ name: "Ghost Guild", tag: "GG", ownerId: ada });
    await t.sql("DELETE FROM clans WHERE id = ?", [ghost]);
    await t.seedProfile({ userId: ada, name: "Ada", clanId: ghost });

    // The card still names a clan that no longer exists: the panel shows
    // nothing, and the two mutations refuse instead of operating on ghosts.
    expect(await t.as(ada).query(api.clans.mine, {})).toBeNull();
    await expect(
      t.as(ada).mutation(api.clans.setRole, { userId: ada, officer: false }),
    ).rejects.toThrow(/no longer exists/);
    await expect(t.as(ada).mutation(api.clans.kick, { userId: ada })).rejects.toThrow(
      /no longer exists/,
    );
  });
});

describe("quest guards", () => {
  it("refuses a reward claim for a learner with no guild", async () => {
    const t = createBackend();
    const rey = await makeUser(t, "Rey");

    // No player card at all…
    await expect(t.as(rey).mutation(api.clans.claimQuestReward, {})).rejects.toThrow(
      /Join a guild first/,
    );
    // …and a card with no clan are the same answer.
    await t.seedProfile({ userId: rey, name: "Rey" });
    await expect(t.as(rey).mutation(api.clans.claimQuestReward, {})).rejects.toThrow(
      /Join a guild first/,
    );
  });

  it("ignores contributions that can't move the bar", async () => {
    const t = createBackend();
    const ada = await makeUser(t, "Ada");

    // Signed out, no clan, no quest: all silent no-ops rather than errors —
    // the QuestBridge pushes these on every profile sync.
    await t.mutation(api.clans.reportContribution, { lessons: 5, xp: 5, flawless: 5 });
    await t.as(ada).mutation(api.clans.reportContribution, { lessons: 5, xp: 5, flawless: 5 });
    await t.as(ada).mutation(api.clans.create, {
      name: "Nightly Builders",
      tag: "NB",
      blurb: "",
    });
    // A guild with no quest yet has nothing to report against — and nothing
    // to show.
    expect(await t.as(ada).query(api.clans.questView, {})).toBeNull();
    expect(await t.as(ada).query(api.clans.activeQuest, {})).toBeNull();
    await t.as(ada).mutation(api.clans.reportContribution, { lessons: 5, xp: 5, flawless: 5 });
    expect(await t.rows("SELECT * FROM clan_quest_progress")).toEqual([]);

    // With the week's quest open, zero and negative reports write nothing…
    await t.as(ada).mutation(api.clans.ensureActiveQuest, {});
    await t.as(ada).mutation(api.clans.reportContribution, { lessons: 0, xp: 0, flawless: 0 });
    await t.as(ada).mutation(api.clans.reportContribution, { lessons: -4, xp: -4, flawless: -4 });
    expect(await t.rows("SELECT * FROM clan_quest_progress")).toEqual([]);

    // …and a fractional total banks its whole part, not the fraction.
    await t.as(ada).mutation(api.clans.reportContribution, {
      lessons: 2.9,
      xp: 2.9,
      flawless: 2.9,
    });
    const rows = await t.rows<{ contribution: number }>("SELECT * FROM clan_quest_progress");
    expect(rows).toHaveLength(1);
    expect(rows[0].contribution).toBe(2);
    const view = (await t.as(ada).query(api.clans.questView, {})) as { pooled: number };
    expect(view.pooled).toBe(2);
  });
});
