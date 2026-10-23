/* Deterministic grader for decision artifacts: exact match per item. */
import type { DecisionArtifact } from "../data/decision-artifacts";

export function gradeDecisions(a: DecisionArtifact, picks: Record<string, string | undefined>): number {
  const correct = a.items.filter(i => picks[i.id] === i.answer).length;
  return correct / a.items.length;
}

export type Capability = "read" | "write" | "execute" | "network";
/** One fixed run replayed against learner-selected authority; no real tools run. */
export function replayCapabilities(grants: Record<Capability, boolean>): string[] {
  return [
    grants.read ? "READ: repository context available; private .env remains denied by path policy." : "READ blocked: cannot establish the owning file.",
    grants.write ? (grants.read ? "WRITE: scoped patch created in src/app.ts." : "WRITE risk: a blind patch could overwrite unrelated behavior.") : "WRITE blocked: analysis only; no repair is applied.",
    grants.execute ? (grants.write ? "EXECUTE: local regression run produces a final-patch receipt." : "EXECUTE: tests cover the unchanged draft, not an applied repair.") : "EXECUTE blocked: no test receipt; do not claim tests pass.",
    grants.network ? "NETWORK risk: the same agent attempts an unapproved upload; a destination allowlist and confirmation must stop it." : "NETWORK blocked: external upload cannot leave this run.",
  ];
}

/** Estimated minutes for the learner's choices vs doing everything by hand. Unverifiable delegation is charged the full human time. */
export function replayMinutes(a: DecisionArtifact, picks: Record<string, string | undefined>): { chosen: number; allByHand: number } {
  let chosen = 0, allByHand = 0;
  for (const i of a.items) {
    if (!i.costs) continue;
    allByHand += i.costs.human;
    const pick = picks[i.id];
    chosen += pick === "DELEGATE" && i.costs.delegate !== null ? i.costs.delegate : i.costs.human;
  }
  return { chosen, allByHand };
}
