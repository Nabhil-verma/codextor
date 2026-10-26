// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MANIFEST_TRACKS } from "../src/data/manifest";

// framer-motion's whileInView needs observers that jsdom doesn't implement.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
if (!("IntersectionObserver" in globalThis)) {
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
    NoopObserver;
}
if (!("ResizeObserver" in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = NoopObserver;
}

// The catalog mounts <Nav/>, which reads the account context. Stub the live
// data (same pattern as the other page tests) so the filters are what's tested.
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
    useAccount: () =>
      ({
        user: { email: "ada@example.com", displayName: "Ada" },
        authReady: true,
        sync: "idle",
        signOutUser: async () => {},
        resetEverything: async () => {},
      }) as unknown as ReturnType<typeof actual.useAccount>,
  };
});

// Imported after the mocks so the page picks them up.
import Learn from "../src/pages/Learn";

/*
 * #7 (second half): the catalog is searchable and filterable by status, track
 * and interaction kind — including the break-and-fix labs. Everything comes
 * from the manifest, so no lesson body is needed to filter the list.
 */

const renderLearn = () =>
  render(
    <MemoryRouter initialEntries={["/learn"]}>
      <Learn />
    </MemoryRouter>,
  );

const search = () => screen.getByRole("searchbox") as HTMLInputElement;

// The first track's title appears in more than one panel, so only its
// presence matters while the page settles.
const waitForCatalog = () =>
  waitFor(() =>
    expect(screen.getAllByText(MANIFEST_TRACKS[0].title).length).toBeGreaterThan(0),
  );

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("Learn search and filters", () => {
  it("starts a fresh account at the first web lesson and renders Agents fourth", async () => {
    renderLearn();
    await waitForCatalog();
    expect(screen.getByRole("link", { name: "Start lesson" }).getAttribute("href")).toBe("/learn/web/html-semantic");
    const headings = screen.getAllByRole("heading", { level: 2 }).map(h => h.textContent);
    const coreTitles = MANIFEST_TRACKS.filter(t => !t.optional).map(t => t.title);
    const catalog = headings.filter(h => coreTitles.includes(h ?? ""));
    expect(catalog[3]).toBe("Working with Coding Agents");
  });
  it("shows every track before filtering", async () => {
    renderLearn();
    await waitForCatalog();
    for (const track of MANIFEST_TRACKS) {
      expect(screen.getAllByText(track.title).length).toBeGreaterThan(0);
    }
  });

  it("narrows the list to matching lessons", async () => {
    renderLearn();
    await waitForCatalog();

    fireEvent.change(search(), { target: { value: "flexbox" } });

    await waitFor(() =>
      expect(screen.getAllByText(/flexbox/i).length).toBeGreaterThan(0),
    );
    // A lesson that cannot match is gone, and the match count is announced.
    const unrelated = MANIFEST_TRACKS[MANIFEST_TRACKS.length - 1].lessons[0].title;
    expect(screen.queryAllByText(unrelated)).toHaveLength(0);
    expect(screen.getByRole("status").textContent).toMatch(/lessons? match/);
  });

  it("filters to break-and-fix labs", async () => {
    renderLearn();
    await waitForCatalog();

    fireEvent.click(screen.getByRole("button", { name: /break-and-fix labs/i }));

    const labs = MANIFEST_TRACKS.flatMap((t) => t.lessons.filter((l) => l.hasDebug));
    expect(labs.length).toBeGreaterThan(0);
    await waitFor(() =>
      expect(screen.getAllByText(labs[0].title).length).toBeGreaterThan(0),
    );
    // Reading lessons are filtered out. (The very first lesson is skipped:
    // it also appears in the "up next" card.)
    const reading = MANIFEST_TRACKS[0].lessons.find(
      (l) => l.interaction === "reading" && l.id !== "html-semantic",
    )!;
    expect(screen.queryAllByText(reading.title)).toHaveLength(0);
  });

  it("says so when nothing is done yet", async () => {
    renderLearn();
    await waitForCatalog();

    fireEvent.click(screen.getByRole("button", { name: /^done$/i }));

    await waitFor(() => expect(screen.getByText(/No lessons match/i)).toBeTruthy());
  });

  it("filters by interaction kind", async () => {
    renderLearn();
    await waitForCatalog();

    fireEvent.click(screen.getByRole("button", { name: /^interactive$/i }));

    const interactive = MANIFEST_TRACKS[0].lessons.find(
      (l) => l.interaction === "interactive",
    )!;
    await waitFor(() =>
      expect(screen.getAllByText(interactive.title).length).toBeGreaterThan(0),
    );
    const reading = MANIFEST_TRACKS[0].lessons.find(
      (l) => l.interaction === "reading" && l.id !== "html-semantic",
    )!;
    expect(screen.queryAllByText(reading.title)).toHaveLength(0);
  });

  it("filters by track", async () => {
    renderLearn();
    await waitForCatalog();

    const target = MANIFEST_TRACKS[2];
    fireEvent.change(screen.getByLabelText(/filter by track/i), {
      target: { value: target.id },
    });

    await waitFor(() =>
      expect(screen.getAllByText(target.lessons[0].title).length).toBeGreaterThan(0),
    );
    const other = MANIFEST_TRACKS[0].lessons.find((l) => l.id !== "html-semantic")!;
    expect(screen.queryAllByText(other.title)).toHaveLength(0);
  });

  it("clears every filter at once", async () => {
    renderLearn();
    await waitForCatalog();

    fireEvent.change(search(), { target: { value: "zzzz" } });
    await waitFor(() => expect(screen.getByText(/No lessons match/i)).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: /clear/i }));
    await waitFor(() => expect(screen.queryByText(/No lessons match/i)).toBeNull());
    expect(search().value).toBe("");
  });
});
