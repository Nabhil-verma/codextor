import { useQuery } from "../lib/cloud";
import { Link, useParams } from "react-router-dom";
import Nav from "../components/Nav";
import { api } from "../lib/api";
import type { Id } from "../lib/apiTypes";
import { resolveAscension } from "../lib/gamification";

/*
 * A learner's public profile. Built only from the public card (the same facts
 * the leaderboard already shows) and their certificates. There is no account
 * id, email, or guild role on this page, and no control that edits anything.
 */

function longDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

export default function PublicProfile() {
  const { profileId = "" } = useParams();
  const id = profileId as Id<"profiles">;
  const card = useQuery(api.profiles.publicCard, { profileId: id });
  const certificates = useQuery(api.certificates.listForProfile, { profileId: id });

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-28 sm:px-6">
        {card === undefined && (
          <p role="status" className="text-ink-600">
            Loading profile…
          </p>
        )}
        {card === null && (
          <div className="card p-8">
            <h1 className="font-display text-2xl font-semibold text-ink-950">Profile not found</h1>
            <p className="mt-3 text-sm text-ink-600">This learner has no public profile at this address.</p>
            <Link to="/leaderboard" className="btn-ghost mt-6 inline-block">
              Leaderboard
            </Link>
          </div>
        )}
        {card && (
          <>
            <p className="eyebrow">public profile</p>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tighter text-ink-950">
              {card.name}
              {card.title && <span className="ml-3 text-lg font-medium text-ink-500">{card.title}</span>}
            </h1>
            <p className="mt-3 font-mono text-sm text-ink-600">
              Level {card.level} · {resolveAscension(card.ascension, card.level).name}
              {card.clan && ` · [${card.clan.tag}] ${card.clan.name}`}
            </p>
            <dl className="mt-8 grid gap-4 sm:grid-cols-3">
              <Stat label="XP" value={card.xp.toLocaleString()} />
              <Stat label="lessons" value={String(card.lessonsDone)} />
              <Stat label="best streak" value={String(card.streakLongest)} />
            </dl>

            <section className="mt-12">
              <h2 className="eyebrow mb-4">certificates</h2>
              {certificates === undefined && <p className="text-sm text-ink-600">Loading…</p>}
              {certificates && certificates.length === 0 && (
                <p className="text-sm text-ink-600">No certificates yet.</p>
              )}
              <ul className="grid gap-3">
                {certificates?.map((c) => (
                  <li key={c.code} className="card flex flex-wrap items-center justify-between gap-3 p-5">
                    <div>
                      <p className="font-display text-lg font-semibold text-ink-950">{c.trackTitle}</p>
                      <p className="font-mono text-[11px] text-ink-600">
                        {c.displayName} · {longDate(c.issuedAt)}
                      </p>
                    </div>
                    <Link to={"/verify/" + c.code} className="font-mono text-xs text-gold-600 underline">
                      verify {c.code}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <dt className="font-mono text-[11px] uppercase tracking-widest text-ink-500">{label}</dt>
      <dd className="mt-1 font-mono text-2xl font-bold text-ink-950">{value}</dd>
    </div>
  );
}
