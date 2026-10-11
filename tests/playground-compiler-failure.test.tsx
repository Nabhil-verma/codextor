// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Playground from "../src/components/Playground";

/*
 * When the TypeScript compiler script cannot be fetched, the run must end
 * with a message the learner can act on, and Run must come back. Before the
 * fix the button stayed on "running…" forever.
 */
vi.mock("../src/lib/tsRunner", () => ({
  runTs: vi.fn(async () => {
    throw new Error(
      "Could not load the TypeScript compiler from /typescript/typescript.js. Check your connection and press Run again."
    );
  }),
}));

afterEach(() => {
  cleanup();
});

describe("Playground when the TypeScript compiler cannot load", () => {
  it("shows the load error and re-enables Run", async () => {
    render(<Playground starter={"const n: number = 1;"} lang="ts" label="annotations" />);

    fireEvent.click(screen.getByRole("button", { name: "▶ Run" }));

    // Shown on screen and announced to screen readers, so more than one match is expected.
    await waitFor(() =>
      expect(screen.getAllByText(/Could not load the TypeScript compiler/).length).toBeGreaterThan(0)
    );
    const runButton = screen.getByRole("button", { name: "▶ Run" }) as HTMLButtonElement;
    expect(runButton.disabled).toBe(false);
    expect(screen.queryByText("running…")).toBeNull();
  });

  it("does not count load failures toward the two attempts that unlock hints", async () => {
    render(
      <Playground
        starter={"const n: number = 1;"}
        lang="ts"
        label="annotations"
        check={{ expr: "true", hint: "a hint", hints: [{ tier: 1, text: "First nudge" }] }}
      />
    );
    for (let i = 0; i < 2; i++) {
      const runButton = screen.getByRole("button", { name: "▶ Run" }) as HTMLButtonElement;
      fireEvent.click(runButton);
      await waitFor(() => expect(screen.getAllByText(/Could not load the TypeScript compiler/).length).toBeGreaterThan(0));
      await waitFor(() => expect((screen.getByRole("button", { name: "▶ Run" }) as HTMLButtonElement).disabled).toBe(false));
    }
    expect(screen.queryByText("First nudge")).toBeNull();
    expect(screen.getByText(/tiered hints unlock after two runs/)).toBeTruthy();
  });
});
