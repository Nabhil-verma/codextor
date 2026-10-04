/* ------------------------------------------------------------------ */
/* Milestone claims — a localStorage claim log (see localStore.ts).    */
/*                                                                     */
/* Kept deliberately separate from `progress`: the progress map is a   */
/* numeric score map, while a project claim is a dated attestation     */
/* that merges by its own rule. The task is stored on the same Convex  */
/* row but in its own field, so neither merge can corrupt the other.   */
/* Local storage stays the source of truth while signed out.          */
/* ------------------------------------------------------------------ */

import { createLocalStore, readRecord, useLocalStore } from "./localStore";
import { REVIEW_CODES, type TaxonomyCode } from "../data/bug-taxonomy";
import {
  mergeClaims,
  milestoneXpTotal,
  type Claim,
  type Claims,
  type MilestoneArtifacts,
} from "./milestones";

const KEY = "clr-milestones-v1";

/** Per-field caps: an artifact is evidence, not a document dump. */
const MAX_NOTE = 4_000;
const MAX_CODE = 4_000;
const MAX_TASK = 300;

/**
 * The Fix 8 artifact, sanitized: strings capped, the category must be a real
 * taxonomy code, and anything structurally missing drops the artifact — the
 * claim survives, it just reads as pre-patch.
 */
function sanitizeArtifacts(raw: unknown): MilestoneArtifacts | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const { task, note, noteCategory, proof } = raw as Record<string, unknown>;
  if (typeof task !== "string" || typeof note !== "string") return undefined;
  if (typeof noteCategory !== "string") return undefined;
  if (!REVIEW_CODES.includes(noteCategory as TaxonomyCode)) return undefined;
  if (!proof || typeof proof !== "object") return undefined;
  const { buggy, test, fixed } = proof as Record<string, unknown>;
  const code = (v: unknown): string | null =>
    typeof v === "string" && v.trim().length > 0 ? v.slice(0, MAX_CODE) : null;
  const b = code(buggy);
  const t = code(test);
  const f = code(fixed);
  if (!b || !t || !f) return undefined;
  const n = note.slice(0, MAX_NOTE);
  if (n.trim().length === 0) return undefined;
  return {
    task: task.slice(0, MAX_TASK),
    note: n,
    noteCategory: noteCategory as TaxonomyCode,
    proof: { buggy: b, test: t, fixed: f },
  };
}

/**
 * Only a dated tick list is a claim; anything else is dropped. The same rule
 * the backend enforces, applied on the way in, so a hand-edited entry can't
 * reach the "shipped" tiles and break their rendering.
 */
function sanitizeClaims(raw: unknown): Claims {
  const out: Claims = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const { at, deliverables, artifacts } = value as {
      at?: unknown;
      deliverables?: unknown;
      artifacts?: unknown;
    };
    if (typeof at !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(at)) continue;
    if (!Array.isArray(deliverables)) continue;
    const ticks = [
      ...new Set(
        deliverables
          .map((n) => (typeof n === "number" ? n : Number(n)))
          .filter((n) => Number.isInteger(n) && n >= 0)
      ),
    ].sort((a, b) => a - b);
    if (ticks.length === 0) continue;
    const clean = sanitizeArtifacts(artifacts);
    out[id] = clean ? { at, deliverables: ticks, artifacts: clean } : { at, deliverables: ticks };
  }
  return out;
}

const store = createLocalStore<Claims>(KEY, (raw) => sanitizeClaims(readRecord(raw)));

export function subscribeClaims(fn: () => void): () => void {
  return store.subscribe(fn);
}

export function loadClaims(): Claims {
  return store.get();
}

export function saveClaims(claims: Claims) {
  store.set(claims);
}

/**
 * Merge a cloud claim log into the local one and persist. Used by the account
 * sync on pull; the merged log is also what gets pushed back, so both sides
 * converge rather than one overwriting the other.
 */
export function applyCloudClaims(cloud: Claims): Claims {
  const merged = mergeClaims(loadClaims(), cloud);
  saveClaims(merged);
  return merged;
}

/**
 * Record a milestone as shipped. The skill gate is enforced by the caller
 * (`milestoneStatus().unlocked`) and re-checked in the UI, so a stale claim
 * can never render as earned without its lessons behind it.
 *
 * The artifact (Fix 8) is optional on the way in: a fresh `claimMilestone`
 * with artifacts writes the full claim, and a pre-patch claim can be
 * *resubmitted* with the same ticks plus artifacts. A write never downgrades:
 * partial ticks can't follow full ones, and an artifact can't be replaced by
 * nothing. Re-submitting a *different* artifact with the same ticks is allowed
 * locally; the merge rule deliberately converges on the earlier proof.
 */
export function claimMilestone(
  id: string,
  deliverables: number[],
  day: string,
  artifacts?: MilestoneArtifacts
): Claims {
  const claims = loadClaims();
  const existing: Claim | undefined = claims[id];
  const ticks = [...deliverables].sort((a, b) => a - b);
  const clean = sanitizeArtifacts(artifacts);
  if (existing) {
    // Never downgrade a completed claim to a partial one.
    if (existing.deliverables.length > ticks.length) return claims;
    if (existing.deliverables.length === ticks.length) {
      // Same ticks: an artifact already on the claim can't be replaced by
      // nothing, and an identical resubmission is a no-op.
      if (existing.artifacts && !clean) return claims;
      if (!existing.artifacts && !clean) return claims;
      if (
        existing.artifacts &&
        clean &&
        JSON.stringify(existing.artifacts) === JSON.stringify(clean)
      ) {
        return claims;
      }
    }
  }
  const next: Claims = {
    ...claims,
    [id]: clean ? { at: day, deliverables: ticks, artifacts: clean } : { at: day, deliverables: ticks },
  };
  saveClaims(next);
  return next;
}

export function resetClaims() {
  store.reset();
}

/* --------------------------- React bindings --------------------------- */

export function useClaims(): Claims {
  return useLocalStore(store);
}

/**
 * Non-hook reader for code that runs outside render — the profile sync in
 * `AccountProvider` publishes this to the leaderboard.
 */
export function currentMilestoneXp(): number {
  return milestoneXpTotal(loadClaims());
}
