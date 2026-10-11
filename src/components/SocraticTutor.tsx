import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { loadAiSettings, streamAi, useAiSettings, type TutorMessage } from "../lib/ai";
import SocraticChatBubble from "./ui/SocraticChatBubble";

type Props = {
  /** The student's current code in the editor. */
  code: string;
  /** The exercise's check expression (so the tutor knows the goal). */
  checkExpr?: string;
  /** The hint from the exercise. */
  checkHint?: string;
  /** The error from the last run (if any). */
  error?: string | null;
  /** Console output from the last run. */
  logs?: string[];
  /** Lesson topic for context. */
  topic?: string;
  /** Language of the lesson's code, used to label the code fence sent to the tutor. */
  lang?: "js" | "ts" | "python" | "bash" | "sql";
  /** Hint tier the learner has already opened, if any, so the tutor won't repeat it. */
  openHintTier?: number;
  /** A question to send once automatically, e.g. from the error hand-off. */
  autoAsk?: { id: number; text: string };
};

const SOCRATIC_SYSTEM = `You are a Socratic programming tutor. Your ONLY job is to guide the student toward discovering the answer themselves.

CRITICAL RULES:
- NEVER write code for the student. Not even a snippet. Not even "try this".
- NEVER give the answer directly.
- Ask ONE focused question at a time that helps them notice something in their own code.
- Reference specific line numbers when possible.
- If there's an error, help them read and understand it — don't explain what the fix is.
- If their code is correct, ask a deepening question to build understanding.
- Keep responses under 3 sentences.
- Be warm and encouraging. Treat mistakes as learning opportunities.
- If they seem stuck after 3 exchanges, give a very broad conceptual nudge (still no code).`;

/** Recent turns kept in the prompt — an unbounded history blows the context. */
const MAX_TURNS = 12;

/** Clip lesson context so one huge console dump can't blow the context window. */
/** Markdown fence label for the lesson language; unknown values fall back to javascript. */
export function fenceLang(lang: Props["lang"]): string {
  switch (lang) {
    case "ts":
      return "typescript";
    case "python":
      return "python";
    case "bash":
      return "bash";
    case "sql":
      return "sql";
    default:
      return "javascript";
  }
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max) + "\n… (truncated)";
}

export default function SocraticTutor({
  code,
  checkExpr,
  checkHint,
  error,
  logs,
  topic,
  lang,
  openHintTier,
  autoAsk,
}: Props) {
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  // Subscribed through the store hook, so adding or removing a provider in
  // Settings re-renders this panel — the subscription is owned by exactly one
  // effect inside `useLocalStore`, never re-created per render.
  const settingsReady = !!useAiSettings().provider;
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const askTutor = useCallback(
    async (studentMessage: string) => {
      const settings = loadAiSettings();
      if (!settings.provider || !settings.keys[settings.provider]) return;

      const name = settings.tutorName || "student";
      const systemMsg: TutorMessage = {
        role: "system",
        content: `${SOCRATIC_SYSTEM}\n\nContext: The student${name ? ` (${name})` : ""} is working${topic ? ` on "${topic}"` : ""}.\n\nTheir current code:\n\`\`\`${fenceLang(lang)}\n${clip(code, 2000)}\n\`\`\`\n\n${checkExpr ? `Exercise goal (check expression): ${checkExpr}` : ""}\n${checkHint ? `Exercise hint: ${checkHint}` : ""}\n${openHintTier ? `They have already opened hint tier ${openHintTier} — don't repeat it.` : ""}\n${error ? `Last error: ${error}` : ""}\n${logs?.length ? `Console output:\n${clip(logs.slice(-40).join("\n"), 1500)}` : ""}`,
      };

      // Sliding window: only the most recent turns go to the provider.
      const recent = messages
        .filter((m) => m.role !== "system")
        .slice(-MAX_TURNS);
      const newMessages: TutorMessage[] = [
        systemMsg,
        ...recent,
        { role: "user", content: studentMessage },
      ];

      setMessages((prev) => [
        ...prev,
        { role: "user", content: studentMessage },
      ]);
      setInput("");
      setBusy(true);

      // The reply streams in, so the bubble grows as text arrives instead of
      // leaving the learner on a spinner for up to 45 seconds.
      let streamed = "";
      let appended = false;
      const scrollToEnd = () =>
        requestAnimationFrame(() => {
          // jsdom and older browsers have no Element.scrollTo.
          const el = scrollRef.current;
          if (el && typeof el.scrollTo === "function") {
            el.scrollTo(0, el.scrollHeight);
          }
        });

      const fail = (content: string) =>
        setMessages((prev) => {
          if (!appended) return [...prev, { role: "assistant", content }];
          const next = prev.slice();
          next[next.length - 1] = { role: "assistant", content };
          return next;
        });

      try {
        await streamAi(
          newMessages,
          (delta) => {
            streamed += delta;
            if (!appended) {
              appended = true;
              setMessages((prev) => [...prev, { role: "assistant", content: streamed }]);
            } else {
              const text = streamed;
              setMessages((prev) => {
                const next = prev.slice();
                next[next.length - 1] = { role: "assistant", content: text };
                return next;
              });
            }
            scrollToEnd();
          },
          settings,
        );
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "AI call failed";
        fail(
          `[${errMsg.includes("API") ? "API Error" : "Error"}] ${errMsg}. Check your API key in Settings.`,
        );
      } finally {
        setBusy(false);
        scrollToEnd();
      }
    },
    [code, checkExpr, checkHint, error, logs, messages, topic, lang, openHintTier],
  );

  // The error hand-off asks a question for the learner; fire it exactly once.
  const handledAutoAsk = useRef<number | null>(null);
  useEffect(() => {
    if (!autoAsk || handledAutoAsk.current === autoAsk.id) return;
    handledAutoAsk.current = autoAsk.id;
    void askTutor(autoAsk.text);
  }, [autoAsk, askTutor]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (input.trim() && !busy) {
        void askTutor(input.trim());
      }
    }
  };

  if (!settingsReady) {
    return (
      <div className="glass rounded-3xl border border-dashed border-paper-300/70 p-8 text-center">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-400/[0.08] text-violet-300">
          <Sparkles className="h-4 w-4" aria-hidden />
        </span>
        <p className="mt-4 font-mono text-[0.7rem] uppercase tracking-[0.22em] text-ink-500">
          Socratic AI Tutor
        </p>
        <p className="mt-3 text-sm text-ink-600">
          Optional: add a Gemini or Claude API key in Settings to enable guided help.
        </p>
        <p className="mt-1 text-xs text-ink-500">
          The tutor asks questions to guide you &mdash; it never writes code for you.
        </p>
      </div>
    );
  }

  return (
    <div className="glass glass-edge overflow-hidden rounded-3xl border border-paper-200/70">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-400/[0.08] text-violet-300">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="font-display text-sm font-bold tracking-tighter text-ink-950">
              Socratic Tutor
            </p>
            <p className="font-mono text-[0.62rem] uppercase tracking-widest text-ink-500">
              asks questions, never writes code
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => setMessages([])}
            className="rounded-full px-3 py-1 font-mono text-[0.68rem] uppercase tracking-widest text-ink-500 transition-colors hover:bg-white/[0.05] hover:text-ink-900"
          >
            clear chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="max-h-80 space-y-4 overflow-auto p-5"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <div className="py-6 text-center">
            <p className="text-sm text-ink-600">
              Stuck on your code? Ask the tutor for a hint.
            </p>
            <p className="mt-1 text-xs text-ink-500">
              It will guide you with questions &mdash; not solutions.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {[
                "I'm stuck, can you help?",
                "What's wrong with my code?",
                "I don't understand the error",
                "How should I think about this?",
              ].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void askTutor(q)}
                  className="rounded-full border border-cyan-400/20 bg-cyan-400/[0.05] px-3.5 py-1.5 text-xs text-cyan-200 transition-all duration-300 ease-snap hover:scale-[1.03] hover:border-cyan-400/50 hover:bg-cyan-400/10 active:scale-[0.97]"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <SocraticChatBubble key={i} role={m.role === "user" ? "user" : "ai"}>
            <p className="whitespace-pre-wrap">{m.content}</p>
          </SocraticChatBubble>
        ))}

        {busy && (
          <SocraticChatBubble role="ai" analyzing>
            {null}
          </SocraticChatBubble>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-white/[0.06] p-4">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-ink-900 outline-none transition-colors duration-300 placeholder:text-ink-400 focus:border-cyan-400/50 focus:bg-white/[0.05]"
            placeholder="Ask a question about your code..."
            aria-label="Ask the Socratic tutor"
          />
          <button
            type="button"
            onClick={() => {
              if (input.trim() && !busy) void askTutor(input.trim());
            }}
            disabled={busy || !input.trim()}
            className="self-end rounded-full bg-gold-400 px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-[#030305] transition-all duration-300 ease-snap hover:scale-[1.03] hover:bg-gold-300 hover:shadow-neon active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40"
          >
            ask
          </button>
        </div>
        <p className="mt-2.5 text-center font-mono text-[0.62rem] uppercase tracking-widest text-ink-400">
          {"\u2318"}Enter to send &middot; tutor never writes code for you
        </p>
      </div>
    </div>
  );
}
