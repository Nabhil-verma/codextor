/*
 * Atlas interview (layer 1 of the loop). Every question is optional. A skipped
 * interview, or any unanswered question, falls back to the default plan, so the
 * app never needs an answer to work. The rules here are fixed: no AI is used,
 * and the same answers always give the same plan.
 */
import { LANES, laneById, type Lane } from "../data/roadmap-lanes";

export type InterviewGroup = "start" | "planet" | "weekly";

type Option = { id: string; label: string };

type ChoiceQuestion = {
  id: string;
  group: InterviewGroup;
  kind: "choice";
  prompt: string;
  options: Option[];
};

type TextQuestion = {
  id: string;
  group: InterviewGroup;
  kind: "text";
  prompt: string;
};

export type InterviewQuestion = ChoiceQuestion | TextQuestion;

/** Answers by question id. A missing key means the question was skipped. */
export type InterviewAnswers = Partial<Record<string, string>>;

/** A complete saved interview. Newer revisions include deliberate skips. */
export type AtlasState = { answers: InterviewAnswers; revision: number };

export function sanitizeAtlasAnswers(raw: unknown): InterviewAnswers {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const record = raw as Record<string, unknown>;
  const out: InterviewAnswers = {};
  for (const question of INTERVIEW_QUESTIONS) {
    const value = record[question.id];
    if (typeof value !== "string") continue;
    if (question.kind === "choice" && !question.options.some((o) => o.id === value)) continue;
    out[question.id] = value.slice(0, 200);
  }
  return out;
}

/** Total order: newer revision wins; sorted content breaks equal-revision ties. */
export function mergeAtlasState(a: AtlasState, b: AtlasState): AtlasState {
  if (a.revision !== b.revision) return a.revision > b.revision ? a : b;
  const serial = (state: AtlasState) => JSON.stringify(
    Object.entries(state.answers).filter(([, value]) => value !== undefined).sort(([x], [y]) => x.localeCompare(y)),
  );
  return serial(a) >= serial(b) ? a : b;
}

export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  // Start: asked once, before the first plan.
  {
    id: "goal",
    group: "start",
    kind: "choice",
    prompt: "What is your goal?",
    options: LANES.map((lane) => ({ id: lane.id, label: lane.title })),
  },
  {
    id: "level",
    group: "start",
    kind: "choice",
    prompt: "Have you written a web page before?",
    options: [
      { id: "never", label: "Never" },
      { id: "some", label: "A little" },
      { id: "comfortable", label: "Comfortably" },
    ],
  },
  {
    id: "hours",
    group: "start",
    kind: "choice",
    prompt: "Hours per week?",
    options: [
      { id: "1-3", label: "1–3" },
      { id: "4-7", label: "4–7" },
      { id: "8-12", label: "8–12" },
      { id: "13+", label: "13+" },
    ],
  },
  {
    id: "deadline",
    group: "start",
    kind: "choice",
    prompt: "Do you have a deadline?",
    options: [
      { id: "none", label: "No deadline" },
      { id: "weeks", label: "Within a few weeks" },
      { id: "months", label: "Within a few months" },
    ],
  },
  {
    id: "device",
    group: "start",
    kind: "choice",
    prompt: "What will you learn on?",
    options: [
      { id: "laptop", label: "Laptop" },
      { id: "desktop", label: "Desktop" },
      { id: "phone", label: "Phone" },
      { id: "tablet", label: "Tablet" },
    ],
  },
  {
    id: "stack",
    group: "start",
    kind: "choice",
    prompt: "Favourite stack?",
    options: [
      { id: "react", label: "React" },
      { id: "plain", label: "Plain JavaScript" },
      { id: "python", label: "Python" },
      { id: "none", label: "No preference" },
    ],
  },
  {
    id: "ship",
    group: "start",
    kind: "text",
    prompt: "What do you want to ship? (optional)",
  },
  // After each planet.
  {
    id: "hard",
    group: "planet",
    kind: "text",
    prompt: "What was hard?",
  },
  {
    id: "still-want",
    group: "planet",
    kind: "choice",
    prompt: "Do you still want this goal?",
    options: [
      { id: "yes", label: "Yes" },
      { id: "unsure", label: "Not sure" },
      { id: "change", label: "Change my goal" },
    ],
  },
  // Weekly retro.
  {
    id: "pace",
    group: "weekly",
    kind: "choice",
    prompt: "How was this week?",
    options: [
      { id: "ahead", label: "Ahead" },
      { id: "on-pace", label: "On pace" },
      { id: "behind", label: "Behind" },
    ],
  },
  {
    id: "change-next",
    group: "weekly",
    kind: "text",
    prompt: "One thing to change next week? (optional)",
  },
];

/** Hours for each "hours" answer, at the middle of its range. */
const HOURS_MIDPOINT: Record<string, number> = {
  "1-3": 2,
  "4-7": 5,
  "8-12": 10,
  "13+": 14,
};

const DEFAULT_LANE: Lane = LANES[0];

/** The plan for a learner who skipped the interview. */
export const DEFAULT_ANSWERS: InterviewAnswers = {};

export type Plan = {
  laneId: string;
  hoursPerWeek: number;
};

export function defaultPlan(): Plan {
  return planFromAnswers(DEFAULT_ANSWERS);
}

/**
 * Turn answers into a plan. Any answer that is missing or not recognised falls
 * back to the default, so a bad or stale value can never produce a plan with no
 * lane or no hours.
 */
export function planFromAnswers(answers: InterviewAnswers): Plan {
  const lane = (answers.goal !== undefined ? laneById(answers.goal) : undefined) ?? DEFAULT_LANE;
  const hoursPerWeek =
    (answers.hours !== undefined ? HOURS_MIDPOINT[answers.hours] : undefined) ?? 5;
  return { laneId: lane.id, hoursPerWeek };
}

/**
 * Merge two sets of answers. Commutative and idempotent, like the claim log:
 * when both sides answered the same question, the larger value wins (a total
 * order, so the result never depends on which side came first). A question that
 * neither side answered stays skipped; no value is ever invented.
 */
export function mergeAnswers(a: InterviewAnswers, b: InterviewAnswers): InterviewAnswers {
  const out: InterviewAnswers = { ...a };
  for (const [id, value] of Object.entries(b)) {
    if (value === undefined) continue;
    const mine = out[id];
    if (mine === undefined || value > mine) out[id] = value;
  }
  return out;
}
