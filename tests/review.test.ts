// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  DAILY_REVIEW_XP_CAP,
  MAX_BOX,
  MAX_QUEUE,
  REVIEW_XP,
  addDaysKey,
  daysBetweenKeys,
  dueDayFor,
  dueItems,
  gradeReview,
  mergeReviews,
  newReviewItem,
  questionId,
  refixId,
  reviewQueueVisible,
  reviewXp,
  shakyLessons,
  weakSpots,
  type ReviewItem,
  type ReviewState,
} from "../src/lib/review";
import {
  loadReviews,
  mergeRemoteReviews,
  reviewStore,
  saveReviews,
  upsertReview,
} from "../src/lib/reviewStore";
import type { Attempt } from "../src/lib/telemetry";

/* #9: the Leitner schedule, the merge rule and the weak-spot map. */

const TODAY = "2026-05-10";
const NOW = 1_700_000_000_000;

const quizItem = (overrides: Partial<ReviewItem> = {}): ReviewItem => ({
  ...newReviewItem(
    {
      id: questionId("web", "fetch-api", "What does await do?"),
      kind: "quiz",
      trackId: "web",
      lessonId: "fetch-api",
      label: "What does await do?",
      snapshot: { prompt: "What does await do?", options: ["a", "b"], answer: 1 },
    },
    TODAY,
    NOW,
  ),
  ...overrides,
});

beforeEach(() => {
  localStorage.clear();
  reviewStore.reset();
});

describe("day keys", () => {
  it("adds days across month and year boundaries", () => {
    expect(addDaysKey("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDaysKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysKey("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("counts whole days between keys", () => {
    expect(daysBetweenKeys("2026-05-10", "2026-05-13")).toBe(3);
    expect(daysBetweenKeys("2026-05-13", "2026-05-10")).toBe(-3);
  });
});

describe("item keys", () => {
  it("is stable for the same question and differs across lessons", () => {
    const a = questionId("web", "fetch-api", "What does await do?");
    expect(a).toBe(questionId("web", "fetch-api", "What does await do?"));
    expect(a).not.toBe(questionId("web", "dom-events", "What does await do?"));
    expect(questionId("web", "dom-events", "A")).not.toBe(questionId("web", "dom-events", "B"));
  });

  it("namespaces quiz and re-fix items apart", () => {
    expect(refixId("web", "fetch-api")).toContain("web/fetch-api");
    expect(refixId("web", "fetch-api")).not.toBe(questionId("web", "fetch-api", "x"));
  });
});

describe("schedule", () => {
  it("uses the 1/3/7/21/60 ladder", () => {
    expect(dueDayFor(0, TODAY)).toBe(addDaysKey(TODAY, 1));
    expect(dueDayFor(1, TODAY)).toBe(addDaysKey(TODAY, 3));
    expect(dueDayFor(2, TODAY)).toBe(addDaysKey(TODAY, 7));
    expect(dueDayFor(3, TODAY)).toBe(addDaysKey(TODAY, 21));
    expect(dueDayFor(4, TODAY)).toBe(addDaysKey(TODAY, 60));
    expect(dueDayFor(5, TODAY)).toBe(addDaysKey(TODAY, 60));
  });

  it("a new mistake comes back tomorrow, not today", () => {
    expect(quizItem().dueDay).toBe(addDaysKey(TODAY, 1));
    expect(quizItem().box).toBe(0);
  });

  it("a correct answer moves up a box and pays XP", () => {
    const { item, xp } = gradeReview(quizItem({ box: 1 }), true, TODAY, NOW + 1);
    expect(item.box).toBe(2);
    expect(item.dueDay).toBe(addDaysKey(TODAY, 7));
    expect(item.shaky).toBe(false);
    expect(xp).toBe(REVIEW_XP);
  });

  it("caps the ladder at the last box", () => {
    const { item } = gradeReview(quizItem({ box: MAX_BOX }), true, TODAY, NOW);
    expect(item.box).toBe(MAX_BOX);
    expect(item.dueDay).toBe(addDaysKey(TODAY, 60));
  });

  it("a wrong answer drops to box 0, marks the lesson shaky and pays nothing", () => {
    const { item, xp } = gradeReview(quizItem({ box: 4 }), false, TODAY, NOW);
    expect(item.box).toBe(0);
    expect(item.dueDay).toBe(addDaysKey(TODAY, 1));
    expect(item.shaky).toBe(true);
    expect(xp).toBe(0);
    expect(shakyLessons({ [item.id]: item })).toHaveLength(1);
  });
});

describe("the daily queue", () => {
  const state = (): ReviewState => ({
    a: quizItem({ id: "a", dueDay: addDaysKey(TODAY, -5), label: "oldest" }),
    b: quizItem({ id: "b", dueDay: TODAY, lastAt: NOW - 1000 }),
    c: quizItem({ id: "c", dueDay: addDaysKey(TODAY, 3) }),
  });

  it("returns only what is due, oldest first", () => {
    expect(dueItems(state(), TODAY).map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("caps the queue", () => {
    const many: ReviewState = {};
    for (let i = 0; i < 12; i++) {
      many[`i${i}`] = quizItem({ id: `i${i}`, dueDay: addDaysKey(TODAY, -1) });
    }
    expect(dueItems(many, TODAY)).toHaveLength(MAX_QUEUE);
  });

  it("takes an explicit limit", () => {
    expect(dueItems(state(), TODAY, 1).map((i) => i.id)).toEqual(["a"]);
  });

  it("hides the queue from brand-new learners", () => {
    expect(reviewQueueVisible(0)).toBe(false);
    expect(reviewQueueVisible(1)).toBe(true);
  });
});

describe("XP", () => {
  it("pays per correct recall and stops at the daily cap", () => {
    expect(reviewXp(0)).toBe(0);
    expect(reviewXp(2)).toBe(2 * REVIEW_XP);
    expect(reviewXp(100)).toBe(DAILY_REVIEW_XP_CAP);
  });
});

describe("merge", () => {
  const mine: ReviewState = {
    a: quizItem({ id: "a", box: 3, lastAt: NOW }),
    b: quizItem({ id: "b", box: 1, lastAt: NOW - 500 }),
  };
  const theirs: ReviewState = {
    a: quizItem({ id: "a", box: 2, lastAt: NOW + 1000 }),
    b: quizItem({ id: "b", box: 5, lastAt: NOW - 900 }),
    c: quizItem({ id: "c", box: 0 }),
  };

  it("keeps the higher box", () => {
    const merged = mergeReviews(mine, theirs);
    expect(merged.a.box).toBe(3);
    expect(merged.b.box).toBe(5);
    expect(merged.c.box).toBe(0);
  });

  it("settles a tie with the later timestamp, both ways round", () => {
    const old = { a: quizItem({ id: "a", box: 2, lastAt: NOW }) };
    const fresh = { a: quizItem({ id: "a", box: 2, lastAt: NOW + 5_000 }) };
    expect(mergeReviews(old, fresh).a.lastAt).toBe(NOW + 5_000);
    expect(mergeReviews(fresh, old).a.lastAt).toBe(NOW + 5_000);
  });
});

describe("weak spots", () => {
  const attempts: Attempt[] = [
    { key: "web/fetch-api", element: "quiz", score: 0.5, day: TODAY, at: 1 },
    { key: "web/fetch-api", element: "quiz", score: 0.8, day: TODAY, at: 2 },
    { key: "dsa/big-o", element: "debug", score: 0, day: TODAY, at: 3 },
    { key: "web/dom-events", element: "quiz", score: 1, day: TODAY, at: 4 },
    { key: "react/hooks-effect", element: "quiz", score: 0.2, day: TODAY, at: 5 },
  ];
  const codes: Record<string, string> = {
    "web/fetch-api": "ID",
    "dsa/big-o": "EC",
    "react/hooks-effect": "HA",
  };

  it("counts misses by taxonomy code, worst first", () => {
    const spots = weakSpots(
      attempts,
      (t, l) => codes[`${t}/${l}`],
      (t, l) => `${t}:${l}`,
    );
    expect(spots.map((s) => s.code)).toEqual(["ID", "EC", "HA"]);
    expect(spots[0].misses).toBe(2);
    expect(spots[0].label).toBe("web:fetch-api");
  });

  it("ignores passes and lessons with no diagnosed code", () => {
    const spots = weakSpots(
      attempts,
      () => undefined,
      () => "x",
    );
    expect(spots).toEqual([]);
  });
});

describe("the store", () => {
  it("round-trips items and drops junk", () => {
    saveReviews({ a: quizItem({ id: "a" }) });
    expect(Object.keys(loadReviews())).toEqual(["a"]);

    localStorage.setItem(
      "cl_codextor_reviews",
      JSON.stringify({ good: quizItem({ id: "good" }), bad: { id: "bad" }, worse: 7 }),
    );
    expect(Object.keys(loadReviews())).toEqual(["good"]);
  });

  it("clamps a stored box to the ladder and the queue to a bound", () => {
    localStorage.setItem(
      "cl_codextor_reviews",
      JSON.stringify({ a: { ...quizItem({ id: "a" }), box: 99 } }),
    );
    expect(loadReviews().a.box).toBe(MAX_BOX);

    const many: ReviewState = {};
    for (let i = 0; i < 300; i++) many[`i${i}`] = quizItem({ id: `i${i}`, lastAt: i });
    saveReviews(many);
    expect(Object.keys(loadReviews()).length).toBe(200);
  });

  it("upserting never lowers a box", () => {
    saveReviews({ a: quizItem({ id: "a", box: 4 }) });
    upsertReview(quizItem({ id: "a", box: 1 }));
    expect(loadReviews().a.box).toBe(4);
  });

  it("merges the account's queue in", () => {
    saveReviews({ a: quizItem({ id: "a", box: 1 }) });
    mergeRemoteReviews({ a: quizItem({ id: "a", box: 3 }), b: quizItem({ id: "b" }) });
    const after = loadReviews();
    expect(after.a.box).toBe(3);
    expect(Object.keys(after).sort()).toEqual(["a", "b"]);
  });
});
