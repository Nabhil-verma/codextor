import { describe, expect, it } from "vitest";
import {
  MAX_CODE,
  MAX_TITLE,
  MAX_TOKEN,
  REPLAY_PREFIX,
  TTL_DAYS,
  decodeReplay,
  encodeReplay,
  replayUrl,
} from "../src/lib/replayShare";

/*
 * Replay links: a round trip keeps the code, and every way a link can be wrong
 * produces a named reason instead of a crash or a silent run of something else.
 */

const NOW = Date.parse("2026-10-11T12:00:00Z");
const CODE = `function greet(name) {\n  return "hi " + name;\n}\nconsole.log(greet("Ada"));`;

describe("creating and reading a replay", () => {
  it("round-trips the code and title exactly", () => {
    const token = encodeReplay({ code: CODE, title: "Closures" }, NOW);
    const r = decodeReplay(token, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.replay.code).toBe(CODE);
    expect(r.replay.title).toBe("Closures");
    expect(r.replay.lang).toBe("js");
    expect(r.replay.createdAt).toBe(NOW);
  });

  it("round-trips unicode and quotes in the code", () => {
    const code = `console.log("café — 日本 \\"quoted\\"")`;
    const r = decodeReplay(encodeReplay({ code }, NOW), NOW);
    expect(r.ok && r.replay.code).toBe(code);
  });

  it("omits the title when none is given", () => {
    const r = decodeReplay(encodeReplay({ code: "1" }, NOW), NOW);
    expect(r.ok && "title" in r.replay).toBe(false);
  });

  it("sets an expiry TTL_DAYS after creation", () => {
    const r = decodeReplay(encodeReplay({ code: "1" }, NOW), NOW);
    expect(r.ok && r.replay.expiresAt - r.replay.createdAt).toBe(TTL_DAYS * 86_400_000);
  });

  it("refuses to make a link the decoder would reject", () => {
    expect(() => encodeReplay({ code: "x".repeat(MAX_CODE + 1) }, NOW)).toThrow(/longer than/);
    expect(() => encodeReplay({ code: "1", title: "t".repeat(MAX_TITLE + 1) }, NOW)).toThrow(/longer than/);
  });

  it("builds a hash-route URL so the token never reaches a server", () => {
    const token = encodeReplay({ code: "1" }, NOW);
    const url = replayUrl(token, "https://app.example", "/");
    expect(url.startsWith("https://app.example/#/replay?c=")).toBe(true);
    // Everything before the hash is what a server sees; the token must not be in it.
    const serverVisible = url.split("#")[0];
    expect(serverVisible).not.toContain(token);
    expect(url.split("#")[1]).toContain(encodeURIComponent(token));
  });
});

describe("expiry", () => {
  it("is valid just before expiry", () => {
    const token = encodeReplay({ code: "1" }, NOW);
    const r = decodeReplay(token, NOW + TTL_DAYS * 86_400_000 - 1);
    expect(r.ok).toBe(true);
  });

  it("is rejected at and after expiry", () => {
    const token = encodeReplay({ code: "1" }, NOW);
    expect(decodeReplay(token, NOW + TTL_DAYS * 86_400_000)).toEqual({ ok: false, reason: "expired" });
    expect(decodeReplay(token, NOW + TTL_DAYS * 86_400_000 + 5)).toEqual({ ok: false, reason: "expired" });
  });
});

describe("tampered input", () => {
  it("rejects an edited payload (the check no longer matches)", () => {
    const token = encodeReplay({ code: "console.log(1)" }, NOW);
    const [prefix, payload, check] = token.split(".");
    const flipped = (payload[0] === "A" ? "B" : "A") + payload.slice(1);
    expect(decodeReplay([prefix, flipped, check].join("."), NOW)).toEqual({ ok: false, reason: "checksum" });
  });

  it("rejects an edited check value", () => {
    const token = encodeReplay({ code: "1" }, NOW);
    const [prefix, payload] = token.split(".");
    expect(decodeReplay(`${prefix}.${payload}.zzzz`, NOW)).toEqual({ ok: false, reason: "checksum" });
  });

  it("rejects a different payload that is paired with the original check", () => {
    const token = encodeReplay({ code: "console.log(1)" }, NOW);
    const other = encodeReplay({ code: "while(true){}" }, NOW);
    const [prefix, , check] = token.split(".");
    const [, otherPayload] = other.split(".");
    // A different payload under the original check still fails the check.
    expect(decodeReplay(`${prefix}.${otherPayload}.${check}`, NOW)).toEqual({ ok: false, reason: "checksum" });
  });
});

describe("malformed input", () => {
  const cases: [string, unknown][] = [
    ["not a string", 42],
    ["undefined", undefined],
    ["empty", ""],
    ["wrong prefix", "cdx9.abc.def"],
    ["too few parts", `${REPLAY_PREFIX}.abc`],
    ["too many parts", `${REPLAY_PREFIX}.a.b.c`],
    ["empty payload", `${REPLAY_PREFIX}..x`],
    ["non-base64 characters", `${REPLAY_PREFIX}.***.x`],
  ];
  for (const [label, token] of cases) {
    it(`rejects ${label}`, () => {
      const r = decodeReplay(token, NOW);
      expect(r.ok).toBe(false);
    });
  }

  it("rejects a valid checksum over non-JSON", () => {
    const payload = Buffer.from("not json").toString("base64url");
    const r = decodeReplay(`${REPLAY_PREFIX}.${payload}.${recheck(payload)}`, NOW);
    expect(r).toEqual({ ok: false, reason: "malformed" });
  });

  it("rejects a token larger than the limit before parsing it", () => {
    expect(decodeReplay("cdx1." + "A".repeat(MAX_TOKEN) + ".x", NOW)).toEqual({ ok: false, reason: "too-large" });
  });
});

describe("well-formed but wrong fields", () => {
  it("rejects an unknown version", () => {
    const r = decodeReplay(signed({ v: 2, lang: "js", code: "1", createdAt: NOW, expiresAt: NOW + 1000 }), NOW);
    expect(r).toEqual({ ok: false, reason: "unsupported-version" });
  });

  it("rejects an unknown language", () => {
    const r = decodeReplay(signed({ v: 1, lang: "python", code: "1", createdAt: NOW, expiresAt: NOW + 1000 }), NOW);
    expect(r).toEqual({ ok: false, reason: "invalid-fields" });
  });

  it("rejects non-string code and oversized code", () => {
    expect(decodeReplay(signed({ v: 1, lang: "js", code: 7, createdAt: NOW, expiresAt: NOW + 1000 }), NOW)).toEqual({
      ok: false,
      reason: "invalid-fields",
    });
    const big = "x".repeat(MAX_CODE + 1);
    expect(decodeReplay(signed({ v: 1, lang: "js", code: big, createdAt: NOW, expiresAt: NOW + 1000 }), NOW)).toEqual({
      ok: false,
      reason: "invalid-fields",
    });
  });

  it("rejects an expiry that is not after creation, or longer than the TTL", () => {
    expect(decodeReplay(signed({ v: 1, lang: "js", code: "1", createdAt: NOW, expiresAt: NOW }), NOW)).toEqual({
      ok: false,
      reason: "invalid-fields",
    });
    const forever = NOW + 10 * TTL_DAYS * 86_400_000;
    expect(decodeReplay(signed({ v: 1, lang: "js", code: "1", createdAt: NOW, expiresAt: forever }), NOW)).toEqual({
      ok: false,
      reason: "invalid-fields",
    });
  });

  it("rejects a non-object JSON payload", () => {
    expect(decodeReplay(signed([1, 2, 3]), NOW)).toEqual({ ok: false, reason: "malformed" });
  });
});

/* Builds a token whose payload is `value`, with a matching check. */
function signed(value: unknown): string {
  const payload = Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
  return `${REPLAY_PREFIX}.${payload}.${recheck(payload)}`;
}

/* Same FNV-1a the module uses, so the tests can craft payloads it accepts. */
function recheck(payload: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    h ^= payload.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
