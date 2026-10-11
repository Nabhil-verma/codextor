/*
 * Taxonomy wiring used to live in `data/index.ts`, which imports every track.
 * It moved here so a single track can be loaded on its own: the lesson route
 * imports one `track-*.ts` plus this module, and the rest of the curriculum
 * stays out of the chunk.
 */
import { debugChallenge } from "./debug-challenges";
import type { Track } from "./types";

const TAXONOMY_WIRING: Record<string, string> = {
  "web/es6-syntax": "semantics-refactor",
  "dsa/big-o": "quadratic-dedupe",
  "dsa/sorting": "ai-sort-comparator",
  "react/hooks-effect": "invented-helpers",
  "backend/api-security": "trusted-role-header",
};

export function wireTrack(track: Track): Track {
  return {
    ...track,
    lessons: track.lessons.map((lesson) => {
      const id = TAXONOMY_WIRING[`${track.id}/${lesson.id}`];
      if (!id) return lesson;
      return { ...lesson, debug: debugChallenge(id) };
    }),
  };
}

