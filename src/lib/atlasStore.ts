import { createLocalStore } from "./localStore";
import { sanitizeAtlasAnswers, type AtlasState } from "./atlasInterview";
export { mergeAtlasState } from "./atlasInterview";

const stores = new Map<string, ReturnType<typeof createLocalStore<AtlasState>>>();

export function atlasStoreFor(username?: string) {
  const key = username ? `clr-atlas-answers-v1:${encodeURIComponent(username)}` : "clr-atlas-answers-v1";
  let store = stores.get(key);
  if (!store) {
    store = createLocalStore<AtlasState>(key, (raw) => {
      try {
        const parsed: unknown = JSON.parse(raw ?? "{}");
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { answers: {}, revision: 0 };
        const record = parsed as Record<string, unknown>;
        return {
          answers: sanitizeAtlasAnswers(record.answers ?? record),
          revision: typeof record.revision === "number" && Number.isSafeInteger(record.revision) && record.revision >= 0
            ? record.revision : 0,
        };
      } catch {
        return { answers: {}, revision: 0 };
      }
    });
    stores.set(key, store);
  }
  return store;
}

export function saveAtlasAnswers(username: string | undefined, answers: AtlasState["answers"]) {
  const store = atlasStoreFor(username);
  store.set({ answers: sanitizeAtlasAnswers(answers), revision: Math.max(Date.now(), store.get().revision + 1) });
}
