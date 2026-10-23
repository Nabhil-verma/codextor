// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PLAN_APPROVAL, PERMISSION_SIM, DELEGATION_REPLAY, delegationAnswer, type DecisionArtifact } from "../src/data/decision-artifacts";
import { gradeDecisions, replayCapabilities, replayMinutes } from "../src/lib/decisionGrade";
import DecisionLab from "../src/components/DecisionLab";
import { agentsTrack } from "../src/data/track-agents";

afterEach(cleanup);
const ALL = [PLAN_APPROVAL, PERMISSION_SIM, DELEGATION_REPLAY];

describe("decision artifact data", () => {
  it("every answer is one of the artifact's options and ids are unique", () => {
    for (const a of ALL) {
      const values = new Set(a.options.map(o => o.value));
      expect(new Set(a.items.map(i => i.id)).size).toBe(a.items.length);
      for (const i of a.items) expect(values.has(i.answer)).toBe(true);
    }
  });

  it("delegation answers follow the stated rule", () => {
    const got = Object.fromEntries(DELEGATION_REPLAY.items.map(i => [i.id, i.answer]));
    expect(got).toEqual({
      "rename-local": "BY HAND",
      "formatter-tests": "DELEGATE",
      "pricing-policy": "BY HAND",
      "migrate-calls": "DELEGATE",
    });
    expect(delegationAnswer({ human: 10, delegate: null })).toBe("BY HAND");
  });

  it("is attached to the three stable lessons", () => {
    const find = (id: string) => agentsTrack.lessons.find(l => l.id === id);
    expect(find("plan-before-code")?.decisions).toEqual([PLAN_APPROVAL]);
    expect(find("permissions-and-sandbox")?.decisions).toEqual([PERMISSION_SIM]);
    expect(find("when-not-to-use-agents")?.decisions).toEqual([DELEGATION_REPLAY]);
  });
});

describe("decision grading and replay", () => {
  const picksFor = (a: DecisionArtifact) => Object.fromEntries(a.items.map(i => [i.id, i.answer]));
  it("exact match scores the fraction correct", () => {
    expect(gradeDecisions(PERMISSION_SIM, picksFor(PERMISSION_SIM))).toBe(1);
    const wrong = { ...picksFor(PERMISSION_SIM), "read-env": "ALLOW" };
    expect(gradeDecisions(PERMISSION_SIM, wrong)).toBeCloseTo(6 / 7);
  });
  it("replay charges delegation only where delegated, and full human time when unverifiable", () => {
    const picks = { "rename-local": "DELEGATE", "formatter-tests": "DELEGATE", "pricing-policy": "DELEGATE", "migrate-calls": "BY HAND" };
    expect(replayMinutes(DELEGATION_REPLAY, picks)).toEqual({ chosen: 4 + 20 + 90 + 240, allByHand: 3 + 60 + 90 + 240 });
  });
});

describe("DecisionLab UI", () => {
  it("replays read/write/execute/network blast radius through actual controls", () => {
    render(<DecisionLab artifact={PERMISSION_SIM} onScore={vi.fn()} />);
    expect(screen.getByText(/WRITE blocked: analysis only/)).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: "write" }));
    expect(screen.getByText(/WRITE: scoped patch/)).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: "execute" }));
    expect(screen.getByText(/EXECUTE: local regression/)).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: "network" }));
    expect(screen.getByText(/NETWORK risk: the same agent/)).toBeTruthy();
    expect(replayCapabilities({read:false,write:true,execute:false,network:false}).join()).toContain("blind patch");
  });
  it("keeps the check disabled until every item is decided, then grades exactly", () => {
    const score = vi.fn();
    render(<DecisionLab artifact={PLAN_APPROVAL} onScore={score} />);
    const check = screen.getByRole("button", { name: "Check decisions" }) as HTMLButtonElement;
    expect(check.disabled).toBe(true);
    for (const item of PLAN_APPROVAL.items) {
      const group = screen.getByRole("group", { name: `Decision for: ${item.text}` });
      const option = Array.from(group.querySelectorAll("input")).find(i => i.value === item.answer)!;
      fireEvent.click(option);
    }
    expect(check.disabled).toBe(false);
    fireEvent.click(check);
    expect(score).toHaveBeenCalledWith(1);
    expect(screen.getByRole("status").textContent).toContain("6 of 6 match the policy");
  });
});

import { ENFORCEMENT_RULES, UNATTENDED_RUNS } from "../src/data/decision-artifacts";

describe("#10 enforcement and headless artifacts", () => {
  it("answers are valid options with unique ids", () => {
    for (const a of [ENFORCEMENT_RULES, UNATTENDED_RUNS]) {
      const values = new Set(a.options.map(o => o.value));
      expect(new Set(a.items.map(i => i.id)).size).toBe(a.items.length);
      for (const i of a.items) expect(values.has(i.answer)).toBe(true);
    }
  });
  it("lessons exist with artifacts and quizzes", () => {
    const find = (id: string) => agentsTrack.lessons.find(l => l.id === id);
    expect(find("enforceable-rules")?.decisions).toEqual([ENFORCEMENT_RULES]);
    expect(find("headless-and-scheduled-agents")?.decisions).toEqual([UNATTENDED_RUNS]);
    expect(find("enforceable-rules")?.quiz.length).toBeGreaterThan(0);
    expect(find("headless-and-scheduled-agents")?.quiz.length).toBeGreaterThan(0);
  });
});
