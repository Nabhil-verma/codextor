import { describe, expect, it } from "vitest";
import { createBackend } from "./helpers/backend";
import { api } from "../src/lib/api";

/*
 * The account-backed appearance preference (glass ⇄ minimal).
 *
 * Signed-out reads stay `null` (the client keeps using localStorage), a
 * signed-in round trip stores and returns the choice, two accounts never see
 * each other's preference, and a debounced write landing after sign-out is
 * dropped instead of creating an orphan row.
 */

describe("account appearance preferences", () => {
  it("returns null when signed out", async () => {
    const t = createBackend();
    expect(await t.query(api.preferences.get, {})).toBeNull();
  });

  it("round-trips the signed-in learner's style", async () => {
    const t = createBackend();
    const userId = await t.seedUser({ name: "Ada", email: "ada@example.com" });

    await t.as(userId).mutation(api.preferences.save, { themeStyle: "minimal" });
    expect(await t.as(userId).query(api.preferences.get, {})).toEqual({ themeStyle: "minimal" });

    // Second save is an update, not a second row.
    await t.as(userId).mutation(api.preferences.save, { themeStyle: "glass" });
    expect(await t.as(userId).query(api.preferences.get, {})).toEqual({ themeStyle: "glass" });
    expect(await t.rows("SELECT * FROM preferences")).toHaveLength(1);
  });

  it("keeps preferences per account", async () => {
    const t = createBackend();
    const ada = await t.seedUser({ name: "Ada" });
    const bob = await t.seedUser({ name: "Bob" });

    await t.as(ada).mutation(api.preferences.save, { themeStyle: "minimal" });
    expect(await t.as(bob).query(api.preferences.get, {})).toEqual({ themeStyle: null });
  });

  it("drops a save from a signed-out client", async () => {
    const t = createBackend();
    await t.mutation(api.preferences.save, { themeStyle: "minimal" });
    expect(await t.query(api.preferences.get, {})).toBeNull();
    expect(await t.rows("SELECT * FROM preferences")).toHaveLength(0);
  });
});
