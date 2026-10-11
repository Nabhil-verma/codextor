import { useCallback, useState, type KeyboardEvent, type RefObject } from "react";

/*
 * Keyboard trap for code textareas, with an escape hatch.
 *
 * Default: Tab inserts two spaces (the learner is typing code).
 * Esc toggles "Tab moves focus" mode, where Tab is left alone so keyboard
 * users can leave the editor. Blur, or any non-Tab keypress, re-arms trapping.
 */

export const TAB_HINT =
  "Tab inserts spaces. Press Esc, then Tab to leave the editor.";

type Options = {
  /** Called with the current text and selection when Tab should indent. */
  onIndent: (next: string, caret: number) => void;
};

export function useTabTrapEscape(
  ref: RefObject<HTMLTextAreaElement>,
  value: string,
  { onIndent }: Options,
) {
  const [escaped, setEscaped] = useState(false);

  const onBlur = useCallback(() => setEscaped(false), []);

  /** Returns true when the event was consumed (caller should stop). */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>): boolean => {
      if (e.key === "Escape") {
        e.preventDefault();
        setEscaped((v) => !v);
        return true;
      }
      if (e.key !== "Tab") {
        // Any other key re-arms trapping.
        if (escaped) setEscaped(false);
        return false;
      }
      if (escaped) return false; // let focus move
      e.preventDefault();
      const ta = ref.current;
      if (!ta) return true;
      const { selectionStart: s, selectionEnd: end } = ta;
      onIndent(value.slice(0, s) + "  " + value.slice(end), s + 2);
      return true;
    },
    [escaped, ref, value, onIndent],
  );

  return { escaped, onBlur, handleKeyDown };
}
