// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { MotionGlobalConfig } from "framer-motion";
import type { ReactNode } from "react";
import Quiz from "../src/components/Quiz";
import RapidFire from "../src/components/gamification/RapidFire";
import PredictOutput from "../src/components/PredictOutput";
import DebugLab from "../src/components/DebugLab";
import RepoLab from "../src/components/RepoLab";
import type { DebugChallenge, PredictStep, QuizQuestion, RepoExercise } from "../src/data/types";
import { useShuffledOptions } from "../src/lib/shuffle";
import ReviewCard from "../src/components/gamification/ReviewCard";
import { MemoryRouter } from "react-router-dom";
import { addReviewItems, loadReviewDays, loadReviews } from "../src/lib/reviewStore";
import { todayKey } from "../src/lib/gamification";
import type { ReviewItem } from "../src/lib/review";

/*
 * Option order is presentation only. Each surface below is driven through its
 * real DOM with an injected (or stubbed) random source, and every assertion is
 * about what the learner sees or what gets scored: the displayed order changes
 * on retry, the correct text always scores, and a reshuffle never restarts a
 * running clock.
 */

if (typeof window.matchMedia !== "function") {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  };
});

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The option texts in the order they are shown, read from a Quiz's labels. */
function shownQuizOptions(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("label")).map((label) => (label.textContent ?? "").slice(1));
}

const QUIZ: QuizQuestion[] = [
  {
    q: "Pick the letter x",
    options: ["x", "y", "z", "w"],
    answer: 0,
    explanation: "x is the first letter of the set.",
  },
];

beforeEach(() => {
  MotionGlobalConfig.skipAnimations = true;
});

afterEach(() => {
  cleanup();
  MotionGlobalConfig.skipAnimations = false;
  vi.useRealTimers();
});

describe("Quiz", () => {
  it("renders the injected rng's order, scores the correct pick 1, and re-rolls on retry", () => {
    const onScore = vi.fn();
    const { container } = render(<Quiz questions={QUIZ} onScore={onScore} rng={() => 0} />);

    // rng = 0 walks Fisher–Yates to: y, z, w, x.
    expect(shownQuizOptions(container)).toEqual(["y", "z", "w", "x"]);
    expect(container.querySelector("label")?.textContent?.startsWith("A")).toBe(true);

    // The correct text "x" is displayed at position D.
    const radios = container.querySelectorAll('input[type="radio"]');
    fireEvent.click(radios[3]);
    fireEvent.click(screen.getByRole("button", { name: "Check answers" }));

    expect(onScore).toHaveBeenCalledTimes(1);
    expect(onScore).toHaveBeenCalledWith(1);
    expect(screen.getByRole("status").textContent).toContain("1/1");

    // A fully correct run still shows the flawless state and the Retry control.
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    const reshuffled = shownQuizOptions(container);
    expect(reshuffled).not.toEqual(["y", "z", "w", "x"]);
    expect([...reshuffled].sort()).toEqual(["w", "x", "y", "z"]);
  });

  it("scores the correct text as 1 in two separate mounts with different seeds, in different orders", () => {
    const seen: string[][] = [];
    for (const seed of [11, 4242]) {
      const onScore = vi.fn();
      const { container, unmount } = render(
        <Quiz questions={QUIZ} onScore={onScore} rng={mulberry32(seed)} />,
      );
      seen.push(shownQuizOptions(container));
      const correctAt = shownQuizOptions(container).indexOf("x");
      fireEvent.click(container.querySelectorAll('input[type="radio"]')[correctAt]);
      fireEvent.click(screen.getByRole("button", { name: "Check answers" }));
      expect(onScore).toHaveBeenLastCalledWith(1);
      unmount();
    }
    expect(seen[0]).not.toEqual(seen[1]);
  });

  it("scores a wrong pick 0 after the order has been shuffled", () => {
    const onScore = vi.fn();
    const { container } = render(<Quiz questions={QUIZ} onScore={onScore} rng={() => 0} />);
    fireEvent.click(container.querySelectorAll('input[type="radio"]')[0]); // shows "y"
    fireEvent.click(screen.getByRole("button", { name: "Check answers" }));
    expect(onScore).toHaveBeenCalledWith(0);
  });
});

describe("RapidFire", () => {
  const RAPID: QuizQuestion[] = [
    { q: "First", options: ["alpha", "beta", "gamma"], answer: 2, explanation: "gamma." },
    { q: "Second", options: ["one", "two"], answer: 0, explanation: "one." },
  ];

  it("scores correct picks after shuffling and reports the run once", async () => {
    vi.useFakeTimers();
    const onScore = vi.fn();
    render(<RapidFire questions={RAPID} onScore={onScore} rng={mulberry32(5)} />);

    fireEvent.click(screen.getByText("gamma"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(950);
    });
    fireEvent.click(screen.getByText("one"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(950);
    });

    expect(screen.getByText("Flawless under pressure")).toBeTruthy();
    expect(onScore).toHaveBeenCalledTimes(1);
    expect(onScore).toHaveBeenCalledWith(1);
  });

  it("keeps the clock running and the order fixed when the parent re-renders", async () => {
    vi.useFakeTimers();
    const onScore = vi.fn();
    const { rerender } = render(<RapidFire questions={RAPID} onScore={onScore} rng={mulberry32(9)} />);

    const orderBefore = screen.getAllByRole("button").map((b) => b.textContent);
    // One second per act, so React flushes each countdown effect before the next tick.
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
    }
    expect(screen.getByLabelText("6 seconds left")).toBeTruthy();

    // Same content, new array identity: a parent re-render must not reshuffle
    // or restart the countdown.
    rerender(
      <RapidFire
        questions={RAPID.map((q) => ({ ...q, options: [...q.options] }))}
        onScore={onScore}
        rng={mulberry32(9)}
      />,
    );
    expect(screen.getByLabelText("6 seconds left")).toBeTruthy();
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(orderBefore);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByLabelText("5 seconds left")).toBeTruthy();
  });
});

describe("PredictOutput", () => {
  const STEPS: PredictStep[] = [
    {
      prompt: "What does this print?",
      code: "console.log(1 + 1)",
      options: ["alpha", "beta", "All of the above"],
      answer: 1,
      explanation: "beta is the sum.",
    },
  ];

  it("scores the correct text as solved after shuffling and keeps the pinned option last", () => {
    const { container } = render(<PredictOutput steps={STEPS} rng={() => 0} />);
    const buttons = Array.from(container.querySelectorAll("button")).filter((b) =>
      ["alpha", "beta", "All of the above"].includes((b.textContent ?? "").slice(1)),
    );
    expect(buttons.map((b) => (b.textContent ?? "").slice(1))).toEqual(["beta", "alpha", "All of the above"]);

    fireEvent.click(screen.getByText("beta"));
    expect(screen.getByText(/Correct\./)).toBeTruthy();
    expect(container.textContent).toContain("1/1 correct");
  });
});

describe("DebugLab diagnosis", () => {
  const CHALLENGE: DebugChallenge = {
    id: "shuffle-diag",
    title: "Diagnose it",
    brief: "The total is wrong.",
    broken: "console.log(1 + 1 + 1)",
    fixCheck: "output.trim() === '2'",
    win: "Fixed.",
    hints: [{ tier: 1, text: "Look at the sum." }],
    solution: "Remove the extra term.",
    fix: "console.log(1 + 1)",
    diagnosis: {
      prompt: "What kind of bug is it?",
      codes: ["RC", "EC", "SL"],
      answer: "EC",
    },
  };

  it("records the diagnosed code as right and earns partial credit regardless of its position", () => {
    const onScore = vi.fn();
    render(<DebugLab challenge={CHALLENGE} onScore={onScore} />);
    fireEvent.click(screen.getByText("EC"));
    fireEvent.click(screen.getByRole("button", { name: "Check diagnosis" }));
    expect(onScore).toHaveBeenCalledWith(0.5);
  });
});

describe("RepoLab select questions", () => {
  const EXERCISE: RepoExercise = {
    id: "shuffle-repo",
    title: "Trace the callers",
    brief: "Find the callers.",
    files: [{ path: "a.ts", content: "export const a = 1;" }],
    questions: [
      {
        kind: "select",
        prompt: "Which symbols are callers?",
        options: [
          { label: "alpha", correct: true },
          { label: "beta", correct: false },
          { label: "gamma", correct: true },
        ],
        why: "alpha and gamma call it.",
      },
    ],
  };

  it("scores the same per-option flags after the options are shuffled", () => {
    const onScore = vi.fn();
    render(<RepoLab exercise={EXERCISE} onScore={onScore} />);
    fireEvent.click(screen.getByText("alpha"));
    fireEvent.click(screen.getByText("gamma"));
    fireEvent.click(screen.getByRole("button", { name: /Submit answer/ }));
    expect(onScore).toHaveBeenLastCalledWith(1);
  });

  it("scores a wrong tick as 0 after the options are shuffled", () => {
    const onScore = vi.fn();
    render(<RepoLab exercise={EXERCISE} onScore={onScore} />);
    fireEvent.click(screen.getByText("beta"));
    fireEvent.click(screen.getByRole("button", { name: /Submit answer/ }));
    expect(onScore).toHaveBeenLastCalledWith(0);
  });
});

describe("useShuffledOptions", () => {
  it("holds its order across re-renders and redraws only when the question changes", () => {
    const { result, rerender } = renderHook(
      ({ options, answer }: { options: string[]; answer: number }) =>
        useShuffledOptions(options, answer, mulberry32(3)),
      { initialProps: { options: ["p", "q", "r", "s"], answer: 0 } },
    );
    const first = result.current.view.order;

    rerender({ options: ["p", "q", "r", "s"], answer: 0 });
    expect(result.current.view.order).toEqual(first);

    act(() => result.current.reshuffle());
    expect(result.current.view.order).not.toEqual(first);
    expect(result.current.view.options[result.current.view.answer]).toBe("p");

    rerender({ options: ["m", "n"], answer: 1 });
    expect(result.current.view.options[result.current.view.answer]).toBe("n");
    expect(result.current.view.options).toHaveLength(2);
  });
});

describe("Quiz scoring is independent of the drawn order", () => {
  it("reports the same score for the same authored picks in two different orders", () => {
    const questions: QuizQuestion[] = [
      { q: "one", options: ["p", "q", "r"], answer: 2, explanation: "r is right." },
      { q: "two", options: ["s", "t"], answer: 0, explanation: "s is right." },
    ];
    const pickAuthored = (fieldset: Element, text: string) => {
      const label = Array.from(fieldset.querySelectorAll("label")).find(
        (l) => (l.textContent ?? "").slice(1) === text,
      );
      fireEvent.click(label!.querySelector("input")!);
    };
    const run = (rng: () => number) => {
      const onScore = vi.fn();
      const { container, unmount } = render(<Quiz questions={questions} onScore={onScore} rng={rng} />);
      const fieldsets = container.querySelectorAll("fieldset");
      const firstOrder = shownQuizOptions(fieldsets[0] as HTMLElement);
      pickAuthored(fieldsets[0], "r"); // correct
      pickAuthored(fieldsets[1], "t"); // wrong
      fireEvent.click(screen.getByRole("button", { name: "Check answers" }));
      const score = onScore.mock.calls[0][0];
      unmount();
      return { score, firstOrder };
    };
    const constant = run(() => 0);
    const seeded = run(mulberry32(77));
    expect(constant.firstOrder).not.toEqual(seeded.firstOrder);
    expect(constant.score).toBe(0.5);
    expect(seeded.score).toBe(0.5);
  });
});

describe("ReviewCard answers", () => {
  afterEach(() => {
    localStorage.clear();
  });

  function seedDueItem(options: string[], answer: number): ReviewItem {
    const item: ReviewItem = {
      id: "shuffle-test-item",
      kind: "quiz",
      trackId: "demo",
      lessonId: "demo-lesson",
      label: "Shuffle test",
      box: 0,
      dueDay: todayKey(),
      lastAt: 0,
      snapshot: { prompt: "Pick the answer", options, answer, explanation: "Because." },
    };
    addReviewItems([item]);
    return item;
  }

  it("marks a wrong pick on a shuffled item and keeps the item shaky", async () => {
    seedDueItem(["alpha", "beta", "gamma"], 2);
    render(
      <MemoryRouter>
        <ReviewCard />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /start review/i }));
    expect(screen.getByRole("button", { name: "alpha" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "alpha" }));
    expect(await screen.findByText(/Not quite/)).toBeTruthy();
    const stored = loadReviews()["shuffle-test-item"];
    expect(stored.box).toBe(0);
    expect(stored.shaky).toBe(true);
  });

  it("keeps the authored order and never marks correct when the stored answer is invalid", async () => {
    seedDueItem(["x", "y"], -1);
    const { container } = render(
      <MemoryRouter>
        <ReviewCard />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /start review/i }));
    const shown = Array.from(container.querySelectorAll("ul li button")).map((b) => b.textContent);
    expect(shown).toEqual(["x", "y"]);
    fireEvent.click(screen.getByRole("button", { name: "y" }));
    expect(await screen.findByText(/Not quite/)).toBeTruthy();
    expect(screen.queryByText(/^Correct/)).toBeNull();
  });

  it("stores the same review state and day XP whichever order the options were drawn in", () => {
    const answerOnce = (draw: number) => {
      localStorage.clear();
      const spy = vi.spyOn(Math, "random").mockReturnValue(draw);
      seedDueItem(["alpha", "beta"], 1); // correct text: beta
      const { container, unmount } = render(
        <MemoryRouter>
          <ReviewCard />
        </MemoryRouter>,
      );
      fireEvent.click(screen.getByRole("button", { name: /start review/i }));
      const shown = Array.from(container.querySelectorAll("ul li button")).map((b) => b.textContent);
      fireEvent.click(screen.getByRole("button", { name: "beta" }));
      const stored = Object.fromEntries(
        Object.entries(loadReviews()).map(([id, item]) => [id, { ...item, lastAt: 0 }]),
      );
      const days = loadReviewDays();
      unmount();
      spy.mockRestore();
      return { shown, stored, days };
    };
    const low = answerOnce(0);
    const high = answerOnce(0.99);
    expect(low.shown).not.toEqual(high.shown);
    expect(high.stored).toEqual(low.stored);
    expect(high.days).toEqual(low.days);
    expect(Object.values(low.stored)[0].box).toBe(1);
  });
});

describe("RepoLab locate dropdowns", () => {
  const LOCATE: RepoExercise = {
    id: "shuffle-locate",
    title: "Find the function",
    brief: "Trace the call.",
    files: [{ path: "src/a.ts", content: "export const a = 1;" }],
    questions: [
      {
        kind: "locate",
        prompt: "Which function owns the rule?",
        choices: [
          { file: "src/a.ts", symbol: "alpha" },
          { file: "src/a.ts", symbol: "beta" },
          { file: "src/b.ts", symbol: "gamma" },
        ],
        answer: { file: "src/b.ts", symbol: "gamma" },
        why: "gamma owns it.",
      },
    ],
  };

  it("scores the file and function names after the dropdowns are shuffled", () => {
    const onScore = vi.fn();
    const { container } = render(<RepoLab exercise={LOCATE} onScore={onScore} />);
    const selects = container.querySelectorAll("select");
    expect(selects).toHaveLength(2);
    fireEvent.change(selects[0], { target: { value: "src/b.ts" } });
    fireEvent.change(selects[1], { target: { value: "gamma" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit answer/ }));
    expect(onScore).toHaveBeenLastCalledWith(1);
  });
});
