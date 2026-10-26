import { useAccount } from "../AccountProvider";
import { useState, useSyncExternalStore } from "react";
import { loadTelemetry, practiceReviewerMetrics, subscribeTelemetry } from "../lib/telemetry";
import { useMutation, useQuery } from "../lib/cloud";
import { api } from "../lib/api";
import type { Id } from "../lib/apiTypes";

type Item = { prompt: string; code: string; options: string[]; index: number; total: number };

/** Answers and scores never come from the local completion map. */
export default function ReviewerAssessment() {
  const { user } = useAccount();
  const telemetry = useSyncExternalStore(subscribeTelemetry, loadTelemetry, loadTelemetry);
  const rows = practiceReviewerMetrics(telemetry);
  return <section aria-label="Reviewer profile">
    <h2 className="mt-5 font-display text-2xl text-ink-950">Reviewer practice profile</h2>
    <p className="my-3 text-sm text-ink-600">First submissions per diff fixture on this device. Practice is self-reported, not certificate evidence. Decision time includes reading and idle time.</p>
    {rows.length ? <div className="overflow-auto"><table className="w-full text-left text-sm text-ink-700"><caption>Practice evidence by taxonomy code</caption><thead><tr><th scope="col">Code</th><th scope="col">Catch rate</th><th scope="col">False alarms</th><th scope="col">Time to find</th></tr></thead><tbody>{rows.map(r => <tr key={r.code}><th scope="row">{r.code} ({r.count})</th><td>{r.catchRate === null ? "—" : `${Math.round(r.catchRate * 100)}%`}</td><td>{r.falseAlarmRate === null ? "—" : `${Math.round(r.falseAlarmRate * 100)}%`}</td><td>{r.meanFindMs === null ? "—" : `${(r.meanFindMs / 1000).toFixed(1)}s`}</td></tr>)}</tbody></table></div> : <p className="text-ink-600">Review a diff to record your first diagnosis.</p>}
    {user ? <SignedInAssessment /> : <p className="mt-5 text-sm text-ink-600">Sign in to start the server-graded reviewer assessment. Local lesson grades never issue a reviewer certificate.</p>}
  </section>;
}

function SignedInAssessment() {
  const status = useQuery(api.progress.reviewerStatus);
  const start = useMutation(api.progress.startUnseenExercise);
  const finish = useMutation(api.progress.finishUnseenExercise);
  const [attempt, setAttempt] = useState<{ attemptId: Id<"unseenAttempts">; item: Item } | null>(null);
  const [answer, setAnswer] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const perform = async (operation: () => Promise<void>) => {
    setBusy(true); setMessage("");
    try { await operation(); } catch (error) { setMessage(error instanceof Error ? error.message : "Assessment unavailable; try again."); }
    finally { setBusy(false); }
  };
  return <section className="glass rounded-2xl border border-paper-200 p-6" aria-label="Reviewer assessment">
    <h2 className="font-display text-2xl text-ink-950">Unseen reviewer assessment</h2>
    <p className="my-3 text-sm text-ink-600">Three server-assigned reviews, including a clean change. Read each for at least 20 seconds. Only a passing first exposure earns a certificate; practice never replaces that evidence. Timing is an anomaly check, not proof of identity. Resetting account progress deletes this history and certificate.</p>
    {status?.metrics.count ? <p className="text-ink-700">Accuracy {Math.round(status.metrics.accuracy * 100)}% · catch rate {status.metrics.catchRate === null ? "—" : `${Math.round(status.metrics.catchRate * 100)}%`} · false alarms {status.metrics.falseAlarmRate === null ? "—" : `${Math.round(status.metrics.falseAlarmRate * 100)}%`} · median decision {(status.metrics.medianMs / 1000).toFixed(1)}s</p> : null}
    {status?.byCode.length ? <div className="mt-4 overflow-auto"><table className="w-full text-left text-sm text-ink-700">
      <caption className="text-left">Server-graded assessment evidence by taxonomy code (not lesson count)</caption>
      <thead><tr><th scope="col">Code</th><th scope="col">Catch rate</th><th scope="col">False alarms</th><th scope="col">Mean decision time</th></tr></thead>
      <tbody>{status.byCode.map(row => <tr key={row.code}><th scope="row">{row.code} ({row.count})</th><td>{row.catchRate === null ? "No defective items" : `${Math.round(row.catchRate * 100)}%`}</td><td>{row.falseAlarmRate === null ? "No clean items" : `${Math.round(row.falseAlarmRate * 100)}%`}</td><td>{(row.meanDecisionMs / 1000).toFixed(1)}s</td></tr>)}</tbody>
    </table></div> : null}
    {status?.certificate && <div role="status" className="my-4 rounded-xl border border-gold-400 p-4 text-ink-950">
      <h3>Reviewer certificate issued</h3><p>Issued {new Date(status.certificate.issuedAt).toISOString().slice(0, 10)} · score {Math.round(status.certificate.score * 100)}%</p><p className="break-all font-mono text-xs">Verification ID: {status.certificate.id}</p>
      <button type="button" onClick={() => window.print()} className="btn-ghost mt-3">Print reviewer certificate</button>
    </div>}
    {!attempt ? <button type="button" className="btn-primary mt-4" disabled={busy} onClick={() => void perform(async () => { const next = await start({}); setAttempt(next); if (next.seenBefore) setMessage("Practice: this exercise has been seen before."); })}>Start or resume assessment</button> : <fieldset className="mt-5">
      <legend>Review {attempt.item.index + 1} of {attempt.item.total}: {attempt.item.prompt}</legend>
      <pre className="my-3 overflow-auto rounded-xl bg-paper-100 p-4 text-ink-950">{attempt.item.code}</pre>
      {attempt.item.options.map((option, i) => <label key={option} className="my-2 flex gap-3 text-ink-700"><input type="radio" name="review-assessment" checked={answer === i} onChange={() => setAnswer(i)} />{option}</label>)}
      <button type="button" className="btn-primary mt-3" disabled={busy || answer === null} onClick={() => void perform(async () => {
        if (answer === null) return;
        const result = await finish({ attemptId: attempt.attemptId, itemIndex: attempt.item.index, answer });
        setAnswer(null);
        if (result.done) { setAttempt(null); setMessage(result.certificate ? "Certificate earned and saved on your account." : `Assessment recorded: ${Math.round(result.score * 100)}%. ${result.issues.join(" ")}`); }
        else setAttempt({ ...attempt, item: result.item });
      })}>Submit assessment answer</button>
    </fieldset>}
    {message && <p role="status" className="mt-4 text-ink-700">{message}</p>}
  </section>;
}
