import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MANIFEST_TRACKS, lessonKey } from "../data/manifest";
import { BUG_TAXONOMY } from "../data/bug-taxonomy";
import { scoreFor, useProgressState } from "../lib/progress";
import { useTheme, useThemeStyle } from "../lib/theme";
import { useLocalStore } from "../lib/localStore";
import {
  onOpenAiSettings,
  onOpenPalette,
  openAiSettings,
  recentsStore,
  rememberRecent,
} from "../lib/paletteBus";

/*
 * Cmd/Ctrl+K: one fuzzy search across the curriculum, the app's destinations
 * and the appearance/AI actions. It reads the generated manifest, so it knows
 * every lesson without pulling a single lesson body into the bundle.
 *
 * Implemented as a combobox: the input owns focus the whole time and points at
 * the active row with aria-activedescendant, which is what screen readers
 * expect from a list that never receives focus itself.
 */

type Group = "Lessons" | "Tracks" | "Taxonomy" | "Go to" | "Actions" | "Recent";

type Item = {
  id: string;
  label: string;
  hint: string;
  group: Group;
  keywords?: string;
  run: () => void;
};

const GROUP_ORDER: Group[] = ["Recent", "Lessons", "Tracks", "Taxonomy", "Go to", "Actions"];

/**
 * Substring match first (earlier is better), then subsequence match, so
 * "axp" still finds "Async/Await & Promises". Returns 0 for no match.
 */
export function fuzzyScore(query: string, text: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 1;
  const t = text.toLowerCase();
  const at = t.indexOf(q);
  if (at !== -1) return 1_000 - at;
  let cursor = 0;
  let streak = 0;
  let best = 0;
  for (const ch of q) {
    const idx = t.indexOf(ch, cursor);
    if (idx === -1) return 0;
    streak = idx === cursor ? streak + 1 : 0;
    best = Math.max(best, streak);
    cursor = idx + 1;
  }
  return 10 + best;
}

export default function CommandPalette() {
  const navigate = useNavigate();
  const progress = useProgressState();
  const { theme, toggle } = useTheme();
  const { style, setStyle } = useThemeStyle();
  const recents = useLocalStore(recentsStore);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  const go = (to: string, id: string) => {
    rememberRecent(id);
    setOpen(false);
    navigate(to);
  };

  /** First lesson of a track the learner has not finished, else its first. */
  const resumeIn = (trackId: string) => {
    const track = MANIFEST_TRACKS.find((t) => t.id === trackId);
    if (!track || track.lessons.length === 0) return "/learn";
    const next = track.lessons.find((l) => scoreFor(progress, lessonKey(track.id, l.id)) < 1);
    const lesson = next ?? track.lessons[0];
    return `/learn/${track.id}/${lesson.id}`;
  };

  const items = useMemo<Item[]>(() => {
    const lessons: Item[] = MANIFEST_TRACKS.flatMap((track) =>
      track.lessons.map((lesson) => ({
        id: `lesson:${track.id}/${lesson.id}`,
        label: lesson.title,
        hint: `${track.title} · ${lesson.minutes} min`,
        group: "Lessons" as Group,
        run: () => go(`/learn/${track.id}/${lesson.id}`, `lesson:${track.id}/${lesson.id}`),
      })),
    );

    const tracks: Item[] = MANIFEST_TRACKS.map((track) => ({
      id: `track:${track.id}`,
      label: track.title,
      hint: `Track ${track.numeral} · ${track.lessons.length} lessons`,
      group: "Tracks" as Group,
      run: () => go(resumeIn(track.id), `track:${track.id}`),
    }));

    const taxonomy: Item[] = BUG_TAXONOMY.map((entry) => ({
      id: `taxonomy:${entry.code}`,
      label: `${entry.code} · ${entry.label}`,
      hint: "bug taxonomy",
      keywords: entry.code,
      group: "Taxonomy" as Group,
      run: () => go("/learn", `taxonomy:${entry.code}`),
    }));

    const routes: Item[] = [
      { to: "/playground", label: "Playground", hint: "scratch editor" },
      { to: "/learn", label: "Lessons", hint: "the catalog" },
      { to: "/leaderboard", label: "Leaderboard", hint: "weekly, monthly, all-time" },
      { to: "/clans", label: "Guilds", hint: "clans and co-op quests" },
      { to: "/portfolio", label: "Portfolio", hint: "your work and certificates" },
      { to: "/projects", label: "Projects", hint: "larger builds" },
    ].map((route) => ({
      id: `route:${route.to}`,
      label: route.label,
      hint: route.hint,
      group: "Go to" as Group,
      run: () => go(route.to, `route:${route.to}`),
    }));

    const nextIncomplete = (() => {
      for (const track of MANIFEST_TRACKS) {
        for (const lesson of track.lessons) {
          if (scoreFor(progress, lessonKey(track.id, lesson.id)) < 1) {
            return { track, lesson };
          }
        }
      }
      return null;
    })();

    const actions: Item[] = [
      ...(nextIncomplete
        ? [
            {
              id: "action:continue",
              label: "Continue where I left off",
              hint: `${nextIncomplete.track.title} · ${nextIncomplete.lesson.title}`,
              keywords: "resume next lesson",
              group: "Actions" as Group,
              run: () =>
                go(
                  `/learn/${nextIncomplete.track.id}/${nextIncomplete.lesson.id}`,
                  "action:continue",
                ),
            },
          ]
        : []),
      {
        id: "action:theme",
        label: `Switch to ${theme === "dark" ? "light" : "dark"} mode`,
        hint: "appearance",
        keywords: "theme dark light appearance",
        group: "Actions" as Group,
        run: () => {
          toggle();
          setOpen(false);
        },
      },
      {
        id: "action:style",
        label: `Use the ${style === "glass" ? "minimal" : "glass"} visual style`,
        hint: "appearance",
        keywords: "style glass minimal design",
        group: "Actions" as Group,
        run: () => {
          setStyle(style === "glass" ? "minimal" : "glass");
          setOpen(false);
        },
      },
      {
        id: "action:ai",
        label: "AI tutor settings",
        hint: "provider, key, model",
        keywords: "ai settings key gemini claude tutor",
        group: "Actions" as Group,
        run: () => {
          setOpen(false);
          openAiSettings();
        },
      },
    ];

    return [...lessons, ...tracks, ...taxonomy, ...routes, ...actions];
  }, [progress, theme, style, toggle, setStyle]); // eslint-disable-line react-hooks/exhaustive-deps

  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  const results = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      const recent = recents
        .map((id) => byId.get(id))
        .filter((item): item is Item => !!item)
        .map((item) => ({ ...item, group: "Recent" as Group }));
      if (recent.length) return recent;
      return items.filter((item) => GROUP_ORDER.indexOf(item.group) <= 2).slice(0, 8);
    }
    return items
      .map((item) => ({
        item,
        score: Math.max(
          fuzzyScore(trimmed, item.label),
          fuzzyScore(trimmed, `${item.hint} ${item.keywords ?? ""}`) * 0.8,
        ),
      }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((r) => r.item);
  }, [query, items, recents, byId]);

  /* ---------------- open/close ---------------- */

  useEffect(() => {
    const openIt = () => {
      setQuery("");
      setActive(0);
      setOpen(true);
    };
    const offBus = onOpenPalette(openIt);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQuery("");
        setActive(0);
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      offBus();
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // Focus goes to the input on open and back where it came from on close.
  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      clearTimeout(t);
      restoreRef.current?.focus?.();
    };
  }, [open]);

  // Also let the nav's own Settings control announce itself to the palette.
  useEffect(() => onOpenAiSettings(() => setOpen(false)), []);

  if (!open) return null;

  const activeId = results[active] ? `cmdk-option-${results[active].id}` : undefined;

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      results[active]?.run();
    }
  };

  // Group headers are decided before render, never by mutating a marker mid-map.
  const rows = results.map((item, i) => ({
    item,
    i,
    header: i === 0 || results[i - 1].group !== item.group ? item.group : null,
  }));

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-ink-950/50 p-4 pt-[12vh] backdrop-blur-xs"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search and commands"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-paper-50 shadow-lift"
      >
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded="true"
          aria-controls="cmdk-listbox"
          aria-activedescendant={activeId}
          aria-label="Search lessons, tracks and commands"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search lessons, tracks, commands…"
          className="w-full border-b border-paper-200 bg-transparent px-5 py-4 text-base text-ink-950 outline-hidden placeholder:text-ink-400"
        />
        <ul id="cmdk-listbox" role="listbox" aria-label="Results" className="max-h-80 overflow-y-auto py-2">
          {results.length === 0 && (
            <li className="px-5 py-6 text-sm text-ink-500">No matches. Try a lesson name or a command.</li>
          )}
          {rows.map(({ item, i, header }) => (
              <li key={item.id}>
                {header && (
                  <p className="px-5 pb-1 pt-3 font-mono text-[10px] uppercase tracking-widest text-ink-500">
                    {header}
                  </p>
                )}
                <button
                  id={`cmdk-option-${item.id}`}
                  role="option"
                  aria-selected={i === active}
                  type="button"
                  tabIndex={-1}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => item.run()}
                  className={
                    "flex w-full items-baseline justify-between gap-4 px-5 py-2 text-left transition-colors " +
                    (i === active ? "bg-gold-400/15" : "")
                  }
                >
                  <span className="truncate text-sm text-ink-950">{item.label}</span>
                  <span className="shrink-0 font-mono text-[11px] text-ink-500">{item.hint}</span>
                </button>
              </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
