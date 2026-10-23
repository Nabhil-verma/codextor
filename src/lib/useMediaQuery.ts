import { useCallback, useSyncExternalStore } from "react";

/** True where `matchMedia` exists (jsdom and pre-browser renders have none). */
function available(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function";
}

/**
 * Subscribes to a media query and re-renders when it flips.
 *
 * Safe everywhere: in jsdom (where `matchMedia` may be missing) and during any
 * pre-browser render it simply reports `false`, so the desktop layout is the
 * default and nothing crashes in tests.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!available()) return () => {};
      const mql = window.matchMedia(query);
      // Safari < 14 only has the deprecated addListener/removeListener pair.
      if (typeof mql.addEventListener === "function") {
        mql.addEventListener("change", onChange);
        return () => mql.removeEventListener("change", onChange);
      }
      mql.addListener(onChange);
      return () => mql.removeListener(onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => (available() ? window.matchMedia(query).matches : false),
    [query],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/**
 * True on phone-sized viewports (the same 768px boundary Tailwind's `md:`
 * uses, so the React branch and the CSS branch can never disagree).
 */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
