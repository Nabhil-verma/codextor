import { describe, expect, it } from "vitest";
import {
  EMPTY_SEEN,
  initializeSeen,
  pendingCeremonies,
  withSeen,
  type CeremonySeen,
} from "../src/lib/ceremony";
import { ASCENSIONS, XP_PER_LEVEL } from "../src/lib/gamification";

/*
 * What deserves a ceremony, and — more importantly — what does not: never the
 * starting tier, never an achievement that was already earned before the
 * learner opened the app, and never the same milestone twice.
 */

const TRACKS = [
  { id: "web", title: "Web Development Foundations" },
  { id: "dsa", title: "Data Structures" },
];

describe("completion ceremony", () => {
  it("never celebrates the starting tier", () => {
    expect(pendingCeremonies(EMPTY_SEEN, 1, [], 17)).toEqual([]);
    expect(pendingCeremonies(initializeSeen(1, []), 1, [], 17)).toEqual([]);
  });

  it("celebrates a newly reached tier with its perk", () => {
    const adept = ASCENSIONS.find((a) => a.minLevel === 4)!;
    const events = pendingCeremonies(EMPTY_SEEN, 4, [], 17);
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe("tier");
    expect(events[0].id).toBe("tier:" + adept.id);
    expect(events[0].title).toContain(adept.name);
    expect(events[0].detail).toBe(adept.perk);
    // The tier comes with its own frame data, so the overlay can show it.
    expect(events[0].tier?.frame).toBe(adept.frame);
  });

  it("celebrates a finished track with the running count", () => {
    const events = pendingCeremonies(EMPTY_SEEN, 3, [TRACKS[0]], 17);
    const track = events.find((e) => e.kind === "track")!;
    expect(track.id).toBe("track:web");
    expect(track.title).toContain("Web Development Foundations");
    expect(track.detail).toContain("1 of 17");
  });

  it("absorbs history on the first run instead of replaying it", () => {
    const level = 5;
    const seen = initializeSeen(level, ["web", "dsa"]);
    expect(seen.initialized).toBe(true);
    expect(pendingCeremonies(seen, level, TRACKS, 17)).toEqual([]);

    // A tier earned from here on is celebrated; the absorbed ones are not.
    expect(pendingCeremonies(seen, 16, TRACKS, 17).map((e) => e.kind)).toEqual(["tier"]);
  });

  it("marks dismissed milestones so they never fire twice", () => {
    const first = pendingCeremonies(EMPTY_SEEN, 4, [TRACKS[0]], 17);
    expect(first).toHaveLength(2);
    const seen: CeremonySeen = withSeen(EMPTY_SEEN, first);
    expect(pendingCeremonies(seen, 4, [TRACKS[0]], 17)).toEqual([]);
    // Applying the same events again is idempotent.
    expect(withSeen(seen, first)).toEqual(seen);
    // The second track is still pending.
    const second = pendingCeremonies(seen, 4, TRACKS, 17);
    expect(second.map((e) => e.id)).toEqual(["track:dsa"]);
  });

  it("orders the tier before the tracks, newest work first", () => {
    const events = pendingCeremonies(EMPTY_SEEN, 3 * XP_PER_LEVEL + 1, TRACKS, 17);
    expect(events[0].kind).toBe("tier");
    expect(events.slice(1).every((e) => e.kind === "track")).toBe(true);
  });
});
