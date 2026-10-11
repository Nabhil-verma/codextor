import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Hammer, Search, Swords, Trophy } from "lucide-react";
import Nav from "../components/Nav";
import {
  MANIFEST_TRACKS as tracks,
  lessonKey,
  TOTAL_LESSONS as totalLessonCount,
} from "../data/manifest";
import { scoreFor, useProgressState } from "../lib/progress";
import {
  activeDays,
  computeBadges,
  computeStreak,
  lessonsToday,
  levelFor,
  previousDayKeys,
  todayKey,
  totalXp,
} from "../lib/gamification";
import { useAccount } from "../AccountProvider";
import { Reveal, PageFade } from "../components/motion";
import {
  CyberBadge,
  MinimalGlassCard,
  NeonPulseButton,
  PrecisionProgressBar,
  PrecisionRing,
} from "../components/ui";
import SkillTree from "../components/SkillTree";
import MicroPractice from "../components/MicroPractice";
import AscensionPanel from "../components/gamification/AscensionPanel";
import QuestBoard from "../components/gamification/QuestBoard";
import ReviewCard from "../components/gamification/ReviewCard";
import { useReviewDays } from "../lib/reviewStore";
import { useClanRole } from "../lib/guildState";
import { MILESTONES, milestonesClaimed } from "../lib/milestones";
import { useClaims } from "../lib/milestoneStore";


export default function Learn() {
  const progress = useProgressState();
  const { resetEverything } = useAccount();
  const clanRole = useClanRole();
  const shipped = milestonesClaimed(useClaims());
  const navigate = useNavigate();
  const doneCount = tracks.reduce(
    (n, t) =>
      n +
      t.lessons.filter((l) => scoreFor(progress, lessonKey(t.id, l.id)) >= 1)
        .length,
    0
  );
  const pct = Math.round((doneCount / totalLessonCount) * 100);
  const today = todayKey();
  const streak = computeStreak(progress, today, previousDayKeys());
  const reviewDays = useReviewDays();
  const xp = totalXp(progress, reviewDays);
  const level = levelFor(xp);
  const badges = computeBadges(progress, streak, {
    level: level.level,
    clanRole,
  });
  const earnedCount = badges.filter((b) => b.earned).length;
  const doneToday = lessonsToday(progress, today);
  const days = activeDays(progress);

  // The first lesson (in curriculum order) that isn't finished yet.
  let upNext: { trackId: string; trackTitle: string; lessonId: string; title: string; minutes: number } | null = null;
  outer: for (const t of tracks) {
    for (const l of t.lessons) {
      if (scoreFor(progress, lessonKey(t.id, l.id)) < 1) {
        upNext = { trackId: t.id, trackTitle: t.title, lessonId: l.id, title: l.title, minutes: l.minutes };
        break outer;
      }
    }
  }

  /* ---------------- search and filters ---------------- */
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "todo" | "done">("all");
  const [trackFilter, setTrackFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState<
    "all" | "labs" | "interactive" | "terminal" | "visual" | "reading"
  >("all");

  /*
   * The manifest carries the interaction kind, so filtering never touches a
   * lesson body: "break-and-fix labs" is `hasDebug`, and the rest is one of
   * the four interaction kinds the catalog already prints.
   */
  const filtering =
    query.trim() !== "" || statusFilter !== "all" || trackFilter !== "all" || kindFilter !== "all";

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = tracks
      .filter((t) => trackFilter === "all" || t.id === trackFilter)
      .map((track) => ({
        track,
        lessons: track.lessons.filter((lesson) => {
          const score = scoreFor(progress, lessonKey(track.id, lesson.id));
          if (statusFilter === "done" && score < 1) return false;
          if (statusFilter === "todo" && score >= 1) return false;
          if (kindFilter === "labs" && !lesson.hasDebug) return false;
          if (
            kindFilter !== "all" &&
            kindFilter !== "labs" &&
            lesson.interaction !== kindFilter
          ) {
            return false;
          }
          if (!q) return true;
          return (lesson.title + " " + track.title).toLowerCase().includes(q);
        }),
      }))
      .filter((group) => group.lessons.length > 0);

    // Core path first, optional material second — same order as the catalog.
    return [
      ...matched.filter((g) => !g.track.optional),
      ...matched.filter((g) => g.track.optional),
    ];
  }, [query, statusFilter, trackFilter, kindFilter, progress]);

  const shown = groups.reduce((n, g) => n + g.lessons.length, 0);

  return (
    <div className="min-h-screen">
      <Nav />
      <PageFade>
        <main className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="eyebrow">The curriculum</p>
                <h1 className="mt-4 font-display text-5xl font-bold tracking-tighter text-ink-950 sm:text-6xl">
                  All lessons
                </h1>
                <p className="mt-4 max-w-lg text-lg leading-relaxed text-ink-600">
                  Work through the tracks in order, or jump to whatever looks useful.
                </p>
              </div>
              {doneCount > 0 && (
                <button
                  onClick={() => {
                    if (confirm("Reset all progress? This can't be undone.")) {
                      // Always signed in — wipe device + cloud copy; UI updates live.
                      void resetEverything();
                    }
                  }}
                  className="rounded-full border border-paper-300/70 px-4 py-1.5 font-mono text-[0.7rem] uppercase tracking-widest text-ink-500 transition-all duration-300 ease-snap hover:border-rose-400/50 hover:text-rose-300 active:scale-95"
                >
                  reset progress
                </button>
              )}
            </div>
          </Reveal>

          {/* ── Player stats: one quiet surface, three floating readouts ── */}
          <Reveal delay={0.08} className="mt-14">
            <MinimalGlassCard padded={false} neonEdge className="overflow-hidden">
              <div className="grid divide-white/[0.06] md:grid-cols-3 md:divide-x">
                {/* Level + XP */}
                <div className="flex items-center gap-6 p-8">
                  <PrecisionRing value={level.pct} size={72} stroke={2} label={`Level ${level.level} progress`}>
                    <span className="font-mono text-lg font-bold text-ink-950">{level.level}</span>
                  </PrecisionRing>
                  <div className="min-w-0 flex-1">
                    <p className="eyebrow">Level {level.level}</p>
                    <p className="mt-2 font-mono text-3xl font-bold tracking-tighter text-ink-950">
                      {xp.toLocaleString()}
                      <span className="ml-1.5 text-sm font-medium text-gold-400">XP</span>
                    </p>
                    <p className="mt-1.5 font-mono text-[0.68rem] uppercase tracking-widest text-ink-500">
                      {level.toNext} XP to level {level.level + 1}
                    </p>
                  </div>
                </div>

                {/* Streak */}
                <div className="border-t border-white/[0.06] p-8 md:border-t-0">
                  <p className="eyebrow">Daily streak</p>
                  <div className="mt-2 flex items-center gap-3">
                    <p className="font-mono text-3xl font-bold tracking-tighter text-ink-950">
                      <span aria-hidden className="mr-1.5">🔥</span>
                      {streak.current}
                      <span className="ml-1.5 text-sm font-medium text-amber-300">
                        day{streak.current === 1 ? "" : "s"}
                      </span>
                    </p>
                    {streak.current === 0 && days.length > 0 && (
                      <CyberBadge tone="neutral">best {streak.longest}</CyberBadge>
                    )}
                  </div>
                  <p className="mt-1.5 font-mono text-[0.68rem] uppercase tracking-widest text-ink-500">
                    {doneToday > 0
                      ? doneToday + " lesson" + (doneToday === 1 ? "" : "s") + " today — keep it alive"
                      : days.length > 0
                        ? "complete a lesson today to extend it"
                        : "complete your first lesson to start one"}
                  </p>
                  {days.length > 0 && <ActivityStrip days={days} today={today} />}
                </div>

                {/* Badges */}
                <div className="border-t border-white/[0.06] p-8 md:border-t-0">
                  <p className="eyebrow">Badges</p>
                  <p className="mt-2 font-mono text-3xl font-bold tracking-tighter text-ink-950">
                    {earnedCount}
                    <span className="text-lg text-ink-500">/{badges.length}</span>
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {badges.map((b, i) => (
                      <motion.span
                        key={b.id}
                        title={b.title + " — " + b.description}
                        className={
                          "flex h-8 w-8 items-center justify-center rounded-full border text-sm transition " +
                          (b.earned
                            ? "border-gold-400/50 bg-gold-400/10 text-gold-600 shadow-glow"
                            : "border-paper-200 text-paper-300 grayscale")
                        }
                        initial={{ scale: 0, rotate: -30 }}
                        whileInView={{ scale: 1, rotate: 0 }}
                        viewport={{ once: true }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 24,
                          delay: 0.25 + i * 0.05,
                        }}
                        whileHover={b.earned ? { scale: 1.2, rotate: 8 } : undefined}
                      >
                        {b.icon}
                      </motion.span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-white/[0.06] px-8 py-6">
                <PrecisionProgressBar
                  value={pct}
                  label={`${doneCount} of ${totalLessonCount} lessons complete`}
                  showLabel
                  readout={pct + "%"}
                />
              </div>
            </MinimalGlassCard>
          </Reveal>

          {/* ── Up next: one frictionless action ── */}
          {upNext && (
            <Reveal delay={0.12} className="mt-6">
              <div className="dark-canvas neon-border glass-edge-dark noise-overlay relative overflow-hidden rounded-3xl p-8 sm:p-10">
                <div className="relative z-10 flex flex-wrap items-center justify-between gap-8">
                  <div className="min-w-0">
                    <CyberBadge tone="cyan" dot pulse>
                      {doneCount === 0 ? "start here" : "up next"}
                    </CyberBadge>
                    <h2 className="mt-5 font-display text-3xl font-bold tracking-tighter text-paper-50 sm:text-4xl">
                      {upNext.title}
                    </h2>
                    <p className="mt-3 font-mono text-[0.7rem] uppercase tracking-[0.22em] text-paper-300/70">
                      {upNext.trackTitle} · {upNext.minutes} min
                    </p>
                  </div>
                  <NeonPulseButton
                    to={`/learn/${upNext.trackId}/${upNext.lessonId}`}
                    size="lg"
                  >
                    {doneCount === 0 ? "Start lesson" : "Continue quest"}
                  </NeonPulseButton>
                </div>
              </div>
            </Reveal>
          )}

          {/* Ascension + daily quests — the game layer */}
          <Reveal className="mt-20">
            <h2 className="eyebrow mb-5">ascension</h2>
            <AscensionPanel />
          </Reveal>

          <Reveal className="mt-20">
            <h2 className="eyebrow mb-5">quests</h2>
            <QuestBoard />
            <div className="mt-4">
              <ReviewCard />
            </div>
          </Reveal>

          {/* Compete & ship — leaderboard, guild hall, project board */}
          <Reveal className="mt-8">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  to: "/leaderboard",
                  Icon: Trophy,
                  title: "Global leaderboard",
                  sub: "weekly · monthly · all-time standings",
                },
                {
                  to: "/clans",
                  Icon: Swords,
                  title: "Guild hall",
                  sub:
                    clanRole === "none"
                      ? "pool your XP with a study group"
                      : clanRole === "owner"
                        ? "you founded a guild — lead the board"
                        : "your guild is pooling XP",
                },
                {
                  to: "/projects",
                  Icon: Hammer,
                  title: "Project board",
                  sub: `${shipped} of ${MILESTONES.length} milestones shipped · build something you can show`,
                },
              ].map(({ to, Icon, title, sub }) => (
                <Link
                  key={to}
                  to={to}
                  className="glass glass-edge group flex h-full flex-col gap-6 rounded-3xl border border-paper-200/70 p-7 transition-all duration-500 ease-snap hover:-translate-y-1 hover:border-cyan-400/30 hover:shadow-[0_0_40px_-12px_rgba(0,229,255,0.25)]"
                >
                  <span className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-ink-800">
                      <Icon className="h-[1.1rem] w-[1.1rem]" aria-hidden />
                    </span>
                    <ArrowUpRight
                      className="h-5 w-5 text-ink-400 transition-all duration-300 ease-snap group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-gold-400"
                      aria-hidden
                    />
                  </span>
                  <span>
                    <span className="block font-display text-xl font-bold tracking-tighter text-ink-950">
                      {title}
                    </span>
                    <span className="mt-1.5 block font-mono text-[0.68rem] uppercase leading-relaxed tracking-widest text-ink-500">
                      {sub}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </Reveal>

          {/* Visual Skill Tree */}
          <Reveal className="mt-20">
            <h2 className="eyebrow mb-5">skill tree</h2>
            <MinimalGlassCard padded="lg">
              <SkillTree />
            </MinimalGlassCard>
          </Reveal>

          {/* Mobile Micro-Practice */}
          <Reveal className="mt-20">
            <h2 className="eyebrow mb-5">quick practice</h2>
            <MicroPractice />
          </Reveal>

          {/*
           * Core path first, optional material second. The split is metadata
           * on the track (Tier 2), not a demotion: optional tracks are fully
           * playable and still count for XP, ranks and certificates.
           */}
          {/* Search + filters: status, track, interaction kind. */}
          <section className="mt-24" aria-label="Find a lesson">
            <label htmlFor="learn-search" className="eyebrow">
              find a lesson
            </label>
            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-paper-200 bg-paper-50 px-4 py-2.5">
              <Search className="h-4 w-4 shrink-0 text-ink-400" aria-hidden />
              <input
                id="learn-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${totalLessonCount} lessons — 'hooks', 'flexbox', 'async'…`}
                className="w-full bg-transparent text-sm text-ink-950 outline-none placeholder:text-ink-400"
              />
              {filtering && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setStatusFilter("all");
                    setTrackFilter("all");
                    setKindFilter("all");
                  }}
                  className="shrink-0 rounded-full px-3 py-1 font-mono text-[11px] text-ink-600 transition hover:bg-paper-100 hover:text-ink-950"
                >
                  clear
                </button>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1.5">
                {(["all", "todo", "done"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={statusFilter === value}
                    onClick={() => setStatusFilter(value)}
                    className={
                      "rounded-full border px-3.5 py-1 font-mono text-[11px] uppercase tracking-wider transition " +
                      (statusFilter === value
                        ? "border-gold-400 bg-gold-400/15 text-ink-950"
                        : "border-paper-200 text-ink-600 hover:border-gold-400/60")
                    }
                  >
                    {value === "all" ? "any status" : value === "todo" ? "to do" : "done"}
                  </button>
                ))}
              </div>
              <div role="group" aria-label="Filter by kind" className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["all", "all kinds"],
                    ["labs", "break-and-fix labs"],
                    ["interactive", "interactive"],
                    ["terminal", "terminal"],
                    ["visual", "visual"],
                    ["reading", "reading"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={kindFilter === value}
                    onClick={() => setKindFilter(value)}
                    className={
                      "rounded-full border px-3.5 py-1 font-mono text-[11px] uppercase tracking-wider transition " +
                      (kindFilter === value
                        ? "border-gold-400 bg-gold-400/15 text-ink-950"
                        : "border-paper-200 text-ink-600 hover:border-gold-400/60")
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="sr-only" htmlFor="learn-track-filter">
                Filter by track
              </label>
              <select
                id="learn-track-filter"
                value={trackFilter}
                onChange={(e) => setTrackFilter(e.target.value)}
                className="rounded-full border border-paper-200 bg-paper-50 px-3.5 py-1 font-mono text-[11px] uppercase tracking-wider text-ink-600"
              >
                <option value="all">all tracks</option>
                {tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            {filtering && (
              <p role="status" className="mt-3 font-mono text-xs text-ink-500">
                {shown} {shown === 1 ? "lesson" : "lessons"} match
                {groups.length === 0 ? " — try clearing a filter" : ""}
              </p>
            )}
          </section>

          <div className="mt-14 space-y-20">
            {groups.length === 0 && (
              <p className="rounded-2xl border border-dashed border-paper-300 px-6 py-10 text-center text-sm text-ink-600">
                No lessons match those filters yet.
              </p>
            )}
            {groups.map(({ track, lessons }, ti) => {
              const trackDone = track.lessons.filter((l) => scoreFor(progress, lessonKey(track.id, l.id)) >= 1).length;
              const trackPct = Math.round((trackDone / track.lessons.length) * 100);
              const firstOptional =
                track.optional && ti > 0 && !groups[ti - 1]?.track.optional;
              return (
              <Reveal key={track.id}>
                <section>
                  {firstOptional && (
                    <div className="mb-10 rounded-3xl border border-dashed border-paper-300/60 bg-white/[0.02] px-7 py-6">
                      <p className="eyebrow">optional tracks</p>
                      <p className="mt-2 text-sm leading-relaxed text-ink-600">
                        Framework-specific or lower-priority-for-screening
                        material. Fully playable, still counts for XP and
                        certificates — take these when your target stack or the
                        job description names them.
                      </p>
                    </div>
                  )}
                  <div className="mb-6 flex items-center gap-6 border-b border-white/[0.06] pb-7">
                    <PrecisionRing
                      value={trackPct}
                      size={52}
                      stroke={2}
                      tone={trackPct === 100 ? "emerald" : "cyan"}
                      label={`${track.title} progress`}
                    >
                      <span className="font-mono text-xs font-bold text-ink-800">
                        {String(ti + 1).padStart(2, "0")}
                      </span>
                    </PrecisionRing>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-3xl font-bold tracking-tighter text-ink-950">
                        {track.title}
                        {track.optional && (
                          <span className="ml-3 align-middle">
                            <CyberBadge tone="neutral">optional</CyberBadge>
                          </span>
                        )}
                      </h2>
                      <p className="mt-1.5 text-sm text-ink-600">
                        {track.optional && track.optionalWhy
                          ? track.optionalWhy
                          : track.blurb}
                      </p>
                    </div>
                    <span className="hidden font-mono text-[0.7rem] uppercase tracking-widest text-ink-500 sm:block">
                      {trackDone}/{track.lessons.length}
                    </span>
                  </div>
                  <ol className="space-y-1">
                    {lessons.map((lesson, i) => {
                      const key = lessonKey(track.id, lesson.id);
                      const score = scoreFor(progress, key);
                      const done = score >= 1;
                      const started = score > 0;
                      return (
                        <motion.li
                          key={lesson.id}
                          initial={{ opacity: 0, x: -18 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true, margin: "-40px" }}
                          transition={{ type: "spring", stiffness: 400, damping: 30, delay: Math.min(i * 0.04, 0.3) }}
                        >
                          <Link
                            to={"/learn/" + track.id + "/" + lesson.id}
                            className="group flex items-center gap-5 rounded-2xl border border-transparent px-4 py-4 transition-all duration-300 ease-snap hover:border-white/[0.07] hover:bg-white/[0.04]"
                          >
                            <span
                              className={
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-bold transition-all duration-300 " +
                                (done
                                  ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-300 shadow-emerald"
                                  : started
                                    ? "border-gold-400/50 text-gold-400"
                                    : "border-paper-300 text-ink-500")
                              }
                            >
                              {done ? "✓" : String(i + 1).padStart(2, "0")}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-display text-lg font-semibold tracking-tight text-ink-950 transition-colors group-hover:text-gold-400">
                                {lesson.title}
                              </span>
                              <span className="mt-0.5 block font-mono text-[0.68rem] uppercase tracking-widest text-ink-500">
                                {lesson.minutes} min ·{" "}
                                {lesson.interaction}
                                {lesson.hasPredict ? " · predict" : ""} ·{" "}
                                {lesson.quizCount} quiz questions
                              </span>
                            </span>
                            <span className="font-mono text-sm text-gold-400 opacity-0 transition-all duration-300 ease-snap group-hover:translate-x-1 group-hover:opacity-100">
                              →
                            </span>
                          </Link>
                        </motion.li>
                      );
                    })}
                  </ol>

                  {/* Certificate CTA for fully-completed tracks */}
                  {trackDone === track.lessons.length && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      className="mt-5 rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.06] px-6 py-5 shadow-emerald"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <p className="text-sm text-ink-800">
                          <span className="mr-2 text-emerald-300">✦</span>
                          <strong className="font-display font-semibold text-ink-950">
                            Track complete.
                          </strong>{" "}
                          Claim your printable certificate.
                        </p>
                        <button
                          type="button"
                          onClick={() => navigate("/certificate/" + track.id)}
                          className="btn-gold !px-5 !py-2 text-sm"
                        >
                          View certificate →
                        </button>
                      </div>
                    </motion.div>
                  )}
                </section>
              </Reveal>
              );
            })}
          </div>
        </main>
      </PageFade>
    </div>
  );
}

/** Last 14 days of activity as a tiny strip of squares. */
function ActivityStrip({ days, today }: { days: string[]; today: string }) {
  const set = new Set(days);
  const cells: { key: string; on: boolean }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - i);
    const k = d.toISOString().slice(0, 10);
    cells.push({ key: k, on: set.has(k) });
  }
  return (
    <div className="mt-3 flex gap-1" aria-label="Last 14 days of activity">
      {cells.map((c, i) => (
        <motion.span
          key={c.key}
          title={c.key}
          className={
            "h-3 w-3 rounded-[3px] " +
            (c.on ? "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.55)]" : "bg-white/[0.06]")
          }
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.03, type: "spring", stiffness: 400, damping: 22 }}
        />
      ))}
    </div>
  );
}
