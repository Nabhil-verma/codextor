import { describe, expect, it } from "vitest";
import { tracks } from "../src/data";
import type { Lesson } from "../src/data/types";
import {
  isPinnedOption,
  rerollOptions,
  shuffleOptions,
  shuffleOrder,
  type ShuffledOptions,
} from "../src/lib/shuffle";
import { questionId } from "../src/lib/review";
import { seededItems, type QueueRef } from "../src/lib/reviewQueue";

/*
 * Option shuffling for every multiple-choice surface. The contract under test:
 * the displayed correct option is always the authored correct text, `order`
 * maps every displayed slot back to its authored index, pinned options that
 * refer to the others never move, and the review queue keys off the authored
 * question, so shuffling the view can't change what is stored.
 */

/** Small seeded PRNG so every "random" run in this file is reproducible. */
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

function isPermutation(order: number[], n: number): boolean {
  if (order.length !== n) return false;
  const sorted = [...order].sort((a, b) => a - b);
  return sorted.every((value, i) => value === i);
}

describe("isPinnedOption", () => {
  it("pins options that refer to the other options", () => {
    for (const text of [
      "All of the above",
      "None of these",
      "all of them",
      "Neither",
      "Both",
      "None.",
      "Neither — it's just faster HTTP",
      "Both A and B",
      "Neither A nor B",
    ]) {
      expect(isPinnedOption(text), text).toBe(true);
    }
  });

  it("leaves ordinary answers alone", () => {
    for (const text of ["Either works the same", "Both assign 5", "All hit B", "ABCD", "Read-only"]) {
      expect(isPinnedOption(text), text).toBe(false);
    }
  });
});

describe("shuffleOptions", () => {
  it("keeps the correct option's text and points options[answer] at it, for 1,000 seeded runs", () => {
    const options = ["alpha", "beta", "gamma", "delta"];
    for (let seed = 0; seed < 1000; seed++) {
      const answer = seed % options.length;
      const view = shuffleOptions(options, answer, mulberry32(seed));
      expect(view.options[view.answer]).toBe(options[answer]);
    }
  });

  it("returns an order that is a permutation with order[view.answer] equal to the authored answer", () => {
    const options = ["w", "x", "y", "z", "q"];
    for (let seed = 0; seed < 300; seed++) {
      const answer = seed % options.length;
      const view = shuffleOptions(options, answer, mulberry32(seed));
      expect(isPermutation(view.order, options.length)).toBe(true);
      expect(view.order[view.answer]).toBe(answer);
      expect(view.options).toEqual(view.order.map((i) => options[i]));
    }
  });

  it("never mutates the input array", () => {
    const input = ["a", "b", "c", "d"];
    const before = [...input];
    shuffleOptions(input, 2, mulberry32(7));
    expect(input).toEqual(before);
  });

  it("keeps pinned options last, in authored order, and never moves them", () => {
    const options = ["Alpha", "All of the above", "Beta", "Gamma", "None of these"];
    for (let seed = 0; seed < 200; seed++) {
      const view = shuffleOptions(options, 2, mulberry32(seed));
      expect(view.options.slice(3)).toEqual(["All of the above", "None of these"]);
      expect(view.order.slice(3)).toEqual([1, 4]);
      expect(view.options[view.answer]).toBe("Beta");
    }
  });

  it("moves a pinned correct answer to the end and keeps it correct", () => {
    const options = ["Alpha", "All of the above", "Beta"];
    const view = shuffleOptions(options, 1, () => 0);
    expect(view.options[view.options.length - 1]).toBe("All of the above");
    expect(view.answer).toBe(view.options.length - 1);
    expect(view.options[view.answer]).toBe("All of the above");
  });

  it("maps duplicate option text back by index, not by text", () => {
    const options = ["same", "same", "other", "x"];
    for (let seed = 0; seed < 200; seed++) {
      const view = shuffleOptions(options, 1, mulberry32(seed));
      expect(view.options[view.answer]).toBe("same");
      expect(view.order[view.answer]).toBe(1);
    }
  });

  it("throws a descriptive error when the answer is not an index into the options", () => {
    const options = ["a", "b", "c", "d"];
    for (const bad of [-1, 4, 1.5, Number.NaN]) {
      expect(() => shuffleOptions(options, bad), `answer ${bad}`).toThrow(/answer must be an integer index/);
    }
    expect(() => shuffleOptions([], 0)).toThrow(/answer must be an integer index/);
  });

  it("returns a single option unchanged", () => {
    expect(shuffleOptions(["only"], 0)).toEqual({ options: ["only"], answer: 0, order: [0] });
  });

  it("is deterministic for an injected rng", () => {
    const options = ["x", "y", "z", "w"];
    // rng always 0: Fisher–Yates walks each movable slot to the front.
    const view = shuffleOptions(options, 0, () => 0);
    expect(view.options).toEqual(["y", "z", "w", "x"]);
    expect(view.order).toEqual([1, 2, 3, 0]);
    expect(view.answer).toBe(3);
  });

  it("keeps a clamped rng from indexing outside the options", () => {
    const view = shuffleOptions(["a", "b", "c", "d"], 0, () => 1);
    expect(isPermutation(view.order, 4)).toBe(true);
    expect(shuffleOrder(["a", "b", "c"], () => -0.5)).toHaveLength(3);
  });
});

describe("shuffleOptions uniformity", () => {
  it("lands the correct answer in every position 15%–35% of the time over 1,000 seeded shuffles", () => {
    const options = ["w", "x", "y", "z"];
    const landed = [0, 0, 0, 0];
    for (let seed = 0; seed < 1000; seed++) {
      const view = shuffleOptions(options, seed % 4, mulberry32(seed));
      landed[view.answer]++;
    }
    for (let position = 0; position < 4; position++) {
      const share = landed[position] / 1000;
      expect(share, `position ${position}`).toBeGreaterThanOrEqual(0.15);
      expect(share, `position ${position}`).toBeLessThanOrEqual(0.35);
    }
  });
});

describe("rerollOptions", () => {
  it("changes the order on every retry when at least two options can move", () => {
    const options = ["w", "x", "y", "z"];
    const previous: ShuffledOptions = shuffleOptions(options, 0, () => 0);
    for (let seed = 0; seed < 200; seed++) {
      const next = rerollOptions(options, 0, previous, mulberry32(seed));
      expect(next.order).not.toEqual(previous.order);
      expect(next.options[next.answer]).toBe("w");
    }
  });

  it("still changes the order when the rng keeps returning the same draw", () => {
    const options = ["w", "x", "y", "z"];
    const previous = shuffleOptions(options, 0, () => 0);
    const next = rerollOptions(options, 0, previous, () => 0);
    expect(next.order).not.toEqual(previous.order);
    expect(isPermutation(next.order, 4)).toBe(true);
  });

  it("cannot change the order when nothing is movable", () => {
    const options = ["Alpha", "All of the above"];
    const previous = shuffleOptions(options, 0, () => 0);
    expect(rerollOptions(options, 0, previous).order).toEqual(previous.order);
  });
});

describe("review-queue keys stay on the authored question", () => {
  function firstQuiz(): { trackId: string; lessonId: string; lesson: Lesson } {
    for (const track of tracks) {
      for (const lesson of track.lessons) {
        if (lesson.quiz.length > 0) return { trackId: track.id, lessonId: lesson.id, lesson };
      }
    }
    throw new Error("no quiz in the curriculum");
  }

  it("produces identical keys and snapshots before and after shuffling the same question", () => {
    const { trackId, lessonId, lesson } = firstQuiz();
    const quiz = lesson.quiz[0];
    const authoredOptions = [...quiz.options];
    const lessonsByTrack = new Map([[trackId, [lesson]]]);
    const ref: QueueRef = { key: `${trackId}/${lessonId}`, trackId, lessonId, label: lesson.title };

    const keyBefore = questionId(trackId, lessonId, quiz.q);
    const itemBefore = seededItems([ref], lessonsByTrack, "2026-10-11", 0)[0];

    for (let seed = 0; seed < 50; seed++) {
      shuffleOptions(quiz.options, quiz.answer, mulberry32(seed));
    }

    expect(questionId(trackId, lessonId, quiz.q)).toBe(keyBefore);
    const itemAfter = seededItems([ref], lessonsByTrack, "2026-10-11", 0)[0];
    expect(itemAfter.id).toBe(itemBefore.id);
    expect(itemAfter.snapshot).toEqual(itemBefore.snapshot);
    expect(quiz.options).toEqual(authoredOptions);
    expect(itemAfter.snapshot?.options).toEqual(authoredOptions);
    expect(itemAfter.snapshot?.answer).toBe(quiz.answer);
  });
});
