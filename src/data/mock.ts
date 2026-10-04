import type {
  ChatMessage,
  CourseModule,
  DailyChallenge,
  LessonContent,
  Player,
  StatItem,
  TerminalLine,
  TestResult,
} from "../types";

/** Sample values for local previews only. Replace with your Convex queries. */

export const sampleStats: StatItem[] = [
  { value: "15", label: "Tracks" },
  { value: "74+", label: "Hands-on lessons" },
  { value: "0", label: "Cost to learn" },
  { value: "13", label: "Badges to earn" },
];

export const samplePlayers: Player[] = [
  { id: "p1", name: "Ananya Rao", handle: "ananya", title: "Debug Monk", level: 14, xp: 12480, xpIntoLevel: 480, xpForLevel: 1000, streak: 42, rank: 1, questsCompleted: 61 },
  { id: "p2", name: "Marcus Lee", handle: "mlee", title: "Loop Wrangler", level: 13, xp: 11905, xpIntoLevel: 905, xpForLevel: 1000, streak: 19, rank: 2, questsCompleted: 55 },
  { id: "p3", name: "Sofia Alvarez", handle: "sofia_a", title: "Type Whisperer", level: 12, xp: 10230, xpIntoLevel: 230, xpForLevel: 1000, streak: 27, rank: 3, questsCompleted: 49 },
  { id: "p4", name: "Dev Patel", handle: "devp", level: 11, xp: 9120, xpIntoLevel: 120, xpForLevel: 1000, streak: 11, rank: 4, questsCompleted: 44 },
  { id: "p5", name: "Chloe Martin", handle: "chloem", level: 10, xp: 8570, xpIntoLevel: 570, xpForLevel: 1000, streak: 8, rank: 5, questsCompleted: 40 },
  { id: "p6", name: "Noah Kim", handle: "noahk", level: 9, xp: 7340, xpIntoLevel: 340, xpForLevel: 1000, streak: 7, rank: 6, questsCompleted: 33 },
  { id: "p7", name: "Priya Singh", handle: "priyas", level: 8, xp: 6810, xpIntoLevel: 810, xpForLevel: 1000, streak: 15, rank: 7, questsCompleted: 31 },
  { id: "p8", name: "Tomás Ruiz", handle: "tomasr", level: 7, xp: 5995, xpIntoLevel: 995, xpForLevel: 1000, streak: 3, rank: 8, questsCompleted: 27 },
  { id: "p9", name: "Lena Fischer", handle: "lenaf", level: 7, xp: 5420, xpIntoLevel: 420, xpForLevel: 1000, streak: 5, rank: 9, questsCompleted: 25 },
];

export const sampleMe: Player = {
  id: "p6",
  name: "Noah Kim",
  handle: "noahk",
  title: "Loop Wrangler in training",
  level: 9,
  xp: 7340,
  xpIntoLevel: 340,
  xpForLevel: 1000,
  streak: 7,
  rank: 6,
  questsCompleted: 33,
};

export const sampleModules: CourseModule[] = [
  { id: "m1", title: "React foundations", blurb: "Components, props and state, built one small exercise at a time.", difficulty: "beginner", progress: 62, lessonsDone: 8, lessonsTotal: 13, etaMinutes: 75, tone: "cyan" },
  { id: "m2", title: "Tailwind UI engineering", blurb: "Layouts and polish without leaving your markup.", difficulty: "beginner", progress: 24, lessonsDone: 3, lessonsTotal: 12, etaMinutes: 110, tone: "violet" },
  { id: "m3", title: "Data structures", blurb: "Arrays, maps and trees you can reason about.", difficulty: "intermediate", progress: 8, lessonsDone: 1, lessonsTotal: 12, etaMinutes: 150, tone: "amber" },
  { id: "m4", title: "Backend with Node", blurb: "Routes, validation and talking to a database.", difficulty: "advanced", progress: 0, lessonsDone: 0, lessonsTotal: 10, etaMinutes: 180, tone: "emerald" },
];

export const sampleDaily: DailyChallenge = {
  id: "d1",
  title: "The loop that stops short",
  prompt: "A function that should add every even number returns the wrong total. Find why, using only the tutor's questions.",
  rewardXp: 120,
  etaMinutes: 10,
  difficulty: "beginner",
};

export const sampleLesson: LessonContent = {
  track: "JavaScript basics",
  title: "Looping over arrays",
  objective: "Make sumEvens return the total of every even number in the array, including the last one.",
  paragraphs: [
    "A for loop runs its body once for every value of the counter that satisfies the condition.",
    "Array indexes start at 0, so an array of length 3 has valid indexes 0, 1 and 2.",
    "Run the tests, read what fails, then ask the tutor about the line you suspect.",
  ],
};

export const sampleStarterCode = [
  "function sumEvens(nums) {",
  "  let total = 0;",
  "  for (let i = 0; i < nums.length - 1; i++) {",
  "    if (nums[i] % 2 === 0) total += nums[i];",
  "  }",
  "  return total;",
  "}",
  "",
  "console.log(sumEvens([2, 4, 6]));",
].join("\n");

export const sampleMessages: ChatMessage[] = [
  { id: "c1", role: "user", content: "Why does sumEvens([2, 4, 6]) print 6?" },
  {
    id: "c2",
    role: "socratic",
    content: "Your loop stops one step early. What index does the last item live at, and does i ever reach it?",
    hints: ["Show me a hint", "Walk me through the loop"],
  },
];

export const sampleOutput: TerminalLine[] = [
  { id: "o1", kind: "stdout", text: "6" },
  { id: "o2", kind: "error", text: "sumEvens([2, 4, 6]) expected 12, got 6" },
  { id: "o3", kind: "hint", text: "Which index does the loop never visit?" },
];

export const sampleTests: TestResult[] = [
  { id: "t1", name: "returns 0 for an empty array", status: "pass" },
  { id: "t2", name: "adds every even number", status: "fail", detail: "expected 12, got 6" },
  { id: "t3", name: "ignores odd numbers", status: "pass" },
];
