import type { Lesson } from "../data/types";
import { attemptsFor, bestScore, loadTelemetry, recordAttempt, type AttemptElement } from "./telemetry";

export function requiredExerciseIds(lesson: Lesson): string[] {
  return [
    ...(lesson.catchTests ?? []).map(x => x.id),
    ...(lesson.transcripts ?? []).map(x => x.id),
    ...(lesson.decisions ?? []).map(x => x.id),
    ...(lesson.reviews ?? []).map(x => x.id),
    ...(lesson.worktreeLab ? ["worktree-lab"] : []),
    ...(lesson.repo?.id.startsWith("judge-") ? [lesson.repo.id] : []),
    ...(lesson.debug?.diagnosis?.codes.includes("TG") ? [lesson.debug.id] : []),
    ...(lesson.starter && lesson.check && lesson.reviewed ? ["code"] : []),
    ...(lesson.rubric && lesson.reviewed ? [lesson.rubric.id] : []),
  ];
}

/** New multi-artifact lessons require quiz AND every required exercise. Legacy scores stay intact. */
export function evidenceScore(key: string, ids: string[]): number {
  const t = loadTelemetry();
  if (ids.length === 0) return bestScore(t, key);
  return Math.min(bestScore(t, key, "quiz"), ...ids.map(id => bestScore(t, `${key}#${id}`)));
}

export function submitExercise(key: string, id: string, element: AttemptElement, score: number, day: string): void {
  recordAttempt({ key: `${key}#${id}`, element, score, day });
}

export function exerciseEvidence(key: string, id: string) {
  return attemptsFor(loadTelemetry(), `${key}#${id}`);
}
