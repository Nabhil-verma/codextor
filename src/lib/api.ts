/*
 * The client half of the API contract.
 *
 * Each entry names one server endpoint in the Codextor Worker (`sites/api`).
 * The generic parameters carry its argument and result types, so `useQuery`
 * and `useMutation` in `./cloud` stay typed without a generated client.
 */
import type {
  AccountUser,
  AttemptAgg,
  Bracket,
  ClanQuest,
  ClanView,
  FeedEvent,
  FinishedReview,
  Id,
  LeaderboardTop,
  Podium,
  ProfileMe,
  PublicCard,
  PublicCertificate,
  QuestClaim,
  ReviewerStatus,
  StartedReview,
  ThemeStyle,
  VerifyResult,
} from "./apiTypes";
import type { Claims } from "./milestones";

export type ApiKind = "query" | "mutation";

export type ApiRef<K extends ApiKind, A, R> = {
  readonly kind: K;
  readonly name: string;
  /** Phantom types; never present at runtime. */
  readonly __args?: A;
  readonly __result?: R;
};

const q = <A, R>(name: string): ApiRef<"query", A, R> => ({ kind: "query", name });
const m = <A, R>(name: string): ApiRef<"mutation", A, R> => ({ kind: "mutation", name });

/** The learner's own progress map: `"${track}/${lesson}!${day}" -> 0..1`. */
export type ProgressMap = Record<string, number>;

export type ProfileSyncArgs = {
  xp: number;
  xpWeek: number;
  xpMonth: number;
  level: number;
  ascension: string;
  streakCurrent: number;
  streakLongest: number;
  lastActiveDay?: string;
  lessonsDone: number;
  /** Day key of the snapshot that produced this push (dedupes level-up events). */
  sourceDay?: string;
};

export const api = {
  users: {
    me: q<Record<string, never>, AccountUser | null>("users.me"),
    setName: m<{ name: string }, null>("users.setName"),
  },
  progress: {
    get: q<Record<string, never>, ProgressMap | null>("progress.get"),
    save: m<{ data: ProgressMap }, null>("progress.save"),
    getClaims: q<Record<string, never>, Claims>("progress.getClaims"),
    saveClaims: m<{ claims: Claims }, null>("progress.saveClaims"),
    getAttempts: q<Record<string, never>, Record<string, AttemptAgg>>("progress.getAttempts"),
    saveAttempts: m<{ attempts: Record<string, AttemptAgg> }, null>("progress.saveAttempts"),
    wipe: m<Record<string, never>, null>("progress.wipe"),
    startUnseenExercise: m<Record<string, never>, StartedReview>("progress.startUnseenExercise"),
    finishUnseenExercise: m<
      { attemptId: Id<"unseenAttempts">; itemIndex: number; answer: number },
      FinishedReview
    >("progress.finishUnseenExercise"),
    reviewerStatus: q<Record<string, never>, ReviewerStatus | null>("progress.reviewerStatus"),
  },
  profiles: {
    sync: m<ProfileSyncArgs, string | null>("profiles.sync"),
    me: q<Record<string, never>, ProfileMe | null>("profiles.me"),
    setTitle: m<{ title: string }, null>("profiles.setTitle"),
    publicCard: q<{ profileId: Id<"profiles"> }, PublicCard | null>("profiles.publicCard"),
  },
  leaderboard: {
    top: q<{ bracket: Bracket; limit?: number }, LeaderboardTop>("leaderboard.top"),
    podium: q<Record<string, never>, Podium>("leaderboard.podium"),
  },
  clans: {
    list: q<Record<string, never>, ClanView[]>("clans.list"),
    mine: q<Record<string, never>, ClanView | null>("clans.mine"),
    create: m<{ name: string; tag: string; blurb: string }, string>("clans.create"),
    join: m<{ clanId: Id<"clans"> }, null>("clans.join"),
    leave: m<Record<string, never>, null>("clans.leave"),
    activeQuest: q<Record<string, never>, ClanQuest | null>("clans.activeQuest"),
    ensureActiveQuest: m<Record<string, never>, string | null>("clans.ensureActiveQuest"),
    questView: q<Record<string, never>, ClanQuest | null>("clans.questView"),
    reportContribution: m<
      { lessons?: number; xp?: number; flawless?: number },
      null
    >("clans.reportContribution"),
    questClaims: q<Record<string, never>, QuestClaim[]>("clans.questClaims"),
    claimQuestReward: m<Record<string, never>, number>("clans.claimQuestReward"),
    setRole: m<{ userId: Id<"accounts">; officer: boolean }, null>("clans.setRole"),
    kick: m<{ userId: Id<"accounts"> }, null>("clans.kick"),
    feed: q<Record<string, never>, FeedEvent[]>("clans.feed"),
  },
  certificates: {
    issue: m<{ trackId: string; displayName?: string }, PublicCertificate>("certificates.issue"),
    verify: q<{ code: string }, VerifyResult>("certificates.verify"),
    listForProfile: q<{ profileId: Id<"profiles"> }, PublicCertificate[]>(
      "certificates.listForProfile",
    ),
    mine: q<Record<string, never>, PublicCertificate[]>("certificates.mine"),
  },
  preferences: {
    get: q<Record<string, never>, { themeStyle: ThemeStyle | null }>("preferences.get"),
    save: m<{ themeStyle: ThemeStyle }, null>("preferences.save"),
  },
  atlas: {
    get: q<Record<string, never>, { answers: Record<string, string>; revision: number } | null>(
      "atlas.get",
    ),
    save: m<{ answers: Record<string, string>; revision?: number }, null>("atlas.save"),
  },
} as const;

/** Every endpoint name, for the server's registry type. */
export type ApiName =
  | "users.me"
  | "users.setName"
  | "progress.get"
  | "progress.save"
  | "progress.getClaims"
  | "progress.saveClaims"
  | "progress.getAttempts"
  | "progress.saveAttempts"
  | "progress.wipe"
  | "progress.startUnseenExercise"
  | "progress.finishUnseenExercise"
  | "progress.reviewerStatus"
  | "profiles.sync"
  | "profiles.me"
  | "profiles.setTitle"
  | "profiles.publicCard"
  | "leaderboard.top"
  | "leaderboard.podium"
  | "clans.list"
  | "clans.mine"
  | "clans.create"
  | "clans.join"
  | "clans.leave"
  | "clans.activeQuest"
  | "clans.ensureActiveQuest"
  | "clans.questView"
  | "clans.reportContribution"
  | "clans.questClaims"
  | "clans.claimQuestReward"
  | "clans.setRole"
  | "clans.kick"
  | "clans.feed"
  | "certificates.issue"
  | "certificates.verify"
  | "certificates.listForProfile"
  | "certificates.mine"
  | "preferences.get"
  | "preferences.save"
  | "atlas.get"
  | "atlas.save";
