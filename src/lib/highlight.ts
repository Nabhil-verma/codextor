/**
 * A tiny hand-written syntax tokenizer — no highlighting dependency.
 *
 * It is deliberately shallow: enough colour to make code scannable, small
 * enough to stay in the entry budget. Tokens are rendered by CodeBlock, which
 * maps each type to a CSS variable so every theme and style keeps working.
 */

export type Lang =
  | "js"
  | "ts"
  | "py"
  | "html"
  | "css"
  | "bash"
  | "json"
  | "text";

export type TokenType =
  | "plain"
  | "keyword"
  | "string"
  | "number"
  | "comment"
  | "function"
  | "property"
  | "tag"
  | "operator";

export type Token = { text: string; type: TokenType };

const ALIASES: Record<string, Lang> = {
  js: "js",
  javascript: "js",
  jsx: "js",
  mjs: "js",
  cjs: "js",
  ts: "ts",
  typescript: "ts",
  tsx: "ts",
  py: "py",
  python: "py",
  html: "html",
  xml: "html",
  svg: "html",
  css: "css",
  scss: "css",
  bash: "bash",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  console: "bash",
  json: "json",
  text: "text",
  txt: "text",
};

export function normalizeLang(raw?: string): Lang {
  const key = (raw ?? "").trim().toLowerCase();
  return ALIASES[key] ?? "text";
}

const LABELS: Record<Lang, string> = {
  js: "JavaScript",
  ts: "TypeScript",
  py: "Python",
  html: "HTML",
  css: "CSS",
  bash: "Shell",
  json: "JSON",
  text: "Text",
};

export function langLabel(raw?: string): string {
  return LABELS[normalizeLang(raw)];
}

type Rule = { type: TokenType; source: string };

const JS_KEYWORDS =
  "const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|super|this|typeof|instanceof|in|of|try|catch|finally|throw|async|await|yield|import|from|export|default|delete|void|static|get|set|interface|type|enum|implements|private|public|protected|readonly|declare|namespace|keyof|as|satisfies|never|unknown|any|string|number|boolean|object|symbol|bigint";
const PY_KEYWORDS =
  "def|return|if|elif|else|for|while|in|not|and|or|is|import|from|as|class|try|except|finally|raise|with|lambda|yield|global|nonlocal|pass|break|continue|assert|del|async|await|match|case";
const BASH_KEYWORDS =
  "if|then|else|elif|fi|for|while|do|done|case|esac|function|return|export|local|readonly|source|echo|printf|cd|set|unset|read|exit|trap|shift|eval|test";
const CONSTANTS = "true|false|null|undefined|NaN|Infinity|None|True|False";

const STRING_JS =
  '"(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\'|`(?:\\\\.|[^`\\\\])*`';
const NUMBER = "\\b0[xX][0-9a-fA-F]+\\b|\\b\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b";
const OPERATOR = "[{}()\\[\\];,.:?=+\\-*/%<>!&|^~@]+";

const RULES: Record<Lang, Rule[]> = {
  js: [
    { type: "comment", source: "\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/" },
    { type: "string", source: STRING_JS },
    { type: "number", source: `\\b(?:${CONSTANTS})\\b|${NUMBER}` },
    { type: "keyword", source: `\\b(?:${JS_KEYWORDS})\\b` },
    { type: "function", source: "[A-Za-z_$][\\w$]*(?=\\s*\\()" },
    { type: "property", source: "\\.[A-Za-z_$][\\w$]*" },
    { type: "operator", source: OPERATOR },
  ],
  ts: [],
  py: [
    { type: "comment", source: "#[^\\n]*" },
    {
      type: "string",
      source:
        '"""[\\s\\S]*?"""|\'\'\'[\\s\\S]*?\'\'\'|[rbfRBF]?"(?:\\\\.|[^"\\\\\\n])*"|[rbfRBF]?\'(?:\\\\.|[^\'\\\\\\n])*\'',
    },
    { type: "number", source: `\\b(?:${CONSTANTS})\\b|${NUMBER}` },
    { type: "keyword", source: `\\b(?:${PY_KEYWORDS})\\b` },
    { type: "function", source: "[A-Za-z_][\\w]*(?=\\s*\\()" },
    { type: "property", source: "\\.[A-Za-z_][\\w]*" },
    { type: "operator", source: OPERATOR },
  ],
  html: [
    { type: "comment", source: "<!--[\\s\\S]*?-->" },
    { type: "tag", source: "<\\/?[A-Za-z][\\w:-]*|\\/>|>" },
    { type: "property", source: "[A-Za-z-]+(?==)" },
    { type: "string", source: '"[^"\\n]*"|\'[^\'\\n]*\'' },
    { type: "operator", source: "=" },
  ],
  css: [
    { type: "comment", source: "\\/\\*[\\s\\S]*?\\*\\/" },
    { type: "string", source: '"[^"\\n]*"|\'[^\'\\n]*\'' },
    { type: "property", source: "[a-zA-Z-]+(?=\\s*:)" },
    { type: "function", source: "[a-zA-Z-]+(?=\\()" },
    {
      type: "number",
      source:
        "#[0-9a-fA-F]{3,8}\\b|\\b\\d+(?:\\.\\d+)?(?:px|rem|em|%|vh|vw|s|ms|fr|deg|ch)?\\b",
    },
    { type: "tag", source: "@[\\w-]+|[.#][\\w-]+|::?[\\w-]+" },
    { type: "operator", source: "[{}();:,]|!important" },
  ],
  bash: [
    { type: "comment", source: "#[^\\n]*" },
    { type: "string", source: '"(?:\\\\.|[^"\\\\])*"|\'[^\']*\'' },
    { type: "keyword", source: `\\b(?:${BASH_KEYWORDS})\\b` },
    {
      type: "property",
      source: "\\$\\{[A-Za-z_][\\w]*\\}|\\$[A-Za-z_][\\w]*|\\$[0-9@#?*!]",
    },
    { type: "operator", source: "[|&;()\\[\\]{}<>=]+|--?[A-Za-z][\\w-]*" },
    { type: "number", source: "\\b\\d+\\b" },
  ],
  json: [
    { type: "property", source: '"(?:\\\\.|[^"\\\\\\n])*"(?=\\s*:)' },
    { type: "string", source: '"(?:\\\\.|[^"\\\\\\n])*"' },
    {
      type: "number",
      source: `\\b(?:${CONSTANTS})\\b|-?${NUMBER}`,
    },
    { type: "operator", source: "[{}\\[\\],:]" },
  ],
  text: [],
};

// TypeScript gets the JavaScript grammar — close enough for a lesson.
RULES.ts = RULES.js;

function compile(lang: Lang): RegExp | null {
  const rules = RULES[lang];
  if (!rules.length) return null;
  return new RegExp(rules.map((r) => `(${r.source})`).join("|"), "y");
}

const COMPILED = new Map<Lang, RegExp | null>();

function patternFor(lang: Lang): RegExp | null {
  if (!COMPILED.has(lang)) COMPILED.set(lang, compile(lang));
  return COMPILED.get(lang) ?? null;
}

export function tokenize(code: string, lang?: string): Token[] {
  const normalized = normalizeLang(lang);
  const rules = RULES[normalized];
  const re = patternFor(normalized);
  if (!re) return code ? [{ text: code, type: "plain" }] : [];

  const tokens: Token[] = [];
  const push = (text: string, type: TokenType) => {
    if (!text) return;
    const last = tokens[tokens.length - 1];
    if (last && last.type === type) last.text += text;
    else tokens.push({ text, type });
  };

  let i = 0;
  re.lastIndex = 0;
  while (i < code.length) {
    re.lastIndex = i;
    const m = re.exec(code);
    if (!m || m[0].length === 0) {
      push(code[i], "plain");
      i += 1;
      continue;
    }
    // The first defined capture group identifies which rule matched.
    let group = 0;
    for (let g = 1; g < m.length; g++) {
      if (m[g] !== undefined) {
        group = g;
        break;
      }
    }
    push(m[0], rules[group - 1]?.type ?? "plain");
    i += m[0].length;
  }
  return tokens;
}

/** Splits tokens on newlines so each line can be rendered and highlighted. */
export function toLines(tokens: Token[]): Token[][] {
  const lines: Token[][] = [[]];
  for (const t of tokens) {
    const parts = t.text.split("\n");
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) lines.push([]);
      const piece = parts[i];
      if (piece) lines[lines.length - 1].push({ text: piece, type: t.type });
    }
  }
  return lines;
}
