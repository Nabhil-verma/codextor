/*
 * Deterministic parallel-worktree simulator: worktrees, a checked-out branch
 * refusal, rebase replay that stops on conflict with markers, and PR-style
 * diff review. Pure functions over plain data so every path is testable.
 * No real git, no filesystem, no network.
 */

export type Commit = { id: string; msg: string; file: string; text: string };
type Branch = { base: number; commits: Commit[] };
type Worktree = { name: string; branch: string; pending: Record<string, string>; staged: Record<string, string> };
type Conflict = { file: string; ours: string; theirs: string; commit: Commit };
type Rebase = { branch: string; queue: Commit[]; applied: Commit[]; conflict: Conflict | null; skipCheck?: boolean } | null;

export type WorktreeState = {
  main: Commit[];
  branches: Record<string, Branch>;
  worktrees: Record<string, Worktree>;
  cwd: string;
  rebase: Rebase;
  events: string[];
};

/** A learner objective completes when its event has been emitted. */
export type WorktreeObjective = { text: string; event: string };

export const WORKTREE_OBJECTIVES: WorktreeObjective[] = [
  { text: "Attach a second worktree for feat-a with `git worktree add review feat-a`", event: "worktree-added" },
  { text: "Try to attach feat-a in a third worktree and read why git refuses", event: "parallel-attach-blocked" },
  { text: "Switch to the review worktree with `cd review` and rebase feat-a onto main until the conflict stops it", event: "conflict-seen" },
  { text: "Resolve app.css with `echo ... > app.css`, `git add app.css`, then `git rebase --continue`", event: "rebased" },
  { text: "Review the change like a PR with `git diff main`", event: "diff-reviewed" },
];

export function initialWorktreeState(): WorktreeState {
  return {
    main: [
      { id: "a1b2c3d", msg: "initial page", file: "app.css", text: "color: blue" },
      { id: "9e8d7c6", msg: "teammate: red text", file: "app.css", text: "color: red" },
    ],
    branches: {
      main: { base: 2, commits: [] },
      "feat-a": {
        base: 1,
        commits: [{ id: "f00d001", msg: "green button", file: "app.css", text: "color: green" }],
      },
    },
    worktrees: { main: { name: "main", branch: "main", pending: {}, staged: {} } },
    cwd: "main",
    rebase: null,
    events: [],
  };
}

function materialize(commits: Commit[]): Record<string, string> {
  const files: Record<string, string> = {};
  for (const c of commits) files[c.file] = c.text;
  return files;
}

function headCommits(s: WorktreeState, branch: string): Commit[] {
  if (branch === "main") return s.main;
  const b = s.branches[branch];
  return [...s.main.slice(0, b.base), ...b.commits];
}

function emit(s: WorktreeState, event: string) {
  if (!s.events.includes(event)) s.events.push(event);
}

const MARK = "<<<<<<<";

function markers(ours: string, theirs: string, commitId: string): string {
  return `${MARK} HEAD\n${ours}\n=======\n${theirs}\n>>>>>>> ${commitId}`;
}

/** Apply queued commits until done or a conflict stops the rebase. */
function applyQueue(s: WorktreeState): string[] {
  const out: string[] = [];
  const rb = s.rebase;
  if (!rb) return out;
  const wt = s.worktrees[Object.keys(s.worktrees).find(k => s.worktrees[k].branch === rb.branch) ?? ""];
  while (rb.queue.length > 0) {
    const c = rb.queue[0];
    const mainNow = materialize([...s.main, ...rb.applied])[c.file];
    const replayed = rb.applied.filter(a => a.file === c.file);
    const mainAtBase = replayed.length ? replayed[replayed.length - 1].text : materialize(s.main.slice(0, s.branches[rb.branch].base))[c.file];
    if (rb.skipCheck) {
      rb.skipCheck = false;
    } else if (mainNow !== mainAtBase && mainNow !== c.text) {
      rb.conflict = { file: c.file, ours: mainNow, theirs: c.text, commit: c };
      if (wt) wt.pending[c.file] = markers(mainNow, c.text, c.id);
      emit(s, "conflict-seen");
      out.push(`Auto-merging ${c.file}`, `CONFLICT (content): Merge conflict in ${c.file}`, `error: could not apply ${c.id}... ${c.msg}`, "hint: resolve the file, `git add` it, then `git rebase --continue`.");
      return out;
    }
    rb.applied.push(c);
    rb.queue.shift();
  }
  const b = s.branches[rb.branch];
  b.base = s.main.length;
  b.commits = rb.applied;
  s.rebase = null;
  emit(s, "rebased");
  out.push(`Successfully rebased and updated refs/heads/${rb.branch}.`);
  return out;
}

export function runWorktreeCommand(prev: WorktreeState, raw: string): { state: WorktreeState; out: string[] } {
  const s: WorktreeState = JSON.parse(JSON.stringify(prev));
  const line = raw.trim() === "help" ? "git help" : raw.trim();
  if (!line) return { state: s, out: [] };
  const wt = s.worktrees[s.cwd];

  const echo = line.match(/^echo\s+"?(.*?)"?\s*>\s*(\S+)$/);
  if (echo) {
    wt.pending[echo[2]] = echo[1];
    return { state: s, out: [] };
  }

  const cd = line.match(/^cd\s+(\S+)$/);
  if (cd) {
    if (!s.worktrees[cd[1]]) return { state: s, out: [`cd: no such worktree: ${cd[1]}`] };
    s.cwd = cd[1];
    return { state: s, out: [] };
  }

  const parts = line.split(/\s+/);
  if (parts[0] !== "git") {
    return { state: s, out: [`${parts[0]}: command not found — this terminal speaks git, echo and cd (try \`help\`)`] };
  }
  const cmd = parts[1] ?? "";
  const args = parts.slice(2);
  const branch = wt.branch;

  switch (cmd) {
    case "help":
      return { state: s, out: ["commands: git status · git log --oneline · git commit -m \"msg\" · git worktree add [-b] <name> <branch> · git worktree list · cd <name> · echo \"text\" > <file> · git add <file> · git rebase main · git rebase --continue · git diff main"] };

    case "status": {
      const out = [`On worktree ${wt.name} (branch ${branch})`];
      if (s.rebase) out.push(`rebase in progress: ${s.rebase.conflict ? "conflict in " + s.rebase.conflict.file : "replaying commits"}`);
      const files = Object.keys(wt.pending);
      if (files.length) out.push(...files.map(f => `modified: ${f}`));
      else out.push("nothing to commit, working tree clean");
      return { state: s, out };
    }

    case "log": {
      const cs = branch === "main" ? s.main : s.branches[branch].commits;
      return { state: s, out: [...[...cs].reverse().map(c => `${c.id} ${c.msg}`), ...(cs.length === 0 ? ["(no commits on this branch yet)"] : [])] };
    }

    case "worktree": {
      if (args[0] === "list") {
        return { state: s, out: Object.values(s.worktrees).map(w => `${w.name.padEnd(10)} ${w.branch}`) };
      }
      if (args[0] !== "add") return { state: s, out: ["usage: git worktree add [-b] <name> <branch> | git worktree list"] };
      let name: string | undefined, target: string | undefined, create = false;
      if (args[1] === "-b") { create = true; target = args[2]; name = args[3]; }
      else { name = args[1]; target = args[2]; }
      if (!name || !target) return { state: s, out: ["usage: git worktree add [-b] <name> <branch>"] };
      if (s.worktrees[name]) return { state: s, out: [`fatal: '${name}' already exists`] };
      if (create) {
        if (s.branches[target]) return { state: s, out: [`fatal: a branch named '${target}' already exists`] };
        s.branches[target] = { base: s.main.length, commits: [] };
      } else if (!s.branches[target]) {
        return { state: s, out: [`fatal: invalid reference: ${target}`] };
      }
      const holder = Object.values(s.worktrees).find(w => w.branch === target);
      if (holder) {
        emit(s, "parallel-attach-blocked");
        return { state: s, out: [`fatal: '${target}' is already checked out at '${holder.name}'`, "hint: one branch can be checked out in one worktree at a time. Use a new branch with `git worktree add -b`, or work in the existing one."] };
      }
      s.worktrees[name] = { name, branch: target, pending: {}, staged: {} };
      emit(s, "worktree-added");
      return { state: s, out: [`Preparing worktree (${create ? "new branch" : "checking out"} '${target}')`, `HEAD is now at ${target}`] };
    }

    case "add": {
      const f = args[0];
      if (!f) return { state: s, out: ["usage: git add <file>"] };
      const val = wt.pending[f];
      if (val !== undefined && val.includes(MARK)) return { state: s, out: [`error: ${f} still has conflict markers; resolve it first`] };
      if (val === undefined) return { state: s, out: [`fatal: pathspec '${f}' did not match any modified file`] };
      wt.staged[f] = val;
      return { state: s, out: [] };
    }

    case "commit": {
      if (s.rebase) return { state: s, out: ["fatal: cannot commit during a rebase; use `git rebase --continue`"] };
      const m = line.match(/-m\s+"([^"]+)"/);
      if (!m) return { state: s, out: ["usage: git commit -m \"message\""] };
      const files = Object.keys(wt.staged);
      if (files.length === 0) return { state: s, out: ["nothing to commit"] };
      const id = (branch + m[1] + files.join()).split("").reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7).toString(16).slice(0, 7).padStart(7, "0");
      const made = files.map((f, i) => ({ id: `${id.slice(0, 6)}${i}`, msg: m[1], file: f, text: wt.staged[f] }));
      if (branch === "main") s.main.push(...made);
      else s.branches[branch].commits.push(...made);
      for (const f of files) {
        if (wt.pending[f] === wt.staged[f]) delete wt.pending[f];
        delete wt.staged[f];
      }
      return { state: s, out: [`[${branch} ${made[0].id}] ${m[1]}`, ...files.map(f => ` 1 file changed: ${f}`)] };
    }

    case "rebase": {
      if (args[0] === "--continue") {
        const rb = s.rebase;
        if (!rb || !rb.conflict) return { state: s, out: ["fatal: no rebase in progress"] };
        const val = wt.pending[rb.conflict.file];
        if (wt.branch !== rb.branch) return { state: s, out: ["error: continue from the rebasing worktree"] };
        if (val === undefined || val.includes(MARK) || wt.staged[rb.conflict.file] !== val) return { state: s, out: [`error: ${rb.conflict.file} still has conflict markers or is not staged`] };
        const resolved = { ...rb.conflict.commit, text: val };
        delete wt.pending[rb.conflict.file];
        delete wt.staged[rb.conflict.file];
        rb.queue[0] = resolved;
        rb.conflict = null;
        rb.skipCheck = true;
        return { state: s, out: applyQueue(s) };
      }
      if (args[0] !== "main") return { state: s, out: ["usage: git rebase main | git rebase --continue"] };
      if (branch === "main") return { state: s, out: ["Current branch main is up to date."] };
      if (s.rebase) return { state: s, out: ["fatal: a rebase is already in progress"] };
      if (Object.keys(wt.pending).length) return { state: s, out: ["error: cannot rebase with uncommitted changes"] };
      const queue = [...s.branches[branch].commits];
      s.rebase = { branch, queue, applied: [], conflict: null };
      return { state: s, out: [`Rebasing ${branch} onto main`, ...applyQueue(s)] };
    }

    case "diff": {
      if (args[0] !== "main") return { state: s, out: ["usage: git diff main"] };
      const a = materialize(headCommits(s, "main"));
      const b = materialize(headCommits(s, branch));
      const files = Array.from(new Set([...Object.keys(a), ...Object.keys(b)])).filter(f => a[f] !== b[f]);
      if (files.length === 0) return { state: s, out: ["No differences."] };
      if (branch !== "main") emit(s, "diff-reviewed");
      const out: string[] = [];
      for (const f of files) out.push(`--- main:${f}`, `+++ ${branch}:${f}`, `-${a[f] ?? "(absent)"}`, `+${b[f] ?? "(absent)"}`);
      return { state: s, out };
    }

    default:
      return { state: s, out: [`git: '${cmd}' is not a git command in this simulator. Try \`help\`.`] };
  }
}
