import { motion } from "framer-motion";
import Nav from "../components/Nav";
import { CyberBadge, NeonPulseButton } from "../components/ui";

const EASE = [0.25, 1, 0.5, 1] as const;

export default function NotFound() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="relative mx-auto max-w-3xl overflow-hidden px-4 py-32 text-center sm:py-44">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="fx-glow absolute left-1/2 top-[10%] h-[22rem] w-[22rem] -translate-x-1/2 rounded-full bg-rose-500/15 blur-[130px]" />
          <div className="fx-glow absolute right-[12%] bottom-[8%] h-[16rem] w-[16rem] rounded-full bg-violet-600/15 blur-[120px]" />
        </div>

        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="flex justify-center"
          >
            <CyberBadge tone="rose" dot pulse>
              error 404
            </CyberBadge>
          </motion.div>
          <motion.p
            className="gradient-text mt-8 font-mono text-[8rem] font-bold leading-none tracking-tighter sm:text-[11rem]"
            initial={{ opacity: 0, scale: 0.9, filter: "blur(16px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.8, ease: EASE }}
            aria-hidden
          >
            404
          </motion.p>
          <motion.h1
            className="mt-6 font-display text-3xl font-bold tracking-tighter text-ink-950 sm:text-4xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
          >
            SyntaxError: page not found
          </motion.h1>
          <motion.p
            className="mx-auto mt-4 max-w-md text-ink-600"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28, ease: EASE }}
          >
            Unexpected token at line 1, column 1. The page you're looking for
            doesn't exist.
          </motion.p>
          <motion.div
            className="mt-12 flex justify-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: EASE }}
          >
            <NeonPulseButton to="/" size="lg">
              Back to safety
            </NeonPulseButton>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
