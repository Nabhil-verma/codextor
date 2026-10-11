import { describe, expect, it } from "vitest";
import {
  langLabel,
  normalizeLang,
  tokenize,
  toLines,
  type Token,
} from "../src/lib/highlight";

/* #3: a tiny tokenizer with no dependency; colours are mapped in CSS. */

const ofType = (tokens: Token[], type: Token["type"]) =>
  tokens.filter((t) => t.type === type).map((t) => t.text);

describe("normalizeLang", () => {
  it("maps the languages lessons use", () => {
    expect(normalizeLang("js")).toBe("js");
    expect(normalizeLang("javascript")).toBe("js");
    expect(normalizeLang("TS")).toBe("ts");
    expect(normalizeLang("typescript")).toBe("ts");
    expect(normalizeLang("python")).toBe("py");
    expect(normalizeLang("sh")).toBe("bash");
    expect(normalizeLang("json")).toBe("json");
  });

  it("falls back to plain text for unknown or missing languages", () => {
    expect(normalizeLang("brainfuck")).toBe("text");
    expect(normalizeLang("")).toBe("text");
    expect(normalizeLang(undefined)).toBe("text");
  });

  it("labels languages for the header", () => {
    expect(langLabel("py")).toBe("Python");
    expect(langLabel("ts")).toBe("TypeScript");
    expect(langLabel(undefined)).toBe("Text");
  });
});

describe("tokenize", () => {
  it("marks JavaScript keywords, strings, numbers, comments and calls", () => {
    const code = 'const x = 1;\nfunction f(a) { return "hi" + a; } // note';
    const tokens = tokenize(code, "js");
    expect(ofType(tokens, "keyword")).toContain("const");
    expect(ofType(tokens, "keyword")).toContain("function");
    expect(ofType(tokens, "keyword")).toContain("return");
    expect(ofType(tokens, "number")).toContain("1");
    expect(ofType(tokens, "string")).toContain('"hi"');
    expect(ofType(tokens, "comment")).toEqual(["// note"]);
    expect(ofType(tokens, "function")).toContain("f");
  });

  it("handles TypeScript with the same grammar", () => {
    const tokens = tokenize("interface A { x: string }", "ts");
    expect(ofType(tokens, "keyword")).toContain("interface");
    expect(ofType(tokens, "keyword")).toContain("string");
  });

  it("handles Python comments, strings and keywords", () => {
    const tokens = tokenize('def f():\n    return "a"  # done', "python");
    expect(ofType(tokens, "keyword")).toContain("def");
    expect(ofType(tokens, "keyword")).toContain("return");
    expect(ofType(tokens, "string")).toContain('"a"');
    expect(ofType(tokens, "comment")).toEqual(["# done"]);
  });

  it("handles HTML tags and attributes", () => {
    const tokens = tokenize('<a href="/x">go</a>', "html");
    expect(ofType(tokens, "tag")).toContain("<a");
    expect(ofType(tokens, "property")).toContain("href");
    expect(ofType(tokens, "string")).toContain('"/x"');
  });

  it("handles CSS selectors, properties and values", () => {
    const tokens = tokenize(".a { color: red; width: 10px }", "css");
    expect(ofType(tokens, "property")).toContain("color");
    expect(ofType(tokens, "property")).toContain("width");
    expect(ofType(tokens, "number")).toContain("10px");
    expect(ofType(tokens, "tag")).toContain(".a");
  });

  it("handles shell commands and variables", () => {
    const tokens = tokenize("echo $HOME # say it", "bash");
    expect(ofType(tokens, "keyword")).toContain("echo");
    expect(ofType(tokens, "property")).toContain("$HOME");
    expect(ofType(tokens, "comment")).toEqual(["# say it"]);
  });

  it("handles JSON keys", () => {
    const tokens = tokenize('{ "a": true }', "json");
    expect(ofType(tokens, "property")).toContain('"a"');
  });

  it("leaves plain text alone", () => {
    const tokens = tokenize("just words", "text");
    expect(tokens).toEqual([{ text: "just words", type: "plain" }]);
  });

  it("never drops or invents characters, in any language", () => {
    const samples: Record<string, string> = {
      js: 'const a = `t ${b}`; /* c */ async () => 0.5e3;',
      ts: "type T = { a?: number }; // x",
      py: 'x = f"{y}"\nif x is None: pass',
      html: '<div class="a" data-x=\'1\'>&amp;</div>',
      css: "@media (min-width: 30rem) { .a::after { content: 'x'; } }",
      bash: "if [ -f $PWD/x ]; then echo ok; fi",
      json: '{"a": [1, 2.5, null]}',
      text: "no rules here",
    };
    for (const [lang, code] of Object.entries(samples)) {
      const tokens = tokenize(code, lang);
      expect(tokens.map((t) => t.text).join("")).toBe(code);
    }
  });

  it("returns nothing for empty input", () => {
    expect(tokenize("", "js")).toEqual([]);
  });
});

describe("toLines", () => {
  it("keeps one entry per source line", () => {
    const code = "a\n\nb";
    const lines = toLines(tokenize(code, "js"));
    expect(lines).toHaveLength(3);
    expect(lines.map((l) => l.map((t) => t.text).join(""))).toEqual(["a", "", "b"]);
  });
});
