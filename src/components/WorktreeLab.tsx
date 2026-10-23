import { useState } from "react";
import { initialWorktreeState, runWorktreeCommand, WORKTREE_OBJECTIVES, type WorktreeState } from "../lib/gitWorktreeSim";

/** Parallel-worktree terminal. Objectives complete from the simulator's events. */
export default function WorktreeLab({ onScore }: { onScore?: (score: number) => void }) {
  const [state, setState] = useState<WorktreeState>(initialWorktreeState);
  const [lines, setLines] = useState<string[]>([
    "# worktree-sim — main is checked out in the primary worktree; feat-a exists",
    "# type `help` for the commands",
    "",
  ]);
  const [review, setReview] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [secondReview, setSecondReview] = useState("");
  const [secondSubmitted, setSecondSubmitted] = useState(false);
  const [input, setInput] = useState("");

  const submit = () => {
    const raw = input.trim();
    if (!raw) return;
    const r = runWorktreeCommand(state, raw);
    setState(r.state);
    setReviewed(false); setSecondSubmitted(false);
    setLines(prev => [...prev, `${r.state.cwd} $ ${raw}`, ...r.out, ""]);
    setInput("");
  };

  return (
    <section className="glass glass-edge mt-8 rounded-3xl border border-paper-200 p-6" aria-label="Parallel worktrees lab">
      <p className="eyebrow">Parallel worktrees · rebase · review</p>
      <ol className="my-4 space-y-1 text-sm text-ink-700">
        {WORKTREE_OBJECTIVES.map(o => (
          <li key={o.event}>
            <span aria-hidden="true">{state.events.includes(o.event) ? "✓ " : "○ "}</span>
            <span className={state.events.includes(o.event) ? "text-ink-900" : ""}>{o.text}</span>
          </li>
        ))}
      </ol>
      <pre aria-live="polite" className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-ink-950 p-4 font-mono text-xs text-paper-100">{lines.join("\n")}</pre>
      <form onSubmit={e => { e.preventDefault(); submit(); }} className="mt-3 flex gap-2">
        <label className="sr-only" htmlFor="worktree-input">Command</label>
        <input id="worktree-input" value={input} onChange={e => setInput(e.target.value)} placeholder="git worktree add review feat-a" className="flex-1 rounded-xl border border-paper-200 bg-paper-50 px-3 py-2 font-mono text-sm" />
        <button type="submit" className="btn-primary !px-4 !py-2 text-sm">Run</button>
      </form>
      {state.events.includes("diff-reviewed") && <fieldset className="mt-4">
        <legend>PR review: the ticket requires purple text. What should you decide?</legend>
        <label className="block"><input type="radio" name="worktree-review" checked={review === "approve"} onChange={() => setReview("approve")} /> Approve only if the reviewed patch sets color: purple</label>
        <label className="block"><input type="radio" name="worktree-review" checked={review === "blind"} onChange={() => setReview("blind")} /> Approve because rebase finished</label>
        <button type="button" className="btn-primary mt-3" disabled={!review} onClick={() => {
          const branch = state.branches[state.worktrees[state.cwd].branch];
          const currentWorktree = state.worktrees[state.cwd];
          const cssChanges = branch?.commits.filter(c => c.file === "app.css") ?? [];
          const matches = cssChanges[cssChanges.length - 1]?.text === "color: purple" && Object.keys(currentWorktree.pending).length === 0;
          const passed = review === "approve" && matches && WORKTREE_OBJECTIVES.every(o => state.events.includes(o.event));
          setReviewed(passed);
          if (!passed) onScore?.(0);
        }}>Submit PR review</button>
        <p role="status">{reviewed ? "Verified: staged resolution, rebase and contract review complete." : "Compare the final patch to the ticket before approval."}</p>
      </fieldset>}
      {reviewed && <fieldset className="mt-5 text-ink-700">
        <legend>PR 2: the independent test agent's patch</legend>
        <p>Contract: the saved style must be purple. Decide before integrating this second agent's PR.</p>
        <pre className="my-3 overflow-auto rounded-lg bg-paper-100 p-3 text-sm">{'--- tests/style.test.ts\n- expect(style.color).toBe("purple");\n+ expect(style.color).toBeDefined();'}</pre>
        <label className="block"><input type="radio" name="second-pr" checked={secondReview === "block"} onChange={() => setSecondReview("block")} /> Block: weakened assertion no longer proves purple</label>
        <label className="block"><input type="radio" name="second-pr" checked={secondReview === "approve"} onChange={() => setSecondReview("approve")} /> Approve: the second agent reports green tests</label>
        <button type="button" className="btn-primary mt-3" disabled={!secondReview} onClick={() => { setSecondSubmitted(true); onScore?.(secondReview === "block" ? 1 : 0); }}>Submit second PR review</button>
        {secondSubmitted && <p role="status">{secondReview === "block" ? "Verified both PRs: accept the staged color repair, reject the weakened test, and require the original assertion before integration." : "A green check after weakening the contract is not proof. Reinspect the assertion."}</p>}
      </fieldset>}
    </section>
  );
}
