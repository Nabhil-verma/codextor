import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  animate,
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { Brain, Infinity as InfinityIcon, ListChecks, ShieldCheck, Sparkles, Zap } from "lucide-react";
import Nav from "../components/Nav";
import TrackCard from "../components/TrackCard";
import QuickSandbox from "../components/QuickSandbox";
import {
  RankFrame,
  RankMedal,
  StreakFlame,
  TitleTag,
} from "../components/gamification/Pieces";
import { resolveAscension } from "../lib/gamification";
import { Marquee, Magnetic, Orb, Reveal, Tilt } from "../components/motion";
import {
  BentoGrid,
  BentoItem,
  CodeLine,
  CyberBadge,
  MinimalGlassCard,
  NeonPulseButton,
  SocraticChatBubble,
  TypingCode,
} from "../components/ui";
import {
  MANIFEST_TRACKS as tracks,
  TOTAL_LESSONS as totalLessonCount,
  findTrackMeta as findTrack,
} from "../data/manifest";
import { scoreFor, useProgressState } from "../lib/progress";
import { useAccount } from "../AccountProvider";

/* ═══════════════════════════════════════════════════════════════
   Real numbers only. Every stat on this page is derived from the
   curriculum that ships in the bundle — nothing is invented.
   ═══════════════════════════════════════════════════════════════ */

const allLessons = tracks.flatMap((t) => t.lessons);
const QUIZ_TOTAL = allLessons.reduce((n, l) => n + l.quizCount, 0);
const HOURS_TOTAL = Math.max(
  1,
  Math.round(allLessons.reduce((n, l) => n + l.minutes, 0) / 60)
);

const marqueeItems = [
  "console.log",
  "React",
  "async/await",
  "TypeScript",
  "Node.js",
  "Algorithms",
  "Tailwind",
  "REST APIs",
  "Git",
  "Docker",
  "PostgreSQL",
  "Python",
  "GraphQL",
  "CI/CD",
  "Testing",
  "Security",
  "Architecture",
  "DSAs",
  "Serverless",
  "Microservices",
];

const headlineWords = ["Judgment", "over", "authorship"];

const HERO_CODE = `const learner = { name: "you", excuses: "none" };
console.log("Hello, free education. 👋");`;

/* ─────────────────────────── small building blocks ─────────────────────────── */

/** Section header: mono index, tight headline, optional lede. Left-aligned. */
function SectionHead({
  index,
  label,
  title,
  lede,
}: {
  index: string;
  label: string;
  title: string;
  lede?: string;
}) {
  return (
    <Reveal>
      <p className="eyebrow flex items-center gap-3">
        <span className="text-ink-400">{index}</span>
        <span className="h-px w-8 bg-white/10" aria-hidden />
        {label}
      </p>
      <h2 className="mt-5 max-w-2xl font-display text-4xl font-bold tracking-tighter text-ink-950 sm:text-5xl">
        {title}
      </h2>
      {lede && <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-600">{lede}</p>}
    </Reveal>
  );
}

/** Number that counts up the first time it scrolls into view. */
function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [count, setN] = useState(0);
  // Reduced motion shows the final number straight away.
  const n = reduce ? to : count;

  useEffect(() => {
    if (reduce) return;
    if (!inView) return;
    const controls = animate(0, to, {
      duration: 1.4,
      ease: [0.25, 1, 0.5, 1],
      onUpdate: (v) => setN(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, to, reduce]);

  return (
    <span ref={ref}>
      {n.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ─────────────────────────── continue / start card ─────────────────────────── */

function ContinueShell({
  to,
  kicker,
  title,
}: {
  to: string;
  kicker: string;
  title: string;
}) {
  return (
    <Reveal className="mx-auto mt-14 max-w-xl">
      <Link
        to={to}
        className="glass glass-edge neon-border group flex items-center gap-5 rounded-2xl px-6 py-5 text-left transition-transform duration-300 ease-snap hover:scale-[1.015] active:scale-[0.985]"
      >
        <CyberBadge tone="cyan" dot pulse>
          {kicker}
        </CyberBadge>
        <span className="min-w-0 flex-1 truncate font-display text-lg font-semibold tracking-tight text-ink-950">
          {title}
        </span>
        <span
          className="font-mono text-sm text-gold-400 transition-transform duration-300 ease-snap group-hover:translate-x-1"
          aria-hidden
        >
          →
        </span>
      </Link>
    </Reveal>
  );
}

function ContinueCard() {
  const { user } = useAccount();
  const progress = useProgressState();

  if (!user) {
    return (
      <ContinueShell
        to="/auth?returnTo=%2Flearn"
        kicker="Free account"
        title="Create one to save your progress"
      />
    );
  }

  for (const track of tracks) {
    for (let i = 0; i < track.lessons.length; i++) {
      const lesson = track.lessons[i];
      if (scoreFor(progress, track.id + "/" + lesson.id) < 1) {
        const first = findTrack(tracks[0].id) === track && i === 0;
        return (
          <ContinueShell
            to={`/learn/${track.id}/${lesson.id}`}
            kicker={first ? "Start here" : "Continue"}
            title={lesson.title}
          />
        );
      }
    }
  }

  return (
    <Reveal className="mx-auto mt-14 max-w-xl">
      <div className="glass glass-edge flex items-center gap-5 rounded-2xl border border-emerald-400/30 px-6 py-5">
        <CyberBadge tone="emerald" dot>
          Complete
        </CyberBadge>
        <span className="flex-1 font-display text-lg font-semibold tracking-tight text-ink-950">
          Every lesson finished — congratulations.
        </span>
      </div>
    </Reveal>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Socratic tutor showcase — a live-looking session. It plays once,
   when it scrolls into view: learner asks, the tutor "analyzes",
   then answers with a QUESTION (it never writes the code for you).
   ═══════════════════════════════════════════════════════════════ */

const SHOWCASE_CODE = [
  "const scores = [3, 5, 8];",
  "const total = scores.reduce((a, b) => a + b, 0);",
  "console.log(totl);",
];
const SHOWCASE_ERROR_LINE = 3;

function SocraticShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-120px" });
  const reduce = useReducedMotion();
  // 0 idle · 1 learner asks · 2 tutor analyzing · 3 tutor answers
  const [stageState, setStage] = useState<0 | 1 | 2 | 3>(0);
  // Reduced motion shows the finished exchange straight away.
  const stage = reduce ? 3 : stageState;

  useEffect(() => {
    if (reduce) return;
    if (!inView) return;
    const timers = [
      setTimeout(() => setStage(1), 350),
      setTimeout(() => setStage(2), 1500),
      setTimeout(() => setStage(3), 3200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [inView, reduce]);

  return (
    <div ref={ref}>
      <MinimalGlassCard
        padded={false}
        neonEdge
        className="overflow-hidden !rounded-[1.75rem]"
      >
        <div className="grid lg:grid-cols-[1.1fr_1fr]">
          {/* ── editor + terminal ── */}
          <div className="flex min-w-0 flex-col border-b border-white/[0.06] lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-1.5" aria-hidden>
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
              </div>
              <span className="font-mono text-[0.7rem] uppercase tracking-widest text-ink-500">
                sum.js
              </span>
              <span className="font-mono text-[0.7rem] text-ink-500">⌘ ↵ run</span>
            </div>

            <div className="bg-[#06060a] py-4 font-mono text-[0.8rem] leading-7">
              {SHOWCASE_CODE.map((line, i) => {
                const n = i + 1;
                const bad = n === SHOWCASE_ERROR_LINE;
                return (
                  <div
                    key={n}
                    className={
                      "flex border-l-2 px-5 " +
                      (bad
                        ? "border-rose-400 bg-rose-500/[0.09] shadow-[inset_0_0_30px_-12px_rgba(244,63,94,0.35)]"
                        : "border-transparent")
                    }
                  >
                    <span
                      aria-hidden
                      className={
                        "w-7 shrink-0 select-none text-right pr-4 " +
                        (bad ? "text-rose-300" : "text-[#6b6e82]")
                      }
                    >
                      {n}
                    </span>
                    <span className="min-w-0 whitespace-pre-wrap break-words">
                      <CodeLine text={line} />
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="bg-black px-5 py-4 font-mono text-[0.78rem] leading-6">
              <p className="text-[0.62rem] uppercase tracking-[0.22em] text-[#6b6e82]">
                terminal
              </p>
              <p className="mt-2 text-rose-300">
                ✗ ReferenceError: totl is not defined
              </p>
              <p className="text-[#6b6e82]">&nbsp;&nbsp;at sum.js:3</p>
            </div>
          </div>

          {/* ── socratic drawer ── */}
          <div className="flex min-h-[22rem] flex-col">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
              <p className="flex items-center gap-2 font-display text-sm font-semibold tracking-tight text-ink-950">
                <Sparkles className="h-4 w-4 text-violet-300" aria-hidden />
                Socratic Tutor
              </p>
              <CyberBadge tone={stage === 2 ? "violet" : "emerald"} dot pulse={stage === 2}>
                {stage === 2 ? "analyzing" : "asks, never tells"}
              </CyberBadge>
            </div>

            <div
              className="flex flex-1 flex-col justify-end gap-4 p-5"
              aria-live="polite"
              aria-label="Example tutor conversation"
            >
              {stage === 0 && (
                <p className="py-10 text-center font-mono text-xs text-ink-500">
                  stuck on your code? ask for a hint.
                </p>
              )}
              {stage >= 1 && (
                <SocraticChatBubble role="user">I'm stuck, can you help?</SocraticChatBubble>
              )}
              {stage === 2 && (
                <SocraticChatBubble role="ai" analyzing>
                  {null}
                </SocraticChatBubble>
              )}
              {stage === 3 && (
                <SocraticChatBubble
                  role="ai"
                  chips={["I don't understand the error", "How should I think about this?"]}
                >
                  Look at line 3 — which name is it printing, and where did you first create
                  that name?
                </SocraticChatBubble>
              )}
            </div>

            <div className="border-t border-white/[0.06] px-5 py-3.5">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 font-mono text-xs text-ink-500">
                Ask a question about your code…
              </div>
            </div>
          </div>
        </div>
      </MinimalGlassCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   The game layer pitch: a live-looking board next to the four
   mechanics that make finishing lessons addictive.
   ═══════════════════════════════════════════════════════════════ */

const GAME_PILLARS = [
  {
    icon: "🏆",
    title: "Dynamic leaderboards",
    text: "Weekly, monthly and all-time brackets. A learner who starts today can still take the crown — and your own row glows while you watch the board reorder live.",
  },
  {
    icon: "🔥",
    title: "Quests & streaks",
    text: "Every module becomes a daily quest. Show up two days running and each day pays a consistency bonus on top of the lesson XP.",
  },
  {
    icon: "✨",
    title: "RPG ascension",
    text: "Seven ascension tiers unlock gradient avatar frames, animated avatars and rare titles you can equip and show off on the board.",
  },
  {
    icon: "⚔",
    title: "Guilds & social play",
    text: "Form a guild of up to 25 and pool your XP. Collective rewards unlock as the banner climbs the guild board.",
  },
];

const MOCK_ROWS = [
  { rank: 1, name: "Ada N.", xp: 4820, level: 20, ascension: "mythic", title: "mythic", streak: 41 },
  { rank: 2, name: "Lin O.", xp: 3960, level: 17, ascension: "ascendant", title: "architect", streak: 22 },
  { rank: 3, name: "You", xp: 1240, level: 6, ascension: "veteran", title: "bugslayer", streak: 9, isMe: true },
  { rank: 4, name: "Sam R.", xp: 980, level: 5, ascension: "adept", title: "cadet", streak: 3 },
];

function GameLayer() {
  return (
    <section className="relative overflow-hidden py-24">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="fx-glow absolute left-[-10%] top-[20%] h-[28rem] w-[28rem] rounded-full bg-violet-600/20 blur-[140px]" />
        <div className="fx-glow absolute bottom-[0%] right-[-8%] h-[24rem] w-[24rem] rounded-full bg-cyan-400/10 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4">
        <SectionHead
          index="04"
          label="the game layer"
          title="A curriculum that plays like a game"
          lede="Same lessons. Same code. But now every completion moves a number you care about, against people who are trying as hard as you are."
        />

        <div className="mt-20 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14">
          {/* Pillars — no boxes, just rhythm and hairlines */}
          <div role="list">
            {GAME_PILLARS.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.07}>
                <div role="listitem" className="flex gap-5 border-t border-white/[0.06] py-7 first:border-t-0 first:pt-0">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-xl"
                    aria-hidden
                  >
                    {p.icon}
                  </span>
                  <div>
                    <h3 className="font-display text-xl font-semibold tracking-tight text-ink-950">
                      {p.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-600">{p.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Board preview */}
          <Reveal delay={0.15}>
            <Tilt max={5} scale={1.01}>
              <div className="dark-canvas neon-border glass-edge-dark noise-overlay relative overflow-hidden rounded-3xl p-6">
                <div className="relative flex items-center justify-between">
                  <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-gold-400">
                    global · this week
                  </p>
                  <CyberBadge tone="emerald" dot pulse>
                    live
                  </CyberBadge>
                </div>

                <ul className="relative mt-5 space-y-2">
                  {MOCK_ROWS.map((row, i) => {
                    const tier = resolveAscension(row.ascension, row.level);
                    return (
                      <motion.li
                        key={row.name}
                        initial={{ opacity: 0, x: 24 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ type: "spring", stiffness: 400, damping: 30, delay: 0.2 + i * 0.09 }}
                        className={
                          "flex items-center gap-3 rounded-xl border px-3 py-2.5 " +
                          (row.isMe
                            ? "border-gold-400/50 bg-gold-400/[0.08] shadow-glow"
                            : "border-white/[0.06] bg-white/[0.02]")
                        }
                      >
                        <RankMedal rank={row.rank} />
                        <RankFrame
                          name={row.name}
                          level={row.level}
                          ascension={row.ascension}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-sm font-semibold text-paper-50">
                            {row.name}
                            {row.isMe && (
                              <span className="ml-2 rounded-full bg-gold-400 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-widest text-[#030305]">
                                you
                              </span>
                            )}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <TitleTag title={row.title} tier={tier} />
                            <span className="font-mono text-[9px] uppercase tracking-widest text-paper-300/50">
                              {tier.name}
                            </span>
                          </div>
                        </div>
                        <StreakFlame days={row.streak} />
                        <span className="font-mono text-sm font-bold text-paper-50">
                          <span className="text-gold-400">✦</span> {row.xp.toLocaleString()}
                        </span>
                      </motion.li>
                    );
                  })}
                </ul>

                <div className="relative mt-5 flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                  <div>
                    <p className="font-mono text-[0.66rem] uppercase tracking-[0.22em] text-gold-400">
                      daily quests
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-paper-300/80">
                      First Blood ✓ · Triple Threat 2/3 · Flawless Run ✓
                    </p>
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-300">+285 xp</span>
                </div>
              </div>
            </Tilt>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="mt-16 flex flex-wrap items-center gap-4">
            <Magnetic>
              <NeonPulseButton to="/leaderboard" size="lg">
                Open the leaderboard
              </NeonPulseButton>
            </Magnetic>
            <NeonPulseButton to="/clans" variant="glass" size="lg" trailingIcon={false}>
              Found a guild
            </NeonPulseButton>
            <NeonPulseButton to="/ascent" variant="glass" size="lg" trailingIcon={false}>
              See the ascent
            </NeonPulseButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Landing
   ═══════════════════════════════════════════════════════════════ */

export default function Landing() {
  /*
   * Scroll-driven hero exit. The raw scroll position is spiky (trackpads,
   * momentum), so it's sprung first — the fade glides instead of snapping.
   * Only opacity + translate animate; scaling text forced a full repaint.
   */
  const { scrollY } = useScroll();
  const smoothScroll = useSpring(scrollY, {
    stiffness: 140,
    damping: 30,
    mass: 0.35,
    restDelta: 0.5,
  });
  const reduceMotion = useReducedMotion();
  const heroOpacity = useTransform(smoothScroll, [0, 520], [1, 0]);
  const heroY = useTransform(smoothScroll, [0, 520], [0, 64]);
  const gridScroll = useTransform(smoothScroll, [0, 700], [0, 120]);

  const stats = [
    { value: tracks.length, label: "tracks", suffix: "" },
    { value: totalLessonCount, label: "hands-on lessons", suffix: "" },
    { value: QUIZ_TOTAL, label: "quiz questions", suffix: "" },
    { value: HOURS_TOTAL, label: "hours of material", suffix: "h" },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        {/* Ambient light — low opacity so the black stays black */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="fx-glow absolute left-[8%] top-[-6rem] h-[30rem] w-[30rem] rounded-full bg-cyan-400/20 opacity-60 blur-[150px]" />
          <div className="fx-glow absolute right-[2%] top-[8rem] h-[26rem] w-[26rem] rounded-full bg-violet-600/20 opacity-70 blur-[150px]" />
          <motion.div
            className="grid-floor absolute inset-x-0 bottom-0 h-[42%] opacity-[0.07]"
            style={reduceMotion ? undefined : { y: gridScroll }}
          />
        </div>

        <motion.div
          className="relative mx-auto max-w-6xl px-4 pb-28 pt-24 text-center sm:pb-36 sm:pt-40"
          style={reduceMotion ? undefined : { opacity: heroOpacity, y: heroY }}
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center"
          >
            <CyberBadge tone="cyan" dot pulse>
              beta · free forever
            </CyberBadge>
          </motion.div>

          {/* Kinetic headline — words resolve out of blur, one by one */}
          <h1
            className="mx-auto mt-10 max-w-5xl text-balance font-display text-[2.9rem] font-bold leading-[0.98] tracking-tighter text-ink-950 sm:text-7xl lg:text-[6.5rem]"
            aria-label="Judgment over authorship"
          >
            {headlineWords.map((w, i) => (
              <motion.span
                key={i}
                aria-hidden
                className="mr-[0.22em] inline-block will-change-transform"
                initial={reduceMotion ? false : { opacity: 0, y: 44, filter: "blur(14px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{
                  duration: reduceMotion ? 0 : 0.8,
                  delay: reduceMotion ? 0 : 0.1 + i * 0.075,
                  ease: [0.25, 1, 0.5, 1],
                }}
              >
                {i === 0 ? <span className="gradient-text">{w}</span> : w}
              </motion.span>
            ))}
          </h1>

          <motion.p
            className="mx-auto mt-10 max-w-xl text-lg leading-relaxed text-ink-600"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7 }}
          >
            Direct the agent. Challenge the draft. Prove what ships.
            A free browser school for agentic engineering: spec → context → plan → delegate → verify → operate.
          </motion.p>

          <motion.div
            className="mt-12 flex flex-wrap items-center justify-center gap-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.85 }}
          >
            <Magnetic>
              <NeonPulseButton to="/auth?returnTo=%2Flearn" size="lg">
                Start learning free
              </NeonPulseButton>
            </Magnetic>
            <NeonPulseButton
              to="/auth?returnTo=%2Flearn"
              variant="glass"
              size="lg"
              trailingIcon={false}
            >
              I already have an account
            </NeonPulseButton>
          </motion.div>
          <motion.p
            className="mt-6 font-mono text-[0.7rem] uppercase tracking-[0.22em] text-ink-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.05 }}
          >
            free forever · takes 10 seconds
          </motion.p>

          {/* Floating code window — types itself, then runs */}
          <motion.div
            className="relative mx-auto mt-24 max-w-2xl"
            initial={{ opacity: 0, y: 70, rotateX: 14 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 1, delay: 0.95, ease: [0.25, 1, 0.5, 1] }}
            style={{ transformPerspective: 1100 }}
          >
            <div
              className="fx-glow pointer-events-none absolute -inset-x-8 -inset-y-6 rounded-[3rem] bg-gradient-to-r from-cyan-400/20 via-violet-500/20 to-cyan-400/20 opacity-60 blur-3xl"
              aria-hidden
            />
            <Tilt max={6} scale={1.012}>
              <div className="code-window neon-border relative !rounded-2xl text-left">
                <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3.5">
                  <div className="flex items-center gap-1.5" aria-hidden>
                    <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                    <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                    <span className="h-2.5 w-2.5 rounded-full bg-gold-400 shadow-[0_0_10px_rgba(0,229,255,0.8)]" />
                  </div>
                  <span className="font-mono text-[0.7rem] uppercase tracking-widest text-ink-400">
                    lesson-01.js
                  </span>
                  <span className="font-mono text-[0.7rem] text-ink-400">⌘ ↵ run</span>
                </div>
                <div className="p-6 pb-7">
                  <TypingCode
                    code={HERO_CODE}
                    output="Hello, free education. 👋"
                    startDelay={1500}
                  />
                </div>
              </div>
            </Tilt>
          </motion.div>

          <ContinueCard />
        </motion.div>
      </section>

      {/* ─── Real stats + topic marquee ─── */}
      <section className="relative mx-auto max-w-6xl px-4">
        <MinimalGlassCard padded={false} className="overflow-hidden">
          <dl className="grid grid-cols-2 divide-white/[0.06] md:grid-cols-4 md:divide-x">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={
                  "px-8 py-9 " +
                  (i < 2 ? "border-b border-white/[0.06] md:border-b-0" : "") +
                  (i % 2 === 0 ? " border-r border-white/[0.06] md:border-r-0" : "")
                }
              >
                <dd className="font-mono text-4xl font-bold tracking-tighter text-ink-950 sm:text-5xl">
                  <CountUp to={s.value} suffix={s.suffix} />
                </dd>
                <dt className="mt-3 font-mono text-[0.68rem] uppercase tracking-[0.22em] text-ink-500">
                  {s.label}
                </dt>
              </div>
            ))}
          </dl>
          <div className="border-t border-white/[0.06] py-4">
            <Marquee speed={42} fadeColor="rgb(var(--paper-50))">
              {marqueeItems.map((item, i) => (
                <span
                  key={i}
                  className="mx-6 flex shrink-0 items-center gap-3 font-mono text-xs uppercase tracking-widest text-ink-500"
                >
                  <span className="h-1 w-1 rounded-full bg-gold-400/60" />
                  {item}
                </span>
              ))}
            </Marquee>
          </div>
        </MinimalGlassCard>
      </section>

      {/* ─── Try-it sandbox ─── */}
      <section className="mx-auto max-w-6xl px-4 py-32">
        <SectionHead
          index="01"
          label="try it right now"
          title="No signup. Just run code."
          lede="Edit the code below and press Run. This is exactly what every lesson feels like."
        />
        <Reveal className="mx-auto mt-16 max-w-3xl" delay={0.1}>
          <Tilt max={3} scale={1.006}>
            <div className="neon-border rounded-2xl">
              <QuickSandbox />
            </div>
          </Tilt>
        </Reveal>
      </section>

      {/* ─── Features bento ─── */}
      <section className="mx-auto max-w-6xl px-4 pb-32">
        <SectionHead
          index="02"
          label="why it works"
          title="Built like a game. Teaches like a mentor."
        />
        <BentoGrid className="mt-16 md:grid-rows-[auto_auto_auto]">
          <BentoItem span="md:col-span-2 md:row-span-2" index={0} className="!p-10">
            <div className="flex h-full flex-col">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/[0.07] text-cyan-300">
                <Zap className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-8 font-display text-3xl font-bold tracking-tighter text-ink-950">
                Learn by running real code
              </h3>
              <p className="mt-4 max-w-md leading-relaxed text-ink-600">
                Every lesson ships with a live editor and console. No videos — you write
                JavaScript from minute one.
              </p>
              <div className="mt-auto pt-10">
                <div className="rounded-2xl border border-white/[0.07] bg-[#06060a] p-5 font-mono text-[0.78rem] leading-7">
                  <p className="text-[#7c7f93]">// no videos. just you and the console.</p>
                  <p>
                    <CodeLine text={"const double = (n) => n * 2;"} />
                  </p>
                  <p>
                    <CodeLine text={"console.log(double(21));"} />
                  </p>
                  <p className="mt-1 border-l-2 border-emerald-400/50 pl-3 text-emerald-300">
                    <span className="mr-2 text-[#7c7f93]">→</span>42
                  </p>
                </div>
              </div>
            </div>
          </BentoItem>

          <BentoItem span="md:col-span-2" index={1}>
            <div className="flex h-full flex-col justify-between gap-8 sm:flex-row sm:items-center">
              <div>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-400/[0.08] text-violet-300">
                  <Brain className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-6 font-display text-2xl font-bold tracking-tighter text-ink-950">
                  A Socratic tutor
                </h3>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-600">
                  Stuck? It asks the question that unsticks you — and never writes your
                  code. Optional: bring your own Gemini or Claude key.
                </p>
              </div>
              <div className="shrink-0 rounded-2xl border border-violet-400/20 bg-violet-500/[0.07] px-4 py-3 text-sm text-ink-800 shadow-[0_0_30px_-10px_rgba(139,92,246,0.4)] sm:max-w-[13rem]">
                What did you expect line 3 to print?
              </div>
            </div>
          </BentoItem>

          <BentoItem index={2}>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="mt-6 font-display text-xl font-bold tracking-tighter text-ink-950">
              Exercises that verify themselves
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              Each lesson checks your output automatically, so you always know whether you
              actually got it.
            </p>
          </BentoItem>

          <BentoItem index={3}>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/[0.08] text-amber-300">
              <ListChecks className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="mt-6 font-display text-xl font-bold tracking-tighter text-ink-950">
              Quizzes that lock it in
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              Short quizzes with explanations at the end of every lesson. Score 100% to
              mark it complete.
            </p>
          </BentoItem>

          <BentoItem span="md:col-span-4" index={4} className="!py-7">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-ink-800">
                  <InfinityIcon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h3 className="font-display text-xl font-bold tracking-tighter text-ink-950">
                    100% free, forever
                  </h3>
                  <p className="mt-1 text-sm text-ink-600">
                    One free account keeps every score, streak, and badge — no paywall, no
                    ads, no catch.
                  </p>
                </div>
              </div>
              <CyberBadge tone="emerald" dot>
                $0 · no card
              </CyberBadge>
            </div>
          </BentoItem>
        </BentoGrid>
      </section>

      {/* ─── Socratic tutor showcase ─── */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <SectionHead
          index="03"
          label="the socratic tutor"
          title="It asks. You figure it out."
          lede="Run into an error and the tutor reads your code and your console — then replies with a question, never the answer."
        />
        <div className="mt-16">
          <SocraticShowcase />
        </div>
      </section>

      {/* ─── Gamification showcase ─── */}
      <GameLayer />

      {/* ─── Curriculum ─── */}
      <section className="mx-auto max-w-6xl px-4 py-32" id="tracks-section">
        <div id="tracks" className="scroll-mt-20">
          <SectionHead
            index="05"
            label="the curriculum"
            title={`${tracks.length} tracks · ${totalLessonCount} hands-on lessons`}
            lede="Start with foundations, then direct agents through specs, plans, verification and operation. Judgment is practiced, not assumed."
          />
        </div>
        <div
          className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3"
          style={{ perspective: "1200px" }}
        >
          {tracks.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 30,
                delay: Math.min((i % 3) * 0.08, 0.24),
              }}
            >
              <TrackCard track={t} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="mx-auto max-w-6xl px-4 pb-32">
        <Reveal>
          <div className="dark-canvas neon-border glass-edge-dark noise-overlay relative overflow-hidden rounded-[2rem] px-8 py-24 text-center sm:px-14">
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              <Orb className="-right-16 -top-16 bg-cyan-400/20" size={320} duration={13} />
              <Orb className="-bottom-12 -left-12 bg-violet-500/20" size={260} duration={17} delay={2} />
            </div>
            <div className="relative z-10">
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.22em] text-gold-400">
                No excuses left
              </p>
              <h2 className="mx-auto mt-6 max-w-xl font-display text-4xl font-bold tracking-tighter text-paper-50 sm:text-6xl">
                Ready to write your first line?
              </h2>
              <p className="mx-auto mt-6 max-w-md text-paper-300/80">
                It takes about five minutes to finish your first lesson. That's it.
                That's the pitch.
              </p>
              <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
                <Magnetic>
                  <NeonPulseButton to="/auth?returnTo=%2Flearn" size="lg">
                    Create your free account
                  </NeonPulseButton>
                </Magnetic>
                <NeonPulseButton
                  to="/auth?returnTo=%2Flearn"
                  variant="glass"
                  size="lg"
                  trailingIcon={false}
                  className="!text-paper-50"
                >
                  Sign in
                </NeonPulseButton>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-white/[0.06] py-10 text-center font-mono text-[0.7rem] uppercase tracking-[0.22em] text-ink-500">
        Codextor · a 100% free code teacher · built with ♥ and zero dollars
      </footer>
    </div>
  );
}
