/*
 * The endpoint registry. Every name is declared in `src/lib/api.ts`, so a
 * client-side ref that has no handler is a typecheck failure here.
 */
import type { ApiName } from "../../src/lib/api";
import type { Ctx } from "./context";
import * as atlas from "./atlas";
import * as certificates from "./certificates";
import * as clans from "./clans";
import * as leaderboard from "./leaderboard";
import * as preferences from "./preferences";
import * as profiles from "./profiles";
import * as progress from "./progress";
import * as accounts from "./accounts";
import * as reviewer from "./reviewer";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Handler = (ctx: Ctx, args: any) => Promise<unknown>;

export const endpoints = {
  "users.me": accounts.me,
  "users.setName": accounts.setName,

  "progress.get": progress.get,
  "progress.save": progress.save,
  "progress.getClaims": progress.getClaims,
  "progress.saveClaims": progress.saveClaims,
  "progress.getAttempts": progress.getAttempts,
  "progress.saveAttempts": progress.saveAttempts,
  "progress.wipe": progress.wipe,
  "progress.startUnseenExercise": reviewer.startUnseenExercise,
  "progress.finishUnseenExercise": reviewer.finishUnseenExercise,
  "progress.reviewerStatus": reviewer.reviewerStatus,

  "profiles.sync": profiles.sync,
  "profiles.me": profiles.me,
  "profiles.setTitle": profiles.setTitle,
  "profiles.publicCard": profiles.publicCard,

  "leaderboard.top": leaderboard.top,
  "leaderboard.podium": leaderboard.podium,

  "clans.list": clans.list,
  "clans.mine": clans.mine,
  "clans.create": clans.create,
  "clans.join": clans.join,
  "clans.leave": clans.leave,
  "clans.activeQuest": clans.activeQuest,
  "clans.ensureActiveQuest": clans.ensureActiveQuest,
  "clans.questView": clans.questView,
  "clans.reportContribution": clans.reportContribution,
  "clans.questClaims": clans.questClaims,
  "clans.claimQuestReward": clans.claimQuestReward,
  "clans.setRole": clans.setRole,
  "clans.kick": clans.kick,
  "clans.feed": clans.feed,

  "certificates.issue": certificates.issue,
  "certificates.verify": certificates.verify,
  "certificates.listForProfile": certificates.listForProfile,
  "certificates.mine": certificates.mine,

  "preferences.get": preferences.get,
  "preferences.save": preferences.save,

  "atlas.get": atlas.get,
  "atlas.save": atlas.save,
} satisfies Record<ApiName, Handler>;
