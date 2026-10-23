/** Reference validation is not semantic truth checking. Structured citations below are exact evidence. */
export type TraceFacts = { steps: number[]; tools: string[]; files: string[]; events?: { step: number; text: string }[] };
export type NarrationResult = { ok: boolean; unsupported: string[] };

export function validateNarration(text: string, facts: TraceFacts): NarrationResult {
  const unsupported: string[] = [];
  const reject = (ref: string) => { if (!unsupported.includes(ref)) unsupported.push(ref); };
  for (const m of text.matchAll(/\bstep\s+(\d+)\b/gi)) if (!facts.steps.includes(Number(m[1]))) reject(`step ${Number(m[1])}`);
  // Scan references regardless of Markdown formatting; quoted references retain their order.
  const refs = [...text.matchAll(/`([^`]+)`|\b((?:[\w.-]+\/)*[\w.-]+\.(?:ts|tsx|js|jsx|json|sql|py|md|css|html|yml|yaml))\b|\b([a-z]+(?:_[a-z]+)+)\b/g)];
  for (const m of refs) {
    const ref = (m[1] ?? m[2] ?? m[3]).trim();
    if (/\.\w+$/.test(ref) || ref.includes("/")) { if (!facts.files.includes(ref)) reject(ref); }
    else if (/^[a-z]+(_[a-z]+)+$/.test(ref) && !facts.tools.includes(ref)) reject(ref);
  }
  return { ok: unsupported.length === 0, unsupported };
}

export type GroundedCitation = { step: number; quote: string };
/** Render only evidence quotes, not arbitrary model prose or inferred test outcomes. */
export function validateCitations(raw: string, facts: TraceFacts): GroundedCitation[] {
  if (raw.length > 12_000) throw new Error("Narration exceeds the response limit");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("Narration must be a JSON citation array"); }
  if (!Array.isArray(parsed) || !parsed.length || parsed.length > 8) throw new Error("Narration must cite one to eight events");
  return parsed.map((value: unknown) => {
    if (!value || typeof value !== "object") throw new Error("Invalid citation");
    const c = value as Record<string, unknown>;
    if (Object.keys(c).some(k => k !== "step" && k !== "quote") || !Number.isInteger(c.step) || typeof c.quote !== "string" || c.quote.trim().length < 12) throw new Error("Invalid citation schema");
    const event = facts.events?.find(e => e.step === c.step);
    if (!event || !event.text.includes(c.quote) || !validateNarration(c.quote, facts).ok) throw new Error("Citation is not in the selected trace event");
    return { step: Number(c.step), quote: c.quote };
  });
}
