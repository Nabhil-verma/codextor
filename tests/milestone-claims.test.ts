import { beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { api } from "../src/convex/_generated/api";
import schema from "../src/convex/schema";
import type { Id } from "../src/convex/_generated/dataModel";
import {
  MILESTONES,
  mergeClaims,
  milestoneStatus,
  type Claims,
  type MilestoneArtifacts,
} from "../src/lib/milestones";
import {
  claimMilestone,
  loadClaims,
  resetClaims,
} from "../src/lib/milestoneStore";

/* The local claim log, stubbed like `tests/progress.test.ts` does. */
const local = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => local.get(k) ?? null,
  setItem: (k: string, v: string) => void local.set(k, v),
  removeItem: (k: string) => void local.delete(k),
});
beforeEach(() => {
  local.clear();
  resetClaims();
});

/*
 * Milestone claims used to be local-only, which meant two devices disagreed
 * and clearing storage lost the project. They now ride on the same Convex row
 * as lesson scores, in their own field — so this file guards the two things
 * that could silently corrupt a learner's project:
 *
 *  1. The merge rule. A claim is a dated attestation, not a score, so
 *     "best claim wins" has to be commutative and idempotent or a push and a
 *     pull can oscillate instead of converging.
 *  2. The boundary. Claims and scores share a row, so each writer must touch
 *     only its own field, and malformed client input must never be stored.
 *
 * The skill gate itself is re-asserted at the end: syncing claims across
 * devices must not become a way to fake "shipped".
 */

const modules = import.meta.glob("../src/convex/**/*.*s");

const ARTIFACT: MilestoneArtifacts = {
  task: "Convert the shell to semantic landmarks",
  note: "The agent skipped a heading level and trapped focus in the mobile nav on the draft.",
  noteCategory: "EC",
  proof: {
    buggy: "const headings = [\"h1\", \"h3\"];",
    test: "if (headings[1] !== \"h2\") throw new Error(\"skipped heading level\");",
    fixed: "const headings = [\"h1\", \"h2\"];",
  },
};

type Server = ReturnType<typeof convexTest>;

function server() {
  return convexTest(schema, modules);
}

async function makeUser(t: Server, email = "ada@claims.test"): Promise<Id<"users">> {
  return t.run((ctx) => ctx.db.insert("users", { name: "Ada", email }));
}

describe("claim merge rule", () => {
  it("keeps the best claim per milestone, commutatively and idempotently", () => {
    const a: Claims = { "m-shell": { at: "2026-05-02", deliverables: [0, 1] } };
    const b: Claims = {
      "m-shell": { at: "2026-05-01", deliverables: [0, 1, 2] },
      "m-style": { at: "2026-05-03", deliverables: [0] },
    };

    const expected: Claims = {
      "m-shell": { at: "2026-05-01", deliverables: [0, 1, 2] },
      "m-style": { at: "2026-05-03", deliverables: [0] },
    };

    expect(mergeClaims(a, b)).toEqual(expected);
    // Order must not matter, or a push/pull pair could never settle.
    expect(mergeClaims(b, a)).toEqual(expected);
    // Re-merging the result changes nothing.
    expect(mergeClaims(mergeClaims(a, b), b)).toEqual(expected);
  });

  it("never downgrades a claim, and breaks ties on the earlier date", () => {
    const done: Claims = {
      "m-ship": { at: "2026-06-10", deliverables: [0, 1, 2] },
    };
    const partial: Claims = {
      "m-ship": { at: "2026-06-01", deliverables: [0] },
    };
    expect(mergeClaims(done, partial)["m-ship"]).toEqual(done["m-ship"]);
    expect(mergeClaims(partial, done)["m-ship"]).toEqual(done["m-ship"]);

    // Same number of ticks from two devices: the first time it was shipped wins.
    const late: Claims = { "m-ship": { at: "2026-06-10", deliverables: [0, 1] } };
    const early: Claims = { "m-ship": { at: "2026-06-01", deliverables: [0, 1] } };
    expect(mergeClaims(late, early)["m-ship"].at).toBe("2026-06-01");
    expect(mergeClaims(early, late)["m-ship"].at).toBe("2026-06-01");
  });

  it("gives ties with artifacts to the artifact claim, then the earlier date", () => {
    const withArtifact: Claims = {
      "m-shell": { at: "2026-05-05", deliverables: [0, 1], artifacts: ARTIFACT },
    };
    const without: Claims = {
      "m-shell": { at: "2026-05-01", deliverables: [0, 1] },
    };
    // Both directions: the artifact wins over the earlier bare claim, which is
    // what makes the pre-patch resubmission path work.
    expect(mergeClaims(without, withArtifact)["m-shell"].artifacts).toEqual(ARTIFACT);
    expect(mergeClaims(withArtifact, without)["m-shell"].artifacts).toEqual(ARTIFACT);
    // Commutative and idempotent: re-merging never oscillates.
    expect(
      mergeClaims(mergeClaims(without, withArtifact), withArtifact)["m-shell"].artifacts
    ).toEqual(ARTIFACT);

    // Both carry artifacts → the earlier proof wins, whichever side it is on.
    const later: Claims = {
      "m-shell": { at: "2026-05-09", deliverables: [0, 1], artifacts: ARTIFACT },
    };
    const earlier: Claims = {
      "m-shell": { at: "2026-05-02", deliverables: [0, 1], artifacts: ARTIFACT },
    };
    expect(mergeClaims(later, earlier)["m-shell"].at).toBe("2026-05-02");
    expect(mergeClaims(earlier, later)["m-shell"].at).toBe("2026-05-02");

    // More ticks still beats artifacts — the evidence rule never downgrades work.
    const fuller: Claims = { "m-shell": { at: "2026-06-01", deliverables: [0, 1, 2] } };
    expect(mergeClaims(withArtifact, fuller)["m-shell"].deliverables).toEqual([0, 1, 2]);
  });

  it("flags pre-patch claims and artifact-bearing claims", () => {
    const empty = { completed: {} };
    const legacy: Claims = { "m-shell": { at: "2026-05-01", deliverables: [0] } };
    const withArt: Claims = {
      "m-shell": { at: "2026-05-01", deliverables: [0], artifacts: ARTIFACT },
    };
    const legacyStatus = milestoneStatus(MILESTONES[0], empty, legacy);
    expect(legacyStatus.legacyClaim).toBe(true);
    expect(legacyStatus.hasArtifacts).toBe(false);
    const artStatus = milestoneStatus(MILESTONES[0], empty, withArt);
    expect(artStatus.legacyClaim).toBe(false);
    expect(artStatus.hasArtifacts).toBe(true);
  });
});

describe("claimMilestone (local store)", () => {
  it("never downgrades and allows a pre-patch resubmission with artifacts", () => {
    claimMilestone("m-shell", [0, 1], "2026-05-01");
    // A partial re-claim can't replace the fuller one.
    claimMilestone("m-shell", [0], "2026-05-02");
    expect(loadClaims()["m-shell"].deliverables).toEqual([0, 1]);
    expect(loadClaims()["m-shell"].artifacts).toBeUndefined();

    // The resubmission path: same ticks, artifacts attached.
    claimMilestone("m-shell", [0, 1], "2026-05-03", ARTIFACT);
    expect(loadClaims()["m-shell"].artifacts).toEqual(ARTIFACT);

    // A bare re-claim can't strip the artifact back off.
    claimMilestone("m-shell", [0, 1], "2026-05-04");
    expect(loadClaims()["m-shell"].artifacts).toEqual(ARTIFACT);

    // An identical resubmission is a no-op, not a rewrite.
    const before = JSON.stringify(loadClaims());
    claimMilestone("m-shell", [0, 1], "2026-05-05", ARTIFACT);
    expect(JSON.stringify(loadClaims())).toBe(before);
  });

  it("drops a malformed artifact instead of storing junk", () => {
    claimMilestone("m-shell", [0, 1], "2026-05-01", {
      ...ARTIFACT,
      noteCategory: "NOPE" as never,
    });
    expect(loadClaims()["m-shell"].deliverables).toEqual([0, 1]);
    expect(loadClaims()["m-shell"].artifacts).toBeUndefined();
  });
});

describe("claims on the server", () => {
  it("round-trips claims and merges a second device without downgrading", async () => {
    const t = server();
    const userId = await makeUser(t);
    const me = t.withIdentity({ subject: userId });

    expect(await me.query(api.progress.getClaims, {})).toEqual({});

    await me.mutation(api.progress.saveClaims, {
      claims: { "m-shell": { at: "2026-05-02", deliverables: [0, 1, 2] } },
    });
    // A second device that only ticked one box, on an earlier day.
    await me.mutation(api.progress.saveClaims, {
      claims: {
        "m-shell": { at: "2026-05-01", deliverables: [0] },
        "m-style": { at: "2026-05-03", deliverables: [1, 1, 0] },
      },
    });

    const back = (await me.query(api.progress.getClaims, {}))!;
    expect(back["m-shell"]).toEqual({ at: "2026-05-02", deliverables: [0, 1, 2] });
    // Duplicate ticks are collapsed and the list is sorted, so identical
    // claims from two devices compare equal.
    expect(back["m-style"]).toEqual({ at: "2026-05-03", deliverables: [0, 1] });
  });

  it("drops claims that aren't a dated tick list, and filters junk out of the rest", async () => {
    const t = server();
    const userId = await makeUser(t);
    const me = t.withIdentity({ subject: userId });

    await me.mutation(api.progress.saveClaims, {
      claims: {
        "m-bad-date": { at: "yesterday", deliverables: [0] },
        "m-no-ticks": { at: "2026-05-01", deliverables: [] },
        "m-not-array": { at: "2026-05-01", deliverables: "all" },
        "m-nan": { at: "2026-05-01", deliverables: [0, "x", -3, 1.5, 2] },
        "m-good": { at: "2026-05-01", deliverables: [2, 0] },
      },
    });

    const back = (await me.query(api.progress.getClaims, {}))!;
    expect(Object.keys(back).sort()).toEqual(["m-good", "m-nan"]);
    expect(back["m-good"]).toEqual({ at: "2026-05-01", deliverables: [0, 2] });
    // Non-integers and negatives are not deliverable indexes.
    expect(back["m-nan"]).toEqual({ at: "2026-05-01", deliverables: [0, 2] });
  });

  it("writes nothing — not even a row — when every incoming claim is junk", async () => {
    const t = server();
    const userId = await makeUser(t);
    const me = t.withIdentity({ subject: userId });

    await me.mutation(api.progress.saveClaims, {
      claims: { "m-shell": { at: "not a date", deliverables: [] } },
    });

    expect(await me.query(api.progress.getClaims, {})).toEqual({});
    const rows = await t.run((ctx) => ctx.db.query("progress").collect());
    expect(rows).toHaveLength(0);
  });

  it("is a no-op when signed out", async () => {
    const t = server();
    await t.mutation(api.progress.saveClaims, {
      claims: { "m-shell": { at: "2026-05-01", deliverables: [0] } },
    });
    expect(await t.query(api.progress.getClaims, {})).toBe(null);
    const rows = await t.run((ctx) => ctx.db.query("progress").collect());
    expect(rows).toHaveLength(0);
  });

  it("keeps claims and lesson scores on one row without clobbering each other", async () => {
    const t = server();
    const userId = await makeUser(t);
    const me = t.withIdentity({ subject: userId });

    await me.mutation(api.progress.save, { data: { "web/html!2026-05-01": 1 } });
    await me.mutation(api.progress.saveClaims, {
      claims: { "m-shell": { at: "2026-05-02", deliverables: [0] } },
    });
    // A later score push must not wipe the claim…
    await me.mutation(api.progress.save, { data: { "web/css!2026-05-02": 0.5 } });

    expect(await me.query(api.progress.getClaims, {})).toEqual({
      "m-shell": { at: "2026-05-02", deliverables: [0] },
    });

    // …and the claims push must not wipe the scores.
    const scores = (await me.query(api.progress.get, {}))!;
    expect(scores["web/html!2026-05-01"]).toBe(1);
    expect(scores["web/css!2026-05-02"]).toBe(0.5);
  });

  it("creates the row when a claim lands before any lesson score has synced", async () => {
    const t = server();
    const userId = await makeUser(t);
    const me = t.withIdentity({ subject: userId });

    await me.mutation(api.progress.saveClaims, {
      claims: { "m-shell": { at: "2026-05-01", deliverables: [0] } },
    });

    const rows = await t.run((ctx) => ctx.db.query("progress").collect());
    expect(rows).toHaveLength(1);
    // The score map exists and is empty, ready for the first lesson push.
    expect(await me.query(api.progress.get, {})).toEqual({});
  });

  it("clears claims along with progress when the account is wiped", async () => {
    const t = server();
    const userId = await makeUser(t);
    const me = t.withIdentity({ subject: userId });

    await me.mutation(api.progress.saveClaims, {
      claims: { "m-shell": { at: "2026-05-01", deliverables: [0] } },
    });
    await me.mutation(api.progress.save, { data: { "web/html!2026-05-01": 1 } });
    await me.mutation(api.progress.wipe, {});

    expect(await me.query(api.progress.getClaims, {})).toEqual({});
    expect(await me.query(api.progress.get, {})).toEqual({});
  });
});

describe("attempt aggregates on the server", () => {
  it("round-trips and merges without ever rewinding a first attempt", async () => {
    const t = server();
    const userId = await makeUser(t, "ada@attempts.test");
    const me = t.withIdentity({ subject: userId });

    expect(await me.query(api.progress.getAttempts, {})).toEqual({});

    await me.mutation(api.progress.saveAttempts, {
      attempts: {
        "agents/verifying-agent-output": { first: 0.4, best: 0.4, attempts: 1, at: 100, firstAt: 100 },
      },
    });
    // A second device that attempted later and scored better.
    await me.mutation(api.progress.saveAttempts, {
      attempts: {
        "agents/verifying-agent-output": { first: 1, best: 1, attempts: 1, at: 200, firstAt: 200 },
        "web/es6-syntax": { first: 0, best: 0.7, attempts: 3, at: 300, firstAt: 300 },
      },
    });

    const back = (await me.query(api.progress.getAttempts, {}))!;
    // The earlier device's 0.4 is the real first attempt; best is the max.
    expect(back["agents/verifying-agent-output"]).toEqual({
      first: 0.4,
      best: 1,
      attempts: 1,
      at: 200,
      firstAt: 100,
    });
    expect(back["web/es6-syntax"]).toEqual({
      first: 0,
      best: 0.7,
      attempts: 3,
      at: 300,
      firstAt: 300,
    });
  });

  it("picks first from the earlier first attempt, not the earlier latest attempt", async () => {
    const t = server();
    const userId = await makeUser(t, "ada@attempts-clock.test");
    const me = t.withIdentity({ subject: userId });

    // Device A: first attempt at t=500, still practising at t=900.
    await me.mutation(api.progress.saveAttempts, {
      attempts: {
        "agents/verifying-agent-output": {
          first: 0.4,
          best: 0.7,
          attempts: 2,
          at: 900,
          firstAt: 500,
        },
      },
    });
    // Device B: one attempt at t=600 — later than A's first, earlier than A's last.
    await me.mutation(api.progress.saveAttempts, {
      attempts: {
        "agents/verifying-agent-output": {
          first: 1,
          best: 1,
          attempts: 1,
          at: 600,
          firstAt: 600,
        },
      },
    });

    const back = (await me.query(api.progress.getAttempts, {}))!;
    // Using `at` for this decision would report 1.0 here and inflate the gate.
    expect(back["agents/verifying-agent-output"]).toEqual({
      first: 0.4,
      best: 1,
      attempts: 2,
      at: 900,
      firstAt: 500,
    });
  });

  it("round-trips artifacts and drops only the broken ones", async () => {
    const t = server();
    const userId = await makeUser(t, "ada@artifacts.test");
    const me = t.withIdentity({ subject: userId });

    await me.mutation(api.progress.saveClaims, {
      claims: {
        "m-shell": { at: "2026-05-02", deliverables: [0, 1], artifacts: ARTIFACT },
        // A junk category drops the artifact but keeps the claim.
        "m-style": {
          at: "2026-05-02",
          deliverables: [0],
          artifacts: { ...ARTIFACT, noteCategory: "NOT_A_CODE" },
        },
        // A structurally broken proof is dropped the same way.
        "m-data": {
          at: "2026-05-02",
          deliverables: [0],
          artifacts: {
            task: "x",
            note: "y",
            noteCategory: "EC",
            proof: { buggy: "a", test: "b" },
          },
        },
      },
    });

    const back = (await me.query(api.progress.getClaims, {}))!;
    expect(back["m-shell"].artifacts).toEqual(ARTIFACT);
    expect(back["m-style"].deliverables).toEqual([0]);
    expect(back["m-style"].artifacts).toBeUndefined();
    expect(back["m-data"].deliverables).toEqual([0]);
    expect(back["m-data"].artifacts).toBeUndefined();
  });

  it("lets a pre-patch claim resubmit with an artifact, without downgrading", async () => {
    const t = server();
    const userId = await makeUser(t, "ada@resubmit.test");
    const me = t.withIdentity({ subject: userId });

    await me.mutation(api.progress.saveClaims, {
      claims: { "m-shell": { at: "2026-05-01", deliverables: [0, 1] } },
    });
    // The resubmission: same ticks, later date, now with the artifact.
    await me.mutation(api.progress.saveClaims, {
      claims: {
        "m-shell": { at: "2026-05-03", deliverables: [0, 1], artifacts: ARTIFACT },
      },
    });
    // And an attempt to strip it again must lose.
    await me.mutation(api.progress.saveClaims, {
      claims: { "m-shell": { at: "2026-05-05", deliverables: [0, 1] } },
    });

    const back = (await me.query(api.progress.getClaims, {}))!;
    expect(back["m-shell"].artifacts).toEqual(ARTIFACT);
    expect(back["m-shell"].at).toBe("2026-05-03");
  });

  it("drops malformed aggregates and never stores an empty map", async () => {
    const t = server();
    const userId = await makeUser(t, "ada@attempts-junk.test");
    const me = t.withIdentity({ subject: userId });

    await me.mutation(api.progress.saveAttempts, {
      attempts: {
        "not-an-object": 5,
        "zero-count": { first: 0.5, best: 0.5, attempts: 0, at: 1 },
        "bad-first": { first: "x", best: 1, attempts: 2, at: 1 },
        "clamped": { first: 5, best: -2, attempts: 1.9, at: 1 },
      },
    });

    const back = (await me.query(api.progress.getAttempts, {}))!;
    expect(Object.keys(back)).toEqual(["clamped"]);
    // No firstAt on this legacy row → it falls back to `at`.
    expect(back["clamped"]).toEqual({ first: 1, best: 0, attempts: 1, at: 1, firstAt: 1 });

    // An all-junk push writes nothing at all — not even a row.
    const t2 = server();
    const u2 = await makeUser(t2, "ada@attempts-empty.test");
    const me2 = t2.withIdentity({ subject: u2 });
    await me2.mutation(api.progress.saveAttempts, { attempts: { x: 1 } });
    expect(await me2.query(api.progress.getAttempts, {})).toEqual({});
    const rows = await t2.run((ctx) => ctx.db.query("progress").collect());
    expect(rows).toHaveLength(0);
  });

  it("keeps attempts, scores and claims on one row without clobbering each other", async () => {
    const t = server();
    const userId = await makeUser(t, "ada@attempts-row.test");
    const me = t.withIdentity({ subject: userId });

    await me.mutation(api.progress.save, { data: { "web/html!2026-05-01": 1 } });
    await me.mutation(api.progress.saveClaims, {
      claims: { "m-shell": { at: "2026-05-02", deliverables: [0] } },
    });
    await me.mutation(api.progress.saveAttempts, {
      attempts: { "web/html": { first: 0.5, best: 1, attempts: 2, at: 10 } },
    });

    // Each later writer must leave the other two fields intact.
    expect((await me.query(api.progress.get, {}))!["web/html!2026-05-01"]).toBe(1);
    expect(await me.query(api.progress.getClaims, {})).toEqual({
      "m-shell": { at: "2026-05-02", deliverables: [0] },
    });
    expect((await me.query(api.progress.getAttempts, {}))!["web/html"]).toEqual({
      first: 0.5,
      best: 1,
      attempts: 2,
      at: 10,
      firstAt: 10,
    });
  });

  it("is a no-op when signed out", async () => {
    const t = server();
    await t.mutation(api.progress.saveAttempts, {
      attempts: { "web/html": { first: 0.5, best: 1, attempts: 1, at: 1 } },
    });
    expect(await t.query(api.progress.getAttempts, {})).toBe(null);
    const rows = await t.run((ctx) => ctx.db.query("progress").collect());
    expect(rows).toHaveLength(0);
  });

  it("is cleared by an account wipe", async () => {
    const t = server();
    const userId = await makeUser(t, "ada@attempts-wipe.test");
    const me = t.withIdentity({ subject: userId });

    await me.mutation(api.progress.saveAttempts, {
      attempts: { "web/html": { first: 0.5, best: 1, attempts: 1, at: 1 } },
    });
    await me.mutation(api.progress.wipe, {});
    expect(await me.query(api.progress.getAttempts, {})).toEqual({});
  });
});

describe("synced claims can't fake the skill gate", () => {
  it("renders a cloud claim as shipped only when its lessons are done", () => {
    // A claims log pulled straight from the cloud, with no local progress.
    const fromCloud: Claims = Object.fromEntries(
      MILESTONES.map((m) => [
        m.id,
        { at: "2026-05-01", deliverables: m.deliverables.map((_, i) => i) },
      ])
    );
    const claims = mergeClaims({}, fromCloud);
    expect(Object.keys(claims)).toHaveLength(MILESTONES.length);

    const empty = { completed: {} };
    for (const m of MILESTONES) {
      const status = milestoneStatus(m, empty, claims);
      expect(status.claimed, m.id).toBe(true);
      expect(status.unlocked, m.id).toBe(false);
      expect(status.earned, `${m.id} was claimed without its lessons`).toBe(false);
    }
  });
});
