import type { RunResult } from "./runner";

/** One short sentence for the sr-only status region after a Run. */
export function summarizeRun(r: RunResult): string {
  if (r.error) {
    const first = r.error.split("\n")[0].trim();
    const short = first.length > 120 ? first.slice(0, 117) + "…" : first;
    return `Failed: ${short}`;
  }
  const n = r.logs.length;
  return `Ran: ${n} ${n === 1 ? "line" : "lines"} of output, no errors`;
}
