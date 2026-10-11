import { Component, Suspense, lazy, useRef, useState, type ReactNode } from "react";
import { useTabTrapEscape } from "../lib/useTabTrapEscape";
import {
  codeMirrorSupported,
  pickEditor,
  saveEditorPrefs,
  useEditorPrefs,
} from "../lib/editorPrefs";

/*
 * The one code-editing surface in the app.
 *
 * Two implementations behind one contract: CodeMirror 6 where the browser can
 * lay it out, the plain textarea everywhere else (including jsdom, so the
 * keyboard contract stays testable). Both share the rules the accessibility
 * pass established — Tab indents, Escape hands Tab back to focus order,
 * Cmd/Ctrl+Enter runs — and both carry the same accessible name, so a learner
 * who never sees the enhanced editor is not using a lesser one.
 *
 * The editor renders no chrome of its own: the window, the Run button and the
 * hint are the caller's, which keeps the existing layouts byte-identical.
 */

const EnhancedEditor = lazy(() => import("./CodeMirrorEditor"));

export type CodeEditorProps = {
  value: string;
  onChange: (next: string) => void;
  /** Cmd/Ctrl+Enter, and the Run button's behaviour. */
  onRun: () => void;
  lang?: "ts" | "python";
  /** Accessible name of the editing surface. */
  label: string;
  /** id of the paragraph describing this editor. */
  describedBy?: string;
  placeholder?: string;
  minRows?: number;
  maxRows?: number;
  onBlur?: () => void;
  /** Rendered after the surface with the live Escape-mode state. */
  hint?: (escaped: boolean) => ReactNode;
};

export default function CodeEditor({
  value,
  onChange,
  onRun,
  lang,
  label,
  describedBy,
  placeholder,
  minRows = 8,
  maxRows = 24,
  onBlur,
  hint,
}: CodeEditorProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const prefs = useEditorPrefs();
  const [cmEscaped, setCmEscaped] = useState(false);
  /* A failed chunk is not worth an error page: the session drops to the
     textarea and keeps working. */
  const [chunkFailed, setChunkFailed] = useState(false);

  const enhanced = pickEditor(prefs, codeMirrorSupported(), chunkFailed) === "codemirror";

  /* The textarea path keeps the original Tab/Esc hook, caret handling and all,
     so nothing regresses for the environment the fallback exists for. */
  const tab = useTabTrapEscape(taRef, value, {
    onIndent: (next, caret) => {
      onChange(next);
      requestAnimationFrame(() => taRef.current?.setSelectionRange(caret, caret));
    },
  });

  const escaped = enhanced ? cmEscaped : tab.escaped;

  return (
    <>
      {enhanced ? (
        <ChunkBoundary onFail={() => setChunkFailed(true)}>
        <Suspense fallback={<EditorSkeleton minRows={minRows} />}>
          <EnhancedEditor
            value={value}
            onChange={onChange}
            onRun={onRun}
            lang={lang}
            label={label}
            describedBy={describedBy}
            placeholder={placeholder}
            escapeTab={cmEscaped}
            onToggleEscapeTab={() => setCmEscaped((v) => !v)}
            onBlur={() => {
              setCmEscaped(false);
              onBlur?.();
            }}
            minRows={minRows}
            maxRows={maxRows}
            onFail={() => setChunkFailed(true)}
          />
        </Suspense>
        </ChunkBoundary>
      ) : (
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              onRun();
              return;
            }
            tab.handleKeyDown(e);
          }}
          spellCheck={false}
          rows={Math.max(minRows, Math.min(maxRows, value.split("\n").length + 1))}
          aria-label={label}
          aria-describedby={describedBy}
          onBlur={() => {
            tab.onBlur();
            onBlur?.();
          }}
          className="block w-full resize-y bg-ink-950 p-5 font-mono text-[13px] leading-relaxed text-paper-100 outline-none placeholder:text-ink-600"
          placeholder={placeholder}
        />
      )}
      {hint?.(escaped)}
    </>
  );
}

/**
 * The "enhanced editor" switch. Disabled — with a reason — where CodeMirror has
 * no layout to work with, instead of silently ignoring the preference.
 */
export function EditorToggle() {
  const prefs = useEditorPrefs();
  const supported = codeMirrorSupported();
  return (
    <label
      className="font-mono text-[11px] text-ink-500"
      title={
        supported
          ? "CodeMirror 6: line numbers, bracket matching, undo history"
          : "The enhanced editor needs a browser with layout; this environment uses the plain editor"
      }
    >
      <input
        type="checkbox"
        className="mr-1.5 align-middle"
        checked={prefs.enhanced}
        disabled={!supported}
        onChange={(e) => saveEditorPrefs({ enhanced: e.target.checked })}
      />
      enhanced editor
    </label>
  );
}

/**
 * Catches a failed editor chunk (offline, a stale hash after a deploy) and
 * hands control back to the textarea path.
 */
class ChunkBoundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFail();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Shown while the editor chunk arrives — same footprint, no layout jump. */
function EditorSkeleton({ minRows }: { minRows: number }) {
  return (
    <div
      aria-hidden
      className="block w-full animate-pulse bg-ink-950"
      style={{ minHeight: minRows * 1.65 + "em" }}
    />
  );
}
