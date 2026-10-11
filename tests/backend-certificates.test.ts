import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../src/convex/schema";
import { api } from "../src/convex/_generated/api";
import { TRACK_LESSON_KEYS, TRACK_TITLES } from "../src/convex/curriculum";
import { missingLessons } from "../src/convex/certificates";
import type { Id } from "../src/convex/_generated/dataModel";

/*
 * #11 access control. Certificates prove completion and are public by code;
 * profiles and guilds are public by design. None of the public surfaces may
 * hand out an account id, an email, or private bookkeeping.
 */

const modules = import.meta.glob("../src/convex/**/*.ts");
const CODE = /^[A-HJ-NP-Z2-9]{12}$/;

function setup() {
  return convexTest(schema, modules);
}

async function makeUser(t: ReturnType<typeof setup>, name: string) {
  return t.run((ctx) => ctx.db.insert("users", { name, email: `${name.toLowerCase()}@example.com` }));
}

/** A progress map that passes every lesson of a track, with dated keys as the client writes them. */
function passed(trackId: string) {
  const data: Record<string, number> = {};
  for (const key of TRACK_LESSON_KEYS[trackId]) data[key + "!2026-10-01"] = 1;
  return data;
}

async function makeProfile(
  t: ReturnType<typeof setup>,
  userId: Id<"users">,
  name: string,
  clanId?: Id<"clans">,
) {
  return t.run((ctx) =>
    ctx.db.insert("profiles", {
      userId,
      name,
      xp: 1200,
      xpWeek: 100,
      xpMonth: 300,
      level: 3,
      ascension: "apprentice",
      title: "cadet",
      streakCurrent: 2,
      streakLongest: 5,
      lessonsDone: 7,
      updatedAt: Date.now(),
      clampLog: ["xp>curriculum"],
      memberRole: "officer",
      syncCount: 4,
      ...(clanId ? { clanId } : {}),
    }),
  );
}

describe("issuing a certificate", () => {
  it("refuses an anonymous request", async () => {
    const t = setup();
    await expect(t.mutation(api.certificates.issue, { trackId: "web" })).rejects.toThrow(/Sign in/);
  });

  it("refuses a track that does not exist, with no lookup on user input", async () => {
    const t = setup();
    const ada = await makeUser(t, "Ada");
    await expect(
      t.withIdentity({ subject: ada }).mutation(api.certificates.issue, { trackId: "__proto__" }),
    ).rejects.toThrow(/does not exist/);
  });

  it("says how many lessons are left instead of issuing early", async () => {
    const t = setup();
    const ada = await makeUser(t, "Ada");
    const keys = TRACK_LESSON_KEYS["web"];
    const partial: Record<string, number> = {};
    for (const key of keys.slice(1)) partial[key + "!2026-10-01"] = 1;
    await t.run((ctx) => ctx.db.insert("progress", { userId: ada, data: partial, updatedAt: 0 }));
    await expect(
      t.withIdentity({ subject: ada }).mutation(api.certificates.issue, { trackId: "web" }),
    ).rejects.toThrow(/Not finished yet: 1 lesson left/);
  });

  it("counts a lesson only at a passing score", async () => {
    const keys = TRACK_LESSON_KEYS["web"];
    const data: Record<string, number> = {};
    for (const key of keys) data[key + "!d"] = 0.9; // partial credit is not a pass
    expect(missingLessons(data, keys)).toBe(keys.length);
    expect(missingLessons(passed("web"), keys)).toBe(0);
  });

  it("issues a code for a finished track, with the display name and no account id", async () => {
    const t = setup();
    const ada = await makeUser(t, "Ada");
    await t.run((ctx) => ctx.db.insert("progress", { userId: ada, data: passed("web"), updatedAt: 0 }));
    const cert = await t.withIdentity({ subject: ada }).mutation(api.certificates.issue, { trackId: "web" });
    expect(cert.code).toMatch(CODE);
    expect(cert.trackTitle).toBe(TRACK_TITLES["web"]);
    expect(cert.displayName).toBe("Ada");
    expect(Object.keys(cert).sort()).toEqual(["code", "displayName", "issuedAt", "trackId", "trackTitle"]);
  });

  it("is idempotent: asking again returns the same code and makes no second row", async () => {
    const t = setup();
    const ada = await makeUser(t, "Ada");
    await t.run((ctx) => ctx.db.insert("progress", { userId: ada, data: passed("web"), updatedAt: 0 }));
    const as = t.withIdentity({ subject: ada });
    const first = await as.mutation(api.certificates.issue, { trackId: "web" });
    const second = await as.mutation(api.certificates.issue, { trackId: "web" });
    expect(second.code).toBe(first.code);
    const rows = await t.run((ctx) => ctx.db.query("certificates").collect());
    expect(rows).toHaveLength(1);
  });

  it("uses the chosen display name when one is given, trimmed and capped", async () => {
    const t = setup();
    const ada = await makeUser(t, "Ada");
    await t.run((ctx) => ctx.db.insert("progress", { userId: ada, data: passed("web"), updatedAt: 0 }));
    const cert = await t
      .withIdentity({ subject: ada })
      .mutation(api.certificates.issue, { trackId: "web", displayName: "  " + "x".repeat(200) });
    expect(cert.displayName).toHaveLength(60);
  });
});

describe("verifying a certificate", () => {
  it("confirms a real code and shows only the public fields", async () => {
    const t = setup();
    const ada = await makeUser(t, "Ada");
    await t.run((ctx) => ctx.db.insert("progress", { userId: ada, data: passed("web"), updatedAt: 0 }));
    const cert = await t.withIdentity({ subject: ada }).mutation(api.certificates.issue, { trackId: "web" });

    const result = await t.query(api.certificates.verify, { code: cert.code.toLowerCase() });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.displayName).toBe("Ada");
    expect(JSON.stringify(result)).not.toContain(ada as string);
    expect(JSON.stringify(result)).not.toContain("example.com");
  });

  it("rejects unknown and malformed codes without a lookup", async () => {
    const t = setup();
    expect(await t.query(api.certificates.verify, { code: "AAAAAAAAAAAA" })).toEqual({ valid: false });
    expect(await t.query(api.certificates.verify, { code: "not-a-code" })).toEqual({ valid: false });
    expect(await t.query(api.certificates.verify, { code: "0000000000O0" })).toEqual({ valid: false });
  });
});

describe("public profiles", () => {
  it("publishes only the public card", async () => {
    const t = setup();
    const ada = await makeUser(t, "Ada");
    const profileId = await makeProfile(t, ada, "Ada");
    const card = await t.query(api.profiles.publicCard, { profileId });
    expect(card).toMatchObject({ name: "Ada", level: 3, lessonsDone: 7, streakLongest: 5, xp: 1200 });
    const text = JSON.stringify(card);
    expect(text).not.toContain(ada as string);
    expect(text).not.toContain("example.com");
    expect(text).not.toContain("clampLog");
    expect(text).not.toContain("officer");
    expect(text).not.toContain("syncCount");
  });

  it("returns nothing for an unknown profile", async () => {
    const t = setup();
    const ada = await makeUser(t, "Ada");
    const profileId = await makeProfile(t, ada, "Ada");
    await t.run((ctx) => ctx.db.delete(profileId));
    expect(await t.query(api.profiles.publicCard, { profileId })).toBeNull();
  });

  it("lists only that learner's certificates", async () => {
    const t = setup();
    const ada = await makeUser(t, "Ada");
    const lin = await makeUser(t, "Lin");
    await t.run((ctx) => ctx.db.insert("progress", { userId: ada, data: passed("web"), updatedAt: 0 }));
    await t.withIdentity({ subject: ada }).mutation(api.certificates.issue, { trackId: "web" });
    const adaProfile = await makeProfile(t, ada, "Ada");
    const linProfile = await makeProfile(t, lin, "Lin");

    const adaCerts = await t.query(api.certificates.listForProfile, { profileId: adaProfile });
    const linCerts = await t.query(api.certificates.listForProfile, { profileId: linProfile });
    expect(adaCerts).toHaveLength(1);
    expect(linCerts).toEqual([]);
    expect(JSON.stringify(adaCerts)).not.toContain(ada as string);
  });
});

describe("the leaderboard does not hand out accounts", () => {
  it("returns profile ids, never user ids, and still marks the caller", async () => {
    const t = setup();
    const ada = await makeUser(t, "Ada");
    const lin = await makeUser(t, "Lin");
    await makeProfile(t, ada, "Ada");
    await makeProfile(t, lin, "Lin");

    const board = await t.withIdentity({ subject: ada }).query(api.leaderboard.top, { bracket: "all" });
    expect(board.board.length).toBe(2);
    for (const row of board.board) {
      expect(row).not.toHaveProperty("userId");
      expect(row).toHaveProperty("profileId");
    }
    expect(board.me?.isMe).toBe(true);
    expect(JSON.stringify(board)).not.toContain(ada as string);
  });
});

describe("guild rosters", () => {
  async function guildWith(t: ReturnType<typeof setup>) {
    const ada = await makeUser(t, "Ada");
    const lin = await makeUser(t, "Lin");
    const clanId = await t.run((ctx) =>
      ctx.db.insert("clans", { name: "Night Builders", tag: "NB", blurb: "", ownerId: ada, createdAt: 0 }),
    );
    await makeProfile(t, ada, "Ada", clanId);
    await makeProfile(t, lin, "Lin", clanId);
    return { ada, lin };
  }

  it("hides account ids from a visitor who is not in the guild", async () => {
    const t = setup();
    const { ada, lin } = await guildWith(t);
    const [guild] = await t.query(api.clans.list, {});
    expect(guild.members).toHaveLength(2);
    for (const m of guild.members) {
      expect(m.userId).toBeNull();
      expect(m.profileId).toBeTruthy();
    }
    const text = JSON.stringify(guild);
    expect(text).not.toContain(ada as string);
    expect(text).not.toContain(lin as string);
  });

  it("shows account ids only to members of that guild", async () => {
    const t = setup();
    const { ada, lin } = await guildWith(t);
    const seen = await t.withIdentity({ subject: lin }).query(api.clans.mine, {});
    expect(seen?.members.every((m) => m.userId !== null)).toBe(true);
    expect(seen?.members.map((m) => m.userId)).toEqual(expect.arrayContaining([ada, lin]));
  });
});
