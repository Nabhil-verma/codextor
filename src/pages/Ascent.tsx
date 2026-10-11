import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Nav from "../components/Nav";
import { Reveal } from "../components/motion";
import { CyberBadge, MinimalGlassCard, PrecisionProgressBar, PrecisionRing } from "../components/ui";
import {
  ASCENSIONS,
  DAILY_QUESTS,
  STREAK_BONUS,
  TITLES,
  XP_PER_LEVEL,
  ascensionFor,
  levelFor,
  totalXp,
  unlockedTitles,
} from "../lib/gamification";
import { REVIEW_XP, DAILY_REVIEW_XP_CAP } from "../lib/review";
import { useProgressState } from "../lib/progress";
import { useReviewDays } from "../lib/reviewStore";
import { useAccount } from "../AccountProvider";

/* ═══════════════════════════════════════════════════════════════
   The Ascent — the ladder, in public.

   The gamification layer has always been a set of panels inside the
   app; this page is where it is explained before you have any XP: what
   a level costs, what each tier unlocks, where the XP comes from, and
   where you currently stand. Everything is derived from the same
   progress map the rest of the app reads.
   ═══════════════════════════════════════════════════════════════ */

export default function Ascent() {
  const progress = useProgressState();
  const reviewDays = useReviewDays();
  const { user } = useAccount();

  const xp = totalXp(progress, reviewDays);
  const level = levelFor(xp);
  const ascension = ascensionFor(level.level);
  const titles = unlockedTitles(level.level);
  const nextTitle = TITLES.find((t) => t.minLevel > level.level) ?? null;

  const sources = [
    { label: "Lesson completed", value: "+50 XP", detail: "Replayed from your own history" },
    { label: "Flawless quiz (100%)", value: "+25 XP", detail: "75 XP for a perfect lesson" },
    { label: "Daily quests", value: "+50 to +385 XP", detail: DAILY_QUESTS.length + " quests, reset each day" },
    {
      label: "Spaced review",
      value: "+" + REVIEW_XP + " XP per recall",
      detail: "Capped at " + DAILY_REVIEW_XP_CAP + " XP a day",
    },
    { label: "Two days running", value: "+" + STREAK_BONUS + " XP", detail: "The habit reward" },
  ];

  return (
    <div className="min-h-screen bg-paper-50">
      <Nav />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-28 sm:px-6">
        <Reveal>
          <CyberBadge tone="cyan" dot pulse>
            the ascent
          </CyberBadge>
          <h1 className="mt-5 font-display text-4xl font-bold tracking-tighter text-ink-950 sm:text-5xl">
            {ASCENSIONS.length} tiers. {XP_PER_LEVEL} XP a level. One ladder.
          </h1>
          <p className="mt-4 max-w-2xl text-ink-600">
            Every number here is derived from what you actually did: lessons finished, quests
            cleared, items recalled. Nothing is granted for showing up twice, and nothing can be
            lost — a new device replays the same history into the same tier.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mt-10">
          <MinimalGlassCard>
            <div className="flex flex-wrap items-center gap-6 p-8">
              <PrecisionRing value={level.pct} size={84} stroke={2} label={`Level ${level.level} progress`}>
                <span className="font-mono text-xl font-bold text-ink-950">{level.level}</span>
              </PrecisionRing>
              <div className="min-w-0 flex-1">
                <p className="eyebrow">{user ? "your standing" : "signed out — this is local progress"}</p>
                <p className="mt-2 font-display text-2xl font-bold tracking-tighter text-ink-950">
                  {ascension.current.roman} — {ascension.current.name}
                </p>
                <p className="mt-1 font-mono text-[0.68rem] uppercase tracking-widest text-ink-500">
                  {xp.toLocaleString()} XP · {level.toNext} XP to level {level.level + 1}
                  {ascension.next ? ` · ${ascension.levelsToNext} levels to ${ascension.next.name}` : " · top tier"}
                </p>
              </div>
            </div>
            <div className="border-t border-white/[0.06] px-8 py-6">
              <PrecisionProgressBar
                value={ascension.pct}
                label={ascension.next ? `Progress toward ${ascension.next.name}` : "Final tier reached"}
                showLabel
                readout={ascension.pct + "%"}
              />
            </div>
          </MinimalGlassCard>
        </Reveal>

        <Reveal delay={0.15} className="mt-14">
          <h2 className="eyebrow mb-5">the ladder</h2>
          <ol className="grid gap-3 sm:grid-cols-2">
            {ASCENSIONS.map((tier) => {
              const earned = level.level >= tier.minLevel;
              const current = tier.id === ascension.current.id;
              return (
                <motion.li
                  key={tier.id}
                  whileHover={{ y: -3 }}
                  className={
                    "glass glass-edge rounded-2xl border p-5 transition " +
                    (current
                      ? "border-gold-400/60 shadow-glow"
                      : "border-paper-200/60 " + (earned ? "" : "opacity-60"))
                  }
                >
                  <div className="flex items-center gap-4">
                    <span
                      aria-hidden
                      className={"h-10 w-10 shrink-0 rounded-full bg-gradient-to-br " + tier.frame}
                    />
                    <div className="min-w-0">
                      <p className="font-display text-lg font-semibold text-ink-950">
                        {tier.roman} — {tier.name}
                      </p>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-500">
                        level {tier.minLevel}+
                        {earned ? " · unlocked" : " · locked"}
                        {current ? " · you are here" : ""}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-ink-600">{tier.perk}</p>
                </motion.li>
              );
            })}
          </ol>
        </Reveal>

        <Reveal delay={0.2} className="mt-14">
          <h2 className="eyebrow mb-5">where XP comes from</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sources.map((s) => (
              <div key={s.label} className="glass glass-edge rounded-2xl border border-paper-200/60 p-5">
                <p className="font-mono text-sm font-bold text-gold-600">{s.value}</p>
                <p className="mt-1 font-display text-base font-semibold text-ink-950">{s.label}</p>
                <p className="mt-1 text-xs text-ink-500">{s.detail}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.25} className="mt-14">
          <h2 className="eyebrow mb-5">titles</h2>
          <div className="flex flex-wrap gap-2">
            {TITLES.map((t) => {
              const owned = titles.some((u) => u.id === t.id);
              return (
                <span
                  key={t.id}
                  className={
                    "rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-widest " +
                    (owned
                      ? "border-gold-400/50 bg-gold-400/10 text-gold-700"
                      : "border-paper-200 text-ink-400")
                  }
                >
                  {t.label} · lvl {t.minLevel}
                </span>
              );
            })}
          </div>
          {nextTitle && (
            <p className="mt-3 text-xs text-ink-500">
              Next title: {nextTitle.label} at level {nextTitle.minLevel}.
            </p>
          )}
        </Reveal>

        <Reveal delay={0.3} className="mt-14">
          <div className="dark-canvas neon-border glass-edge-dark noise-overlay relative overflow-hidden rounded-3xl p-8 sm:p-10">
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
              <div>
                <p className="eyebrow">next step</p>
                <p className="mt-3 font-display text-2xl font-bold tracking-tighter text-paper-50">
                  The fastest XP is a lesson you finish today.
                </p>
              </div>
              <Link
                to={user ? "/learn" : "/auth?returnTo=%2Flearn"}
                className="inline-flex items-center gap-2 rounded-full border border-gold-400/60 bg-gold-400/10 px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest text-gold-300 transition hover:bg-gold-400/20"
              >
                {user ? "back to lessons" : "start free"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Reveal>
      </main>
    </div>
  );
}
