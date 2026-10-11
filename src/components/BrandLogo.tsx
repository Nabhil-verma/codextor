import { motion } from "framer-motion";

/*
 * The Codextor lockup: the brand mark plus the wordmark.
 *
 * The mark is the new hexagon-ribbon `</>` — one artwork recoloured four ways,
 * so the same silhouette carries every theme. Which file loads is decided
 * entirely by the classes the theme already puts on <html> — `.dark`
 * (light/dark) and `.style-minimal` (glass/minimal) — so there is no theme
 * prop, no JS branch and no flash on re-theme. The four files live in
 * public/brand/ and the rules that pick between them are in src/index.css:
 *
 *   glass   + light  →  /brand/logo-glass-light.svg
 *   glass   + dark   →  /brand/logo-glass-dark.svg
 *   minimal + light  →  /brand/logo-minimal-light.svg
 *   minimal + dark   →  /brand/logo-minimal-dark.svg
 *
 * The mark is a CSS background rather than an <img>, so a variant that isn't
 * showing is never fetched and switching theme or style costs no request.
 * The wordmark stays real text: it inherits the theme's ink colour and stays
 * selectable where a baked-in SVG wordmark would not.
 */
export default function BrandLogo({
  withWordmark = true,
}: {
  /** Turn off when the artwork is a full lockup that already contains the name. */
  withWordmark?: boolean;
}) {
  return (
    <>
      <motion.span
        className="brand-mark h-8 w-8 shrink-0"
        /* Decorative while the wordmark carries the name; the accessible label
           when it doesn't. */
        aria-hidden={withWordmark || undefined}
        role={withWordmark ? undefined : "img"}
        aria-label={withWordmark ? undefined : "Codextor"}
        whileHover={{ rotate: [0, -6, 6, 0] }}
        transition={{ duration: 0.45 }}
      />
      {withWordmark && (
        <span className="font-display text-lg font-bold tracking-tighter text-ink-950">
          Codextor
        </span>
      )}
    </>
  );
}
