// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

/*
 * Sign in with Freebuff: the page has one action and never collects a
 * password. The account is the visitor's Freebuff account, so there is no
 * sign-up form, no reset-code flow and nothing secret on this device.
 */

const spies = vi.hoisted(() => ({
  signIn: vi.fn(),
  user: null as
    | null
    | { displayName: string; handle: string; email: string | null; picture: string | null },
}));

vi.mock("../src/lib/cloud", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/cloud")>();
  return {
    ...actual,
    useQuery: () => undefined,
    useMutation: () => vi.fn(() => Promise.resolve()),
  };
});

vi.mock("../src/AccountProvider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/AccountProvider")>();
  return {
    ...actual,
    useAccount: () => ({
      user: spies.user,
      authReady: true,
      sync: "idle",
      signIn: spies.signIn,
      setDisplayName: async () => {},
      signOutUser: async () => {},
      resetEverything: async () => {},
    }),
  };
});

import AuthPage from "../src/pages/AuthPage";

beforeEach(() => {
  spies.signIn.mockClear();
  spies.user = null;
});

afterEach(() => {
  cleanup();
});

function renderPage(path = "/auth") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/learn" element={<p>learn page</p>} />
        <Route path="/clans" element={<p>clans page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("sign in with Freebuff", () => {
  it("offers one button and collects no credential", () => {
    renderPage();
    expect(screen.getByRole("button", { name: "Continue with Freebuff" })).toBeTruthy();
    expect(screen.queryByLabelText(/username/i)).toBeNull();
    expect(screen.queryByLabelText(/password/i)).toBeNull();
    expect(screen.queryByRole("button", { name: "Create a free account" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Forgot password?" })).toBeNull();
  });

  it("starts sign-in and returns to the lessons by default", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Continue with Freebuff" }));
    expect(spies.signIn).toHaveBeenCalledWith("/learn");
  });

  it("returns to the requested in-app page", () => {
    renderPage("/auth?returnTo=/clans");
    fireEvent.click(screen.getByRole("button", { name: "Continue with Freebuff" }));
    expect(spies.signIn).toHaveBeenCalledWith("/clans");
  });

  it("never bounces back to a path outside the app", () => {
    renderPage("/auth?returnTo=" + encodeURIComponent("//evil.example/steal"));
    fireEvent.click(screen.getByRole("button", { name: "Continue with Freebuff" }));
    expect(spies.signIn).toHaveBeenCalledWith("/learn");
  });

  it("sends an already signed-in visitor straight on", () => {
    spies.user = { displayName: "Ada", handle: "user-1", email: "ada@example.com", picture: null };
    renderPage("/auth?returnTo=/clans");
    expect(screen.getByText("clans page")).toBeTruthy();
  });
});
