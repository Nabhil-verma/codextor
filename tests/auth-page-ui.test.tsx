// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const spies = vi.hoisted(() => ({
  signIn: vi.fn(async () => undefined),
  signUp: vi.fn(async () => undefined),
  requestPasswordReset: vi.fn(async () => undefined),
  completePasswordReset: vi.fn(async () => undefined),
}));

vi.mock("convex/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("convex/react")>();
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
      user: null,
      authReady: true,
      sync: "idle",
      ...spies,
      signOutUser: async () => {},
      resetEverything: async () => {},
      setRecoveryEmail: async () => {},
    }),
  };
});

import AuthPage from "../src/pages/AuthPage";

beforeEach(() => {
  for (const spy of Object.values(spies)) spy.mockClear();
  spies.signIn.mockImplementation(async () => undefined);
  spies.signUp.mockImplementation(async () => undefined);
  spies.requestPasswordReset.mockImplementation(async () => undefined);
  spies.completePasswordReset.mockImplementation(async () => undefined);
});

afterEach(() => {
  cleanup();
});

function renderPage() {
  const { container } = render(
    <MemoryRouter>
      <AuthPage />
    </MemoryRouter>,
  );
  return container.querySelector("form") as HTMLFormElement;
}

function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe("sign up with a username", () => {
  it("asks for a username and an optional recovery email, not an email login", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Create a free account" }));

    expect(screen.getByLabelText("Username")).toBeTruthy();
    expect(screen.getByLabelText("Recovery email (optional)")).toBeTruthy();
    expect(screen.queryByLabelText("Email address")).toBeNull();
  });

  it("submits the username and recovery address, and the recovery field may be blank", async () => {
    const form = renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Create a free account" }));
    type("Your name", "Ada");
    type("Username", "Ada_01");
    type("Password (at least 8 characters)", "correct horse");
    fireEvent.submit(form);

    await waitFor(() => expect(spies.signUp).toHaveBeenCalledTimes(1));
    expect(spies.signUp).toHaveBeenCalledWith("Ada", "Ada_01", "correct horse", undefined);

    spies.signUp.mockClear();
    type("Recovery email (optional)", "ada.backup@example.com");
    fireEvent.submit(form);
    await waitFor(() => expect(spies.signUp).toHaveBeenCalledTimes(1));
    expect(spies.signUp).toHaveBeenCalledWith(
      "Ada",
      "Ada_01",
      "correct horse",
      "ada.backup@example.com",
    );
  });
});

describe("sign in", () => {
  it("takes a username, and still accepts a legacy email", async () => {
    const form = renderPage();
    expect(screen.getByLabelText("Username or email")).toBeTruthy();
    type("Username or email", "Ada_01");
    type("Password (at least 8 characters)", "correct horse");
    fireEvent.submit(form);

    await waitFor(() => expect(spies.signIn).toHaveBeenCalledWith("Ada_01", "correct horse"));
  });

  it("shows the provider's plain message when sign-in fails", async () => {
    spies.signIn.mockRejectedValueOnce(new Error("Wrong username or password."));
    const form = renderPage();
    type("Username or email", "ada");
    type("Password (at least 8 characters)", "wrong-pass");
    fireEvent.submit(form);

    expect((await screen.findByRole("alert")).textContent).toContain("Wrong username or password.");
  });
});

describe("forgot password", () => {
  it("asks for the username, then the emailed code and a new password", async () => {
    const form = renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    type("Username", "Ada_01");
    fireEvent.submit(form);

    await waitFor(() => expect(spies.requestPasswordReset).toHaveBeenCalledWith("Ada_01"));
    // The reply is the same whether or not the account has an address on file.
    expect(await screen.findByText(/If that account has a recovery email/)).toBeTruthy();
    expect(screen.getByLabelText("Reset code (8 digits)")).toBeTruthy();

    type("Reset code (8 digits)", "12345678");
    type("New password (at least 8 characters)", "a brand new pass");
    fireEvent.submit(form);

    await waitFor(() =>
      expect(spies.completePasswordReset).toHaveBeenCalledWith("Ada_01", "12345678", "a brand new pass"),
    );
  });

  it("shows a clear message for a wrong or expired code", async () => {
    spies.completePasswordReset.mockRejectedValueOnce(
      new Error("That code is wrong or has expired. Request a new one."),
    );
    const form = renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    type("Username", "Ada_01");
    fireEvent.submit(form);
    await screen.findByLabelText("Reset code (8 digits)");

    type("Reset code (8 digits)", "00000000");
    type("New password (at least 8 characters)", "a brand new pass");
    fireEvent.submit(form);

    expect((await screen.findByRole("alert")).textContent).toMatch(/wrong or has expired/);
  });
});
