// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const board = vi.hoisted(() => ({ data: undefined as unknown }));

vi.mock("../src/lib/cloud", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/cloud")>();
  return {
    ...actual,
    useQuery: (ref: unknown) =>
      (ref as { name: string }).name === "leaderboard.top"
        ? board.data
        : undefined,
    useMutation: () => vi.fn(() => Promise.resolve()),
  };
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

import LeaderboardPanel from "../src/components/gamification/Leaderboard";

afterEach(() => {
  cleanup();
  board.data = undefined;
});

const row = (rank: number | null, isMe: boolean, name: string) => ({
  rank,
  profileId: `profile-${name}`,
  name,
  xp: 1000,
  level: 3,
  ascension: "apprentice",
  title: "cadet",
  streak: 0,
  isMe,
});

describe("arena pinned row beyond the scan cap", () => {
  it("shows 500+ instead of a rank when the server could not place you", () => {
    board.data = { bracket: "all", board: [row(1, false, "Top")], me: row(null, true, "Ada") };
    render(
      <MemoryRouter>
        <LeaderboardPanel limit={5} />
      </MemoryRouter>,
    );
    expect(screen.getByText("500+")).toBeTruthy();
    expect(screen.queryByText("null")).toBeNull();
  });

  it("still shows an exact rank when it is known", () => {
    board.data = { bracket: "all", board: [row(1, false, "Top")], me: row(42, true, "Ada") };
    render(
      <MemoryRouter>
        <LeaderboardPanel limit={5} />
      </MemoryRouter>,
    );
    expect(screen.getByText("42")).toBeTruthy();
    expect(screen.queryByText("500+")).toBeNull();
  });
});
