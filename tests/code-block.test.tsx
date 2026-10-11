// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CodeBlock from "../src/components/CodeBlock";
import LessonBody, { parseLessonBody } from "../src/components/LessonBody";

/* #3: label, copy button, line emphasis, and lesson fences carrying a lang. */

const writeText = vi.fn(async () => {});

beforeEach(() => {
  writeText.mockClear();
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
});
afterEach(cleanup);

describe("CodeBlock", () => {
  it("labels the block with its language", () => {
    render(<CodeBlock code="print(1)" lang="python" />);
    expect(screen.getByText("Python")).toBeTruthy();
  });

  it("falls back to a Text label", () => {
    render(<CodeBlock code="hello" />);
    expect(screen.getByText("Text")).toBeTruthy();
  });

  it("copies the source to the clipboard", async () => {
    render(<CodeBlock code="const a = 1;" lang="js" />);
    fireEvent.click(screen.getByRole("button", { name: /Copy JavaScript code/ }));
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith("const a = 1;"));
    await vi.waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe("Code copied to the clipboard"),
    );
  });

  it("renders tokens with theme CSS classes, not inline colours", () => {
    const { container } = render(<CodeBlock code="const a = 1;" lang="js" />);
    expect(container.querySelector(".tok-keyword")).toBeTruthy();
    expect(container.querySelector("[style]")).toBeNull();
  });

  it("emphasises only the requested lines", () => {
    const { container } = render(
      <CodeBlock code={"let a = 1;\nlet b = 2;\nlet c = 3;"} lang="js" highlightLines={[2]} />,
    );
    const lines = container.querySelectorAll("code > span");
    expect(lines).toHaveLength(3);
    expect(lines[1].className).toContain("bg-gold-400/10");
    expect(lines[0].className).not.toContain("bg-gold-400/10");
  });

  it("hides the header when bare", () => {
    render(<CodeBlock code="x" lang="js" bare />);
    expect(screen.queryByRole("button", { name: /Copy/ })).toBeNull();
  });
});

describe("parseLessonBody", () => {
  it("keeps the fence language and surrounding prose", () => {
    const segs = parseLessonBody("Hi\n\n```python\nprint(1)\n```\n\nBye");
    expect(segs).toEqual([
      { kind: "prose", text: "Hi\n\n" },
      { kind: "code", lang: "python", text: "print(1)" },
      { kind: "prose", text: "\n\nBye" },
    ]);
  });

  it("treats an unlabelled fence as code with an empty language", () => {
    const segs = parseLessonBody("```\nraw\n```");
    expect(segs).toEqual([{ kind: "code", lang: "", text: "raw" }]);
  });
});

describe("LessonBody", () => {
  it("routes a fenced block through CodeBlock with its language", () => {
    render(
      <LessonBody
        lesson={{ body: "Intro\n\n```python\nprint('hi')\n```\n\nDone" } as never}
      />,
    );
    expect(screen.getByText("Python")).toBeTruthy();
    expect(screen.getByText("Intro")).toBeTruthy();
    expect(screen.getByText("Done")).toBeTruthy();
  });
});
