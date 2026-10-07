---
name: chat-ledger
description: Audits the whole coding session and reports every user request with a status (verified, done-unverified, partial, not done, blocked, superseded, regressed), terse evidence, and next step. Make sure to use this whenever the user says /ledger, "what did we finish", "what's left", "what's still open", "did you do everything", "audit this chat", "status of my requests", "checklist of what's done", "did that actually work", asks whether the work is ready to commit or deploy, or wants a handoff / "continue in a new chat". Also use when the user signals the end of a session ("ok that's all", "wrapping up") — then only OFFER a quick audit in one line, don't run it unprompted.
---

# Chat Ledger

Audit every request in this session against REAL state, not your memory of the chat. Output stays in chat; don't create or edit files, because the user wants a report, not repo changes.

## Rules (and why)
1. No evidence = not ✅. Rounding up is the failure this skill exists to prevent.
2. Repo state beats chat claims. "I fixed it" with no matching diff = ❌ and flag it as a false claim; that's the most valuable catch in coding sessions.
3. ✅ needs a check that ran and passed (test, typecheck, build, lint, or repro). Written-but-never-run = 🟡. Tests you wrote but never ran are not evidence.
4. Report only; fix nothing unless the user says "fix". An audit that changes state can't be trusted.
5. Read-only commands only (no reset, clean, push, migrate, install, delete), so an audit can never damage the repo.
6. If a check can't run (no shell, no suite, needs secrets, over ~2 min), say so and cap at 🟡. Silent skipping looks like a pass.
7. Questions the user asked are not requests. Don't list answers as work.
8. Don't ask clarifying questions. Make an assumption and list it.

## Process
1. **Extract.** List each distinct user request in order. Merge duplicates, split compound asks ("add X and Y"). Mark changed-mind requests ↪️. If early context is missing or compacted, say "audited visible context only" and don't guess.
2. **Ground, cheapest first.** Reuse check results already shown this session if nothing changed since. With a shell: `git status --short`, `git diff --stat`, then a typecheck/test/build/lint only if the request needs it and it's fast (read package scripts to pick). Without a shell: say "chat-only audit, nothing verified" and cap at 🟡.
3. **Classify** one status per request.
4. **Cross-check** every earlier "done/fixed/added" claim of yours against a diff or output.
5. **Surface** assumptions, risks (uncommitted work, failing checks, untested paths), next 1-3 actions.
6. **Delta rule.** If a ledger already exists earlier in this chat, show only rows that changed since it.

## Statuses
✅ Verified: change exists AND a check passed · 🟡 Done-unverified: change exists, nothing proved it · 🟠 Partial: list what's missing · ❌ Not done: no matching change, or false claim · ⛔ Blocked: name the blocker · ↪️ Superseded: user changed or dropped it · 🔻 Regressed: worked earlier, broken now

Edge cases: visual request with only a passing build = 🟡 · tests pass but don't cover the ask = 🟡 + note gap · verified but uncommitted = ✅ + risk · errors only in unrelated files = keep status, list under risks · user declined = ↪️, not ❌

## Modes (explicit or inferred)
- `/ledger`, "did you do everything", "audit this chat", "ready to commit/deploy?": full audit. 5 or fewer requests = checklist, otherwise table.
- `/ledger quick`, "what's left", "what's still open": score line + unfinished items only; read `git diff --stat` only, no test runs.
- `/ledger handoff`, "continue in a new chat": resume prompt. Never include secret values, only variable names.
- `/ledger tasks`: unfinished items as a paste-ready `- [ ]` list.
- Session-end phrases: one line only: "Want a `/ledger quick` before you go?"

## Formats (cells ≤10 words; evidence = path, command + result, or "none")
Full:
**Score: 7/12 ✅ · 2 🟡 · 1 🟠 · 2 ❌**
| # | Request | Status | Evidence | Gap / next |
|---|---|---|---|---|
| 1 | Dark mode toggle | ✅ | `ThemeToggle.tsx`; `npm test` pass | none |
| 2 | Fix login redirect | 🟡 | `auth.ts` diff | not run: `npm test auth` |

**Assumptions:** … **Risks:** … **Next:** 1… 2… 3…

Checklist: `- 🟡 Fix login redirect (diff only, not run)`
Quick: `7/12 verified · 5 open` then `- ❌ #5 Export button → no code found`
Tasks: `- [ ] Fix login redirect (verify: npm test auth)`
Handoff (one code block):
```
Continue from this state. Don't redo ✅ items.
Repo/branch: <name>/<branch>  Uncommitted: <files>
Stack & run: <stack>; dev: <cmd>; test: <cmd>
DONE (verified): … 
OPEN: <item → exact next action>
KNOWN ISSUES: <failing checks, blockers>
DECISIONS (don't reverse): …
FIRST STEP: <one command or action>
```

## Example (false claim)
Chat: user asked "fix the login redirect"; you replied "Fixed!" but `git diff --stat` shows no change to `auth.ts`.
→ `❌ Fix login redirect — no diff in auth.ts; earlier "Fixed!" was a false claim.`

## Before sending
Every ✅ cites a passing check? Every earlier "done" has a diff? Cells trimmed? No files touched?