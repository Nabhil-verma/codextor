/*
 * Taxonomy wiring used to live in `data/index.ts`, which imports every track.
 * It moved here so a single track can be loaded on its own: the lesson route
 * imports one `track-*.ts` plus this module, and the rest of the curriculum
 * stays out of the chunk.
 */
import { flagEnabled } from "../lib/flags";
import { JUDGMENT_CONVERSIONS } from "./judgment-conversions";
import { debugChallenge } from "./debug-challenges";
import type { Track } from "./types";

const TAXONOMY_WIRING: Record<string, string> = {
  "web/es6-syntax": "semantics-refactor",
  "dsa/big-o": "quadratic-dedupe",
  "dsa/sorting": "ai-sort-comparator",
  "react/hooks-effect": "invented-helpers",
  "backend/api-security": "trusted-role-header",
  "agents/plan-before-code": "scope-preserve-members",
  "agents/verifying-agent-output": "test-must-catch",
  "agents/instruction-files": "name-dollar-units",
  "agents/permissions-and-sandbox": "debug-bypass-removal",
};

export function wireTrack(track: Track): Track {
  return {
    ...track,
    lessons: track.lessons.map((lesson) => {
      const repo = JUDGMENT_CONVERSIONS[`${track.id}/${lesson.id}`];
      const id = TAXONOMY_WIRING[`${track.id}/${lesson.id}`];
      return { ...lesson, ...(repo ? { repo } : {}), ...(id ? { debug: debugChallenge(id) } : {}),
        ...(lesson.worktreeLab && flagEnabled("gitWorktreeLab") ? { body: lesson.body + "\n\nParallel agents need independent units and one branch or worktree per agent. A worktree shares Git objects but keeps its own working files and staging area. Never check out one branch in two worktrees. Integrate with rebase: replay each branch change onto main, stop at conflicts, edit the resolution, git add it in the conflicted worktree, then rebase --continue. Review the resulting diff and the behavior contract for every PR, not just the final branch. Use help in the parallel lab for its supported commands." } : {}),
      };
    }),
  };
}

