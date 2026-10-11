import { useQuery } from "convex/react";
import { Link, useParams } from "react-router-dom";
import Nav from "../components/Nav";
import { api } from "../convex/_generated/api";

/*
 * Public certificate check. Shows what the certificate certifies and who it was
 * issued to (the display name chosen at issue time). It never shows an account.
 */

function longDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function Verify() {
  const { code = "" } = useParams();
  const result = useQuery(api.certificates.verify, { code });

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="eyebrow">certificate check</p>
        {result === undefined && (
          <p role="status" className="mt-6 text-ink-600">
            Checking…
          </p>
        )}
        {result && !result.valid && (
          <div className="card mt-6 p-8">
            <h1 className="font-display text-2xl font-semibold text-ink-950">No certificate matches this code</h1>
            <p className="mt-3 text-sm text-ink-600">
              Check the code for typing mistakes. Codes are 12 characters, with no 0, 1, I or O.
            </p>
          </div>
        )}
        {result?.valid && (
          <div className="card mt-6 p-8">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-600">verified</p>
            <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-ink-600">This certifies that</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-ink-950">{result.displayName}</h1>
            <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-ink-600">
              completed every lesson of
            </p>
            <p className="mt-2 font-display text-2xl font-semibold text-gold-600">{result.trackTitle}</p>
            <p className="mt-6 font-mono text-[11px] text-ink-600">
              issued {longDate(result.issuedAt)} · code {result.code}
            </p>
          </div>
        )}
        <Link to="/" className="btn-ghost mt-8 inline-block">
          Codextor home
        </Link>
      </main>
    </div>
  );
}
