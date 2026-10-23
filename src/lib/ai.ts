/**
 * BYOK (Bring Your Own Key) settings for AI providers.
 * Keys are stored in localStorage and never leave the browser
 * except when the student explicitly triggers an AI call.
 */

import { createLocalStore, readRecord, useLocalStore } from "./localStore";

const SETTINGS_KEY = "cl_ai_settings";

export type AiProvider = "gemini" | "claude" | null;

type KeyedProvider = "gemini" | "claude";

/** Models a student can pick per provider. The first entry is the default. */
export const MODEL_OPTIONS: Record<KeyedProvider, { id: string; label: string }[]> = {
  gemini: [{ id: "gemini-2.0-flash", label: "Gemini 2.0 Flash (default)" }],
  claude: [{ id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4 (default)" }],
};

export const DEFAULT_MODEL: Record<KeyedProvider, string> = {
  gemini: MODEL_OPTIONS.gemini[0].id,
  claude: MODEL_OPTIONS.claude[0].id,
};

export type AiSettings = {
  /** Which provider is active (null = AI disabled). */
  provider: AiProvider;
  /** API keys keyed by provider slug. */
  keys: Partial<Record<KeyedProvider, string>>;
  /** Chosen model per provider; missing or unknown entries use the default. */
  models: Partial<Record<KeyedProvider, string>>;
  /** Student's name for the tutor to use. */
  tutorName: string;
};

const DEFAULTS: AiSettings = {
  provider: null,
  keys: {},
  models: {},
  tutorName: "",
};

/** The model to call for a provider: the stored choice if still offered, else the default. */
export function modelFor(s: AiSettings, provider: KeyedProvider): string {
  const chosen = s.models[provider];
  const offered = MODEL_OPTIONS[provider].some((m) => m.id === chosen);
  return offered && chosen ? chosen : DEFAULT_MODEL[provider];
}

/**
 * A stored settings blob is only trusted field by field: an unknown provider
 * (or a non-string key) used to reach the provider calls and fail confusingly
 * at fetch time, so it is normalised back to "no AI configured" instead.
 */
function parseSettings(raw: string | null): AiSettings {
  const stored = readRecord(raw);
  const provider =
    stored.provider === "gemini" || stored.provider === "claude" ? stored.provider : null;
  const rawKeys = stored.keys;
  const keys: AiSettings["keys"] = {};
  if (rawKeys && typeof rawKeys === "object") {
    for (const [name, value] of Object.entries(rawKeys as Record<string, unknown>)) {
      if ((name === "gemini" || name === "claude") && typeof value === "string") {
        keys[name] = value;
      }
    }
  }
  const rawModels = stored.models;
  const models: AiSettings["models"] = {};
  if (rawModels && typeof rawModels === "object") {
    for (const name of ["gemini", "claude"] as const) {
      const value = (rawModels as Record<string, unknown>)[name];
      if (typeof value === "string" && MODEL_OPTIONS[name].some((m) => m.id === value)) {
        models[name] = value;
      }
    }
  }
  return {
    provider,
    keys,
    models,
    tutorName: typeof stored.tutorName === "string" ? stored.tutorName : DEFAULTS.tutorName,
  };
}

const store = createLocalStore<AiSettings>(SETTINGS_KEY, parseSettings);

export function loadAiSettings(): AiSettings {
  return store.get();
}

export function saveAiSettings(s: AiSettings) {
  store.set(s);
}

/** Settings + a React binding, so the modal and the tutor stay in sync. */
export function useAiSettings(): AiSettings {
  return useLocalStore(store);
}

/* ------------------------------------------------------------------ */
/* AI Provider Calls                                                   */
/* ------------------------------------------------------------------ */

export type TutorMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/**
 * A hung provider leaves the tutor stuck on "thinking…" forever, so every
 * request is aborted after this long and surfaces as a friendly error.
 */
const REQUEST_TIMEOUT_MS = 45_000;

/**
 * Call the selected AI provider. Returns the assistant's response text.
 * Throws on network/auth/timeout errors so the caller can show a friendly
 * message (the tutor falls back to its static hint when a call fails).
 */
export async function callAi(
  messages: TutorMessage[],
  settings?: AiSettings,
): Promise<string> {
  const s = settings ?? loadAiSettings();
  if (!s.provider || !s.keys[s.provider]) {
    throw new Error("No AI provider configured. Add your API key in Settings.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    if (s.provider === "gemini") {
      return await callGemini(messages, s.keys.gemini!, modelFor(s, "gemini"), controller.signal);
    }
    return await callClaude(messages, s.keys.claude!, modelFor(s, "claude"), controller.signal);
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error("The AI provider didn't respond in time — try again.");
    }
    // fetch() rejects with a TypeError only when no response arrives at all.
    if (err instanceof TypeError) {
      const name = s.provider === "gemini" ? "Google Gemini" : "Anthropic Claude";
      throw new Error(`Couldn't reach ${name}. Check your internet connection and try again.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Plain-English reason for a failed provider call. Used by the tutor and by
 * the "Test key" button, so students see what to fix instead of a raw status.
 */
export function explainProviderError(
  provider: KeyedProvider,
  model: string,
  status: number,
  body = "",
): string {
  const name = provider === "gemini" ? "Google Gemini" : "Anthropic Claude";
  if (status === 401 || status === 403) {
    return `${name} rejected the API key. Check that you pasted the whole key in Settings.`;
  }
  if (status === 429) {
    return `${name} is rate-limiting this key right now. Wait a minute and try again.`;
  }
  if (status === 404 || (status === 400 && /model/i.test(body))) {
    return `${name} doesn't accept the model "${model}". Pick another model in Settings.`;
  }
  if (status >= 500) {
    return `${name} is having trouble right now (error ${status}). Try again later.`;
  }
  return `${name} returned an error (${status}).`;
}

/**
 * Sends a one-word ping with the given key. Resolves when the provider
 * accepts it; rejects with a plain-English reason otherwise.
 */
export async function testKey(
  provider: KeyedProvider,
  apiKey: string,
  model?: string,
): Promise<void> {
  const reply = await callAi(
    [{ role: "user", content: "Reply with the single word OK." }],
    {
      provider,
      keys: { [provider]: apiKey },
      models: model ? { [provider]: model } : {},
      tutorName: "",
    },
  );
  if (!reply.trim()) throw new Error("The provider answered, but with an empty reply.");
}

/* ------------------------------------------------------------------ */
/* Request builders — shared by the one-shot and streaming paths       */
/* ------------------------------------------------------------------ */

function geminiRequest(
  messages: TutorMessage[],
  apiKey: string,
  model: string,
  signal: AbortSignal,
  stream: boolean,
): Promise<Response> {
  // Convert our message format to Gemini's API format
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const systemInstruction = messages.find((m) => m.role === "system");

  const body: Record<string, unknown> = { contents };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction.content }] };
  }

  const endpoint = stream
    ? "streamGenerateContent?alt=sse"
    : "generateContent";

  // The key travels in a header, never the URL: query strings end up in
  // proxy logs, referrers and devtools history.
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:${endpoint}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal,
    },
  );
}

function claudeRequest(
  messages: TutorMessage[],
  apiKey: string,
  model: string,
  signal: AbortSignal,
  stream: boolean,
): Promise<Response> {
  const system = messages.find((m) => m.role === "system")?.content ?? "";
  const chatMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    signal,
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system,
      messages: chatMessages,
      ...(stream ? { stream: true } : {}),
    }),
  });
}

async function callGemini(
  messages: TutorMessage[],
  apiKey: string,
  model: string,
  signal: AbortSignal,
): Promise<string> {
  const res = await geminiRequest(messages, apiKey, model, signal, false);

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(explainProviderError("gemini", model, res.status, err));
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned an empty response.");
  return text;
}

async function callClaude(
  messages: TutorMessage[],
  apiKey: string,
  model: string,
  signal: AbortSignal,
): Promise<string> {
  const res = await claudeRequest(messages, apiKey, model, signal, false);

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(explainProviderError("claude", model, res.status, err));
  }

  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (!text) throw new Error("Claude returned an empty response.");
  return text;
}

/* ------------------------------------------------------------------ */
/* Streaming (SSE)                                                     */
/* ------------------------------------------------------------------ */

/**
 * A streaming reply may legitimately run longer than the one-shot timeout, so
 * the watchdog measures silence instead: no new bytes for this long aborts.
 */
const STREAM_IDLE_TIMEOUT_MS = 30_000;

/** Reads an SSE body, handing each `data:` payload to `onData`. */
async function readSse(res: Response, onData: (data: string) => void): Promise<void> {
  if (!res.body) throw new Error("The provider returned no response stream.");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // Events are separated by a blank line; keep the trailing partial event.
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() ?? "";
    for (const event of events) {
      for (const line of event.split(/\r?\n/)) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data && data !== "[DONE]") onData(data);
      }
    }
  }
}

/** Text carried by one Gemini SSE chunk. */
export function geminiDelta(payload: string): string {
  try {
    const parsed = JSON.parse(payload);
    const parts = parsed?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) return "";
    return parts.map((p: { text?: string }) => p.text ?? "").join("");
  } catch {
    return ""; // keepalives and partial frames are not text
  }
}

/** Text carried by one Anthropic SSE chunk. */
export function claudeDelta(payload: string): string {
  try {
    const parsed = JSON.parse(payload);
    if (parsed?.type !== "content_block_delta") return "";
    if (parsed?.delta?.type !== "text_delta") return "";
    return typeof parsed.delta.text === "string" ? parsed.delta.text : "";
  } catch {
    return "";
  }
}

/**
 * Streams a reply, invoking `onDelta` as text arrives, and resolves with the
 * full text so callers can store it once at the end.
 */
export async function streamAi(
  messages: TutorMessage[],
  onDelta: (text: string) => void,
  settings?: AiSettings,
): Promise<string> {
  const s = settings ?? loadAiSettings();
  if (!s.provider || !s.keys[s.provider]) {
    throw new Error("No AI provider configured. Add your API key in Settings.");
  }
  const provider = s.provider;
  const model = modelFor(s, provider);
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const armIdle = () => {
    clearTimeout(timer);
    timer = setTimeout(() => controller.abort(), STREAM_IDLE_TIMEOUT_MS);
  };
  armIdle();

  try {
    const res =
      provider === "gemini"
        ? await geminiRequest(messages, s.keys.gemini!, model, controller.signal, true)
        : await claudeRequest(messages, s.keys.claude!, model, controller.signal, true);

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(explainProviderError(provider, model, res.status, err));
    }

    let full = "";
    await readSse(res, (data) => {
      armIdle();
      const piece = provider === "gemini" ? geminiDelta(data) : claudeDelta(data);
      if (piece) {
        full += piece;
        onDelta(piece);
      }
    });

    if (!full) {
      throw new Error(
        provider === "gemini"
          ? "Gemini returned an empty response."
          : "Claude returned an empty response.",
      );
    }
    return full;
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error("The AI provider stopped responding — try again.");
    }
    if (err instanceof TypeError) {
      const name = provider === "gemini" ? "Google Gemini" : "Anthropic Claude";
      throw new Error(`Couldn't reach ${name}. Check your internet connection and try again.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
