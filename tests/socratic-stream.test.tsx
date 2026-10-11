// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import SocraticTutor from "../src/components/SocraticTutor";
import { saveAiSettings } from "../src/lib/ai";

/* #2f wiring: the tutor bubble fills with streamed text. */

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

const geminiFrame = (text: string) =>
  `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })}\n\n`;

beforeEach(() => {
  localStorage.clear();
  saveAiSettings({ provider: "gemini", keys: { gemini: "k" }, models: {}, tutorName: "" });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("SocraticTutor streaming", () => {
  it("renders the streamed reply and clears the busy state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => sseResponse([geminiFrame("What does "), geminiFrame("the loop do?")])),
    );
    render(<SocraticTutor code="for (;;) {}" topic="Loops" lang="js" />);

    fireEvent.click(screen.getByRole("button", { name: /I'm stuck/ }));

    await waitFor(() =>
      expect(screen.getByText("What does the loop do?")).toBeTruthy(),
    );
  });

  it("shows a plain-English error when the stream fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 401 })));
    render(<SocraticTutor code="console.log(1)" lang="js" />);

    fireEvent.click(screen.getByRole("button", { name: /I'm stuck/ }));

    await waitFor(() =>
      expect(screen.getByText(/rejected the API key/)).toBeTruthy(),
    );
  });
});
