import { useCallback, useRef, type PointerEvent } from "react";

/**
 * Feeds the `.spotlight` CSS highlight (index.css) with the pointer position.
 * Writes two custom properties straight to the DOM node, so moving the mouse
 * across a card never re-renders React.
 */
export function useSpotlight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const onPointerMove = useCallback((e: PointerEvent<T>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", e.clientX - r.left + "px");
    el.style.setProperty("--my", e.clientY - r.top + "px");
  }, []);
  return { ref, onPointerMove };
}
