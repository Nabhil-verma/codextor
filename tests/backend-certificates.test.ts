import { describe, expect, it } from "vitest";
import { createBackend } from "./helpers/backend";
import { api } from "../src/lib/api";
import { TRACK_LESSON_KEYS, TRACK_TITLES } from "../src/lib/curriculum.generated";
import { missingLessons } from "../sites/api/certificates";

/*
 * Access control. Certificates prove completion and are public by code;
 * profiles and guilds are public by design. None of the public surfaces may
 * hand out an account id, an email, or private bookkeeping.
 */

const CODE = /^[A-HJ-NP-Z2-9]{12}$/;

/** A progress map that passes every lesson of a track, with dated keys as the client writes them. */
function passed(trackId: string) {
  const data: Record<string, number> = {};
  for (const key of TRACK_LESSON_KEYS[trackId]) data[key + "!2026-10-01"] = 1;
  return data;
}

describe("issuing a certificate", () => {
  it("refuses an anonymous request", async () => {
    const t = createBackend();
    await expect(t.mutation(api.certificates.issue, { trackId: "web" })).rejects.toThrow(/Sign in/);
  });

  it("refuses a track that does not exist, with no lookup on user input", async () => {
    const t = createBackend();
    const ada = await t.seedUser({ name: "Ada" });
    await expect(
      t.as(ada).mutation(api.certificates.issue, { trackId: "__proto__" }),
    ).rejects.toThrow(/does not exist/);
  });

  it("says how many lessons are left instead of issuing early", async () => {
    const t = createBackend();
    const ada = await t.seedUser({ name: "Ada" });
    const keys = TRACK_LESSON_KEYS["web"];
    const partial: Record<string, number> = {};
    for (const key of keys.slice(1)) partial[key + "!2026-10-01"] = 1;
    await t.seedProgress(ada, partial);
    await expect(t.as(ada).mutation(api.certificates.issue, { trackId: "web" })).rejects.toThrow(
      /Not finished yet: 1 lesson left/,
    );
  });

  it("counts a lesson only at a passing score", async () => {
    const keys = TRACK_LESSON_KEYS["web"];
    const data: Record<string, number> = {};
    for (const key of keys) data[key + "!d"] = 0.9; // partial credit is not a pass
    expect(missingLessons(data, keys)).toBe(keys.length);
    expect(missingLessons(passed("web"), keys)).toBe(0);
  });

  it("issues a code for a finished track, with the display name and no account id", async () => {
    const t = createBackend();
    const ada = await t.seedUser({ name: "Ada" });
    await t.seedProgress(ada, passed("web"));
    const cert = (await t.as(ada).mutation(api.certificates.issue, { trackId: "web" })) as Record<
      string,
      unknown
    >;
    expect(cert.code).toMatch(CODE);
    expect(cert.trackTitle).toBe(TRACK_TITLES["web"]);
    expect(cert.displayName).toBe("Ada");
    expect(Object.keys(cert).sort()).toEqual([
      "code",
      "displayName",
      "issuedAt",
      "trackId",
      "trackTitle",
    ]);
  });

  it("is idempotent: asking again returns the same code and makes no second row", async () => {
    const t = createBackend();
    const ada = await t.seedUser({ name: "Ada" });
    await t.seedProgress(ada, passed("web"));
    const as = t.as(ada);
    const first = (await as.mutation(api.certificates.issue, { trackId: "web" })) as { code: string };
    const second = (await as.mutation(api.certificates.issue, { trackId: "web" })) as { code: string };
    expect(second.code).toBe(first.code);
    expect(await t.rows("SELECT * FROM certificates")).toHaveLength(1);
  });

  it("uses the chosen display name when one is given, trimmed and capped", async () => {
    const t = createBackend();
    const ada = await t.seedUser({ name: "Ada" });
    await t.seedProgress(ada, passed("web"));
    const cert = (await t.as(ada).mutation(api.certificates.issue, {
      trackId: "web",
      displayName: "  " + "x".repeat(200),
    })) as { displayName: string };
    expect(cert.displayName).toHaveLength(60);
  });
});

describe("verifying a certificate", () => {
  it("confirms a real code and shows only the public fields", async () => {
    const t = createBackend();
    const ada = await t.seedUser({ name: "Ada" });
    await t.seedProgress(ada, passed("web"));
    const cert = (await t.as(ada).mutation(api.certificates.issue, { trackId: "web" })) as {
      code: string;
    };

    const result = (await t.query(api.certificates.verify, {
      code: cert.code.toLowerCase(),
    })) as { valid: boolean; displayName?: string };
    expect(result.valid).toBe(true);
    expect(result.displayName).toBe("Ada");
    expect(JSON.stringify(result)).not.toContain(ada);
    expect(JSON.stringify(result)).not.toContain("example.test");
  });

  it("rejects unknown and malformed codes without a lookup", async () => {
    const t = createBackend();
    expect(await t.query(api.certificates.verify, { code: "AAAAAAAAAAAA" })).toEqual({
      valid: false,
    });
    expect(await t.query(api.certificates.verify, { code: "not-a-code" })).toEqual({ valid: false });
    expect(await t.query(api.certificates.verify, { code: "0000000000O0" })).toEqual({
      valid: false,
    });
  });
});

describe("public profiles", () => {
  it("publishes only the public card", async () => {
    const t = createBackend();
    const ada = await t.seedUser({ name: "Ada" });
    const profileId = await t.seedProfile({
      userId: ada,
      name: "Ada",
      xp: 1200,
      xpWeek: 100,
      xpMonth: 300,
      level: 3,
      ascension: "apprentice",
      title: "cadet",
      streakCurrent: 2,
      streakLongest: 5,
      lessonsDone: 7,
      memberRole: "officer",
    });
    const card = await t.query(api.profiles.publicCard, { profileId });
    expect(card).toMatchObject({
      name: "Ada",
      level: 3,
      lessonsDone: 7,
      streakLongest: 5,
      xp: 1200,
    });
    const text = JSON.stringify(card);
    expect(text).not.toContain(ada);
    expect(text).not.toContain("example.test");
    expect(text).not.toContain("clampLog");
    expect(text).not.toContain("officer");
    expect(text).not.toContain("syncCount");
  });

  it("returns nothing for an unknown profile", async () => {
    const t = createBackend();
    const ada = await t.seedUser({ name: "Ada" });
    const profileId = await t.seedProfile({ userId: ada, name: "Ada" });
    await t.sql("DELETE FROM profiles WHERE id = ?", [profileId]);
    expect(await t.query(api.profiles.publicCard, { profileId })).toBeNull();
  });

  it("lists only that learner's certificates", async () => {
    const t = createBackend();
    const ada = await t.seedUser({ name: "Ada" });
    const lin = await t.seedUser({ name: "Lin" });
    await t.seedProgress(ada, passed("web"));
    await t.as(ada).mutation(api.certificates.issue, { trackId: "web" });
    const adaProfile = await t.seedProfile({ userId: ada, name: "Ada" });
    const linProfile = await t.seedProfile({ userId: lin, name: "Lin" });

    const adaCerts = (await t.query(api.certificates.listForProfile, {
      profileId: adaProfile,
    })) as unknown[];
    const linCerts = await t.query(api.certificates.listForProfile, { profileId: linProfile });
    expect(adaCerts).toHaveLength(1);
    expect(linCerts).toEqual([]);
    expect(JSON.stringify(adaCerts)).not.toContain(ada);
  });
});

describe("the leaderboard does not hand out accounts", () => {
  it("returns profile ids, never user ids, and still marks the caller", async () => {
    const t = createBackend();
    const ada = await t.seedUser({ name: "Ada" });
    const lin = await t.seedUser({ name: "Lin" });
    await t.seedProfile({ userId: ada, name: "Ada", xp: 100 });
    await t.seedProfile({ userId: lin, name: "Lin", xp: 50 });

    const board = (await t.as(ada).query(api.leaderboard.top, { bracket: "all" })) as {
      board: Record<string, unknown>[];
      me: { isMe: boolean } | null;
    };
    expect(board.board.length).toBe(2);
    for (const row of board.board) {
      expect(row).not.toHaveProperty("userId");
      expect(row).toHaveProperty("profileId");
    }
    expect(board.me?.isMe).toBe(true);
    expect(JSON.stringify(board)).not.toContain(ada);
  });
});

describe("guild rosters", () => {
  async function guildWith(t: ReturnType<typeof createBackend>) {
    const ada = await t.seedUser({ name: "Ada" });
    const lin = await t.seedUser({ name: "Lin" });
    const clanId = await t.seedClan({ name: "Night Builders", tag: "NB", ownerId: ada });
    await t.seedProfile({ userId: ada, name: "Ada", clanId });
    await t.seedProfile({ userId: lin, name: "Lin", clanId });
    return { ada, lin, clanId };
  }

  it("hides account ids from a visitor who is not in the guild", async () => {
    const t = createBackend();
    const { ada, lin } = await guildWith(t);
    const [guild] = (await t.query(api.clans.list, {})) as {
      members: { userId: string | null; profileId: string }[];
    }[];
    expect(guild.members).toHaveLength(2);
    for (const m of guild.members) {
      expect(m.userId).toBeNull();
      expect(m.profileId).toBeTruthy();
    }
    const text = JSON.stringify(guild);
    expect(text).not.toContain(ada);
    expect(text).not.toContain(lin);
  });

  it("shows account ids only to members of that guild", async () => {
    const t = createBackend();
    const { ada, lin } = await guildWith(t);
    const seen = (await t.as(lin).query(api.clans.mine, {})) as {
      members: { userId: string | null }[];
    };
    expect(seen.members.every((m) => m.userId !== null)).toBe(true);
    expect(seen.members.map((m) => m.userId)).toEqual(expect.arrayContaining([ada, lin]));
  });
});
