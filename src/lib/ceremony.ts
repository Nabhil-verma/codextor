import { createLocalStore, useLocalStore } from "./localStore";
import { ASCENSIONS, ascensionFor, type Ascension } from "./gamification";
import { MANIFEST_TRACKS } from "../data/manifest";

/*
 * The completion ceremony.
 *
 * Reaching a new ascension tier or closing out a track used to happen silently:
 * the level ring changed and nothing acknowledged it. This module decides what
 * is worth a curtain call and remembers what has already been honoured, so the
 * ceremony fires exactly once per achievement — including across reloads and
 * across a learner who was at level 9 before the feature existed.
 *
 * The decision is pure (`pendingCeremonies`); the store only records what has
 * been shown.
 */

export type CeremonySeen = {
  /** False until the first run has absorbed whatever was already earned. */
  initialized: boolean;
  tiers: string[];
  tracks: string[];
};

export const EMPTY_SEEN: CeremonySeen = { initialized: false, tiers: [], tracks: [] };

export type CeremonyEvent = {
  id: string;
  kind: "tier" | "track";
  title: string;
  detail: string;
  /** Present on tier events — drives the frame and the accent colour. */
  tier?: Ascension;
};

/**
 * A learner's first run must not replay months of history. Whatever is already
 * earned at that moment is marked seen, so only what happens next is celebrated.
 */
export function initializeSeen(level: number, finishedTrackIds: string[]): CeremonySeen {
  return {
    initialized: true,
    tiers: [ascensionFor(level).current.id],
    tracks: [...finishedTrackIds],
  };
}

/** Achievements earned since the last ceremony, biggest first. */
export function pendingCeremonies(
  seen: CeremonySeen,
  level: number,
  finishedTracks: { id: string; title: string }[],
  totalTracks: number = MANIFEST_TRACKS.length,
): CeremonyEvent[] {
  const events: CeremonyEvent[] = [];

  const tier = ascensionFor(level).current;
  // The first tier is where everyone starts; there is nothing to celebrate.
  if (tier.minLevel > 1 && !seen.tiers.includes(tier.id)) {
    events.push({
      id: "tier:" + tier.id,
      kind: "tier",
      title: "Ascended: " + tier.roman + " — " + tier.name,
      detail: tier.perk,
      tier,
    });
  }

  const done = finishedTracks.length;
  for (const track of finishedTracks) {
    if (seen.tracks.includes(track.id)) continue;
    events.push({
      id: "track:" + track.id,
      kind: "track",
      title: track.title + " — track complete",
      detail:
        "Every lesson in this module is at 100%. " +
        done +
        " of " +
        totalTracks +
        " tracks closed.",
    });
  }

  return events;
}

/** Marks every event as seen (used when a ceremony finishes a batch). */
export function withSeen(seen: CeremonySeen, events: CeremonyEvent[]): CeremonySeen {
  const next: CeremonySeen = { ...seen, tiers: [...seen.tiers], tracks: [...seen.tracks] };
  for (const event of events) {
    if (event.kind === "tier") {
      const id = event.id.slice("tier:".length);
      if (!next.tiers.includes(id)) next.tiers.push(id);
    } else {
      const id = event.id.slice("track:".length);
      if (!next.tracks.includes(id)) next.tracks.push(id);
    }
  }
  return next;
}

/* ------------------------------------------------------------------ */
/* Store                                                              */
/* ------------------------------------------------------------------ */

function parseSeen(raw: string | null): CeremonySeen {
  if (raw === null || raw === "") return EMPTY_SEEN;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return EMPTY_SEEN;
    const value = parsed as Partial<CeremonySeen>;
    const strings = (input: unknown): string[] =>
      Array.isArray(input) ? input.filter((s): s is string => typeof s === "string") : [];
    return {
      initialized: value.initialized === true,
      tiers: strings(value.tiers).filter((id) => id !== ""),
      tracks: strings(value.tracks).filter((id) => id !== ""),
    };
  } catch {
    return EMPTY_SEEN;
  }
}

export const ceremonyStore = createLocalStore<CeremonySeen>("cl_codextor_ceremony", parseSeen);

export function loadCeremonySeen(): CeremonySeen {
  return ceremonyStore.get();
}

export function saveCeremonySeen(seen: CeremonySeen): void {
  ceremonyStore.set(seen);
}

export function useCeremonySeen(): CeremonySeen {
  return useLocalStore(ceremonyStore);
}

/** Records one dismissed ceremony without dropping the rest. */
export function markCeremonySeen(event: CeremonyEvent): void {
  saveCeremonySeen(withSeen(loadCeremonySeen(), [event]));
}

/** Absorbs whatever was already earned on a learner's first run. */
export function initializeCeremony(level: number, finishedTrackIds: string[]): void {
  saveCeremonySeen(initializeSeen(level, finishedTrackIds));
}

export { ASCENSIONS };
