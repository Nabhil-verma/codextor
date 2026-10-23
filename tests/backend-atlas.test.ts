import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../src/convex/schema";
import { api } from "../src/convex/_generated/api";

/*
 * Atlas interview answers on the account. The merge follows the same rule as
 * `mergeAnswers` on the client: commutative and idempotent, so two devices
 * converge. Signed-out reads stay null and signed-out writes are dropped.
 */

const modules = import.meta.glob("../src/convex/**/*.ts");

describe("account-backed Atlas answers", () => {
  it("returns null when signed out", async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.atlas.get, {})).toBeNull();
  });

  it("stores and returns the signed-in learner's answers", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run((ctx) => ctx.db.insert("users", { name: "Ada" }));
    const as = t.withIdentity({ subject: userId });

    await as.mutation(api.atlas.save, { answers: { goal: "interview-prep" } });
    expect(await as.query(api.atlas.get, {})).toEqual({ answers: { goal: "interview-prep" }, revision: 0 });
  });

  it("merges two devices' answers the same way in either order", async () => {
    const a = convexTest(schema, modules);
    const b = convexTest(schema, modules);
    const userA = await a.run((ctx) => ctx.db.insert("users", { name: "Ada" }));
    const userB = await b.run((ctx) => ctx.db.insert("users", { name: "Ada" }));

    const left = { goal: "junior-frontend", hours: "4-7" };
    const right = { goal: "interview-prep", device: "laptop" };

    await a.withIdentity({ subject: userA }).mutation(api.atlas.save, { answers: left });
    await a.withIdentity({ subject: userA }).mutation(api.atlas.save, { answers: right });

    await b.withIdentity({ subject: userB }).mutation(api.atlas.save, { answers: right });
    await b.withIdentity({ subject: userB }).mutation(api.atlas.save, { answers: left });

    expect(await a.withIdentity({ subject: userA }).query(api.atlas.get, {})).toEqual(
      await b.withIdentity({ subject: userB }).query(api.atlas.get, {}),
    );
  });

  it("is idempotent: saving the same answers twice changes nothing", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run((ctx) => ctx.db.insert("users", { name: "Ada" }));
    const as = t.withIdentity({ subject: userId });
    const answers = { goal: "fullstack-agents", hours: "8-12" };

    await as.mutation(api.atlas.save, { answers });
    const once = await as.query(api.atlas.get, {});
    await as.mutation(api.atlas.save, { answers });
    expect(await as.query(api.atlas.get, {})).toEqual(once);
  });

  it("keeps the answers of different accounts apart", async () => {
    const t = convexTest(schema, modules);
    const ada = await t.run((ctx) => ctx.db.insert("users", { name: "Ada" }));
    const bob = await t.run((ctx) => ctx.db.insert("users", { name: "Bob" }));

    await t.withIdentity({ subject: ada }).mutation(api.atlas.save, { answers: { goal: "interview-prep" } });
    expect(await t.withIdentity({ subject: bob }).query(api.atlas.get, {})).toEqual({ answers: {}, revision: 0 });
  });

  it("preserves a newer edit or skip when an old device reconnects", async () => {
    const t = convexTest(schema, modules);
    const id = await t.run((ctx) => ctx.db.insert("users", { name: "Ada" }));
    const as = t.withIdentity({ subject: id });
    await as.mutation(api.atlas.save, { answers: { goal: "junior-frontend" }, revision: 1 });
    await as.mutation(api.atlas.save, { answers: { goal: "interview-prep" }, revision: 2 });
    expect(await as.query(api.atlas.get, {})).toEqual({ answers: { goal: "interview-prep" }, revision: 2 });
    await as.mutation(api.atlas.save, { answers: {}, revision: 3 });
    await as.mutation(api.atlas.save, { answers: { goal: "junior-frontend" }, revision: 1 });
    expect(await as.query(api.atlas.get, {})).toEqual({ answers: {}, revision: 3 });
  });

  it("drops a save from a signed-out client", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.atlas.save, { answers: { goal: "interview-prep" } });
    const rows = await t.run((ctx) => ctx.db.query("atlas").collect());
    expect(rows).toHaveLength(0);
  });

  it("ignores values that are not short strings", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run((ctx) => ctx.db.insert("users", { name: "Ada" }));
    const as = t.withIdentity({ subject: userId });
    await as.mutation(api.atlas.save, {
      answers: { goal: "interview-prep", hours: "99", device: "x".repeat(500) },
    });
    expect(await as.query(api.atlas.get, {})).toEqual({ answers: { goal: "interview-prep" }, revision: 0 });
  });
});
