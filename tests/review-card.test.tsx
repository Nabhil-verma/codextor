// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ReviewCard from "../src/components/gamification/ReviewCard";
import { MANIFEST_TRACKS } from "../src/data/manifest";
import { loadTrack } from "../src/data/loadTrack";
import { saveProgress } from "../src/lib/progress";
import { loadReviewDays, loadReviews } from "../src/lib/reviewStore";
import { todayKey } from "../src/lib/gamification";

/*
 * The card end to end: a shaky lesson seeds a question, the learner answers it,
 * the box moves up and the day's XP is logged. localStorage is the only
 * persistence layer involved, so jsdom is enough.
 */

function firstQuizLesson() {
  for (const track of MANIFEST_TRACKS) {
    const lesson = track.lessons.find((l) => l.quizCount > 0);
    if (lesson) return { track, lesson };
  }
  throw new Error("no quiz lesson in the manifest");
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("ReviewCard", () => {
  it("seeds the queue from a shaky lesson and lets the learner recall it", async () => {
    const { track, lesson } = firstQuizLesson();
    saveProgress({ completed: { [track.id + "/" + lesson.id]: 0.4 } });
    const loaded = await loadTrack(track.id);
    const question = loaded!.lessons.find((l) => l.id === lesson.id)!.quiz[0];

    render(
      <MemoryRouter>
        <ReviewCard />
      </MemoryRouter>,
    );

    const start = screen.getByRole("button", { name: /start review/i }) as HTMLButtonElement;
    expect(start.disabled).toBe(true); // no queue yet
    await waitFor(() => {
      expect((screen.getByRole("button", { name: /start review/i }) as HTMLButtonElement).disabled).toBe(false);
    });

    fireEvent.click(screen.getByRole("button", { name: /start review/i }));
    expect(await screen.findByText(question.q)).toBeTruthy();

    const correct = question.options[question.answer];
    fireEvent.click(screen.getByRole("button", { name: correct }));

    expect(await screen.findByText(/Correct/)).toBeTruthy();
    await waitFor(() => {
      expect(loadReviewDays()[todayKey()]).toBe(1);
    });
    const queued = loadReviews();
    const item = Object.values(queued)[0];
    expect(item.box).toBe(1);
    expect(item.dueDay).not.toBe(todayKey());
  });

  it("says the queue is empty when nothing has been missed", () => {
    saveProgress({ completed: {} });
    render(
      <MemoryRouter>
        <ReviewCard />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Nothing queued yet/)).toBeTruthy();
  });
});
