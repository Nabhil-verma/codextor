import { useSyncExternalStore } from "react";

/* ═══════════════════════════════════════════════════════════════
   The learner's guild role, published once at the app root and
   readable anywhere. Badge logic needs it (guild badges) but must
   not fire its own backend query on every page, so a single bridge
   component feeds this store and everyone else just reads it.
   ═══════════════════════════════════════════════════════════════ */

export type ClanRole = "none" | "member" | "officer" | "owner";

let current: ClanRole = "none";
const listeners = new Set<(role: ClanRole) => void>();

export function setClanRole(next: ClanRole) {
  if (next === current) return;
  current = next;
  for (const fn of listeners) fn(next);
}

const subscribe = (onChange: () => void) => {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
};

const getSnapshot = () => current;

/** Current guild role, re-rendering the caller whenever it changes. */
export function useClanRole(): ClanRole {
  return useSyncExternalStore(subscribe, getSnapshot);
}
