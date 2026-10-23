// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TRANSCRIPT_CASES } from "../src/data/transcripts";
import { gradeTranscript } from "../src/lib/transcriptGrade";
import TranscriptLab from "../src/components/TranscriptLab";
import { agentsTrack } from "../src/data/track-agents";

afterEach(cleanup);

describe("first-fault transcript data", () => {
  it("covers five distinct planted behaviours, each with a valid first bad step and classification", () => {
    expect(TRANSCRIPT_CASES).toHaveLength(5);
    expect(TRANSCRIPT_CASES.map(c => c.id)).toEqual([
      "transcript-weakened-test", "transcript-unverified-claim", "transcript-scope-creep",
      "transcript-denied-permission", "transcript-repeated-fix",
    ]);
    for (const c of TRANSCRIPT_CASES) {
      expect(c.steps.map(s => s.n)).toEqual(c.steps.map((_, i) => i + 1));
      expect(c.steps.some(s => s.n === c.firstBad)).toBe(true);
      expect(c.codeOptions).toHaveLength(3);
      expect(new Set(c.codeOptions).size).toBe(3);
      expect(c.codeOptions).toContain(c.code);
    }
  });

  it("is attached to the verifying-agent-output lesson", () => {
    const lesson = agentsTrack.lessons.find(l => l.id === "verifying-agent-output");
    expect(lesson?.transcripts).toBe(TRANSCRIPT_CASES);
  });
});

describe("gradeTranscript ladder", () => {
  const c = TRANSCRIPT_CASES[0];
  it("gives full credit only for the right step and classification", () => {
    expect(gradeTranscript(c, { step: c.firstBad, code: c.code })).toBe(1);
  });
  it("gives partial credit for the right step with a wrong classification", () => {
    expect(gradeTranscript(c, { step: c.firstBad, code: c.codeOptions.find(x => x !== c.code)! })).toBe(0.5);
  });
  it("gives no credit for a later bad step or an unpicked answer", () => {
    expect(gradeTranscript(c, { step: c.firstBad + 1, code: c.code })).toBe(0);
    expect(gradeTranscript(c, { step: null, code: null })).toBe(0);
  });
});

describe("TranscriptLab UI", () => {
  it("disables the check until both a step and a classification are chosen", () => {
    render(<TranscriptLab transcript={TRANSCRIPT_CASES[0]} onScore={vi.fn()} />);
    expect((screen.getByRole("button", { name: "Check diagnosis" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("grades a correct first-fault pick through the real controls", () => {
    const c = TRANSCRIPT_CASES[0], score = vi.fn();
    render(<TranscriptLab transcript={c} onScore={score} />);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${c.firstBad} · EDIT`) }));
    fireEvent.click(screen.getByRole("radio", { name: /Missing or vacuous/ }));
    fireEvent.click(screen.getByRole("button", { name: "Check diagnosis" }));
    expect(score).toHaveBeenCalledWith(1);
    expect(screen.getByRole("status").textContent).toContain("Correct step and classification");
  });

  it("scores a wrong step as zero", () => {
    const c = TRANSCRIPT_CASES[0], score = vi.fn();
    render(<TranscriptLab transcript={c} onScore={score} />);
    fireEvent.click(screen.getByRole("button", { name: /^3 · TOOL/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Missing or vacuous/ }));
    fireEvent.click(screen.getByRole("button", { name: "Check diagnosis" }));
    expect(score).toHaveBeenCalledWith(0);
  });
});
