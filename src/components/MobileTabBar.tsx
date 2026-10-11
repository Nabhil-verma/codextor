import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Code2, Search, Swords, Trophy, UserRound } from "lucide-react";
import { useAccount } from "../AccountProvider";
import { useIsMobile } from "../lib/useMediaQuery";
import { openPalette } from "../lib/paletteBus";

/*
 * The phone shell's primary navigation: a fixed bottom bar, thumb-reachable,
 * the way a native app navigates. It replaces the desktop nav row for signed-in
 * phones (the top strip stays as a scrollable secondary nav).
 */
const tabs = [
  {
    to: "/learn",
    label: "Lessons",
    icon: BookOpen,
    match: (p: string) => p.startsWith("/learn"),
  },
  {
    to: "/playground",
    label: "Playground",
    icon: Code2,
    match: (p: string) => p.startsWith("/playground"),
  },
  {
    to: "/clans",
    label: "Guilds",
    icon: Swords,
    match: (p: string) => p.startsWith("/clans"),
  },
  {
    to: "/leaderboard",
    label: "Board",
    icon: Trophy,
    match: (p: string) => p.startsWith("/leaderboard"),
  },
  {
    to: "/portfolio",
    label: "Profile",
    icon: UserRound,
    match: (p: string) => p.startsWith("/portfolio"),
  },
];

export default function MobileTabBar() {
  const { user, authReady } = useAccount();
  const { pathname } = useLocation();
  const mobile = useIsMobile();
  const visible = mobile && authReady && !!user;

  /*
   * Tag <html> while the bar is on screen so CSS can reserve scroll room at
   * the bottom of every page — otherwise the bar covers the last row.
   */
  // The palette is an action, so it renders as a button between the
  // destinations rather than a link.
  const withSearch = [...tabs.slice(0, 1), null, ...tabs.slice(1)];

  useEffect(() => {
    if (!visible) return;
    const root = document.documentElement;
    root.classList.add("has-tabbar");
    return () => root.classList.remove("has-tabbar");
  }, [visible]);

  if (!visible) return null;

  return (
    <motion.nav
      aria-label="Mobile navigation"
      className="glass fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.07] pb-[env(safe-area-inset-bottom)] print:hidden md:hidden"
      initial={{ y: 96, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {withSearch.map((tab, index) => {
          if (!tab) {
            return (
              <li key="search" className="flex-1">
                <button
                  type="button"
                  onClick={openPalette}
                  aria-label="Search lessons and commands"
                  className="relative flex w-full flex-col items-center gap-0.5 rounded-2xl px-1 py-2.5"
                >
                  <Search className="h-5 w-5 text-ink-500" aria-hidden />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-ink-500">
                    Search
                  </span>
                </button>
              </li>
            );
          }
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.to ?? index} className="flex-1">
              <Link
                to={tab.to}
                aria-current={active ? "page" : undefined}
                className="relative flex flex-col items-center gap-0.5 rounded-2xl px-1 py-2.5"
              >
                {active && (
                  <motion.span
                    layoutId="mobile-tab-pill"
                    className="absolute inset-x-2 inset-y-1 rounded-2xl border border-gold-400/20 bg-gold-400/10 shadow-[0_0_20px_-6px_rgba(0,229,255,0.4)]"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    aria-hidden
                  />
                )}
                <Icon
                  className={
                    "relative h-5 w-5 transition-colors " +
                    (active ? "text-gold-600" : "text-ink-500")
                  }
                  strokeWidth={active ? 2.4 : 2}
                  aria-hidden
                />
                <span
                  className={
                    "relative font-mono text-[10px] uppercase tracking-widest transition-colors " +
                    (active ? "font-bold text-ink-950" : "text-ink-500")
                  }
                >
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </motion.nav>
  );
}
