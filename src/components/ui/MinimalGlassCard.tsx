import type { ElementType, HTMLAttributes, ReactNode } from "react";

export type CardTone = "neutral" | "cyan" | "violet" | "emerald" | "amber";

export interface MinimalGlassCardProps extends HTMLAttributes<HTMLElement> {
  /** Render as another element (`section`, `li`, `article`…). */
  as?: ElementType;
  /** Which neon the border drifts toward on hover. */
  tone?: CardTone;
  /** `true` = p-6, `"lg"` = p-8 sm:p-10, `false` = bring your own padding. */
  padded?: boolean | "lg";
  /** Draws the 1px gradient edge (hero / featured cards). */
  neonEdge?: boolean;
  children: ReactNode;
}

/*
 * Class maps are written out in full on purpose: Tailwind only generates
 * classes it can read as complete strings in the source.
 */
const HOVER_BORDER: Record<CardTone, string> = {
  neutral: "hover:border-white/15",
  cyan: "hover:border-cyan-400/40",
  violet: "hover:border-violet-400/40",
  emerald: "hover:border-emerald-400/40",
  amber: "hover:border-amber-400/40",
};

/** The base surface of the whole redesign: barely-there glass, hairline edge. */
export default function MinimalGlassCard({
  as,
  tone = "neutral",
  padded = true,
  neonEdge = false,
  className = "",
  children,
  ...rest
}: MinimalGlassCardProps) {
  const Tag: ElementType = as ?? "div";
  const pad = padded === "lg" ? "p-8 sm:p-10" : padded ? "p-6" : "";
  return (
    <Tag
      className={
        "glass glass-edge rounded-3xl border border-paper-200/70 transition-colors duration-500 ease-out " +
        HOVER_BORDER[tone] +
        " " +
        pad +
        (neonEdge ? " neon-border" : "") +
        (className ? " " + className : "")
      }
      {...rest}
    >
      {children}
    </Tag>
  );
}
