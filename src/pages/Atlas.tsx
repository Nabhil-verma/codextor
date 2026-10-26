import { lazy, Suspense, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import AtlasFlatMap from "../components/AtlasFlatMap";
import { PanelBoundary } from "../components/gamification/Pieces";
import { Link } from "react-router-dom";
import { atlasViewStore, chooseView, detectWebgl } from "../lib/atlasView";
import { INTERVIEW_QUESTIONS, type InterviewAnswers } from "../lib/atlasInterview";
import { generatePlan, paceForecast } from "../lib/atlasPlan";
import { todayKey } from "../lib/gamification";
import { useLocalStore } from "../lib/localStore";
import { useAccount } from "../AccountProvider";
import { atlasStoreFor, saveAtlasAnswers } from "../lib/atlasStore";
import { findTrackMeta } from "../data/manifest";
import { scoreFor, useProgressState } from "../lib/progress";

import AtlasBridge from "../components/AtlasBridge";

// three.js is loaded only when the 3D view is shown.
const AtlasScene = lazy(() => import("../components/AtlasScene"));

const startQuestions = INTERVIEW_QUESTIONS.filter((q) => q.group === "start");

export default function Atlas() {
  const { user } = useAccount();
  return <AtlasPage key={user?.handle ?? "guest"} handle={user?.handle} />;
}

function AtlasPage({ handle }: { handle?: string }) {
  const saved = useLocalStore(atlasStoreFor(handle));
  const [edits, setEdits] = useState<InterviewAnswers | null>(null);
  const draft = edits ?? saved.answers;
  const plan = useMemo(() => generatePlan(saved.answers), [saved]);
  const progress = useProgressState();
  const override = useLocalStore(atlasViewStore);
  const reducedMotion = useReducedMotion() ?? false;
  const [webgl] = useState(detectWebgl);
  const lowPower = (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 2) || saved.answers.device === "phone";
  const view = chooseView({ webgl, reducedMotion, lowPower, override });
  const doneKeys = new Set(plan.steps.filter((s) => scoreFor(progress, s.key) >= 1).map((s) => s.key));

  const set = (id: string, value: string) => setEdits({ ...draft, [id]: value });

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <AtlasBridge />
      <h1 className="font-display text-3xl">Atlas</h1>
      <p className="mt-2 text-ink-600">Answer a few questions to get a learning plan. You can skip any of them.</p>

      <form
        className="mt-8 space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          saveAtlasAnswers(handle, draft);
          setEdits(null);
        }}
      >
        {startQuestions.map((q) => (
          <fieldset key={q.id} className="space-y-3">
            <legend className="font-medium">{q.prompt}</legend>
            {q.kind === "choice" ? (
              <div className="flex flex-wrap gap-2">
                {q.options.map((o) => (
                  <label key={o.id} className="cursor-pointer">
                    <input
                      type="radio"
                      name={q.id}
                      value={o.id}
                      className="peer sr-only"
                      checked={draft[q.id] === o.id}
                      onChange={() => set(q.id, o.id)}
                    />
                    <span className="inline-block rounded-full border border-ink-300 px-3 py-1 peer-checked:border-gold-500 peer-checked:bg-gold-400/10 peer-focus-visible:ring-2 peer-focus-visible:ring-gold-500">
                      {o.label}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <input
                type="text"
                aria-label={q.prompt}
                maxLength={200}
                className="w-full rounded-md border border-ink-300 bg-transparent px-3 py-2"
                value={draft[q.id] ?? ""}
                onChange={(e) => set(q.id, e.target.value)}
              />
            )}
          </fieldset>
        ))}

        <div className="flex gap-3">
          <button type="submit" className="rounded-full bg-gold-500 px-5 py-2 font-medium text-paper-50 focus-visible:ring-2 focus-visible:ring-gold-500">
            Save my plan
          </button>
          <button
            type="button"
            className="rounded-full border border-ink-300 px-5 py-2 focus-visible:ring-2 focus-visible:ring-gold-500"
            onClick={() => {
              saveAtlasAnswers(handle, {});
              setEdits(null);
            }}
          >
            Skip and use the default plan
          </button>
        </div>
      </form>

      <section aria-live="polite" className="mt-10 rounded-2xl border border-ink-200 p-6">
        <h2 className="font-display text-xl">Your plan</h2>
        <p className="mt-2">
          Finish by {paceForecast(plan, doneKeys, todayKey()).finishDate} at {plan.hoursPerWeek} hours a week.
        </p>
        <p className="mt-2">
          {plan.steps.length} lessons · about {plan.weeks} weeks at {plan.hoursPerWeek} hours a week
        </p>
      </section>

      <section aria-label="Map view" className="mt-10">
        <div role="group" aria-label="Choose a view" className="mb-4 flex gap-2">
          {(["3d", "2.5d", "outline"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              className="rounded-full border border-ink-300 px-3 py-1 aria-pressed:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500"
              onClick={() => atlasViewStore.set(v)}
            >
              {v === "3d" ? "3D" : v === "2.5d" ? "2.5D" : "Outline"}
            </button>
          ))}
        </div>
        <button type="button" className="mb-4 text-sm underline" onClick={() => atlasViewStore.reset()}>Use device setting</button>
        {override === "3d" && !webgl && <p role="status">3D is unavailable on this device. Use 2.5D or the outline below.</p>}
        {view === "3d" ? (
          <PanelBoundary fallback={<p role="status">3D could not load. Use 2.5D or the outline below.</p>}>
            <Suspense fallback={<p>Loading the 3D view…</p>}>
              <AtlasScene plan={plan} done={doneKeys} />
            </Suspense>
          </PanelBoundary>
        ) : view === "2.5d" ? <AtlasFlatMap plan={plan} done={doneKeys} /> : null}
      </section>

      <section aria-label="Outline" className="mt-10 space-y-8">
        {[...new Set(plan.steps.map((s) => s.trackId))].map((trackId) => (
          <div key={trackId}>
            <h2 className="font-display text-xl">{findTrackMeta(trackId)?.title ?? trackId}</h2>
            <ol className="mt-3 space-y-2">
              {plan.steps
                .filter((s) => s.trackId === trackId)
                .map((s) => {
                  const done = scoreFor(progress, s.key) >= 1;
                  return (
                    <li key={s.key}>
                      <Link
                        to={`/learn/${s.trackId}/${s.lessonId}`}
                        className="flex items-center justify-between rounded-lg border border-ink-200 px-4 py-2 focus-visible:ring-2 focus-visible:ring-gold-500"
                      >
                        <span>{findTrackMeta(s.trackId)?.lessons.find((l) => l.id === s.lessonId)?.title ?? s.lessonId}</span>
                        <span className="text-sm text-ink-600">
                          {s.minutes} min · {done ? "Done" : "To do"}
                        </span>
                      </Link>
                    </li>
                  );
                })}
            </ol>
          </div>
        ))}
      </section>
    </main>
  );
}
