import { createLocalStore } from "./localStore";

/*
 * The command palette is mounted once at the app root, but it is opened from
 * the nav, the phone tab bar and the Cmd+K shortcut. A tiny event bus keeps
 * those callers from having to know about each other (and avoids threading a
 * context provider through every bridge at the root).
 */

const OPEN_EVENT = "codextor:palette";
const AI_SETTINGS_EVENT = "codextor:ai-settings";

export function openPalette(): void {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function onOpenPalette(handler: () => void): () => void {
  window.addEventListener(OPEN_EVENT, handler);
  return () => window.removeEventListener(OPEN_EVENT, handler);
}

/** Opens the settings modal, which is owned by the nav. */
export function openAiSettings(): void {
  window.dispatchEvent(new Event(AI_SETTINGS_EVENT));
}

export function onOpenAiSettings(handler: () => void): () => void {
  window.addEventListener(AI_SETTINGS_EVENT, handler);
  return () => window.removeEventListener(AI_SETTINGS_EVENT, handler);
}

/** Palette entry ids, most recent first — the empty-query state. */
export const recentsStore = createLocalStore<string[]>("cl_codextor_recents", (raw) => {
  try {
    const parsed: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string").slice(0, 8);
  } catch {
    return [];
  }
});

export function rememberRecent(id: string): void {
  const current = recentsStore.get();
  recentsStore.set([id, ...current.filter((v) => v !== id)].slice(0, 8));
}
