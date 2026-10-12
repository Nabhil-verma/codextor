import { useEffect, useState } from "react";
import {
  type PackIndex,
  type PackStatus,
  loadPackIndex,
  packStatus,
  savePack,
} from "../lib/offlinePacks";

/*
 * "Save for offline" control for one track. It renders nothing when Cache
 * Storage is unavailable or the build has no pack index (dev server), so the
 * Learn page never shows a control that cannot work.
 */

let indexPromise: Promise<PackIndex | null> | null = null;

/** Loads the index once per page. A failure is remembered as null. */
function sharedIndex(): Promise<PackIndex | null> {
  if (!indexPromise) {
    indexPromise = loadPackIndex().catch(() => null);
  }
  return indexPromise;
}

type Phase = "loading" | "idle" | "saving" | "error" | "unavailable";

export default function OfflinePackButton({ trackId }: { trackId: string }) {
  const [index, setIndex] = useState<PackIndex | null>(null);
  const [status, setStatus] = useState<PackStatus>("none");
  const [phase, setPhase] = useState<Phase>(() =>
    typeof caches === "undefined" ? "unavailable" : "loading",
  );

  useEffect(() => {
    let live = true;
    if (typeof caches === "undefined") return;
    sharedIndex().then(async (loaded) => {
      if (!live) return;
      if (!loaded) {
        setPhase("unavailable");
        return;
      }
      const known = await packStatus(loaded, trackId).catch(() => "none" as PackStatus);
      if (!live) return;
      setIndex(loaded);
      setStatus(known);
      setPhase("idle");
    });
    return () => {
      live = false;
    };
  }, [trackId]);

  if (phase === "loading" || phase === "unavailable" || !index) return null;

  const save = async () => {
    setPhase("saving");
    try {
      await savePack(index, trackId);
      setStatus(await packStatus(index, trackId));
      setPhase("idle");
    } catch {
      setPhase("error");
    }
  };

  const label =
    phase === "saving"
      ? "Saving…"
      : phase === "error"
        ? "Retry offline save"
        : status === "saved"
          ? "Saved offline"
          : status === "partial"
            ? "Finish offline save"
            : "Save for offline";

  return (
    <button
      type="button"
      onClick={save}
      disabled={phase === "saving" || status === "saved"}
      aria-label={`${label} — ${trackId} track`}
      className="rounded-full border border-paper-300/70 px-4 py-1.5 font-mono text-[0.7rem] uppercase tracking-widest text-ink-500 transition-all duration-300 ease-snap hover:border-cyan-400/50 hover:text-cyan-300 active:scale-95 disabled:cursor-default disabled:opacity-70"
    >
      {label}
    </button>
  );
}
