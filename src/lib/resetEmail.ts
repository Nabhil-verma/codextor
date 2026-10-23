/*
 * Password-reset code delivery through Resend's REST API
 * (POST https://api.resend.com/emails).
 *
 * Configuration lives in the Convex deployment environment:
 *   RESEND_API_KEY  an API key with send access
 *   RESEND_FROM     a sender on a domain verified in Resend,
 *                   e.g. "Codextor <no-reply@your-domain.com>"
 * Nothing is sent unless both are set. The code is only in the body, never
 * in the subject line, and it is never written to logs.
 */

export const RESET_CODE_MINUTES = 15;
const RESEND_URL = "https://api.resend.com/emails";
const CODE_SPACE = 100_000_000; // eight digits

export type MailConfig = { apiKey?: string; from?: string };
export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

function secureUint32(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0];
}

/**
 * An eight-digit code drawn without modulo bias. `source` is injectable so the
 * rejection loop can be tested.
 */
export function randomResetCode(source: () => number = secureUint32): string {
  const limit = Math.floor(0x1_0000_0000 / CODE_SPACE) * CODE_SPACE;
  let n: number;
  do {
    n = source();
  } while (n >= limit);
  return String(n % CODE_SPACE).padStart(8, "0");
}

export function resetMessage(code: string): { subject: string; text: string } {
  return {
    subject: "Your Codextor password reset",
    text:
      `Your password reset code is ${code}.\n\n` +
      `It expires in ${RESET_CODE_MINUTES} minutes. ` +
      "If you did not ask for a reset, ignore this email: your password has not changed.",
  };
}

/** Sends the reset code. Throws if unconfigured or if Resend refuses the request. */
export async function sendResetCodeEmail(
  to: string,
  code: string,
  config: MailConfig,
  fetchFn: FetchLike = (url, init) => fetch(url, init),
): Promise<void> {
  if (!config.apiKey || !config.from) {
    throw new Error("Password reset email is not configured (RESEND_API_KEY, RESEND_FROM).");
  }
  const { subject, text } = resetMessage(code);
  const res = await fetchFn(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: config.from, to: [to], subject, text }),
  });
  if (!res.ok) {
    throw new Error(`Password reset email was rejected (HTTP ${res.status}).`);
  }
}
