import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useSpring,
  type MotionValue,
} from "framer-motion";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";

/* ═══════════════════════════════════════════════════════════════
   Shared Framer-Motion primitives — the visual DNA of the site.
   Reveal · PageFade · Tilt · Marquee · Orb · Magnetic
   ═══════════════════════════════════════════════════════════════ */

/* ─────────────────────────────── Fade-up when scrolled into view */

export function Reveal({
  children,
  delay = 0,
  y = 26,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Page-enter fade — wrap each route's outermost <main>. */
export function PageFade({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────────────────────── Mouse-tracking 3D tilt card */

export function Tilt({
  children,
  className,
  max = 9,
  scale = 1.02,
  glare = true,
  style,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  scale?: number;
  glare?: boolean;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const s = useMotionValue(1);
  // Glare is driven by motion values, never React state: the old
  // setGlarePos() re-rendered the card (and repainted a card-sized
  // radial-gradient) on every mousemove, and pointer devices report at
  // 125–1000 Hz. Now the per-frame work is transform + opacity only.
  const go = useMotionValue(0);
  const gx = useMotionValue(0);
  const gy = useMotionValue(0);

  const spring = { stiffness: 220, damping: 22, mass: 0.6 };
  const srx = useSpring(rx, spring);
  const sry = useSpring(ry, spring);
  const ss = useSpring(s, spring);
  const sgo = useSpring(go, { stiffness: 260, damping: 30 });
  const sgx = useSpring(gx, { stiffness: 300, damping: 30 });
  const sgy = useSpring(gy, { stiffness: 300, damping: 30 });

  // The card's rect is measured once per hover, not on every mousemove.
  const rect = useRef<DOMRect | null>(null);
  function measure() {
    rect.current = ref.current?.getBoundingClientRect() ?? null;
  }

  function onMove(e: ReactMouseEvent<HTMLDivElement>) {
    if (!rect.current) measure();
    const r = rect.current;
    if (!r || !r.width || !r.height) return;
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry.set((px - 0.5) * 2 * max);
    rx.set(-(py - 0.5) * 2 * max);
    s.set(scale);
    // GLARE_SIZE matches the old 420px radial-gradient's visible falloff;
    // the disc is offset by half its size so its centre tracks the cursor.
    gx.set(e.clientX - r.left - GLARE_SIZE / 2);
    gy.set(e.clientY - r.top - GLARE_SIZE / 2);
    go.set(1);
  }

  function onLeave() {
    rx.set(0);
    ry.set(0);
    s.set(1);
    go.set(0);
    rect.current = null;
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        ...style,
        rotateX: srx,
        rotateY: sry,
        scale: ss,
        transformStyle: "preserve-3d",
        transformPerspective: 900,
        position: "relative",
      }}
      onMouseEnter={measure}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
      {glare && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
        >
          {/* A static gradient moved by transform — compositor-only, where a
              changing background-image was a repaint on every pointer event. */}
          <motion.span
            className="absolute left-0 top-0 rounded-full"
            style={{
              width: GLARE_SIZE,
              height: GLARE_SIZE,
              x: sgx,
              y: sgy,
              opacity: sgo,
              background:
                "radial-gradient(circle, rgba(255,255,255,0.10), transparent 75%)",
            }}
          />
        </span>
      )}
    </motion.div>
  );
}

/** Diameter of the pre-rendered glare disc (px). */
const GLARE_SIZE = 420;

/* ─────────────────────────────── Infinite horizontal marquee */

const wrap = (min: number, max: number, v: number) => {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
};

export function Marquee({
  children,
  speed = 40,
  reverse = false,
  className,
  fadeColor,
}: {
  children: ReactNode;
  /** pixels per second */
  speed?: number;
  reverse?: boolean;
  className?: string;
  /** color behind the soft edge fades (defaults to transparent → no fade) */
  fadeColor?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const [copyW, setCopyW] = useState(0);
  const [inView, setInView] = useState(true);
  const x = useMotionValue(0);

  useEffect(() => {
    const measure = () => setCopyW(copyRef.current?.offsetWidth ?? 0);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Pause the loop whenever the strip is off-screen: an infinite marquee
  // below the fold otherwise keeps compositing for the whole session
  // (rAF already idles on hidden tabs).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const ob = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    ob.observe(el);
    return () => ob.disconnect();
  }, []);

  useAnimationFrame((_, delta) => {
    if (!copyW || !inView) return;
    const dir = reverse ? 1 : -1;
    const next = x.get() + dir * speed * (delta / 1000);
    x.set(wrap(-copyW, 0, next));
  });

  return (
    <div ref={wrapRef} className={"relative overflow-hidden " + (className ?? "")}>
      {fadeColor && (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24"
            style={{ background: `linear-gradient(to right, ${fadeColor}, transparent)` }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24"
            style={{ background: `linear-gradient(to left, ${fadeColor}, transparent)` }}
          />
        </>
      )}
      <motion.div
        // The pinned layer is only worth its memory while the strip is moving.
        className={"flex w-max items-center" + (inView ? " will-change-transform" : "")}
        style={{ x }}
      >
        <div ref={copyRef} className="flex items-center">
          {children}
        </div>
        <div className="flex items-center" aria-hidden>
          {children}
        </div>
        <div className="flex items-center" aria-hidden>
          {children}
        </div>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────── Floating gradient orb */

export function Orb({
  className = "",
  size = 320,
  duration = 14,
  delay = 0,
  style,
}: {
  className?: string;
  size?: number;
  duration?: number;
  delay?: number;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const [inView, setInView] = useState(false);
  // A blurred layer animating off-screen is pure GPU fill + memory burn,
  // and this loop used to ignore prefers-reduced-motion entirely.
  const moving = !reduce && inView;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const ob = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: "120px",
    });
    ob.observe(el);
    return () => ob.disconnect();
  }, []);

  return (
    <motion.span
      ref={ref}
      aria-hidden
      className={"fx-glow pointer-events-none absolute rounded-full blur-3xl " + className}
      style={{ width: size, height: size, ...style }}
      // Paused → rest pose; entering the viewport resumes the drift.
      animate={
        moving
          ? { y: [0, -28, 12, 0], x: [0, 18, -12, 0], scale: [1, 1.06, 0.97, 1] }
          : { y: 0, x: 0, scale: 1 }
      }
      transition={{ duration, delay, repeat: moving ? Infinity : 0, ease: "easeInOut" }}
    />
  );
}

/* ─────────────────────────────── Magnetic hover (buttons) */

export function Magnetic({
  children,
  className,
  strength = 0.3,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 300, damping: 20 });
  const sy = useSpring(y, { stiffness: 300, damping: 20 });

  function onMove(e: ReactMouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  }

  return (
    <motion.div
      ref={ref}
      className={"inline-block " + (className ?? "")}
      style={{ x: sx, y: sy }}
      onMouseMove={onMove}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

export type { MotionValue };
