// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { tracks } from "../src/data";
import { loadProgress } from "../src/lib/progress";
import Lesson from "../src/pages/Lesson";
import { attemptCount, bestScore, firstScore, loadTelemetry } from "../src/lib/telemetry";

/*
 * Completion through the real lesson page: a perfect quiz run must write a
 * complete score for the lesson (that is what unlocks "✓ completed"), and a
 * run with a miss must not. Option order is random, so every pick is made by
 * its text, never by position.
 */

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
if (!("IntersectionObserver" in globalThis)) {
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = NoopObserver;
}
if (!("ResizeObserver" in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = NoopObserver;
}
window.scrollTo = (() => {}) as typeof window.scrollTo;
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

vi.mock("../src/lib/cloud", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/cloud")>();
  return {
    ...actual,
    useQuery: () => undefined,
    useMutation: () => vi.fn(() => Promise.resolve()),
  };
});

vi.mock("../src/AccountProvider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/AccountProvider")>();
  return {
    ...actual,
    useAccount: () =>
      ({
        user: { email: "ada@example.com", displayName: "Ada" },
        authReady: true,
        sync: "idle",
        signOutUser: async () => {},
        resetEverything: async () => {},
      }) as unknown as ReturnType<typeof actual.useAccount>,
  };
});

/** A lesson with a standard quiz and none of the specialised lab blocks. */
const SPECIAL = ["starter", "debug", "preview", "gitSim", "sandbox", "diff", "repo", "rubric", "sort"] as const;
function plainQuizLesson() {
  for (const track of tracks) {
    for (const lesson of track.lessons) {
      const fields = lesson as unknown as Record<string, unknown>;
      if (lesson.quiz.length > 0 && SPECIAL.every((k) => !fields[k])) return { track, lesson };
    }
  }
  throw new Error("no plain quiz lesson in the curriculum");
}

async function renderLesson(trackId: string, lessonId: string) {
  render(
    <MemoryRouter initialEntries={[`/learn/${trackId}/${lessonId}`]}>
      <Routes>
        <Route path="/learn/:trackId/:lessonId" element={<Lesson />} />
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() => {
    expect(screen.queryByText(/Opening the lesson/)).toBeNull();
    expect(screen.getByRole("button", { name: "Check answers" })).toBeTruthy();
  });
  return screen.getByRole("button", { name: "Check answers" }).closest(".card") as HTMLElement;
}

/** Picks an option by its text inside one question's fieldset. */
function pick(fieldset: Element, text: string) {
  const label = Array.from(fieldset.querySelectorAll("label")).find(
    (l) => (l.textContent ?? "").slice(1) === text,
  );
  fireEvent.click(label!.querySelector("input")!);
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("lesson completion through the quiz", () => {
  it("completes the lesson when every quiz answer is correct", async () => {
    const { track, lesson } = plainQuizLesson();
    const card = await renderLesson(track.id, lesson.id);
    const fieldsets = card.querySelectorAll("fieldset");
    expect(fieldsets).toHaveLength(lesson.quiz.length);

    lesson.quiz.forEach((q, i) => pick(fieldsets[i], q.options[q.answer]));
    fireEvent.click(screen.getByRole("button", { name: "Check answers" }));

    expect(within(card).getByRole("status").textContent).toMatch(/flawless/);
    expect(await screen.findByText(/✓ completed/)).toBeTruthy();
    const recorded = Object.entries(loadProgress().completed).filter(([key]) =>
      key.startsWith(`${track.id}/${lesson.id}!`),
    );
    expect(recorded).toHaveLength(1);
    expect(recorded[0][1]).toBe(1);
  });

  it("keeps the lesson in progress when one answer is wrong", async () => {
    const { track, lesson } = plainQuizLesson();
    const card = await renderLesson(track.id, lesson.id);
    const fieldsets = card.querySelectorAll("fieldset");

    lesson.quiz.forEach((q, i) => {
      const wrong = q.options.find((_, oi) => oi !== q.answer) ?? q.options[q.answer];
      pick(fieldsets[i], i === 0 ? wrong : q.options[q.answer]);
    });
    fireEvent.click(screen.getByRole("button", { name: "Check answers" }));

    expect(within(card).getByRole("status").textContent).toMatch(/review and retry/);
    expect(screen.queryByText(/✓ completed/)).toBeNull();
    expect(await screen.findByText(/in progress/)).toBeTruthy();
    const recorded = Object.entries(loadProgress().completed).filter(([key]) =>
      key.startsWith(`${track.id}/${lesson.id}!`),
    );
    for (const [, score] of recorded) expect(score).toBeLessThan(1);
  });
});

describe("attempt log across a retry", () => {
  it("keeps the first attempt's authored score as first, and the perfect retry as best", async () => {
    const { track, lesson } = plainQuizLesson();
    const key = `${track.id}/${lesson.id}`;
    const card = await renderLesson(track.id, lesson.id);

    // First attempt: wrong on question 1 only; every other pick is correct.
    let fieldsets = card.querySelectorAll("fieldset");
    lesson.quiz.forEach((q, i) => {
      const wrong = q.options.find((_, oi) => oi !== q.answer) ?? q.options[q.answer];
      pick(fieldsets[i], i === 0 ? wrong : q.options[q.answer]);
    });
    fireEvent.click(screen.getByRole("button", { name: "Check answers" }));
    fireEvent.click(within(card).getByRole("button", { name: "Retry" }));

    // Retry: the order has been re-rolled; picks are still made by text.
    fieldsets = card.querySelectorAll("fieldset");
    lesson.quiz.forEach((q, i) => pick(fieldsets[i], q.options[q.answer]));
    fireEvent.click(screen.getByRole("button", { name: "Check answers" }));
    expect(within(card).getByRole("status").textContent).toMatch(/flawless/);

    const telemetry = loadTelemetry();
    const expectedFirst = (lesson.quiz.length - 1) / lesson.quiz.length;
    expect(attemptCount(telemetry, key, "quiz")).toBe(2);
    expect(firstScore(telemetry, key, "quiz")).toBeCloseTo(expectedFirst, 10);
    expect(bestScore(telemetry, key, "quiz")).toBe(1);
    for (const attempt of telemetry.attempts) {
      expect(attempt.score).toBeGreaterThanOrEqual(0);
      expect(attempt.score).toBeLessThanOrEqual(1);
    }
  });
});
