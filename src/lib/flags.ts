/**
 * Build-time feature flags. Each flag is read from a VITE_FLAG_* variable and
 * is OFF unless set to "1". Flagged content stays out of production builds by
 * default and can be enabled per environment without a code change.
 */
export const FLAG_ENV = {
  gitWorktreeLab: "VITE_FLAG_GIT_WORKTREE_LAB",
  agentInternals: "VITE_FLAG_AGENT_INTERNALS",
  fieldReports: "VITE_FLAG_FIELD_REPORTS",
  byokInterrogation: "VITE_FLAG_BYOK_INTERROGATION",
  reviewerCertificate: "VITE_FLAG_REVIEWER_CERTIFICATE",
} as const;

export type FlagName = keyof typeof FLAG_ENV;
export type FlagEnv = Record<string, string | boolean | undefined>;

function currentEnv(): FlagEnv {
  return ((import.meta as unknown as { env?: FlagEnv }).env)
    ?? (typeof process !== "undefined" ? process.env : {});
}

export function flagEnabled(name: FlagName, env: FlagEnv = currentEnv()): boolean {
  const v = env[FLAG_ENV[name]];
  return v === "1" || v === true;
}
