# Codextor

> **A 100% free, interactive code teacher.** <!-- counts:words -->Seventeen tracks, 118 hands-on lessons<!-- /counts:words --> —
> you write and run real code from minute one, in the browser, with easy signup.

**Live:** [codextorcybo4.freebuff.app](https://codextorcybo4.freebuff.app) or what will probably have to be the next and new domain/url [codextor](https://codextor.freebuff.page)

No paywalls, no waste of time , no code snippets you can only
read. Every exercise runs *in your browser* and is graded by what your program
actually does.

---

## Table of contents

- [Why this exists](#why-this-exists)
- [Feature overview](#feature-overview)
- [The curriculum](#the-curriculum)
- [Twelve ways to practise](#twelve-ways-to-practise)
- [The XP economy](#the-xp-economy)
- [Progression: levels, ascension, titles, badges](#progression-levels-ascension-titles-badges)
- [Guilds](#guilds)
- [Project milestones](#project-milestones)
- [How the sandbox actually works](#how-the-sandbox-actually-works)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Project structure](#project-structure)
- [Accounts, progress & cloud sync](#accounts-progress--cloud-sync)
- [AI tutor (BYOK)](#ai-tutor-byok)
- [Testing](#testing)
- [Deployment](#deployment)
- [Design system](#design-system)
- [Troubleshooting](#troubleshooting)
- [Further documentation](#further-documentation)
- [License](#license)
- [Found a bug?](#found-a-bug)

---

## Why this exists

Codextor is built around **judgment over authorship**. AI can draft a change;
people still have to decide what should change, supply the right context,
approve the plan, verify the result and operate what ships.

**Vibe coding** is accepting AI output because it looks right.
**Agentic engineering** is directing an agent through
**spec → context → plan → delegate → verify → operate**, with the human
accountable for the result. Codextor teaches that judgment using deterministic
diff reviews, repair labs, repo traces and rubric-checked artifacts. Real JS,
the TypeScript compiler and Python execute in the browser where appropriate;
a live LLM is an optional BYOK tutor, never the main grader.

A few consequences worth calling out, because they're unusual for a learning app:

- **Grading is behavioural, not textual.** A break-and-fix lab that prints the
  right-looking thing still fails if the output is wrong. A program that prints
  the correct answer while lying to the type system still fails.
- **The real TypeScript compiler runs in the page.** Not a regex, not a
  hand-rolled checker — the `tsc` front end against an in-memory host holding the
  ES2020 libs, reporting genuine diagnostics with line and column.
- **Everything degrades instead of breaking.** A dead backend, a missing API
  endpoint, a corrupt `localStorage` entry — each one costs you exactly one
  panel, with a plain-English explanation, instead of the whole app.

## Feature overview

- **<!-- counts:pair -->17 curriculum tracks, 118 lessons<!-- /counts:pair -->** — Web foundations, React, Tailwind UI
  engineering, advanced React state, API integration, TypeScript for real
  projects, backend/Node, DSA, Python, Git & testing, DevOps/Linux/Docker, web
  security (OWASP), system design, web performance & accessibility,
  debugging/testing practice (including production incident review), and
  **working with coding agents** (the V2.1 judgment track: specs, codebase
  archaeology, instruction files, plan approval, permissions, multi-file diff
  review, and an agent-loop capstone)
- **Live sandbox runner** — every lesson has an editor + console with
  self-checking exercises, "predict the output" challenges, and an
  infinite-loop guard
- **Visual execution engine** — step through code like Python Tutor: variables,
  call stack, and console replay line by line
- **The real TypeScript compiler, in the browser** — the TypeScript track runs
  the `tsc` front end against an in-memory host holding the ES2020 libs, so every
  Run reports real diagnostics with line and column, then strips types and
  executes. Grading needs all three: it runs, it compiles with zero errors, and
  its output passes — a program that prints the right thing while lying to the
  type system does not count
- **Measured performance & accessibility** — a track where the answer is a
  number, not an opinion: LCP/INP/CLS budgets, layout shift fixed in a live
  preview, AA contrast ratios, keyboard semantics and reduced motion, all graded
  against the page you actually built
- **Tiered hint system** — conceptual nudge → syntax reminder → code skeleton,
  before any full solution
- **Plain-English error translator** — runtime errors get beginner-friendly
  explanations above the console
- **Gamification game loop** — XP, levels, daily streaks, daily quests, 13
  badges, and a GitHub-style activity heatmap on your public portfolio
- **Global leaderboard** — live weekly / monthly / all-time brackets with
  glassmorphic rank rows, ascension frames and titles, and your own row glowing
  as it reorders
- **RPG ascension** — seven tiers (Initiate → Mythic) that change your avatar
  frame and unlock equippable titles, with a level ring and tier ladder on your
  profile
- **Guilds** — form a study group of up to 25, pool your XP on the guild board,
  and unlock collective rewards from Band to Legend
- **Interactive course elements** — drag-and-drop sequence challenges, a timed
  rapid-fire quiz mode with combo streaks and screen shake, and animated
  progress reveals
- **Live rendering + break-and-fix labs** — write HTML/CSS/Tailwind and watch the
  browser's own layout engine respond, or repair a genuinely broken program that
  is graded by running it
- **Project milestones** — one continuous portfolio project split into six
  milestones, each gated on the lessons that teach the skill and worth 1,750 XP
  toward your rank
- **Printable certificates** — finish every lesson in a track to unlock a
  gold-sealed certificate
- **Progress that follows you** — lesson scores and project milestone claims are
  saved locally by default; optional **Sign in with Freebuff** syncs both across
  devices, into this app's own Freebuff-hosted database
- **Light & night mode, two design languages** — one `class="dark"` on `<html>`
  rethemes everything, because every color in the Tailwind config resolves
  through the CSS variables in `src/index.css`. Settings also swaps the whole
  visual style between the current glassmorphic cyan look and the original
  minimal white/black/gold one (`.style-minimal` in `src/index.css` retunes the
  palette to gold, swaps the display face to Fraunces and retires the neon
  glow). Both choices are applied before first paint, so night mode never
  flashes white
- **Panels that fail alone** — every live-data panel renders inside its own error
  boundary, and pages inside a route-level one: a backend that is missing a
  function or unreachable costs you that panel with a plain-English explanation
  and a Try-again button, never the app shell
- **Quick practice** — six short exercises (rebuild code, match vocabulary, click
  the broken line) with per-question hints, feedback that names the line that's
  out of place, previous/next navigation and a completion screen
- **AI Socratic tutor (BYOK)** — bring your own Gemini or Claude key; it asks
  guiding questions instead of giving answers
- **PWA** — installable, with offline caching of lessons

## The curriculum

<!-- curriculum-table:start -->
| # | Track | ID | Lessons | What it's for |
| --- | --- | --- | --- | --- |
| Ⅰ | Web Development Foundations | `web` | 10 | HTML5, CSS3, and modern JavaScript — the bedrock every frontend stands on. |
| Ⅵ | Git, GitHub & Workflows | `git` | 4 | Version control, branches, PRs, and shipping pipelines — how teams actually work. |
| Ⅶ | Testing & Debugging | `testing` | 7 | Write tests that catch bugs, hunt down the ones that slip through, and read production incidents. Watch after DevOps — its logs and containers vocabulary carries over. |
| ⅩⅥ | Working with Coding Agents | `agents` | 23 | Operate the tool: write specs an agent can execute, read unfamiliar code, manage context, approve plans, choose permissions, and verify what ships. |
| ⅩⅨ | Professional Workflow | `workflow` | 4 | PRs, review, tickets and decision records — the written work that decides whether code ships. |
| Ⅸ | Web Security & OWASP | `security` | 7 | Think like an attacker: XSS, SQL injection, CSRF, CORS, and the habits that keep apps safe. |
| XIV | TypeScript for Real Projects | `typescript` | 6 | The real compiler runs in your editor: write types, watch diagnostics with line and column, and ship code the compiler has already argued with. |
| Ⅲ | Backend Systems & APIs | `backend` | 5 | Node.js, Express, REST design, auth, and databases that don't fall over. |
| Ⅱ | Modern Frontend: React | `react` | 4 | Components, hooks, and the mental model behind every modern interface. |
| XIII | API Integration & Data Fetching | `api` | 6 | Talk to real services: HTTP, errors, races, optimistic updates, and a resilient client. |
| Ⅳ | Data Structures & Algorithms | `dsa` | 8 | Big-O thinking, classic structures, and the patterns interviewers actually ask. |
| Ⅴ | Python & Data Fundamentals | `python` | 4 | Python syntax, OOP and the pandas/numpy workflow — three lessons now execute in the browser (Pyodide). |
| Ⅷ | DevOps, Linux CLI & Cloud | `devops` | 6 | Command the terminal, write Bash, containerize with Docker, and ship behind Nginx. |
| Ⅹ | System Design & Architecture | `architecture` | 6 | Scale, cache, shard, and queue — the trade-off thinking behind big systems. |
| Ⅺ | UI Engineering with Tailwind CSS | `tailwind` | 6 | Utility-first styling, responsive systems, and shipping a real component kit. |
| Ⅻ | Advanced React State Management | `state` | 6 | Reducers, context without the re-render tax, external stores, and server state. |
| XV | Web Performance & Accessibility | `performance` | 6 | Core Web Vitals, layout stability, contrast and keyboard semantics — measured, graded, and shipped as one audit-ready page. |
<!-- curriculum-table:end -->

Reading lessons teach; the rest end in something runnable. Tracks share no
numerals, and a test pins that. Numerals are stable identities, not path positions.

### Experimental tracks and rollback

All five big-bet flags are off by default: `VITE_FLAG_AGENT_INTERNALS`,
`VITE_FLAG_GIT_WORKTREE_LAB`, `VITE_FLAG_FIELD_REPORTS`,
`VITE_FLAG_REVIEWER_CERTIFICATE`, and `VITE_FLAG_BYOK_INTERROGATION`.
Set a flag to `1` before generating, building or starting the app. Rebuild with
`0` to roll back; no track data or progress is deleted. Agent Internals contains
six deterministic practices, including the moved `python-llm-api` lesson;
its original URL redirects, its storage key and Python certificate requirements
stay unchanged. Field Reports includes five incidents and a locally saved,
redacted own-repository evidence packet. The reviewer certificate accepts only
server-assigned choices and server-computed grades; practice metrics never issue it.
BYOK interrogation renders only validated trace citations, not arbitrary model claims.

Default: 108 lessons / 17 tracks. All flags on: 119 lessons / 19 tracks.
The extra depth content is optional, so core remains 790 authored minutes,
with Agents + Workflow at 214 minutes (27.1%), not the forecast 37%.

**Optional tracks (Tier 2).** `state`, `dsa`, `tailwind`, `python`, `devops`, `architecture`
and `performance` are marked `optional` in the registry and split into their
own section of the Learn page: framework-specific or lower-priority for
generalist screening, but fully playable and still counted for XP, ranks and
certificates.

## Twelve ways to practise

A lesson is not one thing. Depending on what it's teaching, the page mounts a
different interaction:

| Interaction | Where | What it does |
| --- | --- | --- |
| **Reading + quiz** | most concept lessons | Markdown body, then multiple-choice with an explanation per answer |
| **Code exercise** | `starter` + `check` | Edit, run, and a JS expression is evaluated against your real `output` |
| **TypeScript exercise** | `lang: "ts"` | The same, but the program must also pass the real compiler with zero errors |
| **Break-and-fix** | `debug` | A genuinely broken program. Your repair is graded by running it |
| **Live preview** | `preview` | Write HTML/CSS/JS and the browser's own layout engine responds; graded on selectors |
| **CSS sandbox** | `sandbox` | A visual flexbox/grid playground that emits production-ready CSS |
| **Git simulator** | `gitSim` | A guided terminal with objectives checked against real branch/conflict state |
| **Predict the output** | `predict` | Commit to an answer, then run it and find out |
| **Drag-to-order** | `sort` | Reconstruct a sequence — box model layers, middleware pipeline, exception blocks |
| **Multi-file review** | `diff` | A pull-request diff: click the file, the line, and the category of the planted defect — partial credit per rung |
| **Repo trace** | `repo` | A read-only codebase or log snapshot: locate a function, select the real callers, or reconstruct an incident |
| **Written deliverable** | `rubric` | Free text graded by weighted criteria — machine checks over your text plus self-attested judgment calls |

Plus **rapid-fire**: the same questions again as a timed gauntlet, where speed
feeds a combo counter — but only a 100% run completes the lesson, so it can't be
used to skip mastery.

## The XP economy

Every number is **derived** from your progress map, never stored twice, so
rewards can't drift, can't be double-paid, and can't disagree between devices.

```
lesson completed           +50 XP
flawless quiz (100%)       +25 XP   → 75 for a perfect lesson
daily quests               +60 to +385 XP / day
consistency (2+ days)      +25 XP / day
```

**Daily quests** are computed, not stored, so a quest can never be claimed twice:

| Quest | Target | Bonus |
| --- | --- | --- |
| ⚔️ First Blood | Finish 1 lesson today | +60 |
| 🔥 Triple Threat | Finish 3 lessons today | +150 |
| ✦ XP Hunter | Earn 200 XP today | +100 |
| ◎ Flawless Run | Score 100% on any lesson today | +75 |

**Streaks** survive a one-day grace window, so a single missed day doesn't nuke a
long run. Both `current` and `longest` are tracked, and a broken current streak
still shows your personal best.

**Levels** are 250 XP each, with a ring showing your progress within the current
level.

## Progression: levels, ascension, titles, badges

### Ascension tiers

Seven tiers, each changing your avatar frame and unlocking more:

| Tier | Level | Perk |
| --- | --- | --- |
| I · Initiate | 1 | Your name on the board |
| II · Apprentice | 2 | Emerald frame + first titles |
| III · Adept | 4 | Aurora frame + animated streak flame |
| IV · Veteran | 6 | Violet frame + guild banner slot |
| V · Archon | 9 | Gilded frame + glowing rank row |
| VI · Ascendant | 12 | Tri-color frame + rare titles |
| VII · Mythic | 16 | Living prism frame + Mythic titles |

### Titles

Eight equippable titles unlock by level: Novice (1), Code Cadet (2), Syntax
Slinger (4), Bug Slayer (6), The Refactorer (8), Systems Architect (11),
Ascendant (14), Mythic Mind (16).

### Badges

13 badges, all derived from your own progress:

| Badge | Earned by |
| --- | --- |
| 🌱 First Steps | Complete your first lesson |
| ◎ Flawless | Score 100% on any lesson quiz |
| ③ Three-Day Streak | Learn something 3 days in a row |
| ⑦ Week Warrior | Learn something 7 days in a row |
| ✦ 1,000 XP | Earn 1,000 XP across all lessons |
| ❖ Track Finisher | Complete every lesson in a track |
| ❂ Explorer | Finish a lesson in 5 different tracks |
| ✺ Polyglot | Finish a lesson in every track |
| ♛ Seasoned | Reach level 5 |
| 🏅 Perfect Day | Clear every daily quest in a single day |
| ❈ Archon Ascendant | Ascend to the Archon tier |
| ⚔ Guildmate | Join a guild |
| ⚑ Guild Founder | Found your own guild |

## Guilds

Pooled XP unlocks collective rewards — the social loop that turns solo grinding
into team play. Guilds hold up to 25 members.

| Tier | Pooled XP | Perk |
| --- | --- | --- |
| Band | 0 | Shared guild banner |
| Company | 500 | +1 guild streak shield |
| Order | 2,000 | Guild aura on the leaderboard |
| Coterie | 6,000 | Custom guild reward tag |
| Legend | 15,000 | Gilded guild crest + title |

Guilds also run their own co-op quest line and activity feed, with member roles
(owner → officer → member), owner-managed promotions, and per-member
contribution reporting.

## Project milestones

One continuous portfolio project, split into six milestones. Each is **gated on
the lessons that teach the skill**, so you can't claim a milestone you haven't
earned — a stale claim whose progress was reset reads as *not earned*.

| # | Milestone | Phase | XP | The skill being proved |
| --- | --- | --- | --- | --- |
| 1 | Semantic Page Shell | Structure | 150 | Landmarks, semantics, accessibility |
| 2 | Design System Layer | Style | 250 | Tokens, responsive layout, dark mode |
| 3 | Interactive Component | Interactivity | 300 | State, controlled inputs, immutable updates |
| 4 | Live Data Layer | Data | 300 | `fetch`, all four states, abort on unmount |
| 5 | Persistent State | State | 350 | An external store that survives a refresh |
| 6 | Ship It | Delivery | 400 | Repo history, README, a live URL on your CV |

Total: **1,750 XP**. Every milestone's proof is an executable exercise solved by
an independent reference solution in the test suite — so a "solution" that
doesn't actually work can't ship.

Since the V2.1 Wave 3 redesign, each claim also carries a **judgment
artifact**: the agent task you delegated, a note on what the agent got wrong
(classified with the shared bug taxonomy), and a proof test that fails on the
agent's draft and passes on your fix — graded by a dual-run ProofRunner and
exported from your profile as a shareable Markdown judgment card.

## How the sandbox actually works

Worth a section, because this is the part most learning apps fake.

- **The JS runner** (`src/lib/runner.ts`) evaluates your program in a sandboxed
  function with a patched `console`, a `setTimeout` that registers into a
  pending-promise list so `runUserCode` waits for in-flight work instead of
  returning early, and a **loop tick guard** that aborts runaway `while`/`for`
  bodies rather than freezing the tab. Loop instrumentation is paren-aware and
  re-guards nested brace-less loops.
- **A mock REST server** is mounted at `/api/users` with full CRUD plus a
  deliberately flaky `/api/flaky` endpoint, so the API lessons can teach
  retries and error handling against something that genuinely fails.
- **The TS runner** (`src/lib/tsRunner.ts`) runs the real TypeScript compiler
  against an in-memory `CompilerHost` backed by the ES2020 lib files. It reports
  genuine diagnostics with code, line and column, then strips types and executes
  in the shared JS sandbox. Top-level `await` is legal; sandbox globals are
  declared and the DOM is deliberately not.
- **The visualizer** (`src/lib/stepper.ts`) records variable state and the call
  stack per line, so you can scrub through execution the way Python Tutor does.
- **Checks** are small expressions evaluated against the captured output —
  `output.includes("after add: 2 ship")`. They're parsed and interpreted by
  `src/lib/checkExpr.ts` rather than compiled with `new Function`, so the
  grading language is exactly the whitelisted vocabulary (string methods,
  comparisons, booleans) and anything else fails closed instead of running.
  Wrong text fails even if the code was right, which is the point: you're
  being graded on behaviour.

## Tech stack

| Layer | Choice |
| --- | --- |
| Build | Vite 6.4 |
| UI | React 18 + TypeScript 5.6 (strict, `noUnusedLocals`, `noUnusedParameters`) |
| Routing | React Router 7 (`HashRouter`, declarative mode) |
| Styling | Tailwind CSS 4.3 + PostCSS (existing token config) |
| Animation | Framer Motion 13 |
| Icons | lucide-react |
| Backend | A Cloudflare Worker on Freebuff Sites (`sites/api/`) + a D1 database — one JSON endpoint, validation and merge rules on the server |
| Auth | Sign in with Freebuff (OIDC, `@freebuff/auth`) — no passwords, no secrets in the project |
| Tests | Vitest 4.1 + `node:sqlite` (the real schema and handlers in memory) + Testing Library + jsdom |
| CI | GitHub Actions |

No runtime API keys ship in the frontend. The only network calls the app makes
are to its own Worker (`/api/rpc`, `/auth/freebuff/*`), and to an AI provider
*if you supply your own key*.

## Getting started

```bash
npm install       # or bun install
npm run dev       # dev server on 0.0.0.0
npm test          # vitest suite
npm run typecheck # tsc -b --noEmit
npm run build     # production build → dist/
```

Bun works identically and is what CI uses. `npm run build` emits static output
to `dist/` and exits — it does not start a server.

CI runs typecheck, production build, the off/individual/all-on feature route matrix,
the full test suite, dependency audit and review-freshness warnings on every
push to `main`, every pull request, and the weekly schedule.

## Project structure

```
src/
├── main.tsx                  # entry: providers + global CSS
├── App.tsx                   # router, RequireAuth, route boundary, lazy routes
├── AccountProvider.tsx       # Freebuff session, progress merge/push, sign-out
├── index.css                 # every colour token, light + dark
├── data/
│   ├── index.ts              # the track registry + findTrack/findLesson
│   ├── types.ts              # Lesson, Check, DebugChallenge, PreviewSpec, …
│   └── track-*.ts            # <!-- counts:tail -->17 tracks, 118 lessons of content<!-- /counts:tail -->
├── lib/
│   ├── api.ts                # every endpoint, typed (the client's contract)
│   ├── cloud.ts              # fetch + query cache + useQuery/useMutation
│   ├── xpRules.ts            # XP curve and the server's plausibility clamps
│   ├── localStore.ts         # the shared localStorage store + pub/sub primitive
│   ├── progress.ts           # progress store on top of it, v1→v2 migration
│   ├── gamification.ts       # XP, quests, streaks, ascension, titles, badges
│   ├── milestones.ts         # the six project milestones + gating
│   ├── runner.ts             # JS sandbox, loop guard, mock REST server
│   ├── tsRunner.ts           # in-browser TypeScript compiler host
│   ├── stepper.ts            # per-line trace for the visualizer
│   ├── guild.ts / guildState.ts / clanRewards.ts
│   ├── theme.ts              # theme + style persistence (mirrors index.html)
│   ├── errors.ts / friendlyError.ts
│   └── ai.ts                 # BYOK Gemini/Claude client
├── components/               # lesson UI, sandboxes, tutor, error boundaries
│   ├── gamification/         # leaderboard, quests, ascension, drag, rapid-fire
│   └── clan/                 # guild feed + quest panel
└── pages/                    # Landing, Learn, Lesson, Playground, Certificate,
                             # Projects, Portfolio, Leaderboard, Clans, Auth

sites/
├── api/                      # the Worker: schema, handlers, auth, /api/rpc router
│   ├── schema.ts             # D1 tables, applied idempotently on first request
│   ├── accounts.ts           # users, profiles, display name, delete-my-data
│   ├── progress.ts           # scores, milestone claims, attempt aggregates
│   ├── clans.ts              # membership, board, feed, quests
│   ├── leaderboard.ts        # bracketed top-N + your true rank
│   ├── preferences.ts        # appearance style
│   ├── certificates.ts       # verified certificate issue + public verify
│   └── worker.ts             # routing, session, same-origin check, assets
├── worker.js                 # bundled output — built, never edited
└── README.md                 # deploy payload rules and the asset budget

tests/                        # 104 suites, 855 tests
```

## Accounts, progress & cloud sync

The app works **fully without a backend** — progress lives in `localStorage`.
That's deliberate: the product is free and should never be gated on an account.

Accounts are **Freebuff accounts**: the site uses Sign in with Freebuff (OIDC),
so there is no password to store, reset or leak, and the project holds no auth
secrets at all. The Worker verifies the session cookie and keys every SQL row on
the verified `user.sub` — the stable account id — never on anything the browser
sends. The display name is seeded from the Freebuff profile once and can be
changed from the account menu; it is what the leaderboard, guild and
certificates show. Everything lives in **this app's own D1 database on
Freebuff**, not a third-party backend.

- On sign-in the cloud copy is merged with local, **best score per key wins**;
  local changes debounce-push to the cloud while signed in.
- One `progress` row per account holds all three maps: lesson scores in `data`,
  milestone claims in `claims` and attempt aggregates in `attempts`. They merge
  by different rules — best score per key, best claim per milestone, earliest
  first attempt — so they live in **separate columns** and are written by
  **separate endpoints** (`progress.save` / `progress.saveClaims` /
  `progress.saveAttempts`) rather than one blob that all three would clobber.
- `profiles` is the **public player card**: XP totals per bracket, level,
  ascension tier, streak and guild. The client recomputes it from the progress
  map and pushes it, so leaderboard queries sort server-side without reading
  anyone's full progress blob.
- XP, quests and ascension are all **derived** from the progress map (see
  `src/lib/gamification.ts`) — no second source of truth, and every reward is
  replayable and testable without touching the backend.
- The appearance style (glass ⇄ minimal) follows the account too: a
  `preferences` row mirrors the choice while signed in, a fresh account seeds
  from the first device that signs in, and localStorage stays authoritative
  while signed out — the pre-paint script reads it before the bundle loads.
- Progress is keyed `` `${trackId}/${lessonId}!${YYYY-MM-DD}` ``. Pre-v2 keys had
  no date suffix and are migrated on load, keeping their scores but not
  fabricating streak days for a day we can't know.

The leaderboard, guild and milestone-claims panels each sit behind their own
error boundary, so if a query fails they render an inline explanation with a
Try-again button instead of breaking the page.

There is no backend address to configure: the client calls `/api/rpc` on its
own origin, and Sign in with Freebuff is injected by Sites on deploy
(`FREEBUFF_CLIENT_ID`, `FREEBUFF_ISSUER`, `APP_ORIGIN`). A local
`wrangler dev` run uses the project's **development** Freebuff client instead
(see [Deployment](#deployment)).

### What the server trusts (and what it doesn't)

Grading happens in the browser, so the client computes XP, level, streak and
lesson counts and pushes them with `profiles.sync`. The server bounds that
payload against what the curriculum can plausibly produce (`src/lib/xpRules.ts`):
lessons never exceed the registry size, XP never exceeds
`lessonsDone × 75 + quest/milestone ceiling`, `xpWeek ≤ xpMonth ≤ xp`, the level
must sit on the shared curve, a streak can't outlive the account, gains are
capped per hour, and each user may push only a limited number of times per
minute. Violations are **clamped, never rejected**, so a legitimate merge from a
second device is bounded rather than dropped.

The clamps are **enforced**: an implausible value is stored clamped, and the
violation is recorded on the row (`clamped_at`, `clamp_log`) so a real
multi-device merge that looks odd can be audited afterwards.

**Known limit:** because scoring happens in the browser, a determined learner
can still forge `progress.save` scores through the API, and those forged scores
feed the same XP math. The clamps bound the *shape* of a forged card, not its
existence. The real fix is server-verified grading — running the check
expressions in the Worker against submitted code — which is deliberately out of
scope here.

## AI tutor (BYOK)

Optional, and entirely client-side. Add a Gemini or Claude key in
**Settings → AI**, and the Socratic tutor asks guiding questions instead of
handing you the answer.

Keys are stored in `localStorage` and are sent only to the provider you chose —
`generativelanguage.googleapis.com` for Gemini, `api.anthropic.com` for Claude.
There is no server in the middle, no proxy, and no key in the bundle. Clearing
site data removes them.

The tutor is a *Socratic* tutor on purpose: it will not write the solution. It
asks what you think will happen, points at the line it thinks is wrong, and lets
you run the code to find out.

## Testing

```bash
npm test        # or: bun x vitest run
```

**855 tests across 104 files.** The content tests are the interesting ones,
because content is where bugs hide:

- Every broken debug program fails its own check, every reference fix passes it,
  and no challenge is secretly a syntax error
- Every diff-review exercise plants a defect that exists inside the after-side
  of a named file, ships ≥2 distractors with one near the blocker, and grades
  on the partial-credit ladder (0 / 0.4 / 0.7 / 1.0) — and every rubric is
  satisfiable by its own exemplar in the check grammar
- No starter is pre-solved, every check is satisfiable, every exercise has a
  full three-tier hint ladder
- Milestone gates derive from real progress, stale claims are not earned, and
  every executable proof is solved by an independent reference solution
- The in-browser compiler: clean code produces zero diagnostics, a real error
  carries the right code/line/column, and `const n: number = "6"` still *runs* —
  which is exactly why the pass gate needs the compiler's answer and not just
  the output
- Two-device claim-log merging is commutative and idempotent, and a full claim
  log with no progress renders as *not* earned
- The artifact loop: claim-merges give ties to the artifact-bearing claim,
  pre-patch claims resubmit without downgrading, and every milestone's note
  rubric is satisfiable by its exemplar across all ten taxonomy categories
- The incident labs: every single-answer select carries exactly one correct
  option, every log-dump answer is reachable, and the deploy review plants its
  defect inside the diff it blames
- The first cohort's bug list, pinned: real backend errors render as explanations
  while the rest of the page keeps working, an assembly answer only verifies in
  *runnable* order, the theme toggle flips `.dark` and remembers it, and the
  settings style switch flips `.style-minimal` and remembers that too
- The account appearance preference: signed-out reads stay `null`, a signed-in
  save round-trips as an update to the same row, preferences never leak across
  accounts, and the client bridge pulls, seeds, pushes (debounced) and stays
  silent while signed out
- Every colour token the source uses exists in both themes *and* in the Tailwind
  config, and every opacity modifier sits on Tailwind's scale — `bg-ink-100` and
  `bg-gold-400/12` both compiled to nothing before this test existed
- One storage primitive behind progress, claims, guild rewards, AI settings,
  the theme and the style: corrupt JSON, blocked storage and hand-edited entries
  all degrade to the default instead of throwing inside a render

## Deployment

Everything — the static SPA, the API and the database — is one Freebuff Sites
project. The worker that ships with it is built from `sites/api/`:

```bash
npm run build      # dist/ (SPA) + sites/worker.js (API), asset budget checked
npm run dev        # http://localhost:5173, proxying /api and /auth to wrangler
npx wrangler dev   # the Worker alone, at http://localhost:8787
```

- The Worker answers `/api/rpc` (one endpoint, `{ fn, args }`), the
  `/auth/freebuff/*` OIDC routes, and everything else from the `ASSETS`
  binding, so a deep link like `/learn/...` still serves the SPA.
- The `DB` D1 binding holds every table: accounts, progress, profiles, clans,
  clan quests and feed, preferences and certificates. `sites/api/schema.ts` is
  applied lazily and idempotently on the first request, so a fresh environment
  needs no migration step.
- Sign in with Freebuff is enabled per environment; the platform injects
  `FREEBUFF_CLIENT_ID`, `FREEBUFF_ISSUER` and `APP_ORIGIN` at deploy. There are
  no secrets to set, no passwords to reset, and no email service to configure.
- `wrangler.toml` is for local work only: it points at a local D1 file and the
  project's **development** Freebuff client.

CI (`.github/workflows/ci.yml`) runs typecheck, the full suite and the asset
build — including the Worker bundle — on every push and pull request. There is
no separate backend deploy job: the Worker ships with the site.

## Design system

The palette is **paper / ink / gold**: warm off-white surfaces, near-black text,
and a single metallic gold accent. Values are space-separated RGB channels in
`src/index.css`, referenced from `tailwind.config.js` as
`rgb(var(--paper) / <alpha-value>)`, so every colour flips with one class on
`<html>` and Tailwind's `/opacity` modifiers keep working unchanged.

Typography is Fraunces (display), Inter (sans) and JetBrains Mono (code). Dark
mode is applied by a small inline script in `index.html` **before first paint**,
so the page never flashes white on load.

Motion is transform-and-opacity only, spring-smoothed, and skipped entirely under
`prefers-reduced-motion`.

## Troubleshooting

**A lesson says the check failed but my code looks right.** The check is an
expression over your program's actual `output`. If it compares text, spacing and
labels matter. Use the hint ladder — tier 3 is close to a skeleton.

**"This feature needs a newer server."** An endpoint the panel needs isn't
reachable. The panel is degraded on purpose, so the rest of the app keeps
working. Press **Try again**; if it persists, the Worker needs a deploy.

**My progress vanished.** Progress lives in `localStorage` under a versioned
key. Private-mode browsers and "clear site data" both wipe it. Sign in to sync
it to your account.

**The rapid-fire run won't complete the lesson.** By design — only a 100% run
completes it. Speed feeds your combo score, not your mastery.

**Sign-in says it is not configured for this environment.** The deployed
environment is missing its Freebuff variables — redeploy it from Sites so they
are injected. Locally, `wrangler dev` reads them from `wrangler.toml`.

## Further documentation

- **[GAMIFICATION.md](./GAMIFICATION.md)** — the full feature plan behind the
  game layer: XP economy, quest and streak math, ascension tiers, guild
  rewards, the backend player-card model, and drop-in snippets for every
  component
- **[CURRICULUM-ROADMAP.md](./CURRICULUM-ROADMAP.md)** — the curriculum's
  interactive engine, the courses it unlocks, the project milestone layer, the
  open-items table, and the first real cohort's bug report with cause and fix for
  each entry
- **[CURRICULUM-V2.md](./CURRICULUM-V2.md)** — the next-curriculum design:
  the judgment-over-authorship exercise format, the shared AI-bug taxonomy,
  five new tracks (coding agents, building with LLMs, SQL, professional
  workflow, and an interview-prep capstone), the grader verification, and the
  auditable diff against the 15 tracks it was written against (the app now
  ships 17 — agents and professional workflow are the V2 tracks to land so far)
- **[CURRICULUM-V2-PATCH.md](./CURRICULUM-V2-PATCH.md)** — the V2.1 patch:
  executed Python via Pyodide, multi-file diff review with partial credit,
  codebase archaeology, operating-agent lessons (instruction files, plans,
  permissions), production debugging, AI data boundaries, a validated Next.js
  decision, and the milestone redesign around agent tasks, notes, and proof
  tests — plus what ships as the two-item pilot
- **[CURRICULUM-V2-PILOT-PROPOSAL.md](./CURRICULUM-V2-PILOT-PROPOSAL.md)** —
  the pilot's status report and execution record: the seed-order reconciliation,
  the three Wave 0 deliverables (partial-credit recording, the diff/click
  grader, Track XVI end-to-end), the exit gates, and the Wave 1–3 records
  (executed Python, production debugging, data boundaries, the artifact loop)
  with Fix 7's Next.js track still gated

## License

MIT — free forever, as intended.

## Found a bug?

If you hit a problem, a broken exercise, or something that just feels *weird*,
please report it. Bug reports from actual learners have caught genuinely
unanswerable exercises, unsolvable quizzes, and no-op buttons that shipped
before anyone said so — all of them fixed, and several pinned by a test so they
can't come back.

DM me on Discord — username **`xar.z_dom`**, display name **`XAR-𝒳𝒶𝓇𝓎𝒶𝓃`**.

Thank you, and please try your best! :)
