import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../src/convex/schema";
import { api } from "../src/convex/_generated/api";

/*
 * The account-backed appearance preference (glass ⇄ minimal gold).
 *
 * The style used to be per-browser only. These tests pin the server side of
 * the fix: signed-out reads stay `null` (the client keeps using localStorage),
 * a signed-in round trip stores and returns the choice, two accounts never see
 * each other's preference, and a debounced write landing after sign-out is
 * dropped instead of creating an orphan row.
 */

const modules = import.meta.glob("../src/convex/**/*.ts");

describe("account appearance preferences", () => {
  it("returns null when signed out", async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.preferences.get, {})).toBeNull();
  });

  it("round-trips the signed-in learner's style", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", { name: "Ada", email: "ada@example.com" })
    );

    await t
      .withIdentity({ subject: userId })
      .mutation(api.preferences.save, { themeStyle: "minimal" });
    expect(
      await t.withIdentity({ subject: userId }).query(api.preferences.get, {})
    ).toEqual({ themeStyle: "minimal" });

    // Second save is an update, not a second row.
    await t
      .withIdentity({ subject: userId })
      .mutation(api.preferences.save, { themeStyle: "glass" });
    expect(
      await t.withIdentity({ subject: userId }).query(api.preferences.get, {})
    ).toEqual({ themeStyle: "glass" });
  });

  it("keeps preferences per account", async () => {
    const t = convexTest(schema, modules);
    const ada = await t.run((ctx) => ctx.db.insert("users", { name: "Ada" }));
    const bob = await t.run((ctx) => ctx.db.insert("users", { name: "Bob" }));

    await t
      .withIdentity({ subject: ada })
      .mutation(api.preferences.save, { themeStyle: "minimal" });

    expect(await t.withIdentity({ subject: bob }).query(api.preferences.get, {})).toEqual({
      themeStyle: null,
    });
  });

  it("drops a save from a signed-out client", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.preferences.save, { themeStyle: "minimal" });
    expect(await t.query(api.preferences.get, {})).toBeNull();
  });
});
