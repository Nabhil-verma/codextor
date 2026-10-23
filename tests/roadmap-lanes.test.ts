import { describe, it, expect } from "vitest";
import { tracks } from "../src/data";
import { MILESTONES } from "../src/lib/milestones";
import { LANES, laneById, type Lane } from "../src/data/roadmap-lanes";

const trackIds = new Set(tracks.map((t) => t.id));
const milestoneIds = new Set(MILESTONES.map((m) => m.id));

describe("roadmap lanes", () => {
  it("defines the four starter lanes", () => {
    expect(LANES.map((l) => l.id)).toEqual([
      "junior-frontend",
      "fullstack-agents",
      "school-project-4w",
      "interview-prep",
    ]);
  });

  it("has unique lane ids", () => {
    const ids = LANES.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every lane a title, blurb and weeks hint", () => {
    for (const lane of LANES) {
      expect(lane.title.trim().length, lane.id).toBeGreaterThan(0);
      expect(lane.blurb.trim().length, lane.id).toBeGreaterThan(0);
      expect(lane.weeksHint.trim().length, lane.id).toBeGreaterThan(0);
    }
  });

  it("names only tracks that exist", () => {
    for (const lane of LANES) {
      for (const id of lane.trackIds) {
        expect(trackIds.has(id), `${lane.id} → track ${id}`).toBe(true);
      }
    }
  });

  it("names only milestones that exist", () => {
    for (const lane of LANES) {
      for (const id of lane.milestoneIds) {
        expect(milestoneIds.has(id), `${lane.id} → milestone ${id}`).toBe(true);
      }
    }
  });

  it("lists each track and milestone once per lane", () => {
    for (const lane of LANES) {
      expect(new Set(lane.trackIds).size, `${lane.id} tracks`).toBe(lane.trackIds.length);
      expect(new Set(lane.milestoneIds).size, `${lane.id} milestones`).toBe(
        lane.milestoneIds.length
      );
    }
  });

  it("gives every lane at least one track", () => {
    for (const lane of LANES) {
      expect(lane.trackIds.length, lane.id).toBeGreaterThan(0);
    }
  });

  it("includes the agents track in the full-stack agents lane", () => {
    expect(laneById("fullstack-agents")?.trackIds).toContain("agents");
  });

  it("looks up a lane by id and returns undefined for an unknown id", () => {
    const lane: Lane | undefined = laneById("interview-prep");
    expect(lane?.id).toBe("interview-prep");
    expect(laneById("no-such-lane")).toBeUndefined();
  });
});
