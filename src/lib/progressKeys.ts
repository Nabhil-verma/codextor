/*
 * Progress-key aliases. When a lesson moves to a new track or id, its old key
 * must keep resolving so saved progress is not lost. A moved lesson resolves
 * to its original storage identity: rollback never loses progress or pays XP twice.
 */
export const PROGRESS_KEY_ALIASES: Record<string, string> = {
  "agent-internals/python-llm-api": "python/python-llm-api",
};

/** Python's original certificate still requires all four original lessons after the move. */
export function certificateLessonKeys(track: { id: string; lessons: { id: string }[] }): string[] {
  const keys = track.lessons.map(l => `${track.id}/${l.id}`);
  if (track.id === "python" && !keys.includes("python/python-llm-api")) keys.push("python/python-llm-api");
  return keys;
}

/** Follow alias links to the canonical key. Throws on a cycle. */
export function canonicalProgressKey(key: string, aliases: Record<string, string> = PROGRESS_KEY_ALIASES): string {
  const seen = new Set<string>();
  let current = key;
  while (aliases[current] !== undefined) {
    if (seen.has(current)) throw new Error(`progress key alias cycle at ${current}`);
    seen.add(current);
    current = aliases[current];
  }
  return current;
}
