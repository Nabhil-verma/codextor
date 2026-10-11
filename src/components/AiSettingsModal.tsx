import { useEffect, useRef, useState } from "react";
import {
  loadAiSettings,
  saveAiSettings,
  modelFor,
  MODEL_OPTIONS,
  testKey,
  type AiSettings,
  type AiProvider,
} from "../lib/ai";
import type { ThemeStyle } from "../lib/theme";

/* The two design languages, swappable from the appearance section. */
const STYLES: { id: ThemeStyle; name: string; blurb: string }[] = [
  { id: "glass", name: "Glassmorphic", blurb: "Frosted glass · neon cyan" },
  { id: "minimal", name: "Minimal gold", blurb: "White · black · gold serif" },
];

const inputCls =
  "w-full rounded-xl border border-paper-300 bg-paper-50 px-4 py-2.5 text-sm text-ink-950 outline-none transition placeholder:text-ink-400 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/25";

export default function AiSettingsModal({
  onClose,
  themeStyle,
  onThemeStyle,
}: {
  onClose: () => void;
  themeStyle: ThemeStyle;
  onThemeStyle: (style: ThemeStyle) => void;
}) {
  const [settings, setSettings] = useState<AiSettings>(loadAiSettings);
  const [saved, setSaved] = useState(false);
  const [test, setTest] = useState<{ state: "idle" | "testing" | "ok" | "error"; message: string }>(
    { state: "idle", message: "" },
  );
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const update = (patch: Partial<AiSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    setSaved(false);
    setTest({ state: "idle", message: "" });
  };

  const runTest = async () => {
    if (!settings.provider) return;
    const provider = settings.provider;
    setTest({ state: "testing", message: "" });
    try {
      await testKey(provider, settings.keys[provider]!.trim(), modelFor(settings, provider));
      setTest({ state: "ok", message: "Key works. The tutor is ready." });
    } catch (err) {
      setTest({
        state: "error",
        message: err instanceof Error ? err.message : "Something went wrong.",
      });
    }
  };

  const handleSave = () => {
    saveAiSettings(settings);
    setSaved(true);
  };

  const hasKey = (p: AiProvider) => !!(p && settings.keys[p]?.trim());

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-settings-title"
        className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-paper-200 bg-paper-50 p-8 shadow-lift"
      >
        <p className="eyebrow">settings</p>
        <h2
          id="ai-settings-title"
          className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink-950"
        >
          Settings
        </h2>

        {/* Style: the two design languages are interchangeable here. */}
        <div className="mt-6 space-y-3">
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink-500">
            appearance
          </p>
          <div className="flex gap-3">
            {STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onThemeStyle(s.id)}
                aria-pressed={themeStyle === s.id}
                className={`flex-1 rounded-xl border px-4 py-3 text-left transition ${
                  themeStyle === s.id
                    ? "border-gold-400 bg-gold-400/10 ring-2 ring-gold-400/25"
                    : "border-paper-200 hover:border-ink-300"
                }`}
              >
                <span className="block font-display text-lg font-semibold text-ink-950">
                  {s.name}
                </span>
                <span className="mt-0.5 block text-xs text-ink-600">{s.blurb}</span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-ink-500">
            Glass is the neon cyan look; Minimal is the original white, black and gold
            one. Light/dark is the sun/moon button in the nav.
          </p>
        </div>

        <div className="my-7 h-px bg-white/[0.06]" />

        <p className="text-sm leading-relaxed text-ink-600">
          The AI tutor is 100% optional. If you want guided help, bring your own API key
          for Google Gemini or Anthropic Claude. Keys stay in your browser and are sent
          only to the provider you choose.
        </p>
        <p className="mt-3 rounded-xl border border-gold-400/30 bg-gold-400/5 px-4 py-3 text-xs leading-relaxed text-ink-700">
          <strong className="font-semibold text-ink-950">What gets sent:</strong> when you
          ask the tutor, up to 2,000 characters of your current code, its console output
          and the last error, plus your recent questions, go to the provider you chose.
          Don't paste anything private into the tutor.
        </p>

        {/* Provider toggle */}
        <div className="mt-6 space-y-3">
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink-500">
            provider
          </p>
          <div className="flex gap-3">
            {(["gemini", "claude"] as AiProvider[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => update({ provider: settings.provider === p ? null : p })}
                className={`flex-1 rounded-xl border px-4 py-3 text-left transition ${
                  settings.provider === p
                    ? "border-gold-400 bg-gold-400/10 ring-2 ring-gold-400/25"
                    : "border-paper-200 hover:border-ink-300"
                }`}
              >
                <span className="block font-display text-lg font-semibold text-ink-950">
                  {p === "gemini" ? "Google Gemini" : "Anthropic Claude"}
                </span>
                <span className="mt-0.5 block text-xs text-ink-600">
                  {hasKey(p) ? "key saved" : "no key"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* API key inputs */}
        {settings.provider && (
          <div className="mt-5 space-y-3">
            <div>
              <label className="mb-1 block font-mono text-[11px] uppercase tracking-widest text-ink-500">
                {settings.provider === "gemini"
                  ? "Gemini API Key"
                  : "Claude API Key"}
              </label>
              <input
                ref={firstRef}
                type="password"
                value={settings.keys[settings.provider] ?? ""}
                onChange={(e) =>
                  update({
                    keys: { ...settings.keys, [settings.provider!]: e.target.value },
                  })
                }
                className={inputCls}
                placeholder={
                  settings.provider === "gemini"
                    ? "AIza..."
                    : "sk-ant-..."
                }
              />
              <p className="mt-1 text-[11px] text-ink-500">
                {settings.provider === "gemini"
                  ? "Get a key at aistudio.google.com"
                  : "Get a key at console.anthropic.com"}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void runTest()}
                  disabled={!hasKey(settings.provider) || test.state === "testing"}
                  className="btn-ghost !px-4 !py-1.5 text-xs disabled:opacity-50"
                >
                  {test.state === "testing" ? "Testing…" : "Test key"}
                </button>
                <span
                  role="status"
                  className={`text-xs ${test.state === "ok" ? "text-green-600" : "text-red-600"}`}
                >
                  {test.state === "ok" || test.state === "error" ? test.message : ""}
                </span>
              </div>
            </div>
            <div>
              <label
                htmlFor="ai-model"
                className="mb-1 block font-mono text-[11px] uppercase tracking-widest text-ink-500"
              >
                Model
              </label>
              <select
                id="ai-model"
                value={modelFor(settings, settings.provider)}
                onChange={(e) =>
                  update({
                    models: { ...settings.models, [settings.provider!]: e.target.value },
                  })
                }
                className={inputCls}
              >
                {MODEL_OPTIONS[settings.provider].map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Tutor name */}
        <div className="mt-5">
          <label className="mb-1 block font-mono text-[11px] uppercase tracking-widest text-ink-500">
            Your name (optional, for the tutor)
          </label>
          <input
            value={settings.tutorName}
            onChange={(e) => update({ tutorName: e.target.value })}
            className={inputCls}
            placeholder="e.g. Ada"
          />
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-sm text-ink-600 hover:text-ink-950"
          >
            close
          </button>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="font-mono text-xs text-green-600">
                saved!
              </span>
            )}
            <button type="button" onClick={handleSave} className="btn-gold !px-5">
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
