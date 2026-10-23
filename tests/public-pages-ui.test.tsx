// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { getFunctionName } from "convex/server";

// Per-test answers for each Convex query, keyed by its function name (e.g. "certificates:verify").
const answers = vi.hoisted(() => new Map<unknown, unknown>());

vi.mock("convex/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("convex/react")>();
  return {
    ...actual,
    useQuery: (ref: unknown) => answers.get(getFunctionName(ref as Parameters<typeof getFunctionName>[0])),
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

import Verify from "../src/pages/Verify";
import PublicProfile from "../src/pages/PublicProfile";

afterEach(() => {
  cleanup();
  answers.clear();
  vi.unstubAllGlobals();
});

function at(path: string, element: React.ReactElement, route: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={route} element={element} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Verify page", () => {
  it("says so when no certificate matches the code", () => {
    answers.set("certificates:verify", { valid: false });
    at("/verify/ABCDEFGHJKLM", <Verify />, "/verify/:code");
    expect(screen.getByText(/No certificate matches this code/)).toBeTruthy();
  });

  it("shows the display name and track, and never an account", () => {
    answers.set("certificates:verify", {
      valid: true,
      code: "ABCDEFGHJKLM",
      displayName: "Ada L.",
      trackTitle: "Python Foundations",
      issuedAt: Date.UTC(2026, 0, 2),
    });
    const { container } = at("/verify/ABCDEFGHJKLM", <Verify />, "/verify/:code");
    expect(screen.getByRole("heading", { name: "Ada L." })).toBeTruthy();
    expect(screen.getByText("Python Foundations")).toBeTruthy();
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/userId|subject|@example|email/i);
  });
});

describe("PublicProfile page", () => {
  const card = {
    name: "Ada",
    title: null,
    level: 4,
    ascension: 2,
    xp: 1234,
    lessonsDone: 12,
    streakLongest: 5,
    clan: null,
  };

  it("reports a missing profile without leaking anything", () => {
    answers.set("profiles:publicCard", null);
    answers.set("certificates:listForProfile", []);
    at("/u/nope", <PublicProfile />, "/u/:profileId");
    expect(screen.getByText("Profile not found")).toBeTruthy();
  });

  it("shows the public card and each certificate with a verify link", () => {
    answers.set("profiles:publicCard", card);
    answers.set("certificates:listForProfile", [
      { code: "ABCDEFGHJKLM", trackTitle: "Git Workflow", displayName: "Ada", issuedAt: Date.UTC(2026, 0, 2) },
    ]);
    const { container } = at("/u/p1", <PublicProfile />, "/u/:profileId");
    expect(screen.getByRole("heading", { name: /Ada/ })).toBeTruthy();
    expect(screen.getByText("Git Workflow")).toBeTruthy();
    const link = container.querySelector('a[href="/verify/ABCDEFGHJKLM"]');
    expect(link).not.toBeNull();
  });

  it("never renders account identifiers or email", () => {
    answers.set("profiles:publicCard", { ...card, userId: "user_secret_123", email: "ada@example.com" });
    answers.set("certificates:listForProfile", []);
    const { container } = at("/u/p1", <PublicProfile />, "/u/:profileId");
    const text = container.textContent ?? "";
    expect(text).not.toContain("user_secret_123");
    expect(text).not.toContain("ada@example.com");
  });
});
