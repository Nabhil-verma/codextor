// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Replay from "../src/pages/Replay";
import ShareReplay from "../src/components/ShareReplay";
import { encodeReplay, decodeReplay } from "../src/lib/replayShare";

/*
 * The replay page and the share control, as a learner meets them: open a link,
 * see the code, run the trace; or make a link from the code on screen.
 */

vi.mock("../src/lib/cloud", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/cloud")>();
  return { ...actual, useQuery: () => undefined, useMutation: () => vi.fn(() => Promise.resolve()) };
});

vi.mock("../src/AccountProvider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/AccountProvider")>();
  return {
    ...actual,
    useAccount: () =>
      ({
        user: null,
        authReady: true,
        sync: "idle",
        signOutUser: async () => {},
        resetEverything: async () => {},
      }) as unknown as ReturnType<typeof actual.useAccount>,
  };
});

const CODE = `let total = 0;\nfor (let i = 1; i <= 3; i++) total += i;\nconsole.log("total", total);`;

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Replay />
    </MemoryRouter>,
  );
}

afterEach(() => cleanup());

describe("opening a replay link", () => {
  it("shows the title and the code, read-only", () => {
    const token = encodeReplay({ code: CODE, title: "Loops" });
    renderAt(`/replay?c=${encodeURIComponent(token)}`);
    expect(screen.getByRole("heading", { name: "Loops" })).toBeTruthy();
    expect(screen.getByLabelText("Shared code").textContent).toBe(CODE);
  });

  it("runs the trace only when asked, and shows its steps", async () => {
    const token = encodeReplay({ code: CODE });
    renderAt(`/replay?c=${encodeURIComponent(token)}`);
    expect(screen.queryByText(/execution trace/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /visualize execution/i }));
    expect(await screen.findByText(/execution trace · step 1\//)).toBeTruthy();
  });

  it("explains a tampered link instead of running it", () => {
    const token = encodeReplay({ code: CODE });
    const tampered = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");
    renderAt(`/replay?c=${encodeURIComponent(tampered)}`);
    expect(screen.getByRole("alert").textContent).toMatch(/changed or damaged/);
    expect(screen.queryByLabelText("Shared code")).toBeNull();
  });

  it("explains an expired link", () => {
    const old = Date.now() - 40 * 86_400_000;
    const token = encodeReplay({ code: CODE }, old);
    expect(decodeReplay(token).ok).toBe(false);
    renderAt(`/replay?c=${encodeURIComponent(token)}`);
    expect(screen.getByRole("alert").textContent).toMatch(/expired/);
  });

  it("says so when there is no link at all", () => {
    renderAt("/replay");
    expect(screen.getByText(/Nothing to show/)).toBeTruthy();
  });
});

describe("making a replay link", () => {
  it("builds a link that decodes back to the same code", async () => {
    render(<ShareReplay code={CODE} />);
    fireEvent.click(screen.getByRole("button", { name: /copy replay link/i }));

    const input = (await screen.findByLabelText("Replay link")) as HTMLInputElement;
    const url = new URL(input.value);
    expect(url.hash.startsWith("#/replay?c=")).toBe(true);
    const token = new URLSearchParams(url.hash.split("?")[1]).get("c");
    const r = decodeReplay(token);
    expect(r.ok && r.replay.code).toBe(CODE);
  });

  it("still offers the link when the clipboard is unavailable", async () => {
    render(<ShareReplay code={CODE} />);
    fireEvent.click(screen.getByRole("button", { name: /copy replay link/i }));
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toMatch(/Copy the link below/);
    });
    expect(screen.getByLabelText("Replay link")).toBeTruthy();
  });

  it("will not make a link for code the decoder would refuse", () => {
    render(<ShareReplay code={"x".repeat(4001)} />);
    expect((screen.getByRole("button", { name: /copy replay link/i }) as HTMLButtonElement).disabled).toBe(true);
  });
});
