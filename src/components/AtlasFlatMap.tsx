import { Link } from "react-router-dom";
import { findTrackMeta, findLessonMeta } from "../data/manifest";
import type { GeneratedPlan } from "../lib/atlasPlan";

export default function AtlasFlatMap({ plan, done }: { plan: GeneratedPlan; done: ReadonlySet<string> }) {
  return <section aria-label="2.5D map" className="space-y-6 rounded-2xl border border-paper-200 bg-paper-50 p-4 sm:p-6">
    <p className="text-sm text-ink-600">Each planet is a track. Select a node to open its lesson.</p>
    {[...new Set(plan.steps.map((s) => s.trackId))].map((trackId) => <article key={trackId} className="rounded-2xl border border-gold-400/30 bg-gold-400/5 p-4 shadow-lift">
      <h3 className="font-display text-lg">{findTrackMeta(trackId)?.title}</h3>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2">
        {plan.steps.filter((s) => s.trackId === trackId).map((s, index) => <li key={s.key}>
          <Link to={`/learn/${s.key}`} className="flex h-full gap-3 rounded-xl border border-paper-300 bg-paper-50 p-3 focus-visible:ring-2 focus-visible:ring-gold-500">
            <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold-400 bg-gold-400/10">{index + 1}</span>
            <span><span className="block">{findLessonMeta(s.trackId, s.lessonId)?.title}</span><span className="text-sm text-ink-600">{s.minutes} min · {done.has(s.key) ? "Done" : "To do"}</span></span>
          </Link>
        </li>)}
      </ol>
    </article>)}
  </section>;
}
