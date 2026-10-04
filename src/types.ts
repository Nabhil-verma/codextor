export type Tone = "cyan" | "violet" | "emerald" | "amber" | "rose";
export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface Player {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  title?: string;
  level: number;
  xp: number;
  xpIntoLevel: number;
  xpForLevel: number;
  streak: number;
  rank: number;
  questsCompleted: number;
}

export interface CourseModule {
  id: string;
  title: string;
  blurb: string;
  difficulty: Difficulty;
  /** 0 to 100 */
  progress: number;
  lessonsDone: number;
  lessonsTotal: number;
  etaMinutes: number;
  tone: Tone;
}

export interface DailyChallenge {
  id: string;
  title: string;
  prompt: string;
  rewardXp: number;
  etaMinutes: number;
  difficulty: Difficulty;
}

export interface ChatMessage {
  id: string;
  role: "user" | "socratic";
  content: string;
  hints?: string[];
}

export interface TestResult {
  id: string;
  name: string;
  status: "pass" | "fail";
  detail?: string;
}

export interface TerminalLine {
  id: string;
  kind: "stdout" | "pass" | "hint" | "error" | "info";
  text: string;
}

export interface LessonContent {
  track: string;
  title: string;
  objective: string;
  paragraphs: string[];
}

export interface RunOutcome {
  passed: boolean;
  xpAwarded?: number;
}

export interface StatItem {
  label: string;
  value: string;
}
