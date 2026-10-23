import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { finishedTracks, levelFor, totalXp } from "../../lib/gamification";
import { useProgressState } from "../../lib/progress";
import { useReviewDays } from "../../lib/reviewStore";
import {
  initializeCeremony,
  markCeremonySeen,
  pendingCeremonies,
  useCeremonySeen,
  type CeremonyEvent,
} from "../../lib/ceremony";

/* ═══════════════════════════════════════════════════════════════
   Completion ceremony — the one moment the app stops and looks at
   what the learner just did: a new ascension tier, or a finished
   track. It fires once per achievement, dismisses with Escape or
   the button, and hands the next one in the queue if there is one.
   ═══════════════════════════════════════════════════════════════ */

export default function Ceremony() {
  const progress = useProgressState();
  const reviewDays = useReviewDays();
  const seen = useCeremonySeen();
  const dismissRef = useRef<HTMLButtonElement | null>(null);
  /* Dismissing writes to the store; the ref keeps this render correct even if
     storage refused the write (private mode), so nothing loops forever. */
  const dismissed = useRef<Set<string>>(new Set());
  const [, bump] = useState(0);

  const level = levelFor(totalXp(progress, reviewDays)).level;
  const finished = useMemo(() => finishedTracks(progress), [progress]);
  const started = Object.keys(progress.completed).length > 0;

  /*
   * First run: absorb the history that predates this feature so a returning
   * learner is not congratulated for last month's work.
   */
  useEffect(() => {
    if (seen.initialized || !started) return;
    initializeCeremony(level, finished.map((t) => t.id));
  }, [seen.initialized, started, level, finished]);

  const pending = useMemo(
    () =>
      seen.initialized
        ? pendingCeremonies(
            seen,
            level,
            finished.map((t) => ({ id: t.id, title: t.title }))
          )
        : [],
    [seen, level, finished]
  );

  const event: CeremonyEvent | null = pending.find((e) => !dismissed.current.has(e.id)) ?? null;

  useEffect(() => {
    if (!event) return;
    dismissRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [event]);

  function dismiss() {
    if (!event) return;
    dismissed.current.add(event.id);
    markCeremonySeen(event);
    bump((n) => n + 1);
  }

  if (!event) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/70 px-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={event.kind === "tier" ? "New ascension tier" : "Track complete"}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="glass glass-edge w-full max-w-md overflow-hidden rounded-3xl border border-paper-200/70 p-8 text-center"
      >
        <p className="eyebrow">{event.kind === "tier" ? "ascension" : "track complete"}</p>
        <p className="mt-4 font-display text-2xl font-bold tracking-tighter text-ink-950">
          {event.title}
        </p>
        <p className="mt-3 text-sm text-ink-600">{event.detail}</p>

        {event.tier && (
          <div
            aria-hidden
            className={"mx-auto mt-6 h-20 w-20 rounded-full bg-gradient-to-br " + event.tier.frame}
          />
        )}

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button
            ref={dismissRef}
            type="button"
            onClick={dismiss}
            className="rounded-full border border-gold-400/50 bg-gold-400/10 px-5 py-2 font-mono text-xs font-bold uppercase tracking-widest text-gold-700 transition hover:bg-gold-400/20"
          >
            {pending.length > 1 ? "next" : "keep going"}
          </button>
          <Link
            to="/ascent"
            onClick={dismiss}
            className="font-mono text-[10px] uppercase tracking-widest text-ink-500 underline"
          >
            see the ladder
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
