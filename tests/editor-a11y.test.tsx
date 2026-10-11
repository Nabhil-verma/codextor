// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, act } from "@testing-library/react";
import Playground from "../src/components/Playground";
import DebugLab from "../src/components/DebugLab";
import { summarizeRun } from "../src/lib/runSummary";
import type { DebugChallenge } from "../src/data/types";

/*
 * Editor accessibility (#1): Tab is trapped by default with an Esc escape
 * hatch, the editor has a real accessible name and description, the console
 * is a quiet log, and each Run announces exactly one summary.
 */

afterEach(cleanup);

const textbox = () => screen.getByRole("textbox") as HTMLTextAreaElement;
// The sr-only announcer is the one status region with the sr-only class.
const announcer = () =>
  document.querySelector<HTMLElement>('[role="status"].sr-only')!;

describe("Tab trap with Esc escape (Playground)", () => {
  it("Tab inserts two spaces and prevents focus moving by default", () => {
    render(<Playground starter="ab" />);
    const ta = textbox();
    ta.setSelectionRange(1, 1);
    const notPrevented = fireEvent.keyDown(ta, { key: "Tab" });
    expect(notPrevented).toBe(false);
    expect(ta.value).toBe("a  b");
  });

  it("Esc switches to Tab-moves-focus mode and the hint says so", () => {
    render(<Playground starter="x" />);
    const ta = textbox();
    fireEvent.keyDown(ta, { key: "Escape" });
    expect(fireEvent.keyDown(ta, { key: "Tab" })).toBe(true);
    expect(ta.value).toBe("x");
    expect(screen.getByText(/Tab moves focus now/)).toBeTruthy();
  });

  it("a non-Tab keypress re-arms trapping", () => {
    render(<Playground starter="x" />);
    const ta = textbox();
    fireEvent.keyDown(ta, { key: "Escape" });
    fireEvent.keyDown(ta, { key: "a" });
    expect(fireEvent.keyDown(ta, { key: "Tab" })).toBe(false);
  });

  it("blur re-arms trapping", () => {
    render(<Playground starter="x" />);
    const ta = textbox();
    fireEvent.keyDown(ta, { key: "Escape" });
    fireEvent.blur(ta);
    expect(fireEvent.keyDown(ta, { key: "Tab" })).toBe(false);
  });
});

describe("editor naming and description", () => {
  it("uses the lesson title as the accessible name", () => {
    render(<Playground starter="" label="Closures in practice" />);
    expect(
      screen.getByRole("textbox", { name: "Code editor: Closures in practice" })
    ).toBeTruthy();
  });

  it("falls back to 'Code editor' with no title", () => {
    render(<Playground starter="" />);
    expect(screen.getByRole("textbox", { name: "Code editor" })).toBeTruthy();
  });

  it("links the visible Esc-then-Tab hint through aria-describedby", () => {
    render(<Playground starter="" />);
    const ta = textbox();
    const id = ta.getAttribute("aria-describedby");
    expect(id).toBeTruthy();
    const hint = document.getElementById(id!);
    expect(hint?.textContent).toContain("Esc, then Tab to leave the editor");
  });
});

describe("console and announcements", () => {
  it("the console is a labelled log that does not announce every line", () => {
    render(<Playground starter="" />);
    const log = screen.getByRole("log", { name: "Console output" });
    expect(log.getAttribute("aria-live")).toBe("off");
  });

  it("one Run announces a single summary in the status region", async () => {
    render(<Playground starter={"console.log(1);\nconsole.log(2);"} />);
    fireEvent.click(screen.getByRole("button", { name: /Run/ }));
    await waitFor(() =>
      expect(announcer().textContent).toBe(
        "Ran: 2 lines of output, no errors"
      )
    );
  });

  it("a failing Run announces a short 'Failed:' summary", async () => {
    render(<Playground starter={"throw new Error('boom here');"} />);
    fireEvent.click(screen.getByRole("button", { name: /Run/ }));
    await waitFor(() =>
      expect(
        announcer().textContent
      ).toMatch(/^Failed: .*boom here/)
    );
  });

  it("Cmd/Ctrl+Enter runs without moving focus away from the editor", async () => {
    render(<Playground starter="console.log('hi')" />);
    const ta = textbox();
    ta.focus();
    await act(async () => {
      fireEvent.keyDown(ta, { key: "Enter", ctrlKey: true });
    });
    await waitFor(() =>
      expect(announcer().textContent).toMatch(/^Ran:/)
    );
    expect(document.activeElement).toBe(ta);
  });

  it("the goal panel for a checked exercise is a status region", () => {
    render(
      <Playground
        starter=""
        check={{ expr: "true", hint: "Print the total." } as never}
      />
    );
    const goal = screen
      .getAllByRole("status")
      .find((el) => el.textContent?.includes("Print the total."));
    expect(goal).toBeTruthy();
  });
});

describe("summarizeRun", () => {
  it("reports line count with correct plural", () => {
    expect(summarizeRun({ logs: ["a"] } as never)).toBe(
      "Ran: 1 line of output, no errors"
    );
    expect(summarizeRun({ logs: [] } as never)).toBe(
      "Ran: 0 lines of output, no errors"
    );
  });

  it("truncates long errors to the first line", () => {
    const long = "x".repeat(300) + "\nstack";
    const s = summarizeRun({ logs: [], error: long } as never);
    expect(s.startsWith("Failed: ")).toBe(true);
    expect(s.length).toBeLessThanOrEqual("Failed: ".length + 120);
    expect(s).not.toContain("stack");
  });
});

describe("DebugLab editor", () => {
  const challenge = {
    id: "t",
    title: "Off-by-one loop",
    brief: "Sum 1..3",
    broken: "let s = 0;",
    solution: "loop bound",
    fixCheck: { expr: "true", hint: "" },
    hints: [],
    win: "ok",
  } as unknown as DebugChallenge;

  it("names the editor after the challenge and traps Tab", () => {
    render(<DebugLab challenge={challenge} />);
    const ta = screen.getByRole("textbox", {
      name: "Code editor: Off-by-one loop",
    }) as HTMLTextAreaElement;
    ta.setSelectionRange(ta.value.length, ta.value.length);
    expect(fireEvent.keyDown(ta, { key: "Tab" })).toBe(false);
    expect(ta.value).toBe("let s = 0;  ");
  });

  it("the console is a labelled log and Run announces one summary", async () => {
    render(<DebugLab challenge={challenge} />);
    screen.getByRole("log", { name: "Console output" });
    fireEvent.click(screen.getByRole("button", { name: /Run & verify/ }));
    await waitFor(() =>
      expect(announcer().textContent).toMatch(/^Ran:/)
    );
  });
});
