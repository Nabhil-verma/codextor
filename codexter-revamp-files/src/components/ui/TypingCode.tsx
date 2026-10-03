import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";

/* ── A tiny JS highlighter: enough for demo snippets, no dependency. ── */

type Kind = "plain" | "comment" | "string" | "keyword" | "number" | "call";

const TOKEN =
  /(\/\/.*$)|("(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?|`(?:[^`\\]|\\.)*`?)|\b(const|let|var|function|return|if|else|for|while|async|await|import|from|export|new|class|of|in)\b|\b(\d+(?:\.\d+)?)\b|([A-Za-z_$][\w$]*)(?=\()/gm;

const KIND_CLASS: Record<Kind, string> = {
  // Fixed values, not theme tokens: code always sits on a dark surface, and
  // `.code-window` re-pins the ink scale, which made token-based text vanish.
  plain: "text-[#d9d9e3]",
  comment: "text-[#7c7f93] italic",
  string: "text-emerald-300",
  keyword: "text-violet-300",
  number: "text-amber-300",
  call: "text-cyan-300",
};

interface Span {
  text: string;
  kind: Kind;
}

export function highlight(source: string): Span[] {
  const out: Span[] = [];
  let last = 0;
  for (const m of source.matchAll(TOKEN)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ text: source.slice(last, at), kind: "plain" });
    const kind: Kind = m[1]
      ? "comment"
      : m[2]
        ? "string"
        : m[3]
          ? "keyword"
          : m[4]
            ? "number"
            : "call";
    out.push({ text: m[0], kind });
    last = at + m[0].length;
  }
  if (last < source.length) out.push({ text: source.slice(last), kind: "plain" });
  return out;
}

/** Reveals `text` one character at a time. Instant under reduced motion. */
export function useTypewriter(text: string, speed = 28, startDelay = 600) {
  const reduce = useReducedMotion();
  const [count, setCount] = useState(reduce ? text.length : 0);

  useEffect(() => {
    if (reduce) {
      setCount(text.length);
      return;
    }
    setCount(0);
    let tick: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      tick = setInterval(() => {
        setCount((c) => {
          if (c >= text.length) {
            if (tick) clearInterval(tick);
            return c;
          }
          return c + 1;
        });
      }, speed);
    }, startDelay);
    return () => {
      clearTimeout(start);
      if (tick) clearInterval(tick);
    };
  }, [text, speed, startDelay, reduce]);

  return { shown: text.slice(0, count), done: count >= text.length };
}

export interface TypingCodeProps {
  code: string;
  /** Console line revealed once typing finishes. */
  output?: string;
  speed?: number;
  startDelay?: number;
  /** Line numbers in the gutter. */
  gutter?: boolean;
  className?: string;
}

/** Syntax-highlighted code that types itself, then prints its output. */
export default function TypingCode({
  code,
  output,
  speed = 28,
  startDelay = 700,
  gutter = true,
  className = "",
}: TypingCodeProps) {
  const { shown, done } = useTypewriter(code, speed, startDelay);
  const spans = useMemo(() => highlight(shown), [shown]);
  const lineCount = Math.max(1, code.split("\n").length);
  const activeLine = shown.split("\n").length;

  return (
    <div className={"flex font-mono text-[0.8rem] leading-7 " + className}>
      {gutter && (
        <div
          aria-hidden
          className="select-none pr-5 text-right text-[#6b6e82]"
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div
              key={i}
              className={i + 1 === activeLine && !done ? "text-cyan-300" : ""}
            >
              {i + 1}
            </div>
          ))}
        </div>
      )}
      <div className="min-w-0 flex-1">
        {/* Full text is in the DOM for assistive tech; the typing is decoration. */}
        <span className="sr-only">{code}</span>
        <pre aria-hidden className="whitespace-pre-wrap break-words">
          <code>
            {spans.map((s, i) => (
              <span key={i} className={KIND_CLASS[s.kind]}>
                {s.text}
              </span>
            ))}
            {!done && <span className="caret" />}
          </code>
        </pre>
        {output && (
          <div
            className={
              "mt-2 border-l-2 border-emerald-400/50 pl-3 text-emerald-300 transition-all duration-700 ease-snap " +
              (done ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0")
            }
          >
            <span className="mr-2 text-[#7c7f93]">→</span>
            {output}
          </div>
        )}
      </div>
    </div>
  );
}

/** One statically highlighted line (for mockups that don't type). */
export function CodeLine({ text }: { text: string }) {
  return (
    <>
      {highlight(text).map((s, i) => (
        <span key={i} className={KIND_CLASS[s.kind]}>
          {s.text}
        </span>
      ))}
    </>
  );
}
