import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import Nav from "../components/Nav";
import { Orb } from "../components/motion";
import { useAccount } from "../AccountProvider";

const APP_PREFIXES = [
  "/learn",
  "/playground",
  "/projects",
  "/portfolio",
  "/certificate",
  "/leaderboard",
  "/clans",
];

/** Only authenticated app routes are valid post-sign-in destinations. */
function sanitizeReturnTo(raw: string | null): string {
  if (
    raw &&
    raw.startsWith("/") &&
    !raw.startsWith("//") &&
    APP_PREFIXES.some((p) => raw === p || raw.startsWith(p + "/"))
  )
    return raw;
  return "/learn";
}

const PERKS = [
  {
    icon: "☁",
    title: "Sync across devices",
    text: "Quiz scores, completed lessons, and badges follow your account — phone, tablet, laptop.",
  },
  {
    icon: "🎓",
    title: "Certificates with your name",
    text: "Finish a track and your printable certificate is pre-filled with your display name.",
  },
  {
    icon: "🔥",
    title: "Streaks that survive",
    text: "Your daily streak and XP are safe even if you clear this browser or switch devices.",
  },
];

/*
 * Sign in with Freebuff.
 *
 * Accounts are Freebuff accounts: the site asks Freebuff who the visitor is and
 * stores their rows under that account id. There is no password here to forget,
 * reset or leak, so the old username/password and reset-code flows are gone.
 */
export default function AuthPage() {
  const { user, authReady, signIn } = useAccount();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const returnTo = sanitizeReturnTo(searchParams.get("returnTo"));

  // Already signed in? Straight to where you were headed.
  useEffect(() => {
    if (authReady && user) {
      // Clear ?returnTo so a refresh doesn't keep bouncing through it.
      if (searchParams.has("returnTo")) setSearchParams({}, { replace: true });
      navigate(returnTo, { replace: true });
    }
  }, [user, authReady, navigate, returnTo, searchParams, setSearchParams]);

  return (
    <div className="min-h-screen">
      <Nav />

      <main className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Perks panel */}
          <section className="order-2 lg:order-1">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="eyebrow">why sign in?</p>
              <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-950">
                Progress worth <span className="gradient-text">keeping</span>
              </h1>
              <p className="mt-3 max-w-md leading-relaxed text-ink-600">
                Sign in with your Freebuff account to save every lesson you finish —
                your work follows you to any device.
              </p>
            </motion.div>

            <ul className="mt-8 space-y-4">
              {PERKS.map((p, i) => (
                <motion.li
                  key={p.title}
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                >
                  <motion.div
                    className="glass glass-edge group flex gap-4 rounded-2xl border border-paper-200/60 p-4"
                    whileHover={{ x: 6 }}
                    transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold-400/50 bg-gold-400/10 text-gold-600 transition group-hover:shadow-glow">
                      {p.icon}
                    </span>
                    <div>
                      <p className="font-semibold text-ink-950">{p.title}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-ink-600">{p.text}</p>
                    </div>
                  </motion.div>
                </motion.li>
              ))}
            </ul>

            {/* Mini dark 3D showcase strip */}
            <motion.div
              className="dark-canvas glass-edge-dark relative mt-10 overflow-hidden rounded-2xl p-6"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="pointer-events-none absolute inset-0" aria-hidden>
                <Orb className="-right-8 -top-8 bg-gold-400/15" size={150} duration={11} />
                <div className="dots-bg-dark absolute inset-0 opacity-60" />
              </div>
              <div className="relative z-10">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold-400">
                  inside every lesson
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["live editor", "console", "quizzes", "badges", "certificates"].map((t, i) => (
                    <motion.span
                      key={t}
                      className="rounded-full border border-paper-100/15 px-3 py-1 font-mono text-[11px] text-paper-300/90"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.7 + i * 0.08, type: "spring", stiffness: 300, damping: 20 }}
                    >
                      {t}
                    </motion.span>
                  ))}
                </div>
              </div>
            </motion.div>

            <p className="mt-10 font-mono text-xs text-ink-600">
              no spam · no ads · no password to remember
            </p>
          </section>

          {/* Sign-in card */}
          <section className="order-1 lg:order-2" style={{ perspective: "1200px" }}>
            {!authReady ? (
              <div className="card p-10 text-center">
                <p className="font-mono text-sm text-ink-600">Checking your session…</p>
              </div>
            ) : (
              <motion.div
                className="glass glass-edge rounded-2xl border border-paper-200/70 p-8 sm:p-10"
                initial={{ opacity: 0, y: 40, rotateX: 8 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="eyebrow">Codextor</p>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink-950">
                  Sign in with Freebuff
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  One click with the Freebuff account you already have — Google, GitHub
                  or Apple. No new password, and we never see your credentials.
                </p>

                <motion.button
                  type="button"
                  onClick={() => signIn(returnTo)}
                  className="btn-gold mt-6 w-full !justify-center"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Continue with Freebuff
                </motion.button>

                <ul className="mt-6 space-y-2 text-sm leading-relaxed text-ink-600">
                  <li>
                    <strong className="text-ink-900">What we store:</strong> your lesson
                    scores, streaks, guild membership and certificates, keyed to your
                    Freebuff account.
                  </li>
                  <li>
                    <strong className="text-ink-900">What we never store:</strong> your
                    password, your Freebuff tokens, or your sign-in session off this
                    server.
                  </li>
                  <li>
                    You can reset your progress or sign out at any time from the account
                    menu.
                  </li>
                </ul>

                <p className="mt-6 text-center text-sm text-ink-600">
                  Prefer to stay local?{" "}
                  <a href="/#/learn" className="font-semibold text-gold-600 hover:underline">
                    Keep learning without an account
                  </a>{" "}
                  — progress stays in this browser.
                </p>
              </motion.div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
