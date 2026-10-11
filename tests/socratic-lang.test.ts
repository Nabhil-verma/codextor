import { describe, expect, it } from "vitest";
import { fenceLang } from "../src/components/SocraticTutor";

/* #2b: the tutor's code fence is labelled with the lesson's language. */
describe("fenceLang", () => {
  it("labels each lesson language", () => {
    expect(fenceLang("js")).toBe("javascript");
    expect(fenceLang("ts")).toBe("typescript");
    expect(fenceLang("python")).toBe("python");
    expect(fenceLang("bash")).toBe("bash");
    expect(fenceLang("sql")).toBe("sql");
  });

  it("falls back to javascript when no lang is given", () => {
    expect(fenceLang(undefined)).toBe("javascript");
  });
});
