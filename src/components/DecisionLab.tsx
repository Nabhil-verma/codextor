import { useId, useState } from "react";
import type { DecisionArtifact } from "../data/decision-artifacts";
import { gradeDecisions, replayCapabilities, replayMinutes, type Capability } from "../lib/decisionGrade";

/** Classify each item against a written policy; grade exactly, show a labelled minute replay when costs exist. */
export default function DecisionLab({ artifact, onScore }: { artifact: DecisionArtifact; onScore: (score: number) => void }) {
  const [grants, setGrants] = useState<Record<Capability, boolean>>({ read: true, write: false, execute: false, network: false });
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [score, setScore] = useState<number | null>(null);
  const group = useId();
  const complete = artifact.items.every(i => picks[i.id]);
  const hasCosts = artifact.items.some(i => i.costs);

  const check = () => {
    const s = gradeDecisions(artifact, picks);
    setScore(s);
    onScore(s);
  };

  const replay = hasCosts ? replayMinutes(artifact, picks) : null;

  return (
    <section className="glass glass-edge mt-8 rounded-3xl border border-paper-200 p-6" aria-label={artifact.title}>
      <p className="eyebrow">Decision artifact</p>
      <h3 className="mt-3 font-display text-2xl text-ink-950">{artifact.title}</h3>
      <p className="my-4 text-ink-600">{artifact.brief}</p>
      {artifact.kind === "permission" && <fieldset className="my-5 rounded-xl border border-paper-200 bg-paper-50 p-4">
        <legend>Replay the same agent with a different blast radius</legend>
        <p className="mb-3 text-sm text-ink-600">Toggle capabilities and inspect what succeeds, what breaks, and what needs an additional boundary. This is a deterministic simulation, not real tool access.</p>
        {(["read", "write", "execute", "network"] as const).map(cap => <label className="mr-4 inline-flex gap-2" key={cap}><input type="checkbox" checked={grants[cap]} onChange={e => setGrants({ ...grants, [cap]: e.target.checked })} />{cap}</label>)}
        <ol aria-live="polite" className="mt-3 space-y-1 text-sm text-ink-700">{replayCapabilities(grants).map(line => <li key={line}>{line}</li>)}</ol>
      </fieldset>}
      <ul className="space-y-3">
        {artifact.items.map(item => (
          <li key={item.id} className="rounded-xl border border-paper-200 bg-paper-50 p-4">
            <p className="font-mono text-sm text-ink-900">{item.text}</p>
            {item.costs && (
              <p className="mt-1 text-xs text-ink-500">
                Estimate: {item.costs.human} min by hand · {item.costs.delegate === null ? "cannot be verified" : `${item.costs.delegate} min delegated incl. verification`}
              </p>
            )}
            <fieldset className="mt-2 flex flex-wrap gap-4">
              <legend className="sr-only">Decision for: {item.text}</legend>
              {artifact.options.map(o => (
                <label key={o.value} className="inline-flex items-center gap-2 text-sm text-ink-700">
                  <input type="radio" name={`${group}-${item.id}`} value={o.value} checked={picks[item.id] === o.value} onChange={() => setPicks({ ...picks, [item.id]: o.value })} />
                  {o.label}
                </label>
              ))}
            </fieldset>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={check} disabled={!complete} className="btn-primary !px-5 !py-2 text-sm disabled:opacity-50">Check decisions</button>
        {!complete && <span className="font-mono text-[11px] text-ink-500">decide every item first</span>}
      </div>
      {score !== null && (
        <div role="status" className="mt-4 rounded-xl border border-paper-200 bg-paper-50/50 px-4 py-3 text-sm text-ink-800">
          <p>{Math.round(score * artifact.items.length)} of {artifact.items.length} match the policy.</p>
          {artifact.items.filter(i => picks[i.id] !== i.answer).map(i => (
            <p key={i.id} className="mt-1 text-ink-600">{i.text} → {artifact.options.find(o => o.value === i.answer)?.label}. {i.why}</p>
          ))}
          {replay && (
            <p className="mt-3 font-mono text-[11px] text-ink-500">Replay (estimates, not measured): your choices {replay.chosen} min vs {replay.allByHand} min all by hand.</p>
          )}
        </div>
      )}
    </section>
  );
}
