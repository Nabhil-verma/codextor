import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import Nav from "../components/Nav";
import { Reveal } from "../components/motion";
import { Crown } from "lucide-react";
import { CyberBadge, MinimalGlassCard, NeonPulseButton, Skeleton } from "../components/ui";
import LeaderboardPanel from "../components/gamification/Leaderboard";
import {
  PanelBoundary,
  PanelFallback,
  RankFrame,
  RankMedal,
  StreakFlame,
  TitleTag,
} from "../components/gamification/Pieces";
import {
  DAILY_QUESTS,
  STREAK_BONUS,
  ascensionFor,
  levelFor,
  resolveAscension,
  totalXp,
} from "../lib/gamification";
import { useProgressState } from "../lib/progress";
import { useReviewDays } from "../lib/reviewStore";
import type { LeaderboardRow } from "../convex/leaderboard";

type PodiumRow = LeaderboardRow;

export default function Leaderboard() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="fx-glow absolute left-1/2 top-[-8rem] h-[26rem] w-[44rem] -translate-x-1/2 rounded-full bg-amber-400/10 blur-[140px]" />
          <div className="fx-glow absolute right-[6%] top-[4rem] h-[20rem] w-[20rem] rounded-full bg-violet-600/15 blur-[130px]" />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 pb-6 pt-24 text-center sm:pt-32">
          <Reveal>
            <CyberBadge tone="amber" dot pulse>
              the arena
            </CyberBadge>
            <h1 className="mt-8 font-display text-5xl font-bold tracking-tighter text-ink-950 sm:text-7xl">
              Global leaderboard
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-600">
              Live standings, three brackets, real XP. Weekly and monthly boards
              reset, so a learner who starts today can still take the crown.
            </p>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <NeonPulseButton to="/learn" size="lg">
                Earn your first XP
              </NeonPulseButton>
              <NeonPulseButton to="/clans" variant="glass" size="lg" trailingIcon={false}>
                Join a guild
              </NeonPulseButton>
            </div>
          </Reveal>
        </div>
      </section>

      <main className="mx-auto max-w-4xl px-4 pb-32">
        <PanelBoundary
          fallback={
            <div className="mt-8">
              <PanelFallback message="Standings need the leaderboard server. Your XP still counts locally." />
            </div>
          }
        >
          <Podium />
          <YourStanding />
        </PanelBoundary>

        <div className="mt-24">
          <LeaderboardPanel limit={25} />
        </div>

        <Reveal className="mt-28">
          <h2 className="eyebrow mb-6">how rank is earned</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <MinimalGlassCard padded="lg">
              <p className="font-display text-xl font-bold tracking-tighter text-ink-950">
                Lesson XP
              </p>
              <ul className="mt-6 space-y-4 font-mono text-xs uppercase tracking-widest text-ink-500">
                <li className="flex items-center justify-between gap-4">
                  <span>lesson completed</span>
                  <span className="font-bold text-emerald-300">+50 xp</span>
                </li>
                <li className="flex items-center justify-between gap-4">
                  <span>flawless quiz (100%)</span>
                  <span className="font-bold text-emerald-300">+25 xp</span>
                </li>
                <li className="flex items-center justify-between gap-4">
                  <span>consistency (2 days running)</span>
                  <span className="font-bold text-emerald-300">+{STREAK_BONUS} xp</span>
                </li>
              </ul>
            </MinimalGlassCard>
            <MinimalGlassCard padded="lg">
              <p className="font-display text-xl font-bold tracking-tighter text-ink-950">
                Daily quests
              </p>
              <ul className="mt-6 space-y-4 font-mono text-xs uppercase tracking-widest text-ink-500">
                {DAILY_QUESTS.map((q) => (
                  <li key={q.id} className="flex items-center justify-between gap-4">
                    <span className="truncate">
                      {q.icon} {q.title}
                    </span>
                    <span className="shrink-0 font-bold text-emerald-300">
                      +{q.bonus} xp
                    </span>
                  </li>
                ))}
              </ul>
            </MinimalGlassCard>
          </div>
          <p className="mt-6 font-mono text-[0.68rem] uppercase leading-relaxed tracking-widest text-ink-500">
            Every number is derived from your lesson history — no hidden counters,
            no resets you didn't earn. Brackets: week (Mon–Sun UTC), month, all-time.
          </p>
        </Reveal>
      </main>
    </div>
  );
}

/* ─────────────────────────── Podium ─────────────────────────── */

/*
 * Gold / silver / bronze. Class strings are spelled out in full so Tailwind
 * can see them. `pedestal` is the block the card stands on; its height is the
 * ranking, visible at a glance even before you read a number.
 */
const PLACES = {
  1: {
    label: "1st",
    pedestal: "h-28 sm:h-36",
    halo: "bg-amber-400/25",
    edge: "border-amber-400/40 shadow-[0_0_50px_-12px_rgba(245,158,11,0.45)]",
    numeral: "text-amber-300/25",
    bar: "from-amber-300/50 via-amber-400/10 to-transparent",
  },
  2: {
    label: "2nd",
    pedestal: "h-20 sm:h-24",
    halo: "bg-zinc-300/15",
    edge: "border-zinc-300/25 shadow-[0_0_40px_-14px_rgba(212,212,216,0.3)]",
    numeral: "text-zinc-300/20",
    bar: "from-zinc-300/35 via-zinc-300/5 to-transparent",
  },
  3: {
    label: "3rd",
    pedestal: "h-14 sm:h-16",
    halo: "bg-orange-500/20",
    edge: "border-orange-500/30 shadow-[0_0_40px_-14px_rgba(234,88,12,0.4)]",
    numeral: "text-orange-400/20",
    bar: "from-orange-400/40 via-orange-500/10 to-transparent",
  },
} as const;

function Podium() {
  const data = useQuery(api.leaderboard.podium);
  if (data === undefined) {
    return (
      <div className="mt-20 grid items-end gap-4 sm:grid-cols-3" role="status" aria-label="Loading podium">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className={i === 1 ? "h-80 !rounded-3xl" : "h-64 !rounded-3xl"} />
        ))}
      </div>
    );
  }

  const top = data.week ?? [];
  if (top.length === 0) {
    return (
      <Reveal className="mt-20">
        <MinimalGlassCard padded="lg" className="border-dashed text-center !border-amber-400/30">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] text-amber-300">
            <Crown className="h-6 w-6" aria-hidden />
          </span>
          <p className="mt-6 font-display text-2xl font-bold tracking-tighter text-ink-950">
            The throne is empty this week
          </p>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-600">
            One completed lesson puts you on the podium. Claim it.
          </p>
          <div className="mt-8 flex justify-center">
            <NeonPulseButton to="/learn">Take the crown</NeonPulseButton>
          </div>
        </MinimalGlassCard>
      </Reveal>
    );
  }

  // Visual order: 2nd · 1st · 3rd
  const arranged = [top[1], top[0], top[2]].filter(Boolean) as PodiumRow[];

  return (
    <Reveal className="mt-20">
      <p className="eyebrow mb-14 text-center">this week's podium</p>
      <div className="grid items-end gap-x-4 gap-y-10 sm:grid-cols-3">
        {arranged.map((row, i) => {
          const isFirst = row.userId === top[0].userId;
          const place = (isFirst ? 1 : row.userId === top[1]?.userId ? 2 : 3) as 1 | 2 | 3;
          const look = PLACES[place];
          const tier = resolveAscension(row.ascension, row.level);
          return (
            <motion.div
              key={row.userId}
              initial={{ opacity: 0, y: 48 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30, delay: i * 0.12 }}
              className="relative"
            >
              {/* Animated halo behind the avatar */}
              <motion.span
                aria-hidden
                className={"pointer-events-none absolute left-1/2 top-4 h-40 w-40 -translate-x-1/2 rounded-full blur-3xl " + look.halo}
                animate={{ opacity: [0.5, 1, 0.5], scale: [0.95, 1.08, 0.95] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
              <div
                className={
                  "glass relative overflow-hidden rounded-t-3xl border border-b-0 px-6 pb-8 pt-8 text-center " +
                  look.edge
                }
              >
                {isFirst && (
                  <motion.span
                    className="mx-auto mb-3 flex w-fit text-amber-300 drop-shadow-[0_0_10px_rgba(245,158,11,0.7)]"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    aria-hidden
                  >
                    <Crown className="h-6 w-6" />
                  </motion.span>
                )}
                <div className="mx-auto w-fit">
                  <RankFrame
                    name={row.name}
                    level={row.level}
                    ascension={row.ascension}
                    size={isFirst ? "xl" : "lg"}
                  />
                </div>
                <div className="mt-6 flex items-center justify-center gap-2">
                  <RankMedal rank={place} />
                  <span className="truncate font-display text-lg font-bold tracking-tighter text-ink-950">
                    {row.name}
                  </span>
                </div>
                <div className="mt-3 flex justify-center">
                  <TitleTag title={row.title} tier={tier} />
                </div>
                <p className={"mt-4 font-mono text-[0.68rem] font-bold uppercase tracking-[0.22em] " + tier.accent}>
                  {tier.name}
                </p>
                <p className="mt-4 font-mono text-3xl font-bold tracking-tighter text-ink-950">
                  <span className="text-gold-400" aria-hidden>
                    ✦
                  </span>{" "}
                  {row.xp.toLocaleString()}
                </p>
                <div className="mt-3 flex justify-center">
                  <StreakFlame days={row.streak} />
                </div>
              </div>
              {/* Pedestal — height encodes rank */}
              <div
                aria-hidden
                className={
                  "relative flex items-start justify-center overflow-hidden rounded-b-xl border border-t-0 border-white/[0.07] bg-gradient-to-b " +
                  look.bar +
                  " " +
                  look.pedestal
                }
              >
                <span className={"mt-2 select-none font-mono text-5xl font-bold tracking-tighter sm:text-6xl " + look.numeral}>
                  {look.label}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </Reveal>
  );
}

/* ─────────────────────── Your standing ─────────────────────── */

function YourStanding() {
  const progress = useProgressState();
  const reviewDays = useReviewDays();
  const profile = useQuery(api.profiles.me);
  const xp = totalXp(progress, reviewDays);
  const level = levelFor(xp);
  const tier = ascensionFor(level.level).current;

  if (profile === undefined) return null;

  return (
    <Reveal className="mt-14">
      <div className="dark-canvas neon-border glass-edge-dark noise-overlay relative flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-3xl p-8">
        <div className="relative flex items-center gap-6">
          <RankFrame
            name={profile?.name ?? "You"}
            level={level.level}
            ascension={profile?.ascension ?? tier.id}
            size="lg"
          />
          <div>
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-gold-400">
              your standing
            </p>
            <p className="mt-2 font-display text-3xl font-bold tracking-tighter text-paper-50">
              {profile?.name ?? "Unranked learner"}
            </p>
            <p className="mt-1.5 font-mono text-xs text-paper-300/80">
              {xp.toLocaleString()} XP · level {level.level} · {tier.name}
              {profile?.clan ? ` · [${profile.clan.tag}] ${profile.clan.name}` : ""}
            </p>
          </div>
        </div>
        <div className="relative flex flex-wrap items-center gap-3">
          <NeonPulseButton to="/portfolio" variant="glass" trailingIcon={false} className="!text-paper-50">
            Customize profile
          </NeonPulseButton>
          {!profile && (
            <span className="font-mono text-[0.68rem] uppercase tracking-widest text-paper-300/70">
              finish a lesson to appear on the board
            </span>
          )}
        </div>
      </div>
    </Reveal>
  );
}
