import type { ReactNode } from "react";
import { motion } from "framer-motion";

export type ProgressTone = "cyan" | "emerald" | "amber" | "violet";

const BAR: Record<ProgressTone, string> = {
  cyan: "from-cyan-500 to-cyan-300 shadow-[0_0_14px_rgba(0,229,255,0.5)]",
  emerald: "from-emerald-500 to-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.5)]",
  amber: "from-amber-500 to-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.5)]",
  violet: "from-violet-500 to-fuchsia-400 shadow-[0_0_14px_rgba(139,92,246,0.5)]",
};

const RING: Record<ProgressTone, string> = {
  cyan: "#00E5FF",
  emerald: "#10B981",
  amber: "#F59E0B",
  violet: "#A855F7",
};

const clamp = (n: number) => Math.min(100, Math.max(0, Number.isFinite(n) ? n : 0));

export interface PrecisionProgressBarProps {
  /** 0–100. */
  value: number;
  tone?: ProgressTone;
  /** Accessible name; also shown as the left label when `showLabel`. */
  label: string;
  showLabel?: boolean;
  /** Right-hand readout, e.g. `42%`. Defaults to the rounded value. */
  readout?: ReactNode;
  className?: string;
  /** Entrance delay in seconds. */
  delay?: number;
}

/** Hair-thin animated meter. Fills once, when it scrolls into view. */
export function PrecisionProgressBar({
  value,
  tone = "cyan",
  label,
  showLabel = false,
  readout,
  className = "",
  delay = 0.15,
}: PrecisionProgressBarProps) {
  const v = clamp(value);
  return (
    <div className={className}>
      {showLabel && (
        <div className="mb-2 flex items-center justify-between font-mono text-[0.7rem] uppercase tracking-widest text-ink-500">
          <span>{label}</span>
          <span className="text-ink-700">{readout ?? Math.round(v) + "%"}</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(v)}
        className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]"
      >
        {/* Animated with scaleX (compositor-only) instead of width (layout). */}
        <motion.div
          className={"h-full w-full origin-left rounded-full bg-gradient-to-r " + BAR[tone]}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: v / 100 }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: [0.25, 1, 0.5, 1], delay }}
        />
      </div>
    </div>
  );
}

export interface PrecisionRingProps {
  value: number;
  tone?: ProgressTone;
  /** Outer diameter in px. */
  size?: number;
  /** Stroke width in px — keep it thin. */
  stroke?: number;
  label: string;
  children?: ReactNode;
}

/** Ultra-thin circular indicator with centred content. */
export function PrecisionRing({
  value,
  tone = "cyan",
  size = 56,
  stroke = 2,
  label,
  children,
}: PrecisionRingProps) {
  const v = clamp(value);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={RING[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          whileInView={{ strokeDashoffset: c * (1 - v / 100) }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.25, 1, 0.5, 1], delay: 0.2 }}
          style={{ filter: "drop-shadow(0 0 4px " + RING[tone] + "88)" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
