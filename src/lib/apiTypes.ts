/*
 * Shapes exchanged with the Codextor backend (the Freebuff Sites Worker in
 * `sites/api`). They are shared by the client and the server so a change to a
 * field breaks the typecheck on both sides instead of at runtime.
 *
 * Nothing here identifies an account except `AccountUser`, which is only ever
 * returned for the signed-in learner themselves.
 */

/** A document id. Kept generic so call sites read like the Convex ids they replace. */
export type Id<T extends string> = string & { readonly __table?: T };

export type ThemeStyle = "glass" | "minimal";

/** The signed-in learner's own account row. Never public. */
export type AccountUser = {
  /** Stable account id (the Freebuff `sub`). Used as a local store key. */
  handle: string;
  /** Chosen display name; falls back to the account name on the server. */
  name: string;
  /** Profile data from the identity provider — may be absent. */
  email: string | null;
  picture: string | null;
};

export type ProfileMe = {
  name: string;
  xp: number;
  xpWeek: number;
  xpMonth: number;
  level: number;
  ascension: string;
  title: string | null;
  streakCurrent: number;
  streakLongest: number;
  lessonsDone: number;
  clan: { id: Id<"clans">; name: string; tag: string } | null;
  clanRole: "owner" | "officer" | "member" | "none";
};

/** The public profile page. No account id, email or guild role. */
export type PublicCard = {
  name: string;
  level: number;
  ascension: string;
  title: string | null;
  xp: number;
  streakLongest: number;
  lessonsDone: number;
  clan: { name: string; tag: string } | null;
};

export type Bracket = "week" | "month" | "all";

export type LeaderboardRow = {
  /** Null only when the learner is beyond the server's bounded scan. */
  rank: number | null;
  profileId: Id<"profiles">;
  name: string;
  xp: number;
  level: number;
  ascension: string;
  title: string | null;
  streak: number;
  isMe: boolean;
};

export type LeaderboardTop = {
  bracket: Bracket;
  board: LeaderboardRow[];
  me: LeaderboardRow | null;
};

export type Podium = Record<Bracket, LeaderboardRow[]>;

export type ClanRole = "owner" | "officer" | "member";

/**
 * `userId` is filled in only for callers who are members of the guild (the
 * officer actions address members by account). Everyone else gets null.
 */
export type ClanMember = {
  profileId: Id<"profiles">;
  userId: Id<"accounts"> | null;
  name: string;
  xp: number;
  level: number;
  ascension: string;
  role: ClanRole;
  isMe: boolean;
};

export type ClanView = {
  id: Id<"clans">;
  name: string;
  tag: string;
  blurb: string;
  memberCount: number;
  totalXp: number;
  weekXp: number;
  tier: string;
  tierPerk: string;
  isMine: boolean;
  isOwner: boolean;
  myRole: ClanRole;
  members: ClanMember[];
};

export type ClanQuest = {
  questId: Id<"clanQuests">;
  title: string;
  detail: string;
  metric: "lessons" | "xp" | "flawless";
  target: number;
  pooled: number;
  status: "active" | "complete";
  rewardXp: number;
  weekKey: string;
  isComplete: boolean;
  contributors: {
    userId: Id<"accounts">;
    name: string;
    level: number;
    ascension: string;
    contribution: number;
    isMe: boolean;
  }[];
};

export type QuestClaim = { weekKey: string; xp: number };

export type ClanEventKind =
  | "join"
  | "leave"
  | "level-up"
  | "quest-done"
  | "promotion"
  | "demotion"
  | "kick";

export type FeedEvent = {
  _id: string;
  kind: ClanEventKind;
  text: string;
  createdAt: number;
  actorName: string;
  actorAscension: string | null;
  actorLevel: number;
  isMe: boolean;
};

export type PublicCertificate = {
  code: string;
  trackId: string;
  trackTitle: string;
  displayName: string;
  issuedAt: number;
};

export type VerifyResult =
  | { valid: false }
  | ({ valid: true } & PublicCertificate);

/** One lesson's aggregated attempt record (see `src/lib/telemetry.ts`). */
export type AttemptAgg = {
  first: number;
  best: number;
  attempts: number;
  at: number;
  firstAt: number;
};

export type ReviewItem = {
  prompt: string;
  code: string;
  options: string[];
  index: number;
  total: number;
};

export type ReviewerCertificate = { id: string; issuedAt: number; score: number };

export type ReviewerStatus = {
  metrics: {
    count: number;
    accuracy: number;
    medianMs: number;
    catchRate: number | null;
    falseAlarmRate: number | null;
  };
  certificate: ReviewerCertificate | null;
  byCode: {
    code: string;
    count: number;
    catchRate: number | null;
    falseAlarmRate: number | null;
    meanDecisionMs: number;
  }[];
  attempts: number;
};

export type StartedReview = {
  attemptId: Id<"unseenAttempts">;
  seenBefore: boolean;
  item: ReviewItem;
  minReadMs: number;
};

export type FinishedReview =
  | {
      done: false;
      item: ReviewItem;
      minReadMs: number;
    }
  | {
      done: true;
      accepted: boolean;
      issues: string[];
      metrics: { count: number; accuracy: number; medianMs: number };
      score: number;
      certificate: ReviewerCertificate | null;
    };
