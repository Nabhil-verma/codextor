import { Link } from "react-router-dom";
import {
  MANIFEST_TRACKS as tracks,
  type ManifestTrack,
} from "../data/manifest";
import { scoreFor, useProgressState, type Progress } from "../lib/progress";
import { PrecisionRing, useSpotlight } from "./ui";

function trackProgress(track: ManifestTrack, progress: Progress) {
  const done = track.lessons.filter(
    (l) => scoreFor(progress, track.id + "/" + l.id) >= 1
  ).length;
  return { done, total: track.lessons.length };
}

export default function TrackCard({ track }: { track: ManifestTrack }) {
  const progress = useProgressState();
  const { done, total } = trackProgress(track, progress);
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const { ref, onPointerMove } = useSpotlight<HTMLAnchorElement>();
  const index = String(tracks.findIndex((t) => t.id === track.id) + 1).padStart(2, "0");
  const cta = done === 0 ? "Begin quest" : done >= total ? "Review" : "Continue quest";

  return (
    <Link
      ref={ref}
      onPointerMove={onPointerMove}
      to={"/learn/" + track.id + "/" + track.lessons[0].id}
      className="spotlight glass glass-edge group relative flex h-full flex-col overflow-hidden rounded-3xl border border-paper-200/70 p-8 transition-all duration-500 ease-snap hover:-translate-y-1 hover:border-cyan-400/30 focus-visible:-translate-y-1"
    >
      <div className="relative z-10 flex items-start justify-between">
        <span className="font-mono text-xs uppercase tracking-[0.22em] text-ink-400">
          {index}
        </span>
        <PrecisionRing value={pct} size={44} stroke={2} label={`${track.title} progress`}>
          <span className="font-mono text-[0.62rem] text-ink-700">{pct}</span>
        </PrecisionRing>
      </div>

      <div className="relative z-10 mt-8">
        <h3 className="font-display text-2xl font-bold tracking-tighter text-ink-950">
          {track.title}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-ink-600">{track.blurb}</p>
      </div>

      <div className="relative z-10 mt-auto flex items-end justify-between pt-10">
        <span className="font-mono text-[0.7rem] uppercase tracking-widest text-ink-500">
          {done}/{total} lessons
        </span>
        {/* Appears on hover/focus; always visible on touch screens. */}
        <span
          className="inline-flex translate-y-1 items-center gap-1.5 rounded-full bg-gold-400 px-3.5 py-1.5 text-xs font-semibold text-[#030305] opacity-0 shadow-[0_0_24px_rgba(0,229,255,0.35)] transition-all duration-300 ease-snap group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100"
          aria-hidden
        >
          {cta}
          <span className="transition-transform duration-300 ease-snap group-hover:translate-x-0.5">→</span>
        </span>
      </div>
    </Link>
  );
}
