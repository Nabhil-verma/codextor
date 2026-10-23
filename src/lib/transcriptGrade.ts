/* Deterministic grader for first-fault transcripts. Pure function, no model.
   Wrong step → 0 · right step, wrong classification → 0.5 · both right → 1. */
import type { TaxonomyCode } from "../data/bug-taxonomy";
import type { TranscriptCase } from "../data/transcripts";

export type TranscriptPick = { step: number | null; code: TaxonomyCode | null };

export function gradeTranscript(c: TranscriptCase, pick: TranscriptPick): number {
  if (pick.step !== c.firstBad) return 0;
  return pick.code === c.code ? 1 : 0.5;
}
