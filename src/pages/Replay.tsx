import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Nav from "../components/Nav";
import TraceVisualizer from "../components/TraceVisualizer";
import { decodeReplay, type DecodeError } from "../lib/replayShare";

/*
 * A shared replay. Public on purpose: a replay is self-contained and reads no
 * account data, so it needs no sign-in. The code is shown as text and only
 * runs when the viewer asks — inside the sandbox worker, through the same
 * visualizer the playground uses. Nothing here reaches the page's storage.
 */

const REASON: Record<DecodeError, string> = {
  "too-large": "This link is too long to be a replay link.",
  malformed: "This link is not a valid replay link. Check that it was copied in full.",
  "unsupported-version": "This replay was made by a newer version of the app.",
  checksum: "This replay link has been changed or damaged, so it was not opened.",
  "invalid-fields": "This replay link is missing something it needs.",
  expired: "This replay link has expired. Ask for a new one.",
};

export default function Replay() {
  const [params] = useSearchParams();
  const token = params.get("c");
  const result = useMemo(() => (token === null ? null : decodeReplay(token)), [token]);

  return (
    <div className="min-h-screen bg-paper-50">
      <Nav />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-28 sm:px-6">
        <p className="eyebrow">shared replay</p>

        {token === null && (
          <p className="mt-4 text-ink-600">
            Nothing to show. Open a replay link, or make one from the playground&apos;s execution trace.
          </p>
        )}

        {result && !result.ok && (
          <div className="mt-4 rounded-xl border border-rose-400/40 bg-rose-50/50 p-5">
            <p role="alert" className="text-sm text-rose-800">
              {REASON[result.reason]}
            </p>
            <Link to="/playground" className="mt-3 inline-block font-mono text-xs text-ink-600 underline">
              open the playground
            </Link>
          </div>
        )}

        {result?.ok && (
          <>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tighter text-ink-950">
              {result.replay.title ?? "Untitled replay"}
            </h1>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-ink-500">
              expires {new Date(result.replay.expiresAt).toISOString().slice(0, 10)} · runs in a sandbox
            </p>
            <pre
              aria-label="Shared code"
              className="mt-6 max-h-80 overflow-auto rounded-xl bg-ink-950 p-5 font-mono text-[13px] leading-relaxed text-paper-100"
            >
              {result.replay.code}
            </pre>
            <div className="mt-6">
              <TraceVisualizer code={result.replay.code} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
