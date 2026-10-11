import { afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../src/convex/schema";
import { api, internal } from "../src/convex/_generated/api";
import { sendResetCode } from "../src/convex/auth";

/*
 * Account recovery on the Convex side: the username sign-in key, the private
 * recovery address, and the reset-code sender. The sender runs for real; only
 * the network call to Resend is replaced.
 */

const modules = import.meta.glob("../src/convex/**/*.ts");

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM;
});

/** A user with a password login under `key`, as the auth library creates them. */
async function account(
  t: ReturnType<typeof convexTest>,
  key: string,
  extra: { name?: string; email?: string; username?: string; recoveryEmail?: string } = {},
) {
  return t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { name: extra.name ?? "Ada", ...extra });
    await ctx.db.insert("authAccounts", { userId, provider: "password", providerAccountId: key });
    return userId;
  });
}

describe("recovery address lookup (internal)", () => {
  it("returns the recovery address for a username account", async () => {
    const t = convexTest(schema, modules);
    await account(t, "ada", { username: "ada", email: "ada", recoveryEmail: "ada.backup@example.com" });
    expect(await t.query(internal.users.recoveryEmailFor, { identifier: "Ada" })).toBe(
      "ada.backup@example.com",
    );
  });

  it("returns null for a username account with no recovery address", async () => {
    const t = convexTest(schema, modules);
    await account(t, "grace", { username: "grace", email: "grace" });
    expect(await t.query(internal.users.recoveryEmailFor, { identifier: "grace" })).toBeNull();
  });

  it("returns the email for a legacy account, which is its own recovery address", async () => {
    const t = convexTest(schema, modules);
    await account(t, "old@example.com", { email: "old@example.com" });
    expect(await t.query(internal.users.recoveryEmailFor, { identifier: "old@example.com" })).toBe(
      "old@example.com",
    );
  });

  it("returns null for an unknown account, the same as an account with no address", async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(internal.users.recoveryEmailFor, { identifier: "nobody" })).toBeNull();
  });
});

describe("sendResetCode (the real sender, network stubbed)", () => {
  /** The action context the library passes: the sender only calls runQuery, for the recovery lookup. */
  const ctxFor = (t: ReturnType<typeof convexTest>) =>
    ({
      runQuery: (_ref: unknown, args: { identifier: string }) =>
        t.query(internal.users.recoveryEmailFor, args),
    }) as unknown as Parameters<typeof sendResetCode>[1];

  it("mails the code to the recovery address through Resend", async () => {
    const t = convexTest(schema, modules);
    await account(t, "ada", { username: "ada", email: "ada", recoveryEmail: "ada.backup@example.com" });
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.RESEND_FROM = "Codextor <no-reply@codextor.app>";
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendResetCode({ identifier: "ada", token: "24681357" }, ctxFor(t));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    const body = JSON.parse(String(init.body));
    expect(body.to).toEqual(["ada.backup@example.com"]);
    expect(body.text).toContain("24681357");
  });

  it("sends nothing and returns normally when there is no address", async () => {
    const t = convexTest(schema, modules);
    await account(t, "grace", { username: "grace", email: "grace" });
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.RESEND_FROM = "Codextor <no-reply@codextor.app>";
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendResetCode({ identifier: "grace", token: "11112222" }, ctxFor(t))).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails loudly when the sender is not configured", async () => {
    const t = convexTest(schema, modules);
    await account(t, "ada", { username: "ada", email: "ada", recoveryEmail: "ada.backup@example.com" });
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendResetCode({ identifier: "ada", token: "11112222" }, ctxFor(t))).rejects.toThrow(
      /not configured/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("setRecoveryEmail and me", () => {
  it("lets a signed-in user set, then clear, their recovery address", async () => {
    const t = convexTest(schema, modules);
    const userId = await account(t, "ada", { username: "ada", email: "ada" });
    const as = t.withIdentity({ subject: userId });

    await as.mutation(api.users.setRecoveryEmail, { email: " Ada.Backup@Example.com " });
    expect((await as.query(api.users.me, {}))?.recoveryEmail).toBe("ada.backup@example.com");

    await as.mutation(api.users.setRecoveryEmail, { email: "" });
    expect((await as.query(api.users.me, {}))?.recoveryEmail).toBeNull();
  });

  it("rejects an invalid address and anonymous callers", async () => {
    const t = convexTest(schema, modules);
    const userId = await account(t, "ada", { username: "ada", email: "ada" });
    await expect(
      t.withIdentity({ subject: userId }).mutation(api.users.setRecoveryEmail, { email: "nope" }),
    ).rejects.toThrow(/valid recovery email/);
    await expect(t.mutation(api.users.setRecoveryEmail, { email: "a@b.co" })).rejects.toThrow(
      /Not signed in/,
    );
  });

  it("returns the username and recovery address only to their owner", async () => {
    const t = convexTest(schema, modules);
    const userId = await account(t, "ada", { username: "ada", email: "ada", recoveryEmail: "r@example.com" });
    const me = await t.withIdentity({ subject: userId }).query(api.users.me, {});
    expect(me).toEqual({ name: "Ada", username: "ada", recoveryEmail: "r@example.com" });
    expect(await t.query(api.users.me, {})).toBeNull();
  });
});

describe("public profile names never show a legacy email", () => {
  it("a legacy account with no chosen name appears as Learner on its public card", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", { email: "private@example.com" }),
    );
    // A card is only created once the learner has earned something (see sync).
    await t.withIdentity({ subject: userId }).mutation(api.profiles.sync, {
      xp: 50,
      xpWeek: 50,
      xpMonth: 50,
      level: 1,
      ascension: "apprentice",
      streakCurrent: 1,
      streakLongest: 1,
      lastActiveDay: "2026-10-11",
      lessonsDone: 1,
      sourceDay: "2026-10-11",
    });
    const card = await t.run((ctx) => ctx.db.query("profiles").first());
    expect(card?.name).toBe("Learner");
    expect(card?.name).not.toContain("@");
  });
});
