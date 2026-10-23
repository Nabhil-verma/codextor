import TraceInterrogation from "./TraceInterrogation";
import { flagEnabled } from "../lib/flags";
import { useId, useState } from "react";
import type { TranscriptCase } from "../data/transcripts";
import { taxonomyEntry, type TaxonomyCode } from "../data/bug-taxonomy";
import { gradeTranscript } from "../lib/transcriptGrade";

/** Transcript first-fault viewer: pick the first bad step, then classify it. */
export default function TranscriptLab({ transcript, onScore }: { transcript: TranscriptCase; onScore: (score: number) => void }) {
  const [step, setStep] = useState<number | null>(null);
  const [code, setCode] = useState<TaxonomyCode | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const group = useId();

  const check = () => {
    const s = gradeTranscript(transcript, { step, code });
    setScore(s);
    onScore(s);
  };

  return (
    <section className="glass glass-edge mt-8 rounded-3xl border border-paper-200 p-6" aria-label={transcript.title}>
      <p className="eyebrow">First-fault transcript</p>
      <h3 className="mt-3 font-display text-2xl text-ink-950">{transcript.title}</h3>
      <p className="my-4 text-ink-600">{transcript.brief}</p>

      <p className="mb-2 text-sm font-medium text-ink-800" id={`${group}-steps`}>Select the FIRST bad step:</p>
      <ol aria-labelledby={`${group}-steps`} className="space-y-2">
        {transcript.steps.map(s => (
          <li key={s.n}>
            <button
              type="button"
              aria-pressed={step === s.n}
              onClick={() => setStep(s.n)}
              className={"w-full rounded-xl border px-4 py-3 text-left font-mono text-sm " + (step === s.n ? "border-gold-400 bg-gold-400/10 text-ink-950" : "border-paper-200 bg-paper-50 text-ink-700")}
            >
              <span className="mr-2 text-[10px] uppercase tracking-widest text-ink-500">{s.n} · {s.kind}</span>
              {s.text}
            </button>
          </li>
        ))}
      </ol>

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-medium text-ink-800">Classify it</legend>
        {transcript.codeOptions.map(c => (
          <label key={c} className="mr-5 inline-flex items-center gap-2 text-sm text-ink-700">
            <input type="radio" name={group} value={c} checked={code === c} onChange={() => setCode(c)} />
            {taxonomyEntry(c).label}
          </label>
        ))}
      </fieldset>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={check} disabled={step === null || code === null} className="btn-primary !px-5 !py-2 text-sm disabled:opacity-50">
          Check diagnosis
        </button>
      </div>

      {score !== null && (
        <div role="status" className="mt-4 rounded-xl border border-paper-200 bg-paper-50/50 px-4 py-3 text-sm text-ink-800">
          {score === 1 && "Correct step and classification. "}
          {score === 0.5 && "Right step, but the classification is different. "}
          {score === 0 && "Not the first bad step. "}
          <span className="text-ink-600">{transcript.why}</span>
        </div>
      )}
      {flagEnabled("byokInterrogation") && <TraceInterrogation transcript={transcript} />}
    </section>
  );
}
