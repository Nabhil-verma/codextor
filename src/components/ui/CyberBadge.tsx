import type { ReactNode } from "react";

export type BadgeTone =
  | "cyan"
  | "violet"
  | "emerald"
  | "amber"
  | "rose"
  | "neutral";

export interface CyberBadgeProps {
  tone?: BadgeTone;
  /** Leading status dot. */
  dot?: boolean;
  /** Dot pulses (live / active states). */
  pulse?: boolean;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}

const TONE: Record<BadgeTone, { pill: string; dot: string }> = {
  cyan: {
    pill: "border-cyan-400/25 bg-cyan-400/[0.07] text-cyan-300",
    dot: "bg-cyan-400",
  },
  violet: {
    pill: "border-violet-400/25 bg-violet-400/[0.08] text-violet-300",
    dot: "bg-violet-400",
  },
  emerald: {
    pill: "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300",
    dot: "bg-emerald-400",
  },
  amber: {
    pill: "border-amber-400/25 bg-amber-400/[0.08] text-amber-300",
    dot: "bg-amber-400",
  },
  rose: {
    pill: "border-rose-400/25 bg-rose-400/[0.08] text-rose-300",
    dot: "bg-rose-400",
  },
  neutral: {
    pill: "border-white/10 bg-white/[0.04] text-ink-600",
    dot: "bg-ink-500",
  },
};

/** Monospaced status pill — levels, XP, tags, live indicators. */
export default function CyberBadge({
  tone = "neutral",
  dot = false,
  pulse = false,
  icon,
  className = "",
  children,
}: CyberBadgeProps) {
  const t = TONE[tone];
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[0.68rem] font-medium uppercase tracking-widest " +
        t.pill +
        (className ? " " + className : "")
      }
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5" aria-hidden>
          {pulse && (
            <span
              className={
                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 " +
                t.dot
              }
            />
          )}
          <span className={"relative inline-flex h-1.5 w-1.5 rounded-full " + t.dot} />
        </span>
      )}
      {icon}
      {children}
    </span>
  );
}
