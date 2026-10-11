// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AiSettingsModal from "../src/components/AiSettingsModal";
import { saveAiSettings } from "../src/lib/ai";

/* #2c–#2e: the settings modal discloses what is sent, offers a model
 * choice, and reports Test key results in plain English. */

const renderModal = () =>
  render(
    <AiSettingsModal onClose={() => {}} themeStyle="glass" onThemeStyle={() => {}} />,
  );

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AiSettingsModal", () => {
  it("discloses the 2,000-character code limit", () => {
    renderModal();
    expect(screen.getByText(/up to 2,000 characters of your current code/)).toBeTruthy();
  });

  it("shows a model dropdown once a provider is chosen", () => {
    saveAiSettings({ provider: "gemini", keys: { gemini: "k" }, models: {}, tutorName: "" });
    renderModal();
    const select = screen.getByLabelText("Model") as HTMLSelectElement;
    expect(select.value).toBe("gemini-2.0-flash");
  });

  it("Test key is disabled until a key is entered", () => {
    saveAiSettings({ provider: "gemini", keys: {}, models: {}, tutorName: "" });
    renderModal();
    expect(
      (screen.getByRole("button", { name: "Test key" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("reports a rejected key in plain English", async () => {
    saveAiSettings({ provider: "gemini", keys: { gemini: "bad" }, models: {}, tutorName: "" });
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 401 })));
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Test key" }));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toMatch(/rejected the API key/),
    );
  });

  it("reports success when the ping is accepted", async () => {
    saveAiSettings({ provider: "gemini", keys: { gemini: "good" }, models: {}, tutorName: "" });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ candidates: [{ content: { parts: [{ text: "OK" }] } }] }),
            { status: 200 },
          ),
      ),
    );
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Test key" }));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe("Key works. The tutor is ready."),
    );
  });
});
