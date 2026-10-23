// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { flagEnabled } from "../src/lib/flags";
import { lessonRoute, loadTrack } from "../src/data/loadTrack";
import { MANIFEST_TRACKS } from "../src/data/manifest";
import { canonicalProgressKey, certificateLessonKeys } from "../src/lib/progressKeys";
import { lessonXpTotal } from "../src/lib/gamification";
import { fieldReportsTrack } from "../src/data/track-field-reports";
import Rubric from "../src/components/Rubric";
vi.mock("../src/components/Nav", () => ({ default: () => null }));
vi.mock("../src/AccountProvider", () => ({ useAccount: () => ({ user: null, authReady: true }) }));
window.scrollTo = () => {};
window.matchMedia = vi.fn().mockImplementation(query => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} }));
globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof IntersectionObserver;
import Lesson from "../src/pages/Lesson";
afterEach(() => { cleanup(); localStorage.clear(); });

it("enabled track modules are reachable through their generated manifest", async () => {
  for (const id of ["agent-internals", "field-reports"]) {
    const enabled = flagEnabled(id === "agent-internals" ? "agentInternals" : "fieldReports");
    const loaded = await loadTrack(id);
    expect(Boolean(loaded)).toBe(enabled);
    if (loaded) expect(loaded.lessons.map(l => l.id)).toEqual(MANIFEST_TRACKS.find(t => t.id === id)!.lessons.map(l => l.id));
  }
});
it("moves Python only when enabled and preserves storage and original certificate requirements", () => {
  const enabled = flagEnabled("agentInternals");
  expect(lessonRoute("python", "python-llm-api").trackId).toBe(enabled ? "agent-internals" : "python");
  const python = MANIFEST_TRACKS.find(t => t.id === "python")!;
  expect(certificateLessonKeys(python)).toContain("python/python-llm-api");
  expect(canonicalProgressKey("agent-internals/python-llm-api")).toBe("python/python-llm-api");
  expect(lessonXpTotal({ completed: { "python/python-llm-api!2026-10-01": 1, "agent-internals/python-llm-api!2026-10-23": 1 } })).toBe(75);
});
it("renders the actual flag-gated own-session lesson route or refuses it when disabled", async () => {
  render(<MemoryRouter initialEntries={["/learn/field-reports/own-session-report"]}><Routes><Route path="/learn/:trackId/:lessonId" element={<Lesson />} /></Routes></MemoryRouter>);
  if (!flagEnabled("fieldReports")) expect(await screen.findByRole("heading", { name: "Lesson not found" })).toBeTruthy();
  else {
    expect(await screen.findByRole("heading", { name: "Report on Your Own Agent Session" })).toBeTruthy();
    expect(await screen.findByRole("textbox", { name: /Paste your redacted Spec/ })).toBeTruthy();
  }
});
it("the own-session artifact grades through learner controls and survives a remount", () => {
  const exercise = fieldReportsTrack.lessons.find(l => l.id === "own-session-report")!.rubric!;
  const onScore = vi.fn();
  const view = render(<Rubric exercise={exercise} onScore={onScore} />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: exercise.exemplar } });
  fireEvent.click(screen.getByRole("button", { name: "Submit draft" }));
  expect(onScore).toHaveBeenCalledWith(1);
  view.unmount();
  render(<Rubric exercise={exercise} />);
  expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe(exercise.exemplar);
});
