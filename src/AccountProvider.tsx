import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { signInUrl, useFreebuffUser } from "@freebuff/auth/react";
import { api } from "./lib/api";
import { resetCloudCache, useMutation, useQuery } from "./lib/cloud";
import {
  lessonIdOf,
  loadProgress,
  mergeProgress,
  resetLocalProgress,
  saveProgress,
  subscribeProgress,
  type Progress,
} from "./lib/progress";
import { clanRewardXp, resetClanRewards } from "./lib/clanRewards";
import {
  applyCloudClaims,
  currentMilestoneXp,
  loadClaims,
  resetClaims,
  subscribeClaims,
} from "./lib/milestoneStore";
import {
  aggregateAttempts,
  applyCloudAttempts,
  loadTelemetry,
  resetTelemetry,
  subscribeTelemetry,
  type AttemptAggs,
} from "./lib/telemetry";
import { mergeClaims, type Claims } from "./lib/milestones";
import { loadReviewDays } from "./lib/reviewStore";
import {
  ascensionFor,
  computeStreak,
  levelFor,
  monthStartKey,
  previousDayKeys,
  playerXp,
  todayKey,
  totalXp,
  weekStartKey,
  xpInRange,
} from "./lib/gamification";

type SyncState = "idle" | "syncing" | "synced" | "error";

/**
 * The signed-in learner, as the UI needs them. Nothing vendor-specific leaks
 * into components, and `handle` is the stable account id used to key anything
 * that belongs to this account on this device.
 */
type AccountUser = {
  displayName: string;
  /** Stable account id. Safe as a local store key; never shown publicly. */
  handle: string;
  email: string | null;
  picture: string | null;
};

type AccountCtx = {
  user: AccountUser | null;
  /** False until the initial session read has answered. */
  authReady: boolean;
  sync: SyncState;
  /** Starts Sign in with Freebuff; returns to `returnTo` (a same-site path). */
  signIn: (returnTo?: string) => void;
  setDisplayName: (name: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  /** Wipe local progress AND the signed-in account's cloud progress. */
  resetEverything: () => Promise<void>;
};

const Ctx = createContext<AccountCtx | null>(null);

/** Where to come back to: the current hash route, since the app is hash-routed. */
function currentPath(): string {
  return `/${window.location.hash || "#/"}`;
}

function AccountStore({ children }: { children: ReactNode }) {
  // The session is read from the site's own /auth/freebuff/session route; the
  // server decides access, this is for display and for knowing when to sync.
  const { user: session, isLoading, refresh } = useFreebuffUser();
  const me = useQuery(api.users.me);
  const cloud = useQuery(api.progress.get);
  const cloudClaims = useQuery(api.progress.getClaims);
  const cloudAttempts = useQuery(api.progress.getAttempts);
  const saveRow = useMutation(api.progress.save);
  const saveClaimsRow = useMutation(api.progress.saveClaims);
  const saveAttemptsRow = useMutation(api.progress.saveAttempts);
  const wipeRow = useMutation(api.progress.wipe);
  const saveProfile = useMutation(api.profiles.sync);
  const saveName = useMutation(api.users.setName);

  const [sync, setSync] = useState<SyncState>("idle");
  const lastPulled = useRef("");
  const lastPulledAttempts = useRef("");
  const lastPushedAttempts = useRef("");
  const attemptsPushTimer = useRef<number | null>(null);
  const lastPushed = useRef("");
  const pushTimer = useRef<number | null>(null);
  const lastPulledClaims = useRef("");
  const lastPushedClaims = useRef("");
  const claimsPushTimer = useRef<number | null>(null);

  const signedIn = session != null;
  const authReady = !isLoading;

  /*
   * A different account (or none) must never see the previous account's
   * cached rows, so the query cache is keyed per session and reset here.
   */
  useEffect(() => {
    resetCloudCache();
    lastPulled.current = "";
    lastPushed.current = "";
    lastPulledClaims.current = "";
    lastPushedClaims.current = "";
    lastPulledAttempts.current = "";
    lastPushedAttempts.current = "";
    setSync("idle");
  }, [session?.sub]);

  /* Pull: merge cloud progress into local whenever the cloud row changes. */
  useEffect(() => {
    if (!signedIn || !cloud) return;
    const serial = JSON.stringify(cloud);
    if (serial === lastPulled.current) return;
    lastPulled.current = serial;
    const local = loadProgress().completed;
    const merged = mergeProgress({ completed: local } as Progress, {
      completed: cloud as Progress["completed"],
    } as Progress);
    const mergedSerial = JSON.stringify(merged.completed);
    if (mergedSerial !== JSON.stringify(local)) saveProgress(merged);
    lastPushed.current = mergedSerial; // the union is already on the server
  }, [signedIn, cloud]);

  /* Push: local progress changes while signed in → debounce-save to cloud. */
  useEffect(() => {
    if (!signedIn) return;
    const unsub = subscribeProgress(() => {
      const serial = JSON.stringify(loadProgress().completed);
      if (serial === lastPushed.current) return;
      lastPushed.current = serial;
      setSync("syncing");
      if (pushTimer.current) window.clearTimeout(pushTimer.current);
      pushTimer.current = window.setTimeout(() => {
        saveRow({ data: loadProgress().completed })
          .then(() => setSync("synced"))
          .catch(() => setSync("error"));
      }, 600);
    });
    return () => {
      unsub();
      if (pushTimer.current) window.clearTimeout(pushTimer.current);
    };
  }, [signedIn, saveRow]);

  /* Pull: merge cloud milestone claims into local, then treat the union as
     already pushed — the same shape as the progress pull above. */
  useEffect(() => {
    if (!signedIn || !cloudClaims) return;
    const serial = JSON.stringify(cloudClaims);
    if (serial === lastPulledClaims.current) return;
    lastPulledClaims.current = serial;
    const local = loadClaims();
    const merged = mergeClaims(local, cloudClaims as Claims);
    const mergedSerial = JSON.stringify(merged);
    if (mergedSerial !== JSON.stringify(local)) applyCloudClaims(cloudClaims as Claims);
    lastPushedClaims.current = mergedSerial;
  }, [signedIn, cloudClaims]);

  /* Push: a milestone claimed while signed in → debounce-save to cloud. */
  useEffect(() => {
    if (!signedIn) return;
    const unsub = subscribeClaims(() => {
      const serial = JSON.stringify(loadClaims());
      if (serial === lastPushedClaims.current) return;
      lastPushedClaims.current = serial;
      setSync("syncing");
      if (claimsPushTimer.current) window.clearTimeout(claimsPushTimer.current);
      claimsPushTimer.current = window.setTimeout(() => {
        saveClaimsRow({ claims: loadClaims() })
          .then(() => setSync("synced"))
          .catch(() => setSync("error"));
      }, 600);
    });
    return () => {
      unsub();
      if (claimsPushTimer.current) window.clearTimeout(claimsPushTimer.current);
    };
  }, [signedIn, saveClaimsRow]);

  /* Pull: fold the account's attempt aggregates into the local view. Merged,
     never overwritten — this device may hold attempts the cloud has not seen. */
  useEffect(() => {
    if (!signedIn || !cloudAttempts) return;
    const serial = JSON.stringify(cloudAttempts);
    if (serial === lastPulledAttempts.current) return;
    lastPulledAttempts.current = serial;
    applyCloudAttempts(cloudAttempts as AttemptAggs);
  }, [signedIn, cloudAttempts]);

  /*
   * Attempt aggregates. The push sends a *summary* per lesson (first / best /
   * count), not the raw log: the server keeps the earliest first and the
   * highest best, so a second device can only add information.
   */
  useEffect(() => {
    if (!signedIn) return;
    const unsub = subscribeTelemetry(() => {
      const aggs = aggregateAttempts(loadTelemetry());
      const serial = JSON.stringify(aggs);
      if (serial === lastPushedAttempts.current) return;
      lastPushedAttempts.current = serial;
      setSync("syncing");
      if (attemptsPushTimer.current) window.clearTimeout(attemptsPushTimer.current);
      attemptsPushTimer.current = window.setTimeout(() => {
        saveAttemptsRow({ attempts: aggregateAttempts(loadTelemetry()) })
          .then(() => setSync("synced"))
          .catch(() => setSync("error"));
      }, 600);
    });
    return () => {
      unsub();
      if (attemptsPushTimer.current) window.clearTimeout(attemptsPushTimer.current);
    };
  }, [signedIn, saveAttemptsRow]);

  /*
   * Publish the public player card. Everything here is derived from the local
   * progress map, so the leaderboard can sort server-side without the server
   * ever parsing a progress blob. Best-effort: a failure never blocks learning.
   */
  useEffect(() => {
    if (!signedIn) return;
    const push = () => {
      const p = loadProgress();
      const today = todayKey();
      const streak = computeStreak(p, today, previousDayKeys());
      const reviewDays = loadReviewDays();
      const level = levelFor(totalXp(p, reviewDays));
      const lessonsDone = new Set(
        Object.entries(p.completed)
          .filter(([, score]) => score >= 1)
          .map(([key]) => lessonIdOf(key)),
      ).size;
      void saveProfile({
        xp: playerXp(p, clanRewardXp() + currentMilestoneXp(), reviewDays),
        xpWeek: xpInRange(p, weekStartKey(today), today, reviewDays),
        xpMonth: xpInRange(p, monthStartKey(today), today, reviewDays),
        level: level.level,
        ascension: ascensionFor(level.level).current.id,
        streakCurrent: streak.current,
        streakLongest: streak.longest,
        lastActiveDay: streak.lastDay ?? undefined,
        lessonsDone,
        // Day key of this snapshot — the server uses it to post at most one
        // "level-up" event per (level, day) into the guild feed.
        sourceDay: today,
      }).catch(() => {
        // Offline or transient backend error — progress itself is unaffected.
      });
    };
    push();
    // A milestone claim moves this player's XP (and therefore their leaderboard
    // rank) without touching the progress map, so claims have to re-publish the
    // card too.
    const offProgress = subscribeProgress(push);
    const offClaims = subscribeClaims(push);
    return () => {
      offProgress();
      offClaims();
    };
  }, [signedIn, saveProfile]);

  const signIn = useCallback((returnTo?: string) => {
    window.location.assign(signInUrl(returnTo ?? currentPath()));
  }, []);

  const setDisplayName = useCallback(
    async (name: string) => {
      await saveName({ name });
      await refresh();
    },
    [saveName, refresh],
  );

  const signOutUser = useCallback(async () => {
    try {
      // Sign-out must be a same-site POST; a link would let other sites do it.
      await fetch("/auth/freebuff/signout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch {
      // Already gone, or offline: the local cleanup below still runs.
    }
    // Signing out wipes everything that belonged to the account on this device:
    // lesson scores, milestone claims and banked guild rewards. Leaving any of
    // them behind would show rewards the next learner never earned.
    resetLocalProgress();
    resetClaims();
    resetClanRewards();
    resetTelemetry();
    lastPulled.current = "";
    lastPushed.current = "";
    lastPulledClaims.current = "";
    lastPushedClaims.current = "";
    lastPulledAttempts.current = "";
    lastPushedAttempts.current = "";
    setSync("idle");
    resetCloudCache();
    await refresh();
  }, [refresh]);

  const resetEverything = useCallback(async () => {
    resetLocalProgress();
    // Claims and banked guild rewards are progress too — leaving them local
    // would let a reset device push the wiped milestones back.
    resetClaims();
    resetClanRewards();
    resetTelemetry();
    lastPushed.current = "";
    lastPushedClaims.current = "";
    lastPushedAttempts.current = "";
    if (signedIn) {
      try {
        await wipeRow({});
      } catch {
        setSync("error");
        return;
      }
      setSync("synced");
    }
  }, [signedIn, wipeRow]);

  const value = useMemo<AccountCtx>(() => {
    const displayName = me?.name || session?.name || "Learner";
    return {
      user: me
        ? {
            displayName,
            handle: me.handle,
            email: me.email,
            picture: me.picture,
          }
        : session
          ? {
              displayName,
              handle: session.sub,
              email: session.email ?? null,
              picture: session.picture ?? null,
            }
          : null,
      authReady,
      sync,
      signIn,
      setDisplayName,
      signOutUser,
      resetEverything,
    };
  }, [
    me,
    session,
    authReady,
    sync,
    signIn,
    setDisplayName,
    signOutUser,
    resetEverything,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function AccountProvider({ children }: { children: ReactNode }) {
  return <AccountStore>{children}</AccountStore>;
}

export function useAccount(): AccountCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAccount must be used inside <AccountProvider>");
  return ctx;
}
