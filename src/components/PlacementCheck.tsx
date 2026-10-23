import { useState } from "react";
import { Link } from "react-router-dom";
import { PLACEMENT_CHECK, placementRoute } from "../data/placement";
export default function PlacementCheck() {
  const [answers,setAnswers] = useState<Record<number,number>>({});
  const [route,setRoute] = useState<string | null>(null);
  return <section className="glass glass-edge relative overflow-hidden rounded-3xl border border-paper-200 p-6" aria-label="Placement check">
    <p className="eyebrow">Your judgment, not your years</p><h3 className="mt-3 font-display text-3xl text-ink-950">Find your entry point</h3>
    <p className="mt-2 text-ink-600">Six decisions. No XP or mastery credit; a recommendation, never a lock.</p>
    {PLACEMENT_CHECK.map((q,i) => <fieldset key={q.q} className="mt-6"><legend className="font-semibold text-ink-950">{i+1}. {q.q}</legend>{q.options.map((o,j) => <label key={o} className="mt-2 flex gap-3 rounded-xl border border-paper-200 p-3 text-ink-700"><input type="radio" name={`placement-${i}`} checked={answers[i]===j} onChange={() => {setAnswers(a=>({...a,[i]:j}));setRoute(null);}}/>{o}</label>)}</fieldset>)}
    <button className="btn-primary mt-6 disabled:opacity-50" disabled={Object.keys(answers).length!==6} onClick={()=>setRoute(placementRoute(PLACEMENT_CHECK.map((_,i)=>answers[i])))}>Find my path</button>
    {route && <div role="status" className="mt-5 text-ink-700"><p>{route.includes('/agents/') ? 'Experienced entry: start with executable specs. Revisit fundamentals whenever useful.' : 'Foundation entry: build reading, Git and testing literacy before supervising agents.'}</p><Link className="btn-gold mt-3" to={route}>Open recommended lesson</Link><details className="mt-3"><summary>Review the reasoning</summary>{PLACEMENT_CHECK.map(q=><p key={q.q}>{q.explanation}</p>)}</details></div>}
  </section>;
}
