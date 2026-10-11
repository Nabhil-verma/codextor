import { describe, expect, it } from "vitest";
import {
  assertNewUsername,
  isLegacyEmailKey,
  loginKey,
  normalizeRecoveryEmail,
  publicDisplayName,
  recoveryAddressFor,
} from "../src/lib/accountIdentity";
import { randomResetCode, resetMessage, sendResetCodeEmail } from "../src/lib/resetEmail";

describe("usernames", () => {
  it("normalizes case and whitespace to the stored key", () => {
    expect(loginKey("  Ada_Lovelace ")).toBe("ada_lovelace");
  });

  it.each(["abc", "a_b_c", "user_01", "x".repeat(24)])("accepts %s", (name) => {
    expect(assertNewUsername(name)).toBe(name.toLowerCase());
  });

  it.each([
    ["too short", "ab"],
    ["too long", "x".repeat(25)],
    ["space", "ada lovelace"],
    ["punctuation", "ada.l"],
    ["an email address", "ada@example.com"],
    ["empty", ""],
  ])("rejects %s", (_name, value) => {
    expect(() => assertNewUsername(value)).toThrow(/Usernames are 3–24/);
  });

  it("tells a legacy email key from a username", () => {
    expect(isLegacyEmailKey("ada@example.com")).toBe(true);
    expect(isLegacyEmailKey("ada")).toBe(false);
  });
});

describe("recovery email", () => {
  it("blank or missing means none", () => {
    expect(normalizeRecoveryEmail(undefined)).toBeUndefined();
    expect(normalizeRecoveryEmail("   ")).toBeUndefined();
  });

  it("is trimmed and lowercased", () => {
    expect(normalizeRecoveryEmail(" Ada@Example.COM ")).toBe("ada@example.com");
  });

  it.each(["not-an-email", "a@b", "two @at.com", "x".repeat(250) + "@a.co"])(
    "rejects %s",
    (value) => {
      expect(() => normalizeRecoveryEmail(value)).toThrow(/valid recovery email/);
    },
  );

  it("is used for resets when set, else a legacy email login, else nowhere", () => {
    expect(recoveryAddressFor({ recoveryEmail: "r@x.co", email: "ada" })).toBe("r@x.co");
    expect(recoveryAddressFor({ email: "old@x.co" })).toBe("old@x.co");
    expect(recoveryAddressFor({ email: "ada" })).toBeNull();
    expect(recoveryAddressFor({})).toBeNull();
  });
});

describe("public names never expose an email", () => {
  it("prefers the chosen name, then the username", () => {
    expect(publicDisplayName({ name: "Ada", username: "ada" })).toBe("Ada");
    expect(publicDisplayName({ name: "  ", username: "ada" })).toBe("ada");
  });

  it("does not fall back to a legacy email login", () => {
    expect(publicDisplayName({ name: "", username: "ada@example.com" })).toBe("Learner");
    expect(publicDisplayName({})).toBe("Learner");
  });
});

describe("reset codes", () => {
  it("are eight digits, zero-padded", () => {
    expect(randomResetCode(() => 42)).toBe("00000042");
    expect(randomResetCode(() => 12_345_678)).toBe("12345678");
  });

  it("reject draws from the biased tail instead of using them", () => {
    // 2^32 is not a multiple of 10^8, so draws at or above the largest multiple
    // are rejected. The first draw here is in that tail and must be skipped.
    const tail = 4_200_000_000;
    const draws = [tail, 77_000_001];
    expect(randomResetCode(() => draws.shift()!)).toBe("77000001");
  });

  it("never puts the code in the subject line", () => {
    const { subject, text } = resetMessage("12345678");
    expect(subject).not.toContain("12345678");
    expect(text).toContain("12345678");
  });
});

describe("sendResetCodeEmail", () => {
  type Call = { url: string; init: RequestInit };
  const recorder = (status = 200) => {
    const calls: Call[] = [];
    const fetchFn = async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status });
    };
    return { calls, fetchFn };
  };

  it("posts the code to the recovery address through Resend", async () => {
    const { calls, fetchFn } = recorder();
    await sendResetCodeEmail("ada@example.com", "87654321", { apiKey: "k", from: "Codextor <no-reply@codextor.app>" }, fetchFn);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.resend.com/emails");
    expect(calls[0].init.method).toBe("POST");
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe("Bearer k");
    const body = JSON.parse(String(calls[0].init.body));
    expect(body.to).toEqual(["ada@example.com"]);
    expect(body.from).toBe("Codextor <no-reply@codextor.app>");
    expect(body.text).toContain("87654321");
    expect(body.subject).not.toContain("87654321");
  });

  it("refuses to send when the sender is not configured, and makes no request", async () => {
    const { calls, fetchFn } = recorder();
    await expect(sendResetCodeEmail("a@b.co", "1", {}, fetchFn)).rejects.toThrow(/not configured/);
    await expect(sendResetCodeEmail("a@b.co", "1", { apiKey: "k" }, fetchFn)).rejects.toThrow(/not configured/);
    expect(calls).toHaveLength(0);
  });

  it("reports a rejected send without echoing the key", async () => {
    const { fetchFn } = recorder(422);
    const err = await sendResetCodeEmail("a@b.co", "1", { apiKey: "secret-key", from: "x@y.co" }, fetchFn).catch(
      (e: Error) => e,
    );
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/HTTP 422/);
    expect((err as Error).message).not.toContain("secret-key");
  });
});
