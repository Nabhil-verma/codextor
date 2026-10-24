/*
 * Atlas plan generator. Fixed rules only: the same answers always give the same
 * plan, and no AI is involved. The lesson order comes from the lane's track
 * order, and each lesson's minutes come from the generated manifest.
 */
import { MANIFEST_TRACKS, findLessonMeta, lessonKey } from "../data/manifest";
import { laneById } from "../data/roadmap-lanes";
import { planFromAnswers, type InterviewAnswers } from "./atlasInterview";

export type PlanStep = {
  key: string;
  trackId: string;
  lessonId: string;
  minutes: number;
};

export type GeneratedPlan = {
  laneId: string;
  hoursPerWeek: number;
  steps: PlanStep[];
  milestoneIds: string[];
  totalMinutes: number;
  /** Whole weeks at the planned pace, rounded up. */
  weeks: number;
};

export type PaceForecast = {
  remainingMinutes: number;
  /** Whole weeks left at the planned pace, rounded up. */
  weeks: number;
  /** `YYYY-MM-DD`, counted in UTC so it does not shift with the local timezone. */
  finishDate: string;
};

/**
 * Finish date for the lessons not yet done. `done` holds lesson keys the
 * learner has finished. `today` is `YYYY-MM-DD`, passed in so the result is
 * deterministic.
 */
export function paceForecast(
  plan: GeneratedPlan,
  done: ReadonlySet<string>,
  today: string,
): PaceForecast {
  const remainingMinutes = plan.steps
    .filter((s) => !done.has(s.key))
    .reduce((sum, s) => sum + s.minutes, 0);
  const weeks = Math.ceil(remainingMinutes / (plan.hoursPerWeek * 60));
  const [y, m, d] = today.split("-").map(Number);
  const start = Date.UTC(y, m - 1, d);
  const finishDate = new Date(start + weeks * 7 * 86_400_000).toISOString().slice(0, 10);
  return { remainingMinutes, weeks, finishDate };
}

export function generatePlan(answers: InterviewAnswers): GeneratedPlan {
  const base = planFromAnswers(answers);
  const lane = laneById(base.laneId);
  // planFromAnswers only returns lanes that exist, so this is a type guard.
  if (!lane) throw new Error(`unknown lane ${base.laneId}`);

  const steps: PlanStep[] = [];
  for (const trackId of lane.trackIds) {
    const track = MANIFEST_TRACKS.find((t) => t.id === trackId);
    if (!track) continue;
    for (const lesson of track.lessons) {
      const meta = findLessonMeta(trackId, lesson.id);
      if (!meta) continue;
      steps.push({
        key: lessonKey(trackId, lesson.id),
        trackId,
        lessonId: lesson.id,
        minutes: meta.minutes,
      });
    }
  }

  const totalMinutes = steps.reduce((sum, s) => sum + s.minutes, 0);
  const weekMinutes = base.hoursPerWeek * 60;
  return {
    laneId: lane.id,
    hoursPerWeek: base.hoursPerWeek,
    steps,
    milestoneIds: [...lane.milestoneIds],
    totalMinutes,
    weeks: Math.ceil(totalMinutes / weekMinutes),
  };
}
