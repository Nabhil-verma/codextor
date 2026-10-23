import { useState } from "react";
import { MAX_CODE, encodeReplay, replayUrl } from "../lib/replayShare";

/*
 * Makes a replay link from the code on screen. The link is built here, in the
 * browser, and nothing is sent anywhere: the token is the whole replay.
 */

export default function ShareReplay({ code }: { code: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");

  const tooLong = code.length > MAX_CODE;

  const make = async () => {
    try {
      const token = encodeReplay({ code });
      const url = replayUrl(token, window.location.origin, window.location.pathname);
      setLink(url);
      try {
        await navigator.clipboard.writeText(url);
        setStatus("Link copied. It expires in 30 days.");
      } catch {
        setStatus("Copy the link below. It expires in 30 days.");
      }
    } catch (e) {
      setLink(null);
      setStatus(e instanceof Error ? e.message : "Could not make a link.");
    }
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => void make()}
        disabled={tooLong}
        title={tooLong ? `Replay links hold up to ${MAX_CODE} characters` : undefined}
        className="rounded-full border border-paper-200 px-4 py-1.5 font-mono text-xs text-ink-600 transition hover:border-gold-400 hover:text-gold-600 disabled:opacity-50"
      >
        copy replay link
      </button>
      {status && (
        <p role="status" className="mt-2 font-mono text-[11px] text-ink-500">
          {status}
        </p>
      )}
      {link && (
        <input
          readOnly
          aria-label="Replay link"
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          className="mt-2 w-full rounded-lg border border-paper-200 bg-paper-50 px-3 py-2 font-mono text-[11px] text-ink-700"
        />
      )}
    </div>
  );
}
