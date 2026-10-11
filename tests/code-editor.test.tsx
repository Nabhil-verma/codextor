// @vitest-environment jsdom
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CodeEditor, { EditorToggle } from "../src/components/CodeEditor";
import {
  DEFAULT_EDITOR_PREFS,
  codeMirrorSupported,
  loadEditorPrefs,
  pickEditor,
  saveEditorPrefs,
} from "../src/lib/editorPrefs";

/*
 * The editor contract is shared by two implementations, so what is tested here
 * is the contract: the accessible name, the description link, Tab/Escape, and
 * the decision of which editor to render. jsdom has no layout, which is exactly
 * why it exercises the textarea path — CodeMirror is the same component behind
 * the same props.
 */

function renderEditor(overrides: Partial<Parameters<typeof CodeEditor>[0]> = {}) {
  const onChange = vi.fn();
  const onRun = vi.fn();
  const view = render(
    <CodeEditor
      value={"const a = 1;"}
      onChange={onChange}
      onRun={onRun}
      label="Code editor: Closures"
      describedBy="editor-hint"
      hint={(escaped) => (
        <p id="editor-hint">{escaped ? "Tab moves focus now." : "Tab inserts spaces."}</p>
      )}
      {...overrides}
    />,
  );
  return { onChange, onRun, view };
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("which editor renders", () => {
  it("prefers CodeMirror only when the preference, the browser and the chunk allow it", () => {
    expect(pickEditor({ enhanced: true }, true, false)).toBe("codemirror");
    expect(pickEditor({ enhanced: false }, true, false)).toBe("textarea");
    expect(pickEditor({ enhanced: true }, false, false)).toBe("textarea");
    expect(pickEditor({ enhanced: true }, true, true)).toBe("textarea");
  });

  it("says so instead of silently ignoring the preference", () => {
    // jsdom has no layout: the switch is visible but disabled, with a reason.
    expect(codeMirrorSupported()).toBe(false);
    render(<EditorToggle />);
    const toggle = screen.getByLabelText(/enhanced editor/i) as HTMLInputElement;
    expect(toggle.disabled).toBe(true);
    expect(toggle.closest("label")?.getAttribute("title")).toMatch(/browser with layout/);
  });

  it("remembers the preference", () => {
    expect(loadEditorPrefs()).toEqual(DEFAULT_EDITOR_PREFS);
    saveEditorPrefs({ enhanced: false });
    expect(loadEditorPrefs().enhanced).toBe(false);
    saveEditorPrefs({ enhanced: true });
    expect(loadEditorPrefs().enhanced).toBe(true);
  });
});

describe("bundle discipline", () => {
  it("keeps CodeMirror out of every chunk but its own", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (/\.tsx?$/.test(entry.name)) files.push(path);
      }
    };
    walk(join(process.cwd(), "src"));

    const importers = files.filter((f) => readFileSync(f, "utf8").includes('from "@codemirror'));
    expect(importers.map((f) => f.replace(process.cwd() + "/", ""))).toEqual([
      "src/components/CodeMirrorEditor.tsx",
    ]);

    // And the one file that pulls it in does so on demand, not statically.
    const editor = readFileSync(join(process.cwd(), "src/components/CodeEditor.tsx"), "utf8");
    expect(editor).toContain('lazy(() => import("./CodeMirrorEditor"))');
    expect(editor).not.toContain('from "./CodeMirrorEditor"');
  });
});

describe("the shared editor contract", () => {
  it("names the surface and points at its description", () => {
    renderEditor();
    const editor = screen.getByRole("textbox", { name: "Code editor: Closures" });
    const describedBy = editor.getAttribute("aria-describedby");
    expect(describedBy).toBe("editor-hint");
    expect(document.getElementById(describedBy!)?.textContent).toContain("Tab inserts spaces");
  });

  it("reports every edit and keeps the value controlled", () => {
    const { onChange } = renderEditor();
    const editor = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: "const a = 2;" } });
    expect(onChange).toHaveBeenCalledWith("const a = 2;");
    // Controlled: the DOM still shows the prop until the parent re-renders.
    expect(editor.value).toBe("const a = 1;");
  });

  it("indents with Tab and gives Tab back to focus after Escape", () => {
    const { onChange } = renderEditor({ value: "let x = 1;" });
    const editor = screen.getByRole("textbox") as HTMLTextAreaElement;
    (editor as HTMLTextAreaElement).setSelectionRange(0, 0);

    const tab = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    fireEvent(editor, tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(onChange).toHaveBeenCalledWith("  let x = 1;");

    fireEvent.keyDown(editor, { key: "Escape" });
    expect(screen.getByText("Tab moves focus now.")).toBeTruthy();
    const freeTab = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    fireEvent(editor, freeTab);
    expect(freeTab.defaultPrevented).toBe(false);
  });

  it("runs on Cmd/Ctrl+Enter", () => {
    const { onRun } = renderEditor();
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter", metaKey: true });
    expect(onRun).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter", ctrlKey: true });
    expect(onRun).toHaveBeenCalledTimes(2);
  });

  it("passes the bypassed Escape state to the caller's hint", () => {
    renderEditor();
    expect(screen.getByText("Tab inserts spaces.")).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
    expect(screen.getByText("Tab moves focus now.")).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
    expect(screen.getByText("Tab inserts spaces.")).toBeTruthy();
  });
});
