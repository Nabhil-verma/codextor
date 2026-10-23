import { useState } from "react";

/* ═══════════════════════════════════════════════════════════════
   Shuffling with the learner in mind.

   Exercises that shuffle their own answer — the code-assembly card,
   the drag-to-sequence challenge — must never open already solved.
   A pre-solved puzzle teaches nothing and makes "Check order" a free
   pass, so the guarantee is made exact here rather than left to the
   dice: plain Fisher–Yates lands back on the input order often enough
   to notice (1 in 6 for three lines, 1 in 24 for four), and re-rolling
   on a hit only shrinks the odds (1 in n! each attempt) instead of
   removing them.
   ═══════════════════════════════════════════════════════════════ */

/**
 * A shuffled copy of `items` that is guaranteed to differ from `items`
 * whenever any other arrangement exists. Elements that are equal can't be
 * told apart, so an empty list, a single element, or an all-equal list is
 * returned as-is — there is no other order to offer.
 */
export function shuffled<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  if (out.some((value, at) => value !== items[at])) return out;

  // Fisher–Yates landed on the original order: swap the first position with
  // the first one holding a different value — the smallest change that
  // breaks the order, and one no further draw can undo.
  const other = out.findIndex((value) => value !== out[0]);
  if (other === -1) return out;
  [out[0], out[other]] = [out[other], out[0]];
  return out;
}

/* ═══════════════════════════════════════════════════════════════
   Multiple-choice options in a fresh order every attempt.

   A learner who can read an answer key off the layout — "it's always B",
   "it's always the longest" — never has to judge the content. The authored
   order stays the source of truth: the data, the stored answers and the
   review-queue keys all index it. Only what is *shown* is shuffled, and every
   selection is mapped back through `order` before it is scored or stored.
   ═══════════════════════════════════════════════════════════════ */

/** The displayed view of one multiple-choice question. */
export interface ShuffledOptions {
  /** Options in displayed order. */
  options: string[];
  /** Index of the correct option within `options`. */
  answer: number;
  /** order[displayedIndex] = authoredIndex. Use it to map back to authored space. */
  order: number[];
}

/**
 * Options that refer to the other options only make sense where they were
 * written, so they stay pinned to the end, in authored order, instead of
 * being shuffled. Matched case-insensitively by any of:
 *
 *  - a referential phrase: "all / none / both / neither of the above | these
 *    | those | them | options | choices | answers";
 *  - a bare leading "all", "none", "both", "neither" or "either" followed by a
 *    dash, a full stop or the end of the text (e.g. "Neither", "None.",
 *    "Neither — it's just faster");
 *  - a short "both / neither / either X and / nor / or Y" (e.g. "Both A and B").
 *
 * This is a heuristic. An ordinary sentence that happens to read "Both … and …"
 * is pinned too, which only means that option keeps its authored place.
 */
const PINNED_OPTION = new RegExp(
  [
    String.raw`\b(?:all|none|both|neither)\s+(?:of\s+)?(?:the\s+|these\s+|those\s+|them\s+)?(?:above|below|these|those|them|options|choices|answers)\b`,
    String.raw`^\s*(?:all|none|both|neither|either)\s*(?:[.!?]|[—–-]|$)`,
    String.raw`^\s*(?:both|neither|either)\s+[^.]{1,30}?\s+(?:and|nor|or)\s+\S[^.]{0,30}$`,
  ].join("|"),
  "i",
);

/** True when `text` refers to other options and must not be shuffled. */
export function isPinnedOption(text: string): boolean {
  return PINNED_OPTION.test(text);
}

/** True when `answer` is an integer index into a list of `count` options. */
export function isAnswerIndex(answer: unknown, count: number): answer is number {
  return typeof answer === "number" && Number.isInteger(answer) && answer >= 0 && answer < count;
}

/** Re-rolls a retry this many times before the deterministic fallback swap. */
const REROLL_ATTEMPTS = 8;

/**
 * The displayed order of `options`, as authored indices: the movable options
 * shuffled with Fisher–Yates, then the pinned ones appended in authored order.
 * `rng` returns a float in [0, 1).
 */
export function shuffleOrder(options: readonly string[], rng: () => number = Math.random): number[] {
  const movable: number[] = [];
  const pinned: number[] = [];
  options.forEach((text, i) => (isPinnedOption(text) ? pinned : movable).push(i));
  for (let i = movable.length - 1; i > 0; i--) {
    // Clamped so a misbehaving rng can never index outside the list.
    const j = Math.min(i, Math.max(0, Math.floor(rng() * (i + 1))));
    [movable[i], movable[j]] = [movable[j], movable[i]];
  }
  return [...movable, ...pinned];
}

function viewFromOrder(options: readonly string[], answer: number, order: number[]): ShuffledOptions {
  return { options: order.map((i) => options[i]), answer: order.indexOf(answer), order };
}

function sameOrder(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, i) => value === b[i]);
}

/**
 * Shuffles the options of one question for display. The input is never
 * mutated. Throws when `answer` is not an index into `options`. A question
 * with fewer than two options is returned unchanged. Duplicate option text is
 * tracked by index, so `answer` is remapped correctly even when two options
 * read the same.
 */
export function shuffleOptions(
  options: readonly string[],
  answer: number,
  rng: () => number = Math.random,
): ShuffledOptions {
  if (!isAnswerIndex(answer, options.length)) {
    throw new Error(
      `shuffleOptions: answer must be an integer index in [0, ${options.length}), got ${answer}`,
    );
  }
  return viewFromOrder(options, answer, shuffleOrder(options, rng));
}

/**
 * A fresh arrangement for a retry. It differs from `previous.order` whenever
 * at least two options can move: it re-rolls a bounded number of times, then
 * swaps the first two movable positions (they are always the first two,
 * because pinned options sit at the end), so an identical draw can't survive.
 */
export function rerollOptions(
  options: readonly string[],
  answer: number,
  previous: ShuffledOptions,
  rng: () => number = Math.random,
): ShuffledOptions {
  let next = shuffleOptions(options, answer, rng);
  for (
    let attempt = 1;
    attempt < REROLL_ATTEMPTS && options.length > 1 && sameOrder(next.order, previous.order);
    attempt++
  ) {
    next = shuffleOptions(options, answer, rng);
  }
  const movable = options.filter((text) => !isPinnedOption(text)).length;
  if (movable >= 2 && sameOrder(next.order, previous.order)) {
    const order = [...next.order];
    [order[0], order[1]] = [order[1], order[0]];
    next = viewFromOrder(options, answer, order);
  }
  return next;
}

/**
 * A question's shuffled view, stable across re-renders. The order is drawn
 * once per question (lazy initial state), so a parent re-render never
 * reshuffles mid-attempt. It is redrawn when the question's content changes,
 * and on `reshuffle()`, which re-rolls so the order visibly changes.
 */
export function useShuffledOptions(
  options: readonly string[],
  answer: number,
  rng?: () => number,
): { view: ShuffledOptions; reshuffle: () => void } {
  const signature = JSON.stringify([answer, options]);
  const [state, setState] = useState(() => ({
    signature,
    view: shuffleOptions(options, answer, rng),
  }));

  // Question identity is content-derived: a different question redraws during
  // render, which React handles as a state adjustment for this component.
  let current = state;
  if (state.signature !== signature) {
    current = { signature, view: shuffleOptions(options, answer, rng) };
    setState(current);
  }

  const reshuffle = () =>
    setState((prev) => ({
      signature,
      view: rerollOptions(options, answer, prev.view, rng),
    }));

  return { view: current.view, reshuffle };
}
