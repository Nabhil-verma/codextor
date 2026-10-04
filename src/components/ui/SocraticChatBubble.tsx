import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";

export interface SocraticChatBubbleProps {
  role: "ai" | "user";
  children: ReactNode;
  /** Show the floating "analyzing…" indicator instead of a message. */
  analyzing?: boolean;
  /** Tappable hint chips under an AI message. */
  chips?: string[];
  onChip?: (chip: string) => void;
  /** Slide in on mount (live chats). Off for static mockups. */
  animate?: boolean;
}

/** Three-dot "thinking" indicator. */
function Dots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1 w-1 rounded-full bg-violet-300"
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.16 }}
        />
      ))}
    </span>
  );
}

/**
 * One message in the Socratic tutor. AI turns sit left behind a violet halo,
 * learner turns sit right in a quiet glass pill. No avatars, no tails —
 * the alignment carries the speaker.
 */
export default function SocraticChatBubble({
  role,
  children,
  analyzing = false,
  chips,
  onChip,
  animate = true,
}: SocraticChatBubbleProps) {
  const reduce = useReducedMotion();
  const ai = role === "ai";

  return (
    <motion.div
      initial={animate && !reduce ? { opacity: 0, y: 10, scale: 0.98 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={"flex " + (ai ? "justify-start" : "justify-end")}
    >
      <div className={"max-w-[88%] " + (ai ? "" : "text-right")}>
        {ai && (
          <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-violet-300/80">
            <Sparkles className="h-3 w-3" aria-hidden />
            {analyzing ? "Socratic AI is analyzing" : "Socratic AI"}
          </p>
        )}
        <div
          className={
            "rounded-2xl px-4 py-3 text-sm leading-relaxed " +
            (ai
              ? "border border-violet-400/20 bg-violet-500/[0.07] text-ink-800 shadow-[0_0_30px_-10px_rgba(139,92,246,0.35)]"
              : "border border-white/10 bg-white/[0.05] text-ink-900")
          }
        >
          {analyzing ? <Dots /> : children}
        </div>
        {ai && !analyzing && chips && chips.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => onChip?.(chip)}
                className="rounded-full border border-cyan-400/20 bg-cyan-400/[0.05] px-3 py-1 text-xs text-cyan-200 transition-all duration-300 ease-snap hover:scale-[1.03] hover:border-cyan-400/50 hover:bg-cyan-400/10 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
