// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("OfflinePackButton", () => {
  const INDEX = {
    version: "v1",
    core: ["/assets/index.js"],
    tracks: { web: ["/assets/track-web.js"] },
    runtimes: { ts: [] },
  };

  async function loadButton() {
    vi.resetModules();
    return (await import("../src/components/OfflinePackButton")).default;
  }

  it("renders nothing when Cache Storage is unavailable", async () => {
    vi.stubGlobal("caches", undefined);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(INDEX))));
    const Button = await loadButton();
    const { container } = render(<Button trackId="web" />);
    await waitFor(() => expect(container.innerHTML).toBe(""));
  });

  it("renders nothing when the build has no pack index", async () => {
    vi.stubGlobal("caches", { open: async () => ({}) });
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>spa</html>", { status: 200 })));
    const Button = await loadButton();
    const { container } = render(<Button trackId="web" />);
    await waitFor(() => expect(container.innerHTML).toBe(""));
  });

  it("saves every file for the track, then shows it as saved", async () => {
    const stored = new Map<string, Response>();
    const cache = {
      put: async (url: string, res: Response) => void stored.set(url, res),
      match: async (url: string) => stored.get(url),
    };
    const requested: string[] = [];
    vi.stubGlobal("caches", { open: async () => cache });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        requested.push(url);
        if (url === "/offline-packs.json") return new Response(JSON.stringify(INDEX));
        return new Response(`body ${url}`);
      }),
    );
    const Button = await loadButton();
    render(<Button trackId="web" />);

    const save = await screen.findByRole("button", { name: /Save for offline/ });
    fireEvent.click(save);
    await waitFor(() => expect(screen.getByRole("button", { name: /Saved offline/ })).toBeTruthy());

    expect(requested.filter((u) => u !== "/offline-packs.json").sort()).toEqual([
      "/assets/index.js",
      "/assets/track-web.js",
    ]);
    expect(stored.has("/assets/track-web.js")).toBe(true);
    expect((screen.getByRole("button", { name: /Saved offline/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("offers a retry when a file fails to download", async () => {
    const cache = { put: async () => undefined, match: async () => undefined };
    vi.stubGlobal("caches", { open: async () => cache });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "/offline-packs.json") return new Response(JSON.stringify(INDEX));
        return new Response("gone", { status: 404 });
      }),
    );
    const Button = await loadButton();
    render(<Button trackId="web" />);
    fireEvent.click(await screen.findByRole("button", { name: /Save for offline/ }));
    expect(await screen.findByRole("button", { name: /Retry offline save/ })).toBeTruthy();
  });
});
