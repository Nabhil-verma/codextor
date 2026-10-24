/*
 * Roadmap lanes: plain data plans a learner can start from. A lane names the
 * tracks and project milestones it covers. It holds no progress and no logic,
 * so the plan generator and the map can both read it.
 *
 * tests/roadmap-lanes.test.ts checks every id against the track registry and
 * the project milestones.
 */
export type Lane = {
  id: string;
  title: string;
  blurb: string;
  /** Rough pace, shown as a hint. The pace forecast will compute real dates. */
  weeksHint: string;
  /** Track ids from the registry (`tracks` in ./index). */
  trackIds: string[];
  /** Milestone ids from `MILESTONES` (src/lib/milestones.ts). */
  milestoneIds: string[];
};

export const LANES: Lane[] = [
  {
    id: "junior-frontend",
    title: "Junior frontend",
    blurb: "HTML, CSS, JavaScript and React, with the API and state basics a first frontend job asks for.",
    weeksHint: "8–12 weeks",
    trackIds: ["web", "react", "tailwind", "api", "state"],
    milestoneIds: ["m-shell", "m-style", "m-interactive", "m-data"],
  },
  {
    id: "fullstack-agents",
    title: "Full-stack + agents",
    blurb: "Front end, backend and TypeScript, plus the skills to direct a coding agent and verify its work.",
    weeksHint: "12–16 weeks",
    trackIds: ["web", "react", "backend", "typescript", "git", "agents"],
    milestoneIds: ["m-interactive", "m-data", "m-persist", "m-ship"],
  },
  {
    id: "school-project-4w",
    title: "4-week school project",
    blurb: "A focused four weeks: a semantic page, a styled component and one working data flow.",
    weeksHint: "4 weeks",
    trackIds: ["web", "react", "tailwind"],
    milestoneIds: ["m-shell", "m-style", "m-interactive"],
  },
  {
    id: "interview-prep",
    title: "Interview prep",
    blurb: "Data structures, JavaScript and TypeScript, and the written work that interviewers and reviewers read.",
    weeksHint: "6–8 weeks",
    trackIds: ["dsa", "typescript", "testing", "workflow"],
    milestoneIds: ["m-interactive", "m-persist"],
  },
];

/** The lane with this id, or `undefined` when no lane has it. */
export function laneById(id: string): Lane | undefined {
  return LANES.find((lane) => lane.id === id);
}
