import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  keymap,
  lineNumbers,
  placeholder as cmPlaceholder,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { tags } from "@lezer/highlight";

/*
 * The enhanced editor (CodeMirror 6), loaded on demand.
 *
 * This module is the only place that imports CodeMirror, and `CodeEditor`
 * dynamic-imports it, so the ~300 KB of editor never lands in the entry chunk
 * or in a lesson that does not open an editor. The plain textarea in
 * CodeEditor.tsx remains the fallback and the shared contract:
 *
 *   - Tab indents; Escape switches Tab to "move focus", matching TAB_HINT
 *   - Cmd/Ctrl+Enter runs the code
 *   - the surface carries the same accessible name and description
 */

export type CodeMirrorEditorProps = {
  value: string;
  onChange: (next: string) => void;
  onRun: () => void;
  lang?: "ts" | "python";
  /** Accessible name for the editing surface. */
  label: string;
  describedBy?: string;
  placeholder?: string;
  /** When true, Tab moves focus instead of indenting (the escape hatch). */
  escapeTab: boolean;
  onToggleEscapeTab?: () => void;
  onBlur?: () => void;
  minRows?: number;
  maxRows?: number;
  /** Called when the editor cannot be built, so the caller can fall back. */
  onFail?: () => void;
};

/** The console palette, re-stated for the editor's token classes. */
const cortexHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#e0b56a" },
  { tag: [tags.name, tags.deleted, tags.character, tags.propertyName, tags.macroName], color: "#e8e6e3" },
  { tag: [tags.function(tags.variableName), tags.labelName], color: "#8fd4ff" },
  { tag: [tags.color, tags.constant(tags.name), tags.standard(tags.name)], color: "#f0c987" },
  { tag: [tags.definition(tags.name), tags.separator], color: "#e8e6e3" },
  { tag: [tags.typeName, tags.className, tags.number, tags.bool, tags.atom], color: "#b8e0c8" },
  { tag: [tags.operator, tags.operatorKeyword, tags.url, tags.escape, tags.regexp, tags.link], color: "#9aa4b2" },
  { tag: [tags.string, tags.special(tags.string)], color: "#a8d5a2" },
  { tag: [tags.meta, tags.comment], color: "#6b7280", fontStyle: "italic" },
  { tag: tags.heading, fontWeight: "bold", color: "#e0b56a" },
  { tag: tags.invalid, color: "#ff8f8f" },
]);

const editorTheme = EditorView.theme(
  {
    "&": { backgroundColor: "transparent", color: "#f5f3ef", fontSize: "13px" },
    "&.cm-focused": { outline: "none" },
    ".cm-content": {
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
      lineHeight: "1.65",
      padding: "1.25rem 1.25rem 1.25rem 0.75rem",
      caretColor: "#d4af37",
    },
    ".cm-gutters": {
      backgroundColor: "transparent",
      color: "#6b7280",
      border: "none",
      paddingRight: "0.25rem",
    },
    ".cm-activeLine": { backgroundColor: "rgba(212, 175, 55, 0.06)" },
    ".cm-activeLineGutter": { backgroundColor: "transparent", color: "#d4af37" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#d4af37" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
      backgroundColor: "rgba(143, 212, 255, 0.25)",
    },
    ".cm-placeholder": { color: "#6b7280" },
    ".cm-scroller": { overflow: "auto" },
  },
  { dark: true },
);

export default function CodeMirrorEditor({
  value,
  onChange,
  onRun,
  lang,
  label,
  describedBy,
  placeholder,
  escapeTab,
  onToggleEscapeTab,
  onBlur,
  minRows = 8,
  maxRows = 24,
  onFail,
}: CodeMirrorEditorProps) {
  const host = useRef<HTMLDivElement | null>(null);
  const view = useRef<EditorView | null>(null);

  /* The editor is created once and driven through refs, so callbacks that
     change identity on every render never tear down the document. */
  const handlers = useRef({ onChange, onRun, onEscapeTab: onToggleEscapeTab, onBlur, escapeTab });
  handlers.current = { onChange, onRun, onEscapeTab: onToggleEscapeTab, onBlur, escapeTab };
  /* Only the first document is read at mount; later edits arrive as props. */
  const initialDoc = useRef(value);

  useEffect(() => {
    if (!host.current) return;
    const language = lang === "python" ? python() : javascript({ typescript: lang === "ts" });

    const state = EditorState.create({
      doc: initialDoc.current,
      extensions: [
        lineNumbers(),
        history(),
        drawSelection(),
        highlightActiveLine(),
        EditorView.lineWrapping,
        keymap.of([
          {
            key: "Mod-Enter",
            preventDefault: true,
            run: () => {
              handlers.current.onRun();
              return true;
            },
          },
          {
            key: "Escape",
            run: () => {
              handlers.current.onEscapeTab?.();
              return true;
            },
          },
          {
            ...indentWithTab,
            run: (v) => (handlers.current.escapeTab ? false : (indentWithTab.run?.(v) ?? false)),
          },
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        language,
        syntaxHighlighting(cortexHighlight),
        editorTheme,
        ...(placeholder ? [cmPlaceholder(placeholder)] : []),
        EditorView.contentAttributes.of({
          "aria-label": label,
          ...(describedBy ? { "aria-describedby": describedBy } : {}),
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) handlers.current.onChange(update.state.doc.toString());
        }),
        EditorView.domEventHandlers({
          blur: () => {
            handlers.current.onBlur?.();
          },
        }),
      ],
    });

    let instance: EditorView;
    try {
      instance = new EditorView({ state, parent: host.current });
    } catch {
      // CodeMirror needs real layout; without it the caller must fall back
      // rather than take the page down for a cosmetic enhancement.
      onFail?.();
      return;
    }
    view.current = instance;
    return () => {
      instance.destroy();
      view.current = null;
    };
    // Recreated only when the surface itself changes (language, naming); the
    // document is pushed in by the effect below, never by a remount.
  }, [lang, label, describedBy, placeholder]);

  /* External edits (reset, a restored draft) replace the document in place. */
  useEffect(() => {
    const instance = view.current;
    if (!instance) return;
    const current = instance.state.doc.toString();
    if (current === value) return;
    instance.dispatch({ changes: { from: 0, to: current.length, insert: value } });
  }, [value]);

  return (
    <div
      ref={host}
      className="code-mirror-surface block w-full resize-y overflow-auto bg-ink-950 text-paper-100"
      style={{ minHeight: minRows * 1.65 + "em", maxHeight: maxRows * 1.65 + "em" }}
    />
  );
}
