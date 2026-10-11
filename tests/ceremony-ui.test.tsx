// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Ceremony from "../src/components/gamification/Ceremony";
import { saveProgress } from "../src/lib/progress";
import { MANIFEST_TRACKS } from "../src/data/manifest";
import { loadCeremonySeen } from "../src/lib/ceremony";

/*
 * The overlay end to end: a returning learner is not ambushed by last month's
 * achievements, a milestone earned now gets one curtain call, and dismissing it
 * is permanent.
 */

/** A track with every lesson aced — one completed module. */
function finishedTrack() {
  const track = MANIFEST_TRACKS.find((t) => t.lessons.length > 0)!;
  const completed: Record<string, number> = {};
  for (const lesson of track.lessons) completed[track.id + "/" + lesson.id + "!2026-10-01"] = 1;
  return { track, completed };
}

function renderCeremony() {
  return render(
    <MemoryRouter>
      <Ceremony />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("Ceremony", () => {
  it("says nothing when there is no progress at all", () => {
    saveProgress({ completed: {} });
    renderCeremony();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("absorbs pre-existing achievements on the first run", async () => {
    const { completed } = finishedTrack();
    saveProgress({ completed });
    render(
      <MemoryRouter>
        <Ceremony />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(loadCeremonySeen().initialized).toBe(true);
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(loadCeremonySeen().tracks.length).toBe(1);
  });

  it("celebrates a milestone earned while the app is open, once", async () => {
    // Starter progress: a lesson opened and not aced. The first run absorbs it.
    saveProgress({ completed: { "web/html-semantic!2026-10-01": 0.4 } });
    const { track, completed } = finishedTrack();
    renderCeremony();
    await waitFor(() => expect(loadCeremonySeen().initialized).toBe(true));
    expect(screen.queryByRole("dialog")).toBeNull();

    // Finish the track without reloading — the ceremony fires on the store
    // write. Finishing a track also climbs tiers, and the tier goes first.
    saveProgress({ completed });
    const tierDialog = await screen.findByRole("dialog");
    expect(tierDialog.textContent?.toLowerCase()).toContain("ascended");
    fireEvent.click(screen.getByRole("button", { name: "next" }));

    const trackDialog = await screen.findByRole("dialog");
    expect(trackDialog.textContent).toContain(track.title);
    fireEvent.click(screen.getByRole("button", { name: /keep going/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(loadCeremonySeen().tracks).toContain(track.id);

    // The same milestone never fires twice, even after a remount.
    cleanup();
    renderCeremony();
    await waitFor(() => expect(loadCeremonySeen().initialized).toBe(true));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("celebrates a new tier for a learner who is already climbing", async () => {
    saveProgress({ completed: { "web/html-semantic!2026-10-01": 0.4 } });
    renderCeremony();
    await waitFor(() => expect(loadCeremonySeen().initialized).toBe(true));

    // Climb past the second tier while the app stays open.
    const completed: Record<string, number> = {};
    for (let i = 0; i < 30; i++) completed["web/lesson-" + i + "!2026-10-02"] = 1;
    saveProgress({ completed });

    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent?.toLowerCase()).toContain("ascended");
    expect(loadCeremonySeen().tiers.length).toBeGreaterThan(0);
  });
});
