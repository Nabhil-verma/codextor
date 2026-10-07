import { useCallback, useEffect, useState } from "react";
import { createLocalStore, useLocalStore } from "./localStore";

/* ═══════════════════════════════════════════════════════════════
   Theme (light / dark). The choice lives in localStorage and the
   `.dark` class on <html> — the palette in src/index.css does the
   rest, so no component needs dark: variants.
   ═══════════════════════════════════════════════════════════════ */

export type Theme = "light" | "dark";

/**
 * Shared with the pre-paint script in index.html — keep the two in step.
 * Stored as the bare word (`dark`), not JSON, because that inline script reads
 * the raw value before the app bundle exists.
 */
const themeStore = createLocalStore<Theme | null>(
  "codexter-theme",
  (raw) => (raw === "light" || raw === "dark" ? raw : null),
  (value) => value ?? ""
);

function osTheme(): Theme {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** The theme to render right now: saved choice, else the OS preference. */
function initialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return themeStore.get() ?? osTheme();
}

function paint(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

/**
 * Read + change the theme. Mirrors the choice into localStorage, follows the
 * OS setting while the learner hasn't chosen, and keeps `.dark` on <html> in
 * sync with React state.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  useEffect(() => {
    paint(theme);
  }, [theme]);

  // Only meaningful before the learner has picked a side, but harmless after:
  // a saved choice always wins over the media query.
  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;
    const onChange = () => {
      if (themeStore.get()) return;
      setThemeState(media.matches ? "dark" : "light");
    };
    media.addEventListener?.("change", onChange);
    return () => media.removeEventListener?.("change", onChange);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    themeStore.set(next);
    setThemeState(next);
  }, []);

  // Flips the *rendered* theme, which matters while the learner is following
  // the OS setting and nothing has been stored yet.
  const toggle = useCallback(
    () => setTheme(theme === "dark" ? "light" : "dark"),
    [setTheme, theme]
  );

  return { theme, setTheme, toggle };
}

/* ═══════════════════════════════════════════════════════════════
   Style (glass / minimal). The second axis of the theme system:
   `glass` is the current frosted, cyan-pulse design language;
   `minimal` is the calmer paper/navy/blue one, with Fraunces
   display type and no glow/noise effects. It is applied as the
   `.style-minimal` class on <html>, so src/index.css owns every
   visual difference — no component needs to branch on it.
   ═══════════════════════════════════════════════════════════════ */

export type ThemeStyle = "glass" | "minimal";

/**
 * Shared with the pre-paint script in index.html — keep the two in step.
 * Stored as the bare word (`minimal`), not JSON, because that inline script
 * reads the raw value before the app bundle exists.
 */
const styleStore = createLocalStore<ThemeStyle | null>(
  "codexter-style",
  (raw) => (raw === "glass" || raw === "minimal" ? raw : null),
  (value) => value ?? ""
);

/**
 * The style store, exposed for the account-sync bridge (`ThemeBridge`), which
 * mirrors the choice to the signed-in learner's `preferences` row: it reads the
 * stored value to seed a fresh account and subscribes to push later changes.
 */
export { styleStore as themeStyleStore };

function paintStyle(style: ThemeStyle) {
  document.documentElement.classList.toggle("style-minimal", style === "minimal");
}

/**
 * Read + change the visual style. Subscribes through the shared local store,
 * so every mounted view (the nav and the settings modal) flips together.
 */
export function useThemeStyle() {
  const stored = useLocalStore(styleStore);
  const style = stored ?? "glass";

  useEffect(() => {
    paintStyle(style);
  }, [style]);

  const setStyle = useCallback((next: ThemeStyle) => {
    styleStore.set(next);
  }, []);

  return { style, setStyle };
}
