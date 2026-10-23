// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import WorktreeLab from "../src/components/WorktreeLab";
import { flagEnabled } from "../src/lib/flags";
import { gitTrack } from "../src/data/track-git";

afterEach(cleanup);

describe("WorktreeLab UI", () => {
  it("checks off the worktree objective after a real attach command", () => {
    render(<WorktreeLab />);
    const input = screen.getByLabelText("Command");
    const run = (c: string) => { fireEvent.change(input, { target: { value: c } }); fireEvent.submit(input.closest("form")!); };
    run("git worktree add review feat-a");
    expect(screen.getByText(/Attach a second worktree/).previousSibling?.textContent).toBe("✓ ");
    run("git worktree add third feat-a");
    expect(document.querySelector("pre")?.textContent).toContain("already checked out at 'review'");
  });
});

it("requires a full staged rebase and contract-specific PR review through GitSim", async () => {
 const {default:GitSim}=await import("../src/components/GitSim");
 const scores:number[]=[];render(<GitSim objectives={[]} parallel onScore={score=>scores.push(score)} />);
 const input=screen.getByLabelText("Command");
 for(const c of ["git worktree add review feat-a","git worktree add third feat-a","cd review","git rebase main",'echo "color: purple" > app.css',"git add app.css","git rebase --continue","git diff main"]){fireEvent.change(input,{target:{value:c}});fireEvent.submit(input.closest("form")!);}
 fireEvent.click(screen.getByLabelText("Approve because rebase finished"));fireEvent.click(screen.getByText("Submit PR review"));expect(scores).toEqual([0]);
 fireEvent.click(screen.getByLabelText("Approve only if the reviewed patch sets color: purple"));fireEvent.click(screen.getByText("Submit PR review"));expect(scores).toEqual([0]);
 fireEvent.click(screen.getByLabelText("Approve: the second agent reports green tests"));fireEvent.click(screen.getByText("Submit second PR review"));expect(scores).toEqual([0,0]);
 fireEvent.click(screen.getByLabelText("Block: weakened assertion no longer proves purple"));fireEvent.click(screen.getByText("Submit second PR review"));expect(scores).toEqual([0,0,1]);
 fireEvent.change(input,{target:{value:'echo "color: yellow" > app.css'}});fireEvent.submit(input.closest("form")!);
 expect(screen.queryByText("Submit second PR review")).toBeNull();
 fireEvent.click(screen.getByText("Submit PR review")); expect(scores).toEqual([0,0,1,0]);
});

describe("feature flag and lesson wiring", () => {
  it("is off by default and on only for VITE_FLAG_GIT_WORKTREE_LAB=1", () => {
    expect(flagEnabled("gitWorktreeLab", {})).toBe(false);
    expect(flagEnabled("gitWorktreeLab", { VITE_FLAG_GIT_WORKTREE_LAB: "1" })).toBe(true);
    expect(flagEnabled("gitWorktreeLab", { VITE_FLAG_GIT_WORKTREE_LAB: "0" })).toBe(false);
  });
  it("attaches the worktree lab to the git workflow lesson", () => {
    expect(gitTrack.lessons.find(l => l.id === "git-workflow-lab")?.worktreeLab).toBe(true);
  });
});
