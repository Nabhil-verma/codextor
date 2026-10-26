import { describe, expect, it } from "vitest";
import { createBackend } from "./helpers/backend";
import { api } from "../src/lib/api";

/*
 * Atlas interview answers on the account. The merge follows the same rule as
 * `mergeAnswers` on the client: commutative and idempotent, so two devices
 * converge. Signed-out reads stay null and signed-out writes are dropped.
 *
 * Stored in the Freebuff D1 database, keyed by the Freebuff account id.
 */

describe("account-backed Atlas answers", () => {
  it("returns null when signed out", async () => {
    const t = createBackend();
    expect(await t.query(api.atlas.get, {})).toBeNull();
  });

  it("stores and returns the signed-in learner's answers", async () => {
    const t = createBackend();
    const userId = await t.seedUser({ name: "Ada" });
    const as = t.as(userId);

    await as.mutation(api.atlas.save, { answers: { goal: "interview-prep" } });
    expect(await as.query(api.atlas.get, {})).toEqual({
      answers: { goal: "interview-prep" },
      revision: 0,
    });
  });

  it("merges two devices' answers the same way in either order", async () => {
    const a = createBackend();
    const b = createBackend();
    const userA = await a.seedUser({ name: "Ada" });
    const userB = await b.seedUser({ name: "Ada" });

    const left = { goal: "junior-frontend", hours: "4-7" };
    const right = { goal: "interview-prep", device: "laptop" };

    await a.as(userA).mutation(api.atlas.save, { answers: left });
    await a.as(userA).mutation(api.atlas.save, { answers: right });

    await b.as(userB).mutation(api.atlas.save, { answers: right });
    await b.as(userB).mutation(api.atlas.save, { answers: left });

    expect(await a.as(userA).query(api.atlas.get, {})).toEqual(
      await b.as(userB).query(api.atlas.get, {}),
    );
  });

  it("is idempotent: saving the same answers twice changes nothing", async () => {
    const t = createBackend();
    const userId = await t.seedUser({ name: "Ada" });
    const as = t.as(userId);
    const answers = { goal: "fullstack-agents", hours: "8-12" };

    await as.mutation(api.atlas.save, { answers });
    const once = await as.query(api.atlas.get, {});
    await as.mutation(api.atlas.save, { answers });
    expect(await as.query(api.atlas.get, {})).toEqual(once);
  });

  it("keeps the answers of different accounts apart", async () => {
    const t = createBackend();
    const ada = await t.seedUser({ name: "Ada" });
    const bob = await t.seedUser({ name: "Bob" });

    await t.as(ada).mutation(api.atlas.save, { answers: { goal: "interview-prep" } });
    expect(await t.as(bob).query(api.atlas.get, {})).toEqual({ answers: {}, revision: 0 });
  });

  it("preserves a newer edit or skip when an old device reconnects", async () => {
    const t = createBackend();
    const id = await t.seedUser({ name: "Ada" });
    const as = t.as(id);
    await as.mutation(api.atlas.save, { answers: { goal: "junior-frontend" }, revision: 1 });
    await as.mutation(api.atlas.save, { answers: { goal: "interview-prep" }, revision: 2 });
    expect(await as.query(api.atlas.get, {})).toEqual({
      answers: { goal: "interview-prep" },
      revision: 2,
    });
    await as.mutation(api.atlas.save, { answers: {}, revision: 3 });
    await as.mutation(api.atlas.save, { answers: { goal: "junior-frontend" }, revision: 1 });
    expect(await as.query(api.atlas.get, {})).toEqual({ answers: {}, revision: 3 });
  });

  it("drops a save from a signed-out client", async () => {
    const t = createBackend();
    await t.mutation(api.atlas.save, { answers: { goal: "interview-prep" } });
    expect(await t.rows("SELECT * FROM atlas")).toHaveLength(0);
  });

  it("ignores values that are not short strings", async () => {
    const t = createBackend();
    const userId = await t.seedUser({ name: "Ada" });
    const as = t.as(userId);
    await as.mutation(api.atlas.save, {
      answers: { goal: "interview-prep", hours: "99", device: "x".repeat(500) },
    });
    expect(await as.query(api.atlas.get, {})).toEqual({
      answers: { goal: "interview-prep" },
      revision: 0,
    });
  });
});
