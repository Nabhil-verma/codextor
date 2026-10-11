import { useMemo, useState } from "react";
import {
  langLabel,
  normalizeLang,
  tokenize,
  toLines,
  type TokenType,
} from "../lib/highlight";

/*
 * A self-contained highlighted code block: tokenizer, language label, copy
 * button and optional line emphasis. No highlighting dependency, and every
 * colour comes from the CSS variables declared on `.code-window`, so light,
 * dark, glass and minimal all work.
 */

const TOKEN_CLASS: Record<TokenType, string> = {
  plain: "",
  keyword: "tok-keyword",
  string: "tok-string",
  number: "tok-number",
  comment: "tok-comment",
  function: "tok-function",
  property: "tok-property",
  tag: "tok-tag",
  operator: "tok-operator",
};

type Props = {
  code: string;
  /** Fence language from the markdown, e.g. "ts", "python", "bash". */
  lang?: string;
  /** 1-based line numbers to emphasise. */
  highlightLines?: number[];
  /** Hides the label/copy header — used where the caller supplies its own. */
  bare?: boolean;
  className?: string;
};

export default function CodeBlock({
  code,
  lang,
  highlightLines,
  bare = false,
  className = "",
}: Props) {
  const [copied, setCopied] = useState(false);
  const normalized = useMemo(() => normalizeLang(lang), [lang]);
  const lines = useMemo(() => toLines(tokenize(code, normalized)), [code, normalized]);
  const marked = new Set(highlightLines ?? []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={`code-window my-5 shadow-lift ${className}`}>
      {!bare && (
        <div className="flex items-center justify-between border-b border-ink-800 px-4 py-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-500">
            {langLabel(normalized)}
          </span>
          <button
            type="button"
            onClick={() => void copy()}
            aria-label={`Copy ${langLabel(normalized)} code`}
            className="rounded-full px-3 py-1 font-mono text-[11px] text-ink-600 transition hover:bg-ink-800 hover:text-paper-100"
          >
            {copied ? "copied" : "copy"}
          </button>
        </div>
      )}
      <pre className="overflow-x-auto py-5 font-mono text-[13px] leading-relaxed text-paper-300">
        <code>
          {lines.map((line, i) => (
            <span
              key={i}
              className={
                "block px-5 " +
                (marked.has(i + 1)
                  ? "border-l-2 border-gold-400/60 bg-gold-400/10"
                  : "border-l-2 border-transparent")
              }
            >
              {line.length === 0
                ? "\u00A0"
                : line.map((t, j) => (
                    <span key={j} className={TOKEN_CLASS[t.type]}>
                      {t.text}
                    </span>
                  ))}
            </span>
          ))}
        </code>
      </pre>
      <span role="status" className="sr-only">
        {copied ? "Code copied to the clipboard" : ""}
      </span>
    </div>
  );
}
