// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => ({
  user: null as { displayName: string; username: string; recoveryEmail: null } | null,
  cloud: undefined as { answers: Record<string, string>; revision: number } | null | undefined,
  save: vi.fn(async (_input: unknown) => {}),
}));
vi.mock("convex/react", async (original) => ({
  ...await original<typeof import("convex/react")>(),
  useQuery: (_ref: unknown, args: unknown) => args === "skip" ? undefined : h.cloud,
  useMutation: () => h.save,
}));
vi.mock("../src/AccountProvider", () => ({ useAccount: () => ({ user: h.user }) }));
import Atlas from "../src/pages/Atlas";
import { atlasStoreFor, mergeAtlasState } from "../src/lib/atlasStore";

const page = () => <MemoryRouter><Atlas /></MemoryRouter>;
beforeEach(() => { localStorage.clear(); h.user = null; h.cloud = undefined; h.save.mockReset().mockResolvedValue(undefined); });
afterEach(cleanup);

describe("Atlas answer sync", () => {
  it("lets a later goal replace a lexically larger old goal, and merges in either order", () => {
    const old = { answers: { goal: "junior-frontend" }, revision: 1 };
    const next = { answers: { goal: "interview-prep" }, revision: 2 };
    expect(mergeAtlasState(old, next)).toEqual(next);
    expect(mergeAtlasState(next, old)).toEqual(next);
    expect(mergeAtlasState(next, next)).toEqual(next);
    expect(mergeAtlasState(next, { answers: {}, revision: 3 }).answers).toEqual({});
  });

  it("updates both the form and generated plan when account answers arrive", async () => {
    h.user = { displayName: "Ada", username: "ada", recoveryEmail: null };
    h.cloud = { answers: { goal: "interview-prep", hours: "1-3" }, revision: 2 };
    render(page());
    await waitFor(() => expect((screen.getByRole("radio", { name: "Interview prep" }) as HTMLInputElement).checked).toBe(true));
    expect(atlasStoreFor("ada").get()).toEqual(h.cloud);
    expect(screen.getByText(/Finish by .* at 2 hours/)).toBeTruthy();
    await new Promise(r => setTimeout(r, 450));
    expect(h.save).not.toHaveBeenCalled();
  });

  it("pushes form edits and an explicit empty skip snapshot", async () => {
    h.user = { displayName: "Ada", username: "ada", recoveryEmail: null };
    h.cloud = { answers: {}, revision: 0 };
    render(page());
    fireEvent.click(screen.getByRole("radio", { name: "Interview prep" }));
    fireEvent.click(screen.getByRole("button", { name: "Save my plan" }));
    await waitFor(() => expect(h.save).toHaveBeenCalledWith(expect.objectContaining({ answers: { goal: "interview-prep" } })));
    fireEvent.click(screen.getByRole("button", { name: "Skip and use the default plan" }));
    await waitFor(() => expect(h.save).toHaveBeenLastCalledWith(expect.objectContaining({ answers: {} })));
  });

  it("keeps different accounts and guests in separate local stores", () => {
    atlasStoreFor("ada").set({ answers: { ship: "Ada's private project" }, revision: 1 });
    expect(atlasStoreFor("bob").get().answers).toEqual({});
    expect(atlasStoreFor().get().answers).toEqual({});
  });

  it("retains local answers and reports a failed account write", async () => {
    h.user = { displayName: "Ada", username: "ada", recoveryEmail: null };
    h.cloud = { answers: {}, revision: 0 };
    h.save.mockRejectedValue(new Error("offline"));
    render(page());
    fireEvent.click(screen.getByRole("radio", { name: "Interview prep" }));
    fireEvent.click(screen.getByRole("button", { name: "Save my plan" }));
    await waitFor(() => expect(screen.getByText(/Could not sync.*saved on this device/)).toBeTruthy());
    expect(atlasStoreFor("ada").get().answers.goal).toBe("interview-prep");
  });

  it("does not write a previous account's answers after switching accounts", async () => {
    h.user = { displayName: "Ada", username: "ada", recoveryEmail: null };
    h.cloud = { answers: {}, revision: 0 };
    const view = render(page());
    act(() => atlasStoreFor("ada").set({ answers: { goal: "interview-prep" }, revision: 1 }));
    h.user = { displayName: "Bob", username: "bob", recoveryEmail: null };
    view.rerender(page());
    await new Promise(r => setTimeout(r, 450));
    expect(h.save).not.toHaveBeenCalled();
  });
});
