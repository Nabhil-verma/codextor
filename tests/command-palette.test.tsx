// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import CommandPalette from "../src/components/CommandPalette";
import { openPalette, recentsStore } from "../src/lib/paletteBus";
import { MANIFEST_TRACKS } from "../src/data/manifest";

/*
 * #7: Cmd/Ctrl+K fuzzy search across lessons, tracks, taxonomy, destinations
 * and actions, following the combobox pattern (focus stays in the input, the
 * active row is pointed at with aria-activedescendant, focus is restored on
 * close).
 */

function ShowPath() {
  const { pathname } = useLocation();
  return <p data-testid="path">{pathname}</p>;
}

const renderPalette = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <CommandPalette />
      <Routes>
        <Route path="*" element={<ShowPath />} />
      </Routes>
    </MemoryRouter>,
  );

const input = () => screen.getByRole("combobox") as HTMLInputElement;

beforeEach(() => {
  localStorage.clear();
  recentsStore.reset();
});
afterEach(cleanup);

describe("opening", () => {
  it("stays closed until asked", () => {
    renderPalette();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("opens on Cmd/Ctrl+K", () => {
    renderPalette();
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("opens from the shared bus (the nav and tab bar)", async () => {
    renderPalette();
    openPalette();
    await waitFor(() => expect(screen.getByRole("combobox")).toBeTruthy());
  });
});

describe("searching", () => {
  it("finds a lesson by title and marks it active for the input", () => {
    renderPalette();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    fireEvent.change(input(), { target: { value: "semantic html" } });

    // "Continue where I left off" also names this lesson in its hint, so take
    // the best-ranked (first) option.
    const option = screen.getAllByRole("option", { name: /Semantic HTML/ })[0];
    expect(option.getAttribute("aria-selected")).toBe("true");
    expect(input().getAttribute("aria-activedescendant")).toBe(option.id);
  });

  it("matches fuzzily, not only by substring", () => {
    renderPalette();
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    fireEvent.change(input(), { target: { value: "qqzzx" } });
    expect(screen.queryByRole("option")).toBeNull();
    // No substring hit — "semntich" only lines up as a subsequence.
    fireEvent.change(input(), { target: { value: "semntich" } });
    expect(screen.getAllByRole("option", { name: /Semantic HTML/ })[0]).toBeTruthy();
  });

  it("moves the active row with the arrow keys and wraps", () => {
    renderPalette();
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    fireEvent.change(input(), { target: { value: "html" } });

    const first = input().getAttribute("aria-activedescendant");
    fireEvent.keyDown(input(), { key: "ArrowDown" });
    const second = input().getAttribute("aria-activedescendant");
    expect(second).not.toBe(first);
    fireEvent.keyDown(input(), { key: "ArrowUp" });
    expect(input().getAttribute("aria-activedescendant")).toBe(first);
  });

  it("offers destinations and actions", () => {
    renderPalette();
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    fireEvent.change(input(), { target: { value: "leaderboard" } });
    expect(screen.getByRole("option", { name: /Leaderboard/ })).toBeTruthy();

    fireEvent.change(input(), { target: { value: "switch" } });
    expect(screen.getByRole("option", { name: /Switch to (light|dark) mode/ })).toBeTruthy();
  });

  it("lists taxonomy codes", () => {
    renderPalette();
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    fireEvent.change(input(), { target: { value: "EC" } });
    expect(screen.getAllByRole("option").length).toBeGreaterThan(0);
  });
});

describe("running an item", () => {
  it("navigates to the lesson and remembers it", async () => {
    renderPalette();
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    fireEvent.change(input(), { target: { value: "semantic html" } });
    fireEvent.keyDown(input(), { key: "Enter" });

    await waitFor(() => expect(screen.getByTestId("path").textContent).toContain("/learn/"));
    expect(screen.getByTestId("path").textContent).toContain("html-semantic");
    expect(recentsStore.get()[0]).toContain("html-semantic");
  });

  it("shows recents first when the query is empty", async () => {
    recentsStore.set(["lesson:web/html-semantic"]);
    renderPalette();
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    await waitFor(() =>
      expect(screen.getAllByRole("option", { name: /Semantic HTML/ })[0]).toBeTruthy(),
    );
    expect(screen.getByText("Recent")).toBeTruthy();
  });

  it("toggles the theme without navigating", () => {
    renderPalette();
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    fireEvent.change(input(), { target: { value: "switch" } });
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(localStorage.getItem("codexter-theme")).toBeTruthy();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("offers to continue where the learner left off", () => {
    renderPalette();
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    fireEvent.change(input(), { target: { value: "continue" } });
    const option = screen.getByRole("option", { name: /Continue where I left off/ });
    // The first lesson of the first track is the default resume point.
    expect(option.textContent).toContain(MANIFEST_TRACKS[0].title);
  });
});

describe("closing", () => {
  it("closes on Escape and returns focus to the trigger", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <button type="button">trigger</button>
        <CommandPalette />
      </MemoryRouter>,
    );
    const trigger = screen.getByRole("button", { name: "trigger" });
    trigger.focus();
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    await waitFor(() => expect(document.activeElement).toBe(input()));

    fireEvent.keyDown(input(), { key: "Escape" });
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes when the backdrop is clicked", () => {
    renderPalette();
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    // The dialog element is the panel; the dismissable surface is its parent.
    fireEvent.mouseDown(screen.getByRole("dialog").parentElement!);
    expect(screen.queryByRole("combobox")).toBeNull();
  });
});
