import { wireTrack } from "./wire";
import { MANIFEST_TRACKS, findLessonMeta, findTrackMeta } from "./manifest";
import type { Track } from "./types";

/** Old URLs continue to open the moved lesson, while disabled builds keep Python unchanged. */
export function lessonRoute(trackId: string, lessonId: string): LessonRef {
  if (trackId === "python" && lessonId === "python-llm-api" && findLessonMeta("agent-internals", lessonId)) return { trackId: "agent-internals", lessonId };
  if (trackId === "agent-internals" && lessonId === "mock-endpoint" && findLessonMeta(trackId, "python-llm-api")) return { trackId, lessonId: "python-llm-api" };
  return { trackId, lessonId };
}

/*
 * Lesson content is loaded one track at a time.
 *
 * `data/index.ts` imports all seventeen tracks, so anything that imports it
 * pulls the entire curriculum into that chunk. The lesson route instead
 * dynamic-imports the single `track-*.ts` it needs and wires the taxonomy
 * exercises on the way in (see ./wire.ts). tests/manifest-split.test.ts keeps
 * the entry path off the full registry.
 */

const trackModules = import.meta.glob<Record<string, unknown>>("./track-*.ts");

/** Loads and wires one track, or null when the id is unknown. */
export function loadTrack(trackId: string): Promise<Track | null> {
  if (!findTrackMeta(trackId)) return Promise.resolve(null);
  const loader = trackModules[`./track-${trackId}.ts`];
  if (!loader) return Promise.resolve(null);
  return loader().then((mod) => {
    const track = Object.values(mod).find(
      (value): value is Track =>
        !!value &&
        typeof value === "object" &&
        (value as Track).id === trackId &&
        Array.isArray((value as Track).lessons),
    );
    return track ? wireTrack(track) : null;
  });
}

export type LessonRef = { trackId: string; lessonId: string };

/** The lesson that follows this one in curriculum order, across tracks. */
export function nextLessonRef(trackId: string, lessonId: string): LessonRef | null {
  const ti = MANIFEST_TRACKS.findIndex((t) => t.id === trackId);
  if (ti === -1) return null;
  const track = MANIFEST_TRACKS[ti];
  const li = track.lessons.findIndex((l) => l.id === lessonId);
  if (li === -1) return null;
  if (li + 1 < track.lessons.length) {
    return { trackId: track.id, lessonId: track.lessons[li + 1].id };
  }
  const nextTrack = MANIFEST_TRACKS[ti + 1];
  if (!nextTrack || nextTrack.lessons.length === 0) return null;
  return { trackId: nextTrack.id, lessonId: nextTrack.lessons[0].id };
}

/** Runs work when the browser is idle, falling back to a short timer. */
export function prefetchOnIdle(work: () => void): void {
  const ric = (globalThis as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void })
    .requestIdleCallback;
  if (typeof ric === "function") {
    ric(work, { timeout: 3000 });
    return;
  }
  setTimeout(work, 1200);
}

/**
 * Warms the next lesson's chunk, and the TypeScript compiler when the next
 * lesson type-checks — so the 4 MB compiler lands while the learner is still
 * reading, not when they press Run.
 */
export function prefetchNextLesson(trackId: string, lessonId: string): void {
  const next = nextLessonRef(trackId, lessonId);
  if (!next) return;
  prefetchOnIdle(() => {
    void loadTrack(next.trackId);
    if (findLessonMeta(next.trackId, next.lessonId)?.lang === "ts") {
      void import("../lib/tsRunner");
    }
  });
}
