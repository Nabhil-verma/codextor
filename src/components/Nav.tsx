import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useScroll, useMotionValueEvent } from "framer-motion";
import { Settings } from "lucide-react";
import { useAccount } from "../AccountProvider";
import BrandLogo from "./BrandLogo";
import AiSettingsModal from "./AiSettingsModal";
import ThemeToggle from "./ThemeToggle";
import MobileTabBar from "./MobileTabBar";
import { lessonIdOf, useProgressState } from "../lib/progress";
import { useThemeStyle } from "../lib/theme";
import { totalLessonCount } from "../data";

const syncLabel: Record<string, string> = {
  idle: "local only",
  syncing: "syncing…",
  synced: "synced",
  error: "sync error",
};

const syncDot: Record<string, string> = {
  idle: "bg-ink-400",
  syncing: "bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]",
  synced: "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]",
  error: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]",
};

/*
 * Every destination lives in the bar at every width now — on phones the strip
 * scrolls horizontally instead of hiding entries, and the thumb-sized
 * MobileTabBar below carries the five most-used ones.
 */
const links = [
  { to: "/learn", label: "Lessons", active: (p: string) => p.startsWith("/learn") },
  { to: "/playground", label: "Playground", active: (p: string) => p.startsWith("/playground") },
  { to: "/projects", label: "Projects", active: (p: string) => p.startsWith("/projects") },
  { to: "/leaderboard", label: "Leaderboard", active: (p: string) => p.startsWith("/leaderboard") },
  { to: "/clans", label: "Guilds", active: (p: string) => p.startsWith("/clans") },
  { to: "/portfolio", label: "Profile", active: (p: string) => p.startsWith("/portfolio") },
];

export default function Nav() {
  const progress = useProgressState();
  const [menuOpen, setMenuOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { user, authReady, sync, signOutUser, resetEverything } = useAccount();
  // Keeps `.style-minimal` on <html> in sync on every page (Nav is global).
  const { style: themeStyle, setStyle: setThemeStyle } = useThemeStyle();

  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 12));

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const done = new Set(
    Object.keys(progress.completed)
      .filter((k) => (progress.completed[k] ?? 0) >= 1)
      .map(lessonIdOf)
  ).size;

  return (
    <>
    <motion.header
      className={
        "sticky top-0 z-40 border-b transition-all duration-500 ease-snap " +
        (scrolled
          ? "glass border-white/[0.07] shadow-[0_10px_40px_-16px_rgba(0,0,0,0.6)]"
          : "glass border-transparent")
      }
      initial={{ y: -64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 px-4 md:h-16 md:flex-nowrap">
        <Link to="/" className="group flex h-14 shrink-0 items-center gap-2.5 md:h-16">
          {/* The mark swaps between glass/minimal × light/dark purely through
              the classes on <html> — no prop, no branch. See BrandLogo. */}
          <BrandLogo />
        </Link>

        <div className="flex h-14 shrink-0 items-center gap-1.5 md:order-last md:h-16">
          <ThemeToggle />

          <button
            type="button"
            onClick={() => setAiOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-paper-200/70 text-ink-600 transition-all duration-300 ease-snap hover:scale-105 hover:border-gold-400/50 hover:text-gold-600 hover:shadow-glow active:scale-95"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" aria-hidden />
          </button>

          {authReady &&
            (user ? (
              <div ref={menuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-full border border-paper-200/70 bg-white/[0.03] py-1.5 pl-3 pr-2 transition-all duration-300 ease-snap hover:border-gold-400/50 hover:shadow-glow active:scale-[0.97]"
                  aria-label="Account menu"
                >
                  <span className="hidden max-w-[140px] truncate text-xs font-medium text-ink-800 md:block">
                    {user.displayName || user.email}
                  </span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 font-display text-xs font-bold text-[#030305]">
                    {(user.displayName || user.email || "?").charAt(0).toUpperCase()}
                  </span>
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      className="glass glass-edge absolute right-0 top-11 w-64 rounded-2xl border border-white/10 p-2 shadow-lift"
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      style={{ transformOrigin: "top right" }}
                    >
                      <div className="px-3 pb-2 pt-2">
                        <p className="truncate text-sm font-semibold text-ink-950">
                          {user.displayName || "Learner"}
                        </p>
                        <p className="truncate font-mono text-xs text-ink-600">{user.email}</p>
                        <p className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-ink-600">
                          <span className={"h-1.5 w-1.5 rounded-full " + syncDot[sync]} />
                          {syncLabel[sync]}
                        </p>
                      </div>
                      <div className="my-1 h-px bg-white/[0.06]" />
                      <button
                        type="button"
                        className="w-full rounded-xl px-3 py-2 text-left text-sm text-ink-800 transition hover:bg-white/[0.06]"
                        onClick={async () => {
                          setMenuOpen(false);
                          if (confirm("Reset progress everywhere? This clears your saved scores on this device and in your account.")) {
                            await resetEverything();
                            window.location.reload();
                          }
                        }}
                      >
                        Reset progress
                      </button>
                      <button
                        type="button"
                        className="w-full rounded-xl px-3 py-2 text-left text-sm text-ink-800 transition hover:bg-white/[0.06]"
                        onClick={async () => {
                          setMenuOpen(false);
                          await signOutUser();
                        }}
                      >
                        Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                to={`/auth?returnTo=${encodeURIComponent(location.pathname + location.search)}`}
                className="btn-gold !px-4 !py-1.5 !text-sm"
              >
                Sign in
              </Link>
            ))}
        </div>

        {/* On phones this wraps to its own full-bleed row and scrolls sideways;
            from md up it slots back between the brand and the actions — still
            scrollable in that middle slot, because six links plus the progress
            pill overflow a 768px viewport. */}
        <nav
          aria-label="Main"
          className="no-scrollbar order-last -mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 pb-2.5 text-sm md:order-none md:mx-0 md:w-auto md:min-w-0 md:flex-1 md:pb-0"
        >
          <div className="flex items-center gap-1.5 md:ml-auto">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={
                  "relative shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 font-medium transition-colors duration-300 " +
                  (l.active(location.pathname)
                    ? "text-ink-950"
                    : "text-ink-600 hover:text-ink-950")
                }
              >
                {l.active(location.pathname) && (
                  <motion.span
                    layoutId="nav-pill"
                    className="nav-pill absolute inset-0 rounded-full border border-white/10 bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_24px_-6px_rgba(0,229,255,0.35)]"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{l.label}</span>
              </Link>
            ))}

            <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-paper-200/70 bg-white/[0.03] px-3 py-1.5 font-mono text-[0.7rem] uppercase tracking-widest text-ink-500 sm:flex">
              <span className="font-bold text-gold-400">{done}</span>/{totalLessonCount} done
            </span>
          </div>
        </nav>
      </div>
    </motion.header>
    {/* Rendered outside the header on purpose: the header animates (transform)
        and a transformed ancestor becomes the containing block for
        `position: fixed`, which clipped the modal to the header's height. */}
    {aiOpen && (
      <AiSettingsModal
        onClose={() => setAiOpen(false)}
        themeStyle={themeStyle}
        onThemeStyle={setThemeStyle}
      />
    )}
    <MobileTabBar />
    </>
  );
}
