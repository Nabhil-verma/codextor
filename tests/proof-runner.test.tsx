// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProofRunner from "../src/components/ProofRunner";

/*
 * ProofRunner is Fix 8's only execution-graded contract: the claim's proof
 * must fail on the agent's draft and pass on the learner's fix. The pure
 * ladder (`gradeProofRun`) is unit-tested in lab-graders; this file proves the
 * *wiring* — that the component actually runs both sides through the sandbox
 * and reports the verdict the learner acts on.
 */

const GOOD = {
  buggy: `const headings = ["h1", "h3"];`,
  test: `if (headings[1] !== "h2") throw new Error("skipped heading level");`,
  fixed: `const headings = ["h1", "h2"];`,
};

afterEach(cleanup);

/*
 * Each proof runs the sandbox *twice* — draft+test, then fix+test — and every
 * run carries its own JS_TIMEOUT_MS (4000) budget plus worker start-up. The
 * assertions below are exact; only the window is sized for two sandbox runs so
 * the suite stays deterministic when 75 files share the CPU. Vitest's 5s
 * default per-test timeout is likewise too tight for the same reason.
 */
const DUAL_RUN_MS = 20_000;

describe("ProofRunner", () => {
  it("verifies a proof that fails on the draft and passes on the fix", async () => {
    const onScore = vi.fn();
    render(<ProofRunner proof={GOOD} onScore={onScore} />);
    fireEvent.click(screen.getByRole("button", { name: /run the proof/i }));

    await waitFor(
      () => expect(screen.getByText(/dual run verified/i)).toBeTruthy(),
      { timeout: DUAL_RUN_MS }
    );
    expect(screen.getByText(/failed, as a proof requires/i)).toBeTruthy();
    expect(onScore).toHaveBeenCalledWith(1);
  }, DUAL_RUN_MS);

  it("records 0.5 when the draft does not fail", async () => {
    const onScore = vi.fn();
    // The draft is already fixed — the test cannot distinguish it.
    render(<ProofRunner proof={{ ...GOOD, buggy: GOOD.fixed }} onScore={onScore} />);
    fireEvent.click(screen.getByRole("button", { name: /run the proof/i }));

    await waitFor(
      () => expect(screen.getByText(/partial: 0.5 recorded/i)).toBeTruthy(),
      { timeout: DUAL_RUN_MS }
    );
    expect(onScore).toHaveBeenCalledWith(0.5);
  }, DUAL_RUN_MS);

  it("records 0 when the test distinguishes nothing", async () => {
    const onScore = vi.fn();
    // The draft already passes the test, and the "fix" still fails it — the
    // proof demonstrates no difference between the two states.
    render(
      <ProofRunner
        proof={{ ...GOOD, buggy: GOOD.fixed, fixed: `throw new Error("still broken");` }}
        onScore={onScore}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /run the proof/i }));

    await waitFor(
      () => expect(screen.getByText(/0 recorded/i)).toBeTruthy(),
      { timeout: DUAL_RUN_MS }
    );
    expect(onScore).toHaveBeenCalledWith(0);
  }, DUAL_RUN_MS);

  it("stays disabled until all three fields are present", () => {
    render(<ProofRunner proof={{ buggy: "", test: "", fixed: "" }} />);
    const button = screen.getByRole("button", { name: /run the proof/i });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/all.*required/i)).toBeTruthy();
  });
});
