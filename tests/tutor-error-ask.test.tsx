// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ErrorNote from "../src/components/ErrorNote";
import HintLadder from "../src/components/HintLadder";
import Playground from "../src/components/Playground";
import SocraticTutor from "../src/components/SocraticTutor";
import { saveAiSettings } from "../src/lib/ai";

/* #2g: one click from an error to the tutor, carrying the open hint tier. */

function sseResponse(frames: string[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      for (const f of frames) controller.enqueue(enc.encode(f));
      controller.close();
    },
  });
  return new Response(body, { status: 200 });
}
const announcer = () => document.querySelector<HTMLElement>('[role="status"].sr-only')!;
const geminiFrame = (text: string) =>
  `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })}\n\n`;

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ErrorNote hand-off", () => {
  it("has no tutor button without a handler", () => {
    render(<ErrorNote raw="ReferenceError: x is not defined" />);
    expect(screen.queryByRole("button", { name: /ask the tutor/i })).toBeNull();
  });

  it("calls the handler when present", () => {
    const onAskTutor = vi.fn();
    render(<ErrorNote raw="ReferenceError: x is not defined" onAskTutor={onAskTutor} />);
    fireEvent.click(screen.getByRole("button", { name: /ask the tutor/i }));
    expect(onAskTutor).toHaveBeenCalledTimes(1);
  });
});

describe("HintLadder tier reporting", () => {
  const hints = [
    { tier: 1, text: "think" },
    { tier: 2, text: "syntax" },
  ] as never;

  it("reports tier 1 on mount and tier 2 after revealing", () => {
    const onTierChange = vi.fn();
    render(<HintLadder hints={hints} onTierChange={onTierChange} />);
    expect(onTierChange).toHaveBeenLastCalledWith(1);
    fireEvent.click(screen.getByRole("button", { name: /show hint 2/ }));
    expect(onTierChange).toHaveBeenLastCalledWith(2);
  });
});

describe("Playground error hand-off", () => {
  it("passes the raw error and the open hint tier to the tutor", async () => {
    const onAskTutor = vi.fn();
    const check = {
      expr: "true",
      hint: "Print the total.",
      hints: [{ tier: 1, text: "look at the loop" }],
    } as never;
    render(
      <Playground
        starter={"sum();"}
        check={check}
        label="Totals"
        onAskTutor={onAskTutor}
      />,
    );

    // Two failing runs unlock the hint ladder, which reports tier 1.
    for (let i = 0; i < 2; i++) {
      fireEvent.click(screen.getByRole("button", { name: /Run/ }));
      await waitFor(() =>
        expect(announcer().textContent).toMatch(/^Failed:/),
      );
    }
    // The ladder mounts at tier 1 once hints unlock.
    await screen.findByText(/look at the loop/);

    fireEvent.click(screen.getByRole("button", { name: /ask the tutor/i }));
    expect(onAskTutor).toHaveBeenCalledTimes(1);
    expect(onAskTutor.mock.calls[0][0]).toMatch(/sum is not defined/);
    expect(onAskTutor.mock.calls[0][1]).toBe(1);
  });
});

describe("SocraticTutor auto-ask", () => {
  it("sends the hand-off question with the open tier in context", async () => {
    saveAiSettings({ provider: "gemini", keys: { gemini: "k" }, models: {}, tutorName: "" });
    vi.stubGlobal("fetch", vi.fn(async () => sseResponse([geminiFrame("Start with the loop.")])));

    render(
      <SocraticTutor
        code="sum();"
        topic="Totals"
        lang="js"
        openHintTier={2}
        autoAsk={{ id: 1, text: "I got this error: boom" }}
      />,
    );

    await waitFor(() => expect(screen.getByText("Start with the loop.")).toBeTruthy());

    const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    const body = init.body as string;
    expect(body).toContain("hint tier 2");
    expect(body).toContain("I got this error: boom");
  });
});
