import { describe, expect, it } from "vitest";
import { canonicalProgressKey, PROGRESS_KEY_ALIASES } from "../src/lib/progressKeys";

describe("progress key aliases", () => {
  it("leaves keys unchanged when no alias exists", () => {
    expect(canonicalProgressKey("python/python-syntax")).toBe("python/python-syntax");
    expect(PROGRESS_KEY_ALIASES).toEqual({ "agent-internals/python-llm-api": "python/python-llm-api" });
    expect(canonicalProgressKey("agent-internals/python-llm-api")).toBe("python/python-llm-api");
  });
  it("follows a moved lesson's old key to its new key", () => {
    const aliases = { "old-track/lesson": "python/lesson", "python/lesson": "python/lesson-2" };
    expect(canonicalProgressKey("old-track/lesson", aliases)).toBe("python/lesson-2");
  });
  it("throws on a cycle instead of looping", () => {
    expect(() => canonicalProgressKey("a", { a: "b", b: "a" })).toThrow("cycle");
  });
});
