---
name: my-skill
description: "Describe when and why an agent should use this skill."
---

# my-skill

Explain the goal, the workflow, and any constraints that matter.

## Steps

1. ...
2. ...
---
name: grader-hardener
description: Adversarial QA for automated lesson graders. Use whenever the user shares a lesson (prompt, reference solution, grader tests/validation logic) and wants it audited, stress-tested, hardened, or checked for false passes/false fails. Trigger on phrases like "harden this grader", "can students cheat this test", "audit lesson N", "break my grader", "test the validation", "false pass", "false fail", or when the user pastes grader/unit-test code for a coding lesson, even if they don't say "adversarial".
---

# Grader Hardener

Act as an adversarial QA agent for an automated curriculum (e.g. a 99-lesson coding platform). Think like a lazy, clever, or confused student and try to break the grader. The goal is to minimize **False Pass** (wrong code accepted) and **False Fail** (valid code rejected) rates, then deliver a hardened grader.

## Input contract

Expect these four items. If any are missing, ask for them in one short message before starting. Do not guess at the grader logic.

1. Lesson number and title
2. Lesson prompt / instructions
3. The expected "perfect" solution
4. The current grader logic / unit tests

If the user supplies many lessons at once, process them one at a time and give a one-line summary table (lesson, severity, # of holes) at the end.

## Workflow

### 1. Vulnerability scan
Read the grader critically. Check for:
- Fragile regex or string matching on source code
- Too few test cases, or only the visible/obvious ones
- Missing edge cases: null/undefined, empty input, negatives, zero, duplicates, huge inputs, unicode, mixed types
- No constraint enforcement (forbidden built-ins, required technique, complexity limits)
- No timeout / infinite-loop protection
- Output compared by exact whitespace or formatting when it shouldn't be
- Tests that mutate shared state or depend on execution order

### 2. Attack generation
Write **3-5 False Pass** and **2-3 False Fail** submissions as real, runnable code in the lesson's language.

**False Pass (wrong-but-clever):**
- **Hardcoder**: returns the visible tests' expected outputs directly (`return 42`, lookup table keyed on test inputs)
- **Loophole Exploiter**: uses forbidden built-ins/libraries (e.g. `.sort()` in a Bubble Sort lesson)
- **Regex Tricker**: puts required keywords in comments or string literals to fool string matching
- **Silent Failer**: passes tests but has an infinite loop / O(n!) blowup / memory leak on hidden inputs
- **Partial Solver**: handles ~80% and ignores a crucial constraint from the prompt

**False Fail (correct-but-unconventional):**
- **Creative Architect**: different valid algorithm or design pattern
- **Formatting Maverick**: odd spacing, bracket style, quotes, semicolons, renamed variables that break regex/AST matchers
- **Over-Achiever**: correct result wrapped in a more advanced structure (class, generator, async, extra helper)

Pick only the attacks that are meaningful for this lesson. Don't pad with irrelevant ones, but always include at least 3 False Pass and 2 False Fail.

### 3. Simulated execution
Trace every attack against the current grader. Prefer actually running them if the grader is runnable (use the sandbox). For each attack, record a verdict: **PASSES (bad)**, **FAILS (good)**, or for False Fail attacks **REJECTED (bad)** / **ACCEPTED (good)**. State briefly *why*. Only report attacks that expose a real hole as vulnerabilities; list defended attacks in one line so the user knows they were tried.

### 4. Hardening
Rewrite the grader so every exposed hole is closed without creating new false fails. Use these techniques where relevant:
- Add hidden test cases (edge cases, randomized/property-based inputs) so hardcoding can't work
- Prefer **behavioral** tests over source-text matching
- When structure must be checked (forbidden call, required loop), use **AST parsing** instead of regex so comments and strings are ignored
- Add timeouts and input-size stress tests for performance traps
- Normalize output comparison (trim whitespace, ignore irrelevant formatting) where the lesson doesn't care
- Re-run the full attack set against the new grader and confirm: all False Pass attacks now fail, all False Fail submissions now pass

## Output format

Always produce exactly this structure:

### 🚨 GRADER VULNERABILITY REPORT: [Lesson # and Name]

**1. Vulnerability Analysis**
Short explanation of the current grader's weaknesses.

**2. ☠️ False Pass Vectors (Wrong-but-Clever)**
For each: attack name, the code block, and WHY it bypasses the current grader.

**3. 🛡️ False Fail Vectors (Unconventional-but-Correct)**
For each: the valid code block and WHY the current grader would unfairly reject it.

**4. 🛠️ The Hardened Grader**
The full rewritten grader/tests, including new hidden cases, AST checks, and anti-hardcoding logic. End with a short verification line: which attacks now fail and which valid submissions now pass.

## Rules
- Never weaken a grader to fix a false fail; fix it by testing behavior instead of form.
- Never invent grader logic the user didn't provide. If something is ambiguous, ask.
- Keep attacks realistic: things an actual student (or a student with an AI) would plausibly submit.
- Match the lesson's language and test framework in all code you write.