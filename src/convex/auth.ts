import { Email } from "@convex-dev/auth/providers/Email";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import type { GenericActionCtx } from "convex/server";
import type { DataModel } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  assertNewUsername,
  isLegacyEmailKey,
  loginKey,
  normalizeRecoveryEmail,
} from "../lib/accountIdentity";
import {
  RESET_CODE_MINUTES,
  randomResetCode,
  sendResetCodeEmail,
} from "../lib/resetEmail";

/*
 * Sign-in is by username. Accounts created before usernames existed sign in
 * with their email, which still works. The Password provider keys accounts by
 * `profile().email`, so that field carries the login key. For new accounts it
 * is the username; the optional recovery address is stored on the user and is
 * used only for password-reset codes.
 */

/** The action context is the second argument at runtime (Convex Auth's signIn.ts). */
type SendResetCode = (
  params: { identifier: string; token: string },
  ctx: GenericActionCtx<DataModel>,
) => Promise<void>;

export const sendResetCode: SendResetCode = async ({ identifier, token }, ctx) => {
  const to = await ctx.runQuery(internal.users.recoveryEmailFor, { identifier });
  // No address on file: send nothing and return normally, so the response does
  // not reveal whether the account exists or has a recovery address.
  if (!to) return;
  await sendResetCodeEmail(to, token, {
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.RESEND_FROM,
  });
};

/** Emails a reset code to the account's recovery address, if it has one. */
const resetByCode = Email({
  id: "reset-code",
  maxAge: RESET_CODE_MINUTES * 60,
  generateVerificationToken: async () => randomResetCode(),
  // Auth.js types omit the context, so the signature is narrowed here: the
  // runtime passes it, and the parameter types are the ones we read.
  sendVerificationRequest: sendResetCode as (params: {
    identifier: string;
    token: string;
  }) => Promise<void>,
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      reset: resetByCode,
      profile: (params) => {
        const key = loginKey(String(params.email ?? ""));
        if (params.flow !== "signUp") return { email: key };

        if (isLegacyEmailKey(key)) {
          throw new Error("Choose a username, not an email address.");
        }
        const username = assertNewUsername(key);
        const name = typeof params.name === "string" ? params.name.trim().slice(0, 60) : "";
        const recoveryEmail = normalizeRecoveryEmail(params.recoveryEmail);
        return {
          email: username,
          username,
          ...(name ? { name } : {}),
          ...(recoveryEmail ? { recoveryEmail } : {}),
        };
      },
    }),
  ],
});
