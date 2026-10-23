import { describe, it, expect } from "vitest";
import { chooseView, VIEWS, type ViewChoice } from "../src/lib/atlasView";

const cap = { webgl: true, reducedMotion: false };

describe("chooseView (quality ladder)", () => {
  it("offers exactly the three views, outline first as the fallback", () => {
    expect(VIEWS).toEqual(["3d", "2.5d", "outline"]);
  });

  it("picks 3D when WebGL works and motion is allowed", () => {
    expect(chooseView(cap)).toBe("3d");
  });

  it("falls back to the outline when WebGL is missing", () => {
    expect(chooseView({ ...cap, webgl: false })).toBe("outline");
  });

  it("uses the 2.5D view when motion is reduced, and never the 3D one", () => {
    expect(chooseView({ ...cap, reducedMotion: true })).toBe("2.5d");
  });

  it("uses the outline when motion is reduced and WebGL is missing", () => {
    expect(chooseView({ webgl: false, reducedMotion: true })).toBe("outline");
  });

  it("lets the learner override the automatic choice", () => {
    const override: ViewChoice = "outline";
    expect(chooseView({ ...cap, override })).toBe("outline");
  });

  it("never selects unsupported 3D, even with an override", () => {
    expect(chooseView({ webgl: false, reducedMotion: true, override: "3d" })).toBe("outline");
  });

  it("uses 2.5D on a low-power device", () => {
    expect(chooseView({ ...cap, lowPower: true })).toBe("2.5d");
    expect(chooseView({ ...cap, lowPower: true, override: "3d" })).toBe("3d");
  });

  it("allows a 2.5D override without WebGL", () => {
    expect(chooseView({ ...cap, webgl: false, override: "2.5d" })).toBe("2.5d");
  });

  it("is deterministic", () => {
    expect(chooseView(cap)).toBe(chooseView(cap));
  });
});
