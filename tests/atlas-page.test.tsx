// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Atlas from "../src/pages/Atlas";
import { generatePlan } from "../src/lib/atlasPlan";

// Signed out: the Atlas bridge stays inert, so the page is tested on its own.
vi.mock("convex/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("convex/react")>();
  return { ...actual, useQuery: () => undefined, useMutation: () => () => Promise.resolve() };
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

const renderAtlas = () =>
  render(
    <MemoryRouter>
      <Atlas />
    </MemoryRouter>,
  );

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("Atlas interview page", () => {
  it("labels every start question as a group", () => {
    renderAtlas();
    for (const prompt of [
      "What is your goal?",
      "Hours per week?",
      "Favourite stack?",
    ]) {
      expect(screen.getByRole("group", { name: prompt })).toBeTruthy();
    }
  });

  it("has a radio input for each choice, and each is reachable from the keyboard", () => {
    renderAtlas();
    const goal = screen.getByRole("group", { name: "What is your goal?" });
    const radios = goal.querySelectorAll('input[type="radio"]');
    expect(radios.length).toBeGreaterThan(0);
    for (const radio of radios) {
      // A visually hidden radio is still focusable: it is not display:none.
      expect(radio.className).toContain("sr-only");
      expect(radio.hasAttribute("disabled")).toBe(false);
    }
  });

  it("gives the free-text questions an accessible name", () => {
    renderAtlas();
    expect(screen.getByRole("textbox", { name: "What do you want to ship? (optional)" })).toBeTruthy();
  });

  it("shows the default plan before any answer is given", () => {
    renderAtlas();
    const plan = generatePlan({});
    expect(
      screen.getByText(`${plan.steps.length} lessons · about ${plan.weeks} weeks at ${plan.hoursPerWeek} hours a week`),
    ).toBeTruthy();
  });

  it("updates the plan after the learner picks a goal and saves", () => {
    renderAtlas();
    const goal = screen.getByRole("group", { name: "What is your goal?" });
    const pick = goal.querySelector('input[value="interview-prep"]') as HTMLInputElement;
    fireEvent.click(pick);
    fireEvent.click(screen.getByRole("button", { name: "Save my plan" }));

    const plan = generatePlan({ goal: "interview-prep" });
    expect(
      screen.getByText(`${plan.steps.length} lessons · about ${plan.weeks} weeks at ${plan.hoursPerWeek} hours a week`),
    ).toBeTruthy();
  });

  it("renders a working 2.5D map with lesson links and keeps the outline", () => {
    renderAtlas();
    fireEvent.click(screen.getByRole("button", { name: "2.5D" }));
    const map = screen.getByRole("region", { name: "2.5D map" });
    expect(map.querySelectorAll('a[href^="/learn/"]').length).toBe(generatePlan({}).steps.length);
    expect(screen.getByRole("region", { name: "Outline" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "2.5D" }).getAttribute("aria-pressed")).toBe("true");
    expect(localStorage.getItem("clr-atlas-view-v1")).toBe('"2.5d"');
    fireEvent.click(screen.getByRole("button", { name: "Outline" }));
    expect(screen.queryByRole("region", { name: "2.5D map" })).toBeNull();
  });

  it("shows a finish date for the plan", () => {
    renderAtlas();
    expect(screen.getByText(/^Finish by \d{4}-\d{2}-\d{2} at \d+ hours a week\.$/)).toBeTruthy();
  });

  it("skip returns the learner to the default plan and clears their answers", () => {
    renderAtlas();
    const goal = screen.getByRole("group", { name: "What is your goal?" });
    fireEvent.click(goal.querySelector('input[value="interview-prep"]') as HTMLInputElement);
    fireEvent.click(screen.getByRole("button", { name: "Save my plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Skip and use the default plan" }));

    const plan = generatePlan({});
    expect(
      screen.getByText(`${plan.steps.length} lessons · about ${plan.weeks} weeks at ${plan.hoursPerWeek} hours a week`),
    ).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("clr-atlas-answers-v1")!).answers).toEqual({});
  });
});
