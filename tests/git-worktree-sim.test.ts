import { describe, expect, it } from "vitest";
import { initialWorktreeState, runWorktreeCommand, WORKTREE_OBJECTIVES, type WorktreeState } from "../src/lib/gitWorktreeSim";

function run(s: WorktreeState, cmds: string[]) {
  let state = s;
  const outs: string[][] = [];
  for (const c of cmds) {
    const r = runWorktreeCommand(state, c);
    state = r.state;
    outs.push(r.out);
  }
  return { state, outs };
}

describe("worktree simulator: full learner path", () => {
  it("attaches, blocks a duplicate checkout, stops at conflict, resolves, reviews the diff", () => {
    const { state, outs } = run(initialWorktreeState(), [
      "git worktree add review feat-a",
      "git worktree add third feat-a",
      "cd review",
      "git rebase main",
      'echo "color: purple" > app.css',
      "git add app.css",
      "git rebase --continue",
      "git diff main",
    ]);
    expect(outs[0].join("\n")).toContain("HEAD is now at feat-a");
    expect(outs[1][0]).toContain("already checked out at 'review'");
    expect(outs[3].join("\n")).toContain("CONFLICT (content): Merge conflict in app.css");
    expect(outs[5]).toEqual([]);
    expect(outs[6].join("\n")).toContain("Successfully rebased and updated refs/heads/feat-a.");
    expect(outs[7].join("\n")).toContain("+color: purple");
    expect(state.events).toEqual(expect.arrayContaining(WORKTREE_OBJECTIVES.map(o => o.event)));
  });

  it("refuses to continue while markers remain", () => {
    const { outs } = run(initialWorktreeState(), [
      "git worktree add review feat-a", "cd review", "git rebase main", "git add app.css",
    ]);
    expect(outs[3][0]).toContain("still has conflict markers");
  });

  it("does not let an unrelated command pass as git", () => {
    const { outs } = run(initialWorktreeState(), ["rm -rf ."]);
    expect(outs[0][0]).toContain("command not found");
  });

  it("is deterministic: the same commands always yield the same output", () => {
    const cmds = ["git worktree add review feat-a", "cd review", "git rebase main"];
    expect(run(initialWorktreeState(), cmds).outs).toEqual(run(initialWorktreeState(), cmds).outs);
  });
});

it("requires staging the current resolution and continuing from its own worktree",()=>{
 let s=initialWorktreeState();const cmd=(c:string)=>{const r=runWorktreeCommand(s,c);s=r.state;return r.out.join("\n");};
 expect(cmd("help")).toContain("commands:");
 for(const c of ["git worktree add review feat-a","cd review","git rebase main",'echo "color: purple" > app.css'])cmd(c);
 expect(cmd("git rebase --continue")).toContain("not staged");
 cmd("git add app.css");cmd('echo "color: yellow" > app.css');
 expect(cmd("git rebase --continue")).toContain("not staged");
 cmd("git add app.css");cmd("cd main");expect(cmd("git rebase --continue")).toContain("rebasing worktree");
 cmd("cd review");expect(cmd("git rebase --continue")).toContain("Successfully rebased");
});
