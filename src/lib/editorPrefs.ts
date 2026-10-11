import { createLocalStore, useLocalStore } from "./localStore";

/*
 * Editor preferences.
 *
 * The code editor is enhanced with CodeMirror 6 where the browser can lay it
 * out, and falls back to the plain textarea that shipped first. The fallback is
 * not a degraded mode bolted on for old browsers: it is what runs under jsdom,
 * where there is no layout to measure, so the editor's keyboard behaviour stays
 * testable without pretending a headless editor is a real one.
 */

export type EditorPrefs = {
  /** Prefer the CodeMirror editor where it is supported. */
  enhanced: boolean;
};

export const DEFAULT_EDITOR_PREFS: EditorPrefs = { enhanced: true };

function parsePrefs(raw: string | null): EditorPrefs {
  if (raw === null || raw === "") return DEFAULT_EDITOR_PREFS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return DEFAULT_EDITOR_PREFS;
    const value = parsed as Partial<EditorPrefs>;
    return { enhanced: value.enhanced !== false };
  } catch {
    return DEFAULT_EDITOR_PREFS;
  }
}

export const editorPrefsStore = createLocalStore<EditorPrefs>("cl_codextor_editor", parsePrefs);

export function loadEditorPrefs(): EditorPrefs {
  return editorPrefsStore.get();
}

export function saveEditorPrefs(prefs: EditorPrefs): void {
  editorPrefsStore.set({ enhanced: prefs.enhanced !== false });
}

export function useEditorPrefs(): EditorPrefs {
  return useLocalStore(editorPrefsStore);
}

/**
 * Whether this environment can host CodeMirror. It needs real layout
 * measurement — under vitest (jsdom) it would mount but never lay out, so the
 * editor falls back to the textarea there and the suite keeps testing the
 * keyboard contract that both paths share.
 */
export function codeMirrorSupported(): boolean {
  const mode = (import.meta as ImportMeta & { env?: { MODE?: string } }).env?.MODE;
  if (mode === "test") return false;
  return typeof document !== "undefined";
}

/**
 * Which editor to render. Three inputs, one decision:
 * the learner's preference, whether the browser can host CodeMirror, and
 * whether its chunk already failed to load once (in which case the session
 * stays on the textarea rather than retrying the import on every keystroke).
 */
export function pickEditor(
  prefs: EditorPrefs,
  supported: boolean,
  chunkFailed: boolean,
): "codemirror" | "textarea" {
  return prefs.enhanced && supported && !chunkFailed ? "codemirror" : "textarea";
}

/** The editor to actually render: the preference, gated on support. */
export function useEnhancedEditor(): boolean {
  const prefs = useEditorPrefs();
  return prefs.enhanced && codeMirrorSupported();
}
