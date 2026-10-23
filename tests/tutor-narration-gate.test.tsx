// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const streamAi = vi.fn();
const settingsFixture = { provider: "test", keys: { test: "k" } } as never;
vi.mock("../src/lib/ai", async (orig) => ({
  ...(await orig<typeof import("../src/lib/ai")>()),
  streamAi: (...args: unknown[]) => streamAi(...args),
  loadAiSettings: () => settingsFixture,
  useAiSettings: () => settingsFixture,
}));

import SocraticTutor from "../src/components/SocraticTutor";

afterEach(() => { cleanup(); streamAi.mockReset(); });

const facts = { steps: [1, 2, 3], tools: ["run_tests"], files: ["src/app.ts"] };

async function ask(reply: string, traceFacts?: typeof facts) {
  streamAi.mockImplementation(async (_m: unknown, onDelta: (d: string) => void) => { onDelta(reply); });
  render(<SocraticTutor code="" checkExpr="" checkHint="" error={null} logs={[]} topic="t" lang="ts" openHintTier={0} autoAsk={{ id: 1, text: "why?" }} traceFacts={traceFacts} />);
  await waitFor(() => expect(streamAi).toHaveBeenCalled());
}

describe("tutor narration gate", () => {
  it("withholds a reply that cites a file not in the trace", async () => {
    await ask("Step 2 changed `db/schema.sql`.", facts);
    await waitFor(() => expect(screen.getByText(/Narration withheld/)).toBeTruthy());
    expect(screen.getByText(/db\/schema\.sql/)).toBeTruthy();
  });
  it("shows a grounded reply unchanged", async () => {
    await ask("Step 2 ran `run_tests` on `src/app.ts`.", facts);
    await waitFor(() => expect(screen.getByText(/Step 2 ran/)).toBeTruthy());
    expect(screen.queryByText(/Narration withheld/)).toBeNull();
  });
  it("does nothing when no trace facts are given", async () => {
    await ask("Step 9 changed `db/schema.sql`.");
    await waitFor(() => expect(screen.getByText(/Step 9 changed/)).toBeTruthy());
    expect(screen.queryByText(/Narration withheld/)).toBeNull();
  });
});
