import { afterEach, describe, expect, it, vi } from "vitest";
import { claudeDelta, geminiDelta, streamAi, type AiSettings } from "../src/lib/ai";

/* #2f: replies stream over SSE instead of waiting for one big response. */

function sseResponse(frames: string[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      for (const f of frames) controller.enqueue(enc.encode(f));
      controller.close();
    },
  });
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

const geminiFrame = (text: string) =>
  `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })}\n\n`;

const claudeFrame = (text: string) =>
  `event: content_block_delta\ndata: ${JSON.stringify({
    type: "content_block_delta",
    delta: { type: "text_delta", text },
  })}\n\n`;

const settings = (provider: "gemini" | "claude"): AiSettings => ({
  provider,
  keys: { [provider]: "k" },
  models: {},
  tutorName: "",
});

afterEach(() => vi.unstubAllGlobals());

describe("delta parsers", () => {
  it("reads Gemini chunk text", () => {
    expect(geminiDelta(JSON.stringify({ candidates: [{ content: { parts: [{ text: "abc" }] } }] }))).toBe("abc");
  });

  it("ignores malformed Gemini frames", () => {
    expect(geminiDelta("not json")).toBe("");
    expect(geminiDelta(JSON.stringify({}))).toBe("");
  });

  it("reads Claude text deltas and ignores other event types", () => {
    expect(
      claudeDelta(JSON.stringify({ type: "content_block_delta", delta: { type: "text_delta", text: "hi" } })),
    ).toBe("hi");
    expect(claudeDelta(JSON.stringify({ type: "message_start" }))).toBe("");
    expect(claudeDelta(JSON.stringify({ type: "content_block_delta", delta: { type: "input_json_delta" } }))).toBe("");
  });
});

describe("streamAi", () => {
  it("calls onDelta per chunk and resolves with the full text", async () => {
    const frames = [geminiFrame("Hel"), geminiFrame("lo "), geminiFrame("world")];
    vi.stubGlobal("fetch", vi.fn(async () => sseResponse(frames)));

    const seen: string[] = [];
    const full = await streamAi([{ role: "user", content: "hi" }], (d) => seen.push(d), settings("gemini"));

    expect(seen).toEqual(["Hel", "lo ", "world"]);
    expect(full).toBe("Hello world");
  });

  it("uses the SSE endpoint and keeps the key out of the URL", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => sseResponse([geminiFrame("x")])));
    await streamAi([{ role: "user", content: "hi" }], () => {}, settings("gemini"));

    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toContain(":streamGenerateContent?alt=sse");
    expect(url).not.toContain("key=");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("k");
  });

  it("streams Claude replies with stream: true", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => sseResponse([claudeFrame("He"), claudeFrame("y")])));
    const seen: string[] = [];
    const full = await streamAi([{ role: "user", content: "hi" }], (d) => seen.push(d), settings("claude"));

    expect(full).toBe("Hey");
    const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string).stream).toBe(true);
  });

  it("handles frames split across network chunks", async () => {
    const frame = geminiFrame("split");
    const halfway = Math.floor(frame.length / 2);
    vi.stubGlobal("fetch", vi.fn(async () => sseResponse([frame.slice(0, halfway), frame.slice(halfway)])));

    const full = await streamAi([{ role: "user", content: "hi" }], () => {}, settings("gemini"));
    expect(full).toBe("split");
  });

  it("explains an error status in plain English", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 429 })));
    await expect(streamAi([{ role: "user", content: "hi" }], () => {}, settings("gemini"))).rejects.toThrow(
      /rate-limiting/,
    );
  });

  it("reports an empty stream", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => sseResponse([])));
    await expect(streamAi([{ role: "user", content: "hi" }], () => {}, settings("gemini"))).rejects.toThrow(
      /empty response/,
    );
  });
});
