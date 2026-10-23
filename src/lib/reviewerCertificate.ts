/*
 * Reviewer metrics and the unseen-exercise certificate. Pure functions: the
 * same attempts always give the same verdict. A server must run these same
 * checks before issuing a certificate; a client cannot be trusted to.
 */
export type ReviewDecision = { correct: boolean; shownAtMs: number; decidedAtMs: number };
export type ExerciseAttempt = {
  exerciseId: string;
  seenBefore: boolean;
  score: number;
  startedAtMs: number;
  finishedAtMs: number;
  decisions: ReviewDecision[];
};

/** Minimum believable time for a human to read and decide one item. */
export const MIN_DECISION_MS = 4_000;
export const MIN_ATTEMPT_MS_PER_ITEM = 20_000;
export const CERT_THRESHOLD = 0.8;

export function reviewerMetrics(decisions: ReviewDecision[]) {
  if (decisions.length === 0) return { accuracy: 0, medianMs: 0, count: 0 };
  const correct = decisions.filter(d => d.correct).length;
  const times = decisions.map(d => d.decidedAtMs - d.shownAtMs).sort((a, b) => a - b);
  const mid = Math.floor(times.length / 2);
  const medianMs = times.length % 2 ? times[mid] : (times[mid - 1] + times[mid]) / 2;
  return { accuracy: correct / decisions.length, medianMs, count: decisions.length };
}

/** Returns the reasons an attempt is implausible. An empty list means plausible. */
export function plausibilityIssues(a: ExerciseAttempt): string[] {
  const issues: string[] = [];
  if (!Number.isFinite(a.score) || a.score < 0 || a.score > 1) issues.push("invalid score");
  const accuracy = reviewerMetrics(a.decisions).accuracy;
  if (a.decisions.length && Math.abs(accuracy - a.score) > 0.000001) issues.push("score disagrees with decisions");
  const elapsed = a.finishedAtMs - a.startedAtMs;
  if (a.decisions.length === 0) issues.push("no decisions recorded");
  if (elapsed < MIN_ATTEMPT_MS_PER_ITEM * Math.max(1, a.decisions.length)) issues.push("finished faster than a human could read the items");
  for (const d of a.decisions) {
    if (d.decidedAtMs - d.shownAtMs < MIN_DECISION_MS) { issues.push("a decision was made faster than the minimum reading time"); break; }
  }
  for (const d of a.decisions) {
    if (!Number.isFinite(d.shownAtMs) || !Number.isFinite(d.decidedAtMs) || d.shownAtMs < a.startedAtMs || d.decidedAtMs < d.shownAtMs || d.decidedAtMs > a.finishedAtMs) { issues.push("decision timestamps fall outside the attempt"); break; }
  }
  return issues;
}

/** Certificate only for unseen exercises, a passing score, and a plausible attempt. */
export function certificateFor(attempts: ExerciseAttempt[]): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!attempts.some(a => !a.seenBefore)) reasons.push("no unseen exercise");
  const unseen = attempts.filter(a => !a.seenBefore);
  if (unseen.some(a => plausibilityIssues(a).length > 0)) reasons.push("an unseen attempt failed the plausibility checks");
  if (unseen.length && unseen.reduce((n, a) => n + a.score, 0) / unseen.length < CERT_THRESHOLD) reasons.push(`unseen score below ${CERT_THRESHOLD}`);
  return { eligible: reasons.length === 0, reasons };
}
