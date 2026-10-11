import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  callAi,
  explainProviderError,
  modelFor,
  type AiSettings,
} from "../src/lib/ai";

/*
 * Provider wiring (#2a): the Gemini key must go in the x-goog-api-key header
 * and never in the request URL.
 */

const geminiSettings: AiSettings = {
  provider: "gemini",
  keys: { gemini: "test-key-123" },
  models: {},
  tutorName: "",
};

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: "hi" }] } }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Gemini request", () => {
  it("sends the key in the x-goog-api-key header", async () => {
    const reply = await callAi([{ role: "user", content: "hello" }], geminiSettings);
    expect(reply).toBe("hi");

    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    const headers = init.headers as Record<string, string>;
    expect(headers["x-goog-api-key"]).toBe("test-key-123");
    expect(url).not.toContain("key=");
    expect(url).not.toContain("test-key-123");
  });
});

describe("model choice", () => {
  it("uses the default when nothing is stored", () => {
    expect(modelFor({ ...geminiSettings }, "gemini")).toBe("gemini-2.0-flash");
  });

  it("ignores a stored model that is no longer offered", () => {
    const s = { ...geminiSettings, models: { gemini: "retired-model" } } as AiSettings;
    expect(modelFor(s, "gemini")).toBe("gemini-2.0-flash");
  });
});

describe("plain-English provider errors", () => {
  it("explains a rejected key", () => {
    expect(explainProviderError("gemini", "m", 401)).toMatch(/rejected the API key/);
    expect(explainProviderError("claude", "m", 403)).toMatch(/rejected the API key/);
  });

  it("explains rate limits", () => {
    expect(explainProviderError("claude", "m", 429)).toMatch(/rate-limiting/);
  });

  it("names the model when the provider rejects it", () => {
    const msg = explainProviderError("gemini", "gemini-x", 404, "not found");
    expect(msg).toContain("gemini-x");
    expect(msg).toMatch(/Pick another model/);
  });

  it("treats a 400 that mentions the model as a model rejection", () => {
    expect(
      explainProviderError("claude", "claude-x", 400, "invalid model: claude-x"),
    ).toMatch(/doesn't accept the model/);
  });
});

describe("selected model reaches the request", () => {
  it("puts the chosen Gemini model in the endpoint path", async () => {
    await callAi([{ role: "user", content: "hi" }], {
      provider: "gemini",
      keys: { gemini: "k" },
      models: { gemini: "gemini-2.0-flash" },
      tutorName: "",
    });
    const url = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("/models/gemini-2.0-flash:generateContent");
  });
});

describe("Test key", () => {
  it("resolves when the provider accepts the ping", async () => {
    const { testKey } = await import("../src/lib/ai");
    await expect(testKey("gemini", "good-key")).resolves.toBeUndefined();
  });

  it("explains a 401 in plain English", async () => {
    const { testKey } = await import("../src/lib/ai");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("bad key", { status: 401 })),
    );
    await expect(testKey("gemini", "bad")).rejects.toThrow(/rejected the API key/);
  });

  it("explains a 429 in plain English", async () => {
    const { testKey } = await import("../src/lib/ai");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("slow down", { status: 429 })),
    );
    await expect(testKey("claude", "k")).rejects.toThrow(/rate-limiting/);
  });

  it("explains a network failure in plain English", async () => {
    const { testKey } = await import("../src/lib/ai");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    await expect(testKey("gemini", "k")).rejects.toThrow(/Couldn't reach Google Gemini/);
  });
});
