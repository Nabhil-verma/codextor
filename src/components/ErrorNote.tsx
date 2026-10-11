import { translateError } from "../lib/errors";

/**
 * Plain-English explanation of a sandbox error, rendered above the raw
 * console output so beginners get an actionable next step first.
 */
export default function ErrorNote({
  raw,
  onAskTutor,
}: {
  raw: string;
  /** When given, offers a one-click hand-off to the AI tutor. */
  onAskTutor?: () => void;
}) {
  const t = translateError(raw);
  return (
    <div className="mb-3 rounded-xl border border-gold-400/40 bg-gold-400/5 px-4 py-3 text-sm leading-relaxed">
      <p className="font-semibold text-ink-950">
        <span className="mr-2 text-gold-600">✦</span>
        {t.title}
      </p>
      <p className="mt-1 text-ink-700">{t.plain}</p>
      <p className="mt-1 text-ink-600">
        <span className="font-semibold text-ink-800">Try this: </span>
        {t.fix}
      </p>
      {onAskTutor && (
        <button
          type="button"
          onClick={onAskTutor}
          className="mt-2 rounded-full border border-gold-400/50 px-3.5 py-1 font-mono text-xs text-gold-600 transition hover:bg-gold-400/10"
        >
          ask the tutor about this error →
        </button>
      )}
    </div>
  );
}
