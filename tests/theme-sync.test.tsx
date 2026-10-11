// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";

/*
 * The client half of the account-backed appearance style.
 *
 * ThemeBridge is the only thing that talks to `preferences`; these tests pin
 * its four behaviours with the Convex client mocked:
 *
 *   1. pull — the account's saved style is applied on sign-in;
 *   2. no echo — a style the account already has is never re-pushed;
 *   3. seed — a fresh account adopts this browser's existing choice;
 *   4. push — a later change follows the account, while signed out nothing
 *      is written and the local choice stays authoritative.
 */

const h = vi.hoisted(() => ({
  /** What `api.preferences.get` currently returns (undefined = loading). */
  query: undefined as { themeStyle: "glass" | "minimal" | null } | null | undefined,
  save: vi.fn(() => Promise.resolve()),
  user: null as { displayName: string; username: string; recoveryEmail: string | null } | null,
}));

vi.mock("convex/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("convex/react")>();
  return {
    ...actual,
    useQuery: () => h.query,
    useMutation: () => h.save,
  };
});

vi.mock("../src/AccountProvider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/AccountProvider")>();
  return {
    ...actual,
    useAccount: () =>
      ({
        user: h.user,
        authReady: true,
        sync: "idle",
        signOutUser: async () => {},
        resetEverything: async () => {},
      }) as unknown as ReturnType<typeof actual.useAccount>,
  };
});

import ThemeBridge from "../src/components/ThemeBridge";
import { themeStyleStore } from "../src/lib/theme";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
  h.query = undefined;
  h.save.mockClear();
  h.user = { displayName: "Ada", username: "ada", recoveryEmail: null };
});

afterEach(cleanup);

describe("appearance style follows the account", () => {
  it("pulls the account's saved style into this browser on sign-in", async () => {
    h.query = { themeStyle: "minimal" };
    render(<ThemeBridge />);

    await waitFor(() =>
      expect(document.documentElement.classList.contains("style-minimal")).toBe(true)
    );
    expect(themeStyleStore.get()).toBe("minimal");
    // Applying the account's own value is not a change worth writing back.
    expect(h.save).not.toHaveBeenCalled();
  });

  it("seeds a fresh account from this browser's existing choice", async () => {
    themeStyleStore.set("minimal");
    h.query = { themeStyle: null };
    render(<ThemeBridge />);

    await waitFor(() =>
      expect(h.save).toHaveBeenCalledWith({ themeStyle: "minimal" })
    );
  });

  it("pushes changes made while signed in", async () => {
    themeStyleStore.set("glass");
    h.query = { themeStyle: "glass" };
    render(<ThemeBridge />);

    themeStyleStore.set("minimal");

    await waitFor(() =>
      expect(h.save).toHaveBeenCalledWith({ themeStyle: "minimal" })
    );
    expect(themeStyleStore.get()).toBe("minimal");
  });

  it("never writes to the account while signed out", async () => {
    h.user = null;
    h.query = null; // signed out: the query answers null, not a row
    render(<ThemeBridge />);

    themeStyleStore.set("minimal");
    // Give any (incorrect) async push a chance to fire before asserting.
    await new Promise((r) => setTimeout(r, 20));

    expect(h.save).not.toHaveBeenCalled();
    // The local choice still applies — sign-in is never required for it.
    expect(themeStyleStore.get()).toBe("minimal");
  });
});
