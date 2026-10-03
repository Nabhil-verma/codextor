import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

export interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

/** Asymmetrical 4-column bento. Cells choose their own spans. */
export function BentoGrid({ children, className = "" }: BentoGridProps) {
  return (
    <div
      className={
        "grid grid-cols-1 gap-4 md:grid-cols-4 lg:gap-5 " + className
      }
    >
      {children}
    </div>
  );
}

export interface BentoItemProps {
  children: ReactNode;
  /** Tailwind span classes, e.g. `md:col-span-2 md:row-span-2`. */
  span?: string;
  /** Position in the grid — drives the entrance stagger. */
  index?: number;
  className?: string;
}

/**
 * One bento cell: staggered spring entrance + a cursor-following spotlight.
 * The spotlight is pure CSS (`.spotlight` in index.css) fed by two custom
 * properties, so pointer movement never re-renders React.
 */
export function BentoItem({
  children,
  span = "",
  index = 0,
  className = "",
}: BentoItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", e.clientX - r.left + "px");
    el.style.setProperty("--my", e.clientY - r.top + "px");
  }

  const style: CSSProperties = { willChange: "transform, opacity" };

  return (
    <motion.div
      ref={ref}
      onPointerMove={reduce ? undefined : onPointerMove}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 30,
        delay: Math.min(index * 0.07, 0.35),
      }}
      style={style}
      className={
        "spotlight glass glass-edge group relative overflow-hidden rounded-3xl border border-paper-200/70 p-8 " +
        "transition-colors duration-500 ease-out hover:border-cyan-400/30 " +
        span +
        (className ? " " + className : "")
      }
    >
      <div className="relative z-10 h-full">{children}</div>
    </motion.div>
  );
}
