/** Server-only answer bank. Never imported by learner components or manifests. */
export const REVIEW_BANK_VERSION = 1;
import type { TaxonomyCode } from "../../src/data/bug-taxonomy";
export type ReviewItem = { category: TaxonomyCode; prompt: string; code: string; options: string[]; answer: number; defective: boolean };
export const REVIEW_BANK: { id: string; items: ReviewItem[] }[] = [
  { id: "review-v1-a", items: [
    { category: "EC", prompt: "Contract: empty input must return 0. Review the draft.", code: "const average = xs => xs.reduce((n,x)=>n+x,0) / xs.length;", options: ["Approve", "Block: empty input divides by zero", "Block: arrow functions are forbidden"], answer: 1, defective: true },
    { category: "SL", prompt: "Contract: preserve first occurrence order without mutating input.", code: "const unique = xs => [...new Set(xs)];", options: ["Block: must sort", "Block: Set changes the input", "Approve"], answer: 2, defective: false },
    { category: "ID", prompt: "Contract: missing authority denies deletion.", code: "const allowed = user => (user.role ?? 'admin') === 'admin';", options: ["Block: missing role elevates privilege", "Approve", "Block: use a shorter name"], answer: 0, defective: true },
  ] },
  { id: "review-v1-b", items: [
    { category: "EC", prompt: "Contract: only retry server failures; a 400 must stop.", code: "if (!response.ok) return retry(request);", options: ["Approve", "Block: also retries invalid client requests", "Block: retry is too short a name"], answer: 1, defective: true },
    { category: "ID", prompt: "Contract: absent user or guest denies; admin permits.", code: "const allowed = user => user?.role === 'admin';", options: ["Approve", "Block: optional chaining permits guests", "Block: add a debug bypass"], answer: 0, defective: false },
    { category: "RC", prompt: "Contract: keep the newest response when requests finish out of order.", code: "fetchUser(id).then(setUser);", options: ["Block: promises never work", "Approve", "Block: no stale-response guard"], answer: 2, defective: true },
  ] },
  { id: "review-v1-c", items: [
    { category: "TG", prompt: "Contract: total([2,4]) must equal 6. Review the test.", code: "test('total', () => { total([2,4]); });", options: ["Approve", "Block: no assertion checks the value", "Block: need a longer title"], answer: 1, defective: true },
    { category: "SL", prompt: "Contract: zero remains zero; only null/undefined use the default.", code: "const count = input ?? 10;", options: ["Block: use || instead", "Block: zero is falsy", "Approve"], answer: 2, defective: false },
    { category: "ID", prompt: "Contract: no credentials may appear in logs.", code: "console.log('request config', {apiKey, retryCount});", options: ["Block: emits credential into logs", "Approve", "Block: remove only the label"], answer: 0, defective: true },
  ] },
];

export function publicReviewItem(exerciseId: string, index: number) {
  const item = REVIEW_BANK.find(x => x.id === exerciseId)?.items[index];
  if (!item) throw new Error("unknown assessment item");
  return { prompt: item.prompt, code: item.code, options: item.options, index, total: 3 };
}
