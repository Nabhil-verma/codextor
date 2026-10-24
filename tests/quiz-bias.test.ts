import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { tracks } from "../src/data";
import { flagEnabled } from "../src/lib/flags";
import { isPinnedOption } from "../src/lib/shuffle";

/*
 * Authored answer bias: a ratchet, not a quota.
 *
 * The curriculum's correct answers are heavily skewed (most land on one option
 * position, and the correct option is usually the longest). Shuffling fixes what
 * the learner sees, not what the authors wrote, so this test does not demand a
 * balanced quiz. It records each track's numbers in
 * tests/__fixtures__/quiz-bias-baseline.json and fails only if a track gets
 * WORSE by more than 2 percentage points on its worst answer position or its
 * longest-correct share.
 *
 * When content is deliberately improved, regenerate the baseline and commit it
 * with the content change:
 *
 *   UPDATE_QUIZ_BIAS_BASELINE=1 npx vitest run tests/quiz-bias.test.ts
 *
 * The worst tracks are always printed (agents first) as information, never as a
 * failure. Do not rewrite questions just to satisfy this file.
 */

const BASELINE_PATH = fileURLToPath(new URL("./__fixtures__/quiz-bias-baseline.json", import.meta.url));
const TOLERANCE = 0.02;

type Item = { options: string[]; answer: number };

type Surface = {
  n: number;
  /** Share of items whose correct answer sits at each index. */
  indexShares: number[];
  maxIndexShare: number;
  /** Share of items whose correct option is strictly the longest. */
  longestShare: number;
  /** Items whose correct option is the longest or tied for the longest, as a count. */
  longestOrTiedCount: number;
  /** Share of items whose correct option is the longest or tied for the longest. */
  longestOrTiedShare: number;
};

type Snapshot = {
  tracks: Record<string, { quiz: Surface; predict: Surface }>;
  global: { quiz: Surface; predict: Surface };
  /**
   * Global surfaces per flag configuration. A single `global` cannot serve both
   * the default build and the all-flags build: they contain different tracks,
   * so the denominators differ. Each configuration ratchets against its own
   * entry; `global` stays as the fallback for baselines written before this.
   */
  globals?: Record<string, { quiz: Surface; predict: Surface }>;
  /**
   * Per-track surfaces per flag configuration. Track membership itself moves
   * with the flags — `python-llm-api` relocates to Agent Internals when that
   * track is enabled — so one set of per-track numbers cannot cover both
   * builds. Each configuration ratchets against the tracks it actually has.
   */
  tracksByConfig?: Record<string, Record<string, { quiz: Surface; predict: Surface }>>;
};

/**
 * Which build this run represents. The all-flags portfolio includes tracks the
 * default build hides, so it needs its own global entry — and every track it
 * can expose needs its own per-track entry, which is why the baseline is
 * generated with all flags on before the default build is recorded.
 */
const CONFIG_LABEL =
  (["agentInternals", "fieldReports", "gitWorktreeLab", "byokInterrogation", "reviewerCertificate"] as const)
    .filter((name) => flagEnabled(name))
    .join("+") || "default";

const round4 = (x: number) => Math.round(x * 10000) / 10000;

function surface(items: Item[]): Surface {
  const n = items.length;
  if (n === 0) {
    return { n: 0, indexShares: [], maxIndexShare: 0, longestShare: 0, longestOrTiedCount: 0, longestOrTiedShare: 0 };
  }
  const width = Math.max(...items.map((item) => item.options.length));
  const counts = new Array<number>(width).fill(0);
  let longest = 0;
  let longestOrTied = 0;
  for (const item of items) {
    counts[item.answer]++;
    const length = item.options[item.answer].length;
    if (item.options.every((text, i) => i === item.answer || text.length < length)) longest++;
    if (item.options.every((text, i) => i === item.answer || text.length <= length)) longestOrTied++;
  }
  const indexShares = counts.map((count) => round4(count / n));
  return {
    n,
    indexShares,
    maxIndexShare: Math.max(...indexShares),
    longestShare: round4(longest / n),
    longestOrTiedCount: longestOrTied,
    longestOrTiedShare: round4(longestOrTied / n),
  };
}

function snapshot(): Snapshot {
  const quizAll: Item[] = [];
  const predictAll: Item[] = [];
  const perTrack: Snapshot["tracks"] = {};
  for (const track of tracks) {
    const quiz = track.lessons.flatMap((lesson) => lesson.quiz);
    const predict = track.lessons.flatMap((lesson) => lesson.predict ?? []);
    quizAll.push(...quiz);
    predictAll.push(...predict);
    perTrack[track.id] = { quiz: surface(quiz), predict: surface(predict) };
  }
  return {
    tracks: perTrack,
    global: { quiz: surface(quizAll), predict: surface(predictAll) },
  };
}

const pct = (share: number) => (share * 100).toFixed(1) + "%";

/** Every way the snapshot got worse than the baseline by more than the tolerance. */
function regressions(current: Snapshot, baseline: Snapshot): string[] {
  const problems: string[] = [];
  const compare = (where: string, now: Surface, was: Surface | undefined) => {
    if (!was) {
      problems.push(`${where}: no baseline entry — regenerate with UPDATE_QUIZ_BIAS_BASELINE=1`);
      return;
    }
    for (const metric of ["maxIndexShare", "longestShare"] as const) {
      if (now[metric] > was[metric] + TOLERANCE + 1e-9) {
        problems.push(`${where} ${metric}: ${pct(was[metric])} → ${pct(now[metric])} (worse by more than 2 points)`);
      }
    }
  };
  const global = baseline.globals?.[CONFIG_LABEL] ?? baseline.global;
  compare("global quiz", current.global.quiz, global.quiz);
  compare("global predict", current.global.predict, global.predict);
  for (const [id, now] of Object.entries(current.tracks)) {
    const was = baseline.tracksByConfig?.[CONFIG_LABEL]?.[id] ?? baseline.tracks[id];
    compare(`${id} quiz`, now.quiz, was?.quiz);
    compare(`${id} predict`, now.predict, was?.predict);
  }
  return problems;
}

function printWorstTracks(current: Snapshot) {
  const severity = (id: string) =>
    Math.max(current.tracks[id].quiz.maxIndexShare, current.tracks[id].quiz.longestShare);
  const others = Object.keys(current.tracks)
    .filter((id) => id !== "agents")
    .sort((a, b) => severity(b) - severity(a))
    .slice(0, 9);
  const rows = ["agents", ...others].filter((id) => current.tracks[id]).slice(0, 10);
  const lines = rows.map((id) => {
    const quiz = current.tracks[id].quiz;
    return `  ${id.padEnd(14)} n=${String(quiz.n).padStart(3)}  max-index=${pct(quiz.maxIndexShare).padStart(6)}  longest-correct=${pct(quiz.longestShare).padStart(6)}`;
  });
  console.info(
    "[quiz-bias] worst tracks (information only, agents first):\n" + lines.join("\n"),
  );
}

/**
 * The pinned-last rule (options that refer to other options stay at the end) is
 * itself a position cue. This reports how often it appears and how often the
 * pinned option is the correct one. Information only, never a failure.
 */
function printPinnedCue() {
  const count = (items: Item[]) => {
    const pinned = items.filter((item) => item.options.some(isPinnedOption));
    const pinnedCorrect = pinned.filter((item) => isPinnedOption(item.options[item.answer]));
    return { total: items.length, withPinned: pinned.length, pinnedCorrect: pinnedCorrect.length };
  };
  const quiz = tracks.flatMap((t) => t.lessons.flatMap((l) => l.quiz));
  const predict = tracks.flatMap((t) => t.lessons.flatMap((l) => l.predict ?? []));
  const q = count(quiz);
  const p = count(predict);
  console.info(
    `[quiz-bias] pinned-last cue: quiz ${q.withPinned}/${q.total} questions have a pinned option, ` +
      `${q.pinnedCorrect} with the pinned option correct; predict ${p.withPinned}/${p.total}, ${p.pinnedCorrect} correct.`,
  );
}

describe("quiz answer guards", () => {
  it("every quiz question and predict step has an integer answer in range and at least 2 options", () => {
    for (const track of tracks) {
      for (const lesson of track.lessons) {
        lesson.quiz.forEach((q, i) => {
          const where = `${track.id}/${lesson.id} quiz ${i}`;
          expect(q.options.length, where).toBeGreaterThanOrEqual(2);
          expect(Number.isInteger(q.answer), where).toBe(true);
          expect(q.answer, where).toBeGreaterThanOrEqual(0);
          expect(q.answer, where).toBeLessThan(q.options.length);
        });
        (lesson.predict ?? []).forEach((step, i) => {
          const where = `${track.id}/${lesson.id} predict ${i}`;
          expect(step.options.length, where).toBeGreaterThanOrEqual(2);
          expect(Number.isInteger(step.answer), where).toBe(true);
          expect(step.answer, where).toBeGreaterThanOrEqual(0);
          expect(step.answer, where).toBeLessThan(step.options.length);
        });
      }
    }
  });

  it("no explanation refers to an option by its letter", () => {
    // Shuffled options have no fixed letters, so an explanation that says "option B"
    // or "(B) is correct" would now point at the wrong answer.
    const LETTER_REFERENCE = [
      /\b[Oo]ptions? [A-D]\b/,
      /\b[Cc]hoices? [A-D]\b/,
      /\([A-D]\)/,
      /\b[A-D] (?:is|was) (?:the )?(?:correct|right|wrong)\b/,
      /\banswer (?:is|was) [A-D]\b/,
    ];
    const offenders: string[] = [];
    for (const track of tracks) {
      for (const lesson of track.lessons) {
        const texts = [
          ...lesson.quiz.map((q) => q.explanation),
          ...(lesson.predict ?? []).map((step) => step.explanation),
        ];
        for (const text of texts) {
          if (LETTER_REFERENCE.some((pattern) => pattern.test(text))) {
            offenders.push(`${track.id}/${lesson.id}: ${text}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("quiz answer bias ratchet", () => {
  it("does not let any track's answer-position or longest-correct share get worse than the baseline", () => {
    const current = snapshot();
    printWorstTracks(current);
    printPinnedCue();

    if (process.env.UPDATE_QUIZ_BIAS_BASELINE === "1") {
      mkdirSync(dirname(BASELINE_PATH), { recursive: true });
      // Merge rather than replace: regenerating under one flag set must not
      // delete the entries that cover the other one. `global` keeps the first
      // configuration recorded so older baselines still resolve.
      let existing: Snapshot | null = null;
      try {
        existing = JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as Snapshot;
      } catch {
        existing = null;
      }
      const merged: Snapshot = {
        tracks: { ...(existing?.tracks ?? {}), ...current.tracks },
        global: existing?.global ?? current.global,
        globals: { ...(existing?.globals ?? {}), [CONFIG_LABEL]: current.global },
        tracksByConfig: { ...(existing?.tracksByConfig ?? {}), [CONFIG_LABEL]: current.tracks },
      };
      writeFileSync(BASELINE_PATH, JSON.stringify(merged, null, 2) + "\n");
      console.info(`[quiz-bias] baseline regenerated for ${CONFIG_LABEL} at ${BASELINE_PATH}`);
      return;
    }

    const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as Snapshot;
    expect(regressions(current, baseline)).toEqual([]);
  });

  it("flags a real worsening and ignores an improvement (the ratchet is not vacuous)", () => {
    const flat = {
      n: 10,
      indexShares: [0.5, 0.5],
      maxIndexShare: 0.5,
      longestShare: 0.5,
      longestOrTiedCount: 5,
      longestOrTiedShare: 0.5,
    };
    const baseline: Snapshot = {
      tracks: { demo: { quiz: flat, predict: flat } },
      global: { quiz: flat, predict: flat },
    };
    const worse = { ...flat, maxIndexShare: 0.53 };
    const within = { ...flat, maxIndexShare: 0.52, longestShare: 0.4 };
    const worseCurrent: Snapshot = {
      tracks: { demo: { quiz: worse, predict: flat } },
      global: { quiz: flat, predict: flat },
    };
    const improvedCurrent: Snapshot = {
      tracks: { demo: { quiz: within, predict: flat } },
      global: { quiz: flat, predict: flat },
    };
    expect(regressions(worseCurrent, baseline).join("\n")).toMatch(/demo quiz maxIndexShare/);
    expect(regressions(improvedCurrent, baseline)).toEqual([]);
  });
});
