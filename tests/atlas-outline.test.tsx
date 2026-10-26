// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Atlas from "../src/pages/Atlas";
import { generatePlan } from "../src/lib/atlasPlan";
import { findTrackMeta } from "../src/data/manifest";

// Signed out: the Atlas bridge stays inert, so the page is tested on its own.
vi.mock("../src/lib/cloud", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/cloud")>();
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

const renderAtlas = (path = "/atlas") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Atlas />
    </MemoryRouter>,
  );

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("Atlas outline view", () => {
  it("has a labelled outline region", () => {
    renderAtlas();
    expect(screen.getByRole("region", { name: "Outline" })).toBeTruthy();
  });

  it("lists every planet in the plan as a heading", () => {
    renderAtlas();
    const plan = generatePlan({});
    const planets = [...new Set(plan.steps.map((s) => s.trackId))];
    const outline = screen.getByRole("region", { name: "Outline" });
    for (const trackId of planets) {
      const title = findTrackMeta(trackId)!.title;
      expect(within(outline).getByRole("heading", { name: title })).toBeTruthy();
    }
  });

  it("links every lesson in the plan to its real exercise", () => {
    renderAtlas();
    const plan = generatePlan({});
    const outline = screen.getByRole("region", { name: "Outline" });
    const links = within(outline).getAllByRole("link");
    const hrefs = links.map((a) => a.getAttribute("href"));
    for (const step of plan.steps) {
      expect(hrefs, step.key).toContain(`/learn/${step.trackId}/${step.lessonId}`);
    }
  });

  it("shows each lesson's minutes", () => {
    renderAtlas();
    const plan = generatePlan({});
    const outline = screen.getByRole("region", { name: "Outline" });
    const first = plan.steps[0];
    const link = outline.querySelector(`a[href="/learn/${first.trackId}/${first.lessonId}"]`);
    expect(link).not.toBeNull();
    expect(link!.textContent).toContain(`${first.minutes} min`);
  });

  it("marks a finished lesson as done", () => {
    const plan = generatePlan({});
    const first = plan.steps[0];
    localStorage.setItem(
      "clr-progress-v2",
      JSON.stringify({ completed: { [`${first.trackId}/${first.lessonId}!2026-10-23`]: 1 } }),
    );
    renderAtlas();
    const outline = screen.getByRole("region", { name: "Outline" });
    const link = outline.querySelector(`a[href="/learn/${first.trackId}/${first.lessonId}"]`);
    expect(link).not.toBeNull();
    expect(link!.textContent).toContain("Done");
  });
});
