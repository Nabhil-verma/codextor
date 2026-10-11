/*
 * Shareable trace replays.
 *
 * A replay link carries the code, not the trace. The viewer re-runs the code
 * in the sandbox worker to produce the steps, so nothing the sharer computed is
 * trusted: the steps are a function of the code and nothing else.
 *
 * Format (self-contained, no server storage):
 *
 *   cdx1.<payload>.<check>
 *
 *   payload = base64url( UTF-8 JSON of { v, lang, code, title?, createdAt, expiresAt } )
 *   check   = FNV-1a 32-bit of the payload string, base36
 *
 * What it contains: the source (up to MAX_CODE characters), an optional title
 * (MAX_TITLE characters), and two timestamps. No account, name, email or
 * identifier is included — a link reveals only the code it was made from.
 *
 * Expiry and revocation: every link expires after TTL_DAYS. A link cannot be
 * revoked once issued, because nothing is stored server-side; that is the
 * trade for not needing a backend. The expiry is checked against the viewer's
 * clock, so it is a courtesy, not a security control.
 *
 * Integrity: the check value detects corruption and careless editing. It is
 * not a signature. Anyone can make a valid link for any code, which is harmless
 * here because the code only ever runs inside the worker.
 */

export const REPLAY_PREFIX = "cdx1";
export const REPLAY_VERSION = 1;
export const MAX_CODE = 4000;
export const MAX_TITLE = 80;
export const TTL_DAYS = 30;
/** Longest token accepted; anything bigger is rejected before it is decoded. */
export const MAX_TOKEN = 16_000;

export type Replay = {
  lang: "js";
  code: string;
  title?: string;
  createdAt: number;
  expiresAt: number;
};

export type DecodeResult =
  | { ok: true; replay: Replay }
  | { ok: false; reason: DecodeError };

export type DecodeError =
  | "too-large"
  | "malformed"
  | "unsupported-version"
  | "checksum"
  | "invalid-fields"
  | "expired";

const DAY_MS = 86_400_000;

/* ------------------------------------------------------------------ */
/* Encoding                                                            */
/* ------------------------------------------------------------------ */

function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string | null {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) return null;
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** Makes a replay token. Throws on input the decoder would refuse, so a bad link is never produced. */
export function encodeReplay(input: { code: string; title?: string }, now: number = Date.now()): string {
  if (input.code.length > MAX_CODE) throw new Error(`Code is longer than ${MAX_CODE} characters.`);
  if (input.title !== undefined && input.title.length > MAX_TITLE) {
    throw new Error(`Title is longer than ${MAX_TITLE} characters.`);
  }
  const body: Replay = {
    lang: "js",
    code: input.code,
    ...(input.title ? { title: input.title } : {}),
    createdAt: now,
    expiresAt: now + TTL_DAYS * DAY_MS,
  };
  const payload = toBase64Url(JSON.stringify({ v: REPLAY_VERSION, ...body }));
  return `${REPLAY_PREFIX}.${payload}.${fnv1a(payload)}`;
}

/* ------------------------------------------------------------------ */
/* Decoding                                                            */
/* ------------------------------------------------------------------ */

/** Parses and checks a token. Never throws: every failure is a named reason. */
export function decodeReplay(token: unknown, now: number = Date.now()): DecodeResult {
  if (typeof token !== "string") return { ok: false, reason: "malformed" };
  if (token.length > MAX_TOKEN) return { ok: false, reason: "too-large" };

  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== REPLAY_PREFIX) return { ok: false, reason: "malformed" };
  const [, payload, check] = parts;
  if (!payload) return { ok: false, reason: "malformed" };

  if (fnv1a(payload) !== check) return { ok: false, reason: "checksum" };

  const json = fromBase64Url(payload);
  if (json === null) return { ok: false, reason: "malformed" };

  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, reason: "malformed" };
  const value = raw as Record<string, unknown>;

  if (value.v !== REPLAY_VERSION) return { ok: false, reason: "unsupported-version" };
  if (value.lang !== "js") return { ok: false, reason: "invalid-fields" };
  if (typeof value.code !== "string" || value.code.length > MAX_CODE) {
    return { ok: false, reason: "invalid-fields" };
  }
  if (value.title !== undefined) {
    if (typeof value.title !== "string" || value.title.length > MAX_TITLE) {
      return { ok: false, reason: "invalid-fields" };
    }
  }
  if (!Number.isFinite(value.createdAt) || !Number.isFinite(value.expiresAt)) {
    return { ok: false, reason: "invalid-fields" };
  }
  const createdAt = value.createdAt as number;
  const expiresAt = value.expiresAt as number;
  // A link cannot be valid for longer than the TTL it was issued with.
  if (expiresAt <= createdAt || expiresAt - createdAt > TTL_DAYS * DAY_MS + DAY_MS) {
    return { ok: false, reason: "invalid-fields" };
  }
  if (now >= expiresAt) return { ok: false, reason: "expired" };

  return {
    ok: true,
    replay: {
      lang: "js",
      code: value.code,
      ...(typeof value.title === "string" && value.title ? { title: value.title } : {}),
      createdAt,
      expiresAt,
    },
  };
}

/** A page URL that opens the replay. The token sits in the hash, so it never reaches a server. */
export function replayUrl(token: string, origin: string, pathname: string): string {
  return `${origin}${pathname}#/replay?c=${encodeURIComponent(token)}`;
}
