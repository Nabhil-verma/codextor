import { describe, expect, it } from "vitest";
import { MANIFEST_TRACKS } from "../src/data/manifest";
import { loadTrack } from "../src/data/loadTrack";
import { dailyQuests, dayQuestBonus, questsDoneToday, totalXp } from "../src/lib/gamification";
import type { Progress } from "../src/lib/progress";
import { reviewXp, reviewXpTotal, reviewXpInRange, nextDueDay, seedItem } from "../src/lib/review";
import { queuedLessons, seededItems, shakyRefs } from "../src/lib/reviewQueue";

/*
 * The Review 5 wiring: where the queue comes from, what a recall pays, and how
 * that XP reaches the derived totals. The engine itself is covered by
 * review.test.ts — this file is the join between the stores and the UI model.
 */

const TODAY = "2026-10-11";

function progressWith(entries: Record<string, number>): Progress {
  return { completed: entries };
}

/** The first lesson in the curriculum that actually has questions. */
function firstQuizLesson() {
  for (const track of MANIFEST_TRACKS) {
    const lesson = track.lessons.find((l) => l.quizCount > 0);
    if (lesson) return { track, lesson };
  }
  throw new Error("no quiz lesson in the manifest");
}

describe("review XP", () => {
  it("caps a single day but not the lifetime", () => {
    expect(reviewXp(1)).toBe(15);
    expect(reviewXp(99)).toBe(60);
    expect(reviewXpTotal({ "2026-10-10": 9 })).toBe(60);
    expect(reviewXpTotal({ "2026-10-10": 9, "2026-10-11": 2 })).toBe(90);
  });

  it("counts only days inside the bracket window", () => {
    const days = { "2026-10-01": 4, "2026-10-05": 4, "2026-10-09": 4 };
    expect(reviewXpInRange(days, "2026-10-05", "2026-10-08")).toBe(60);
  });

  it("feeds the derived total instead of sitting beside it", () => {
    const p = progressWith({ "web/html-semantic": 1 });
    const base = totalXp(p);
    expect(totalXp(p, { [TODAY]: 2 }) - base).toBe(30);
  });

  it("pays a review-only day without the consistency bonus", () => {
    // No lesson was completed, so there is no day bucket and no streak reward —
    // just the recall XP.
    expect(totalXp(progressWith({}), { [TODAY]: 1 })).toBe(15);
  });

  it("keys off the day log when the Review 5 quest is scored", () => {
    const p = progressWith({ "web/html-semantic": 1 });
    const reviewQuest = (reviewsToday: number) =>
      dailyQuests(p, TODAY, reviewsToday).find((q) => q.id === "review-5")!;
    expect(reviewQuest(4).done).toBe(false);
    expect(reviewQuest(5).done).toBe(true);
    expect(reviewQuest(5).progress).toBe(5);
    expect(dayQuestBonus({ day: TODAY, lessons: 1, xp: 75, flawless: 0 }, 5)).toBeGreaterThanOrEqual(50);
    expect(questsDoneToday(p, TODAY, 5)).toBeGreaterThan(questsDoneToday(p, TODAY, 0));
  });
});

describe("review queue", () => {
  it("only queues lessons that were attempted and not aced", () => {
    const { track, lesson } = firstQuizLesson();
    const key = track.id + "/" + lesson.id;
    const notAced = progressWith({ [key]: 0.5 });
    expect(shakyRefs(notAced).map((r) => r.key)).toEqual([key]);
    expect(shakyRefs(progressWith({ [key]: 1 }))).toEqual([]);
    expect(shakyRefs(progressWith({}))).toEqual([]);
  });

  it("seeds the lesson's first quiz question as a same-day item", async () => {
    const { track, lesson } = firstQuizLesson();
    const loaded = await loadTrack(track.id);
    expect(loaded).not.toBeNull();
    const refs = shakyRefs(progressWith({ [track.id + "/" + lesson.id]: 0.4 }));
    const items = seededItems(
      refs,
      new Map([[track.id, loaded!.lessons]]),
      TODAY,
      Date.parse(TODAY + "T12:00:00Z"),
    );
    expect(items).toHaveLength(1);
    const question = loaded!.lessons.find((l) => l.id === lesson.id)!.quiz[0];
    expect(items[0].dueDay).toBe(TODAY); // reviewable now, not tomorrow
    expect(items[0].box).toBe(0);
    expect(items[0].snapshot?.prompt).toBe(question.q);
    expect(items[0].snapshot?.options).toEqual(question.options);
    expect(items[0].snapshot?.answer).toBe(question.answer);
  });

  it("skips seeding a lesson whose body is not loaded yet", () => {
    const { track, lesson } = firstQuizLesson();
    const refs = shakyRefs(progressWith({ [track.id + "/" + lesson.id]: 0.4 }));
    expect(seededItems(refs, new Map(), TODAY, 0)).toEqual([]);
  });

  it("recognises which lessons are already queued, whatever the item kind", () => {
    const { track, lesson } = firstQuizLesson();
    const refix = seedItem(
      {
        id: "x:" + track.id + "/" + lesson.id,
        kind: "refix",
        trackId: track.id,
        lessonId: lesson.id,
        label: lesson.title,
      },
      TODAY,
      0,
    );
    expect(queuedLessons({ [refix.id]: refix }).has(track.id + "/" + lesson.id)).toBe(true);
  });

  it("reports the soonest return day for a cleared queue", () => {
    const { track, lesson } = firstQuizLesson();
    const item = seedItem(
      {
        id: "q:1",
        kind: "quiz",
        trackId: track.id,
        lessonId: lesson.id,
        label: lesson.title,
      },
      TODAY,
      0,
    );
    // A seeded item is due today, so it schedules nothing for later...
    expect(nextDueDay({ a: item }, TODAY)).toBeNull();
    // ...while a box-1 item comes back in three days.
    const later = { ...item, box: 1, dueDay: "2026-10-14" };
    expect(nextDueDay({ a: item, b: later }, TODAY)).toBe("2026-10-14");
  });
});
