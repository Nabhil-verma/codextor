import CodeBlock from "./CodeBlock";
import type { Lesson } from "../data/types";

function Inline({ text }: { text: string }) {
  // Split on `code` and **bold** segments
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("`") && p.endsWith("`")) {
          return (
            <code
              key={i}
              className="rounded-md bg-paper-100 px-1.5 py-0.5 font-mono text-[0.85em] text-gold-700"
            >
              {p.slice(1, -1)}
            </code>
          );
        }
        if (p.startsWith("**") && p.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-ink-950">
              {p.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

type Segment = { kind: "prose"; text: string } | { kind: "code"; text: string; lang: string };

/**
 * Splits lesson markdown into prose and fenced code, keeping the fence's
 * language so CodeBlock can label and colour it.
 */
export function parseLessonBody(body: string): Segment[] {
  const fence = /```(\w*)\n?([\s\S]*?)```/g;
  const segments: Segment[] = [];
  let cursor = 0;
  let m: RegExpExecArray | null;
  while ((m = fence.exec(body))) {
    if (m.index > cursor) {
      segments.push({ kind: "prose", text: body.slice(cursor, m.index) });
    }
    segments.push({ kind: "code", lang: m[1], text: m[2].replace(/\n$/, "") });
    cursor = m.index + m[0].length;
  }
  if (cursor < body.length) {
    segments.push({ kind: "prose", text: body.slice(cursor) });
  }
  return segments;
}

export default function LessonBody({ lesson }: { lesson: Lesson }) {
  const segments = parseLessonBody(lesson.body);

  return (
    <div className="space-y-5 text-[17px] leading-relaxed text-ink-700">
      {segments.map((seg, i) =>
        seg.kind === "code" ? (
          <CodeBlock key={i} code={seg.text} lang={seg.lang} />
        ) : (
          seg.text
            .split(/\n\n+/)
            .filter((p) => p.trim())
            .map((para, j) => (
              <p key={j} className="whitespace-pre-line">
                <Inline text={para.trim()} />
              </p>
            ))
        )
      )}
    </div>
  );
}
