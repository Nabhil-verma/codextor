/*
 * Generate the static, crawlable parts of the site at build time.
 *
 * Everything here is derived from `src/data` — the same registry the app
 * ships — so the counts in the copy, the syllabus pages, the sitemap and
 * llms.txt can never drift from the curriculum again. HashRouter means the
 * app itself has exactly one real URL, so the per-track pages are emitted as
 * flat static files under /syllabus/ that a crawler can fetch without JS.
 *
 * Idempotent: running it twice produces byte-identical output.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { deflateSync } from "node:zlib";
import { tmpdir } from "node:os";

const ROOT = process.cwd();
const ORIGIN = "https://codextorcybo4.freebuff.app";

/* ------------------------------------------------------------------ */
/* 1. Read the curriculum                                              */
/* ------------------------------------------------------------------ */

async function loadCurriculum() {
  let esbuild;
  try {
    esbuild = await import("esbuild");
  } catch {
    console.error(
      "gen-site: esbuild is unavailable. It ships with vite; run the install first.",
    );
    process.exit(1);
  }
  const outfile = join(tmpdir(), `codextor-data-${process.pid}.mjs`);
  await esbuild.build({
    entryPoints: [join(ROOT, "src/data/index.ts")],
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    logLevel: "silent",
  });
  const mod = await import(`file://${outfile}`);
  return { tracks: mod.tracks, total: mod.totalLessonCount };
}

/* ------------------------------------------------------------------ */
/* 2. A 5x7 bitmap font and a tiny PNG encoder (no dependencies)        */
/* ------------------------------------------------------------------ */

const FONT_SRC = `
A 01110 10001 10001 11111 10001 10001 10001
B 11110 10001 10001 11110 10001 10001 11110
C 01110 10001 10000 10000 10000 10001 01110
D 11110 10001 10001 10001 10001 10001 11110
E 11111 10000 10000 11110 10000 10000 11111
F 11111 10000 10000 11110 10000 10000 10000
G 01110 10001 10000 10111 10001 10001 01111
H 10001 10001 10001 11111 10001 10001 10001
I 11111 00100 00100 00100 00100 00100 11111
J 00111 00010 00010 00010 00010 10010 01100
K 10001 10010 10100 11000 10100 10010 10001
L 10000 10000 10000 10000 10000 10000 11111
M 10001 11011 10101 10101 10001 10001 10001
N 10001 11001 10101 10011 10001 10001 10001
O 01110 10001 10001 10001 10001 10001 01110
P 11110 10001 10001 11110 10000 10000 10000
Q 01110 10001 10001 10001 10101 10010 01101
R 11110 10001 10001 11110 10100 10010 10001
S 01111 10000 10000 01110 00001 00001 11110
T 11111 00100 00100 00100 00100 00100 00100
U 10001 10001 10001 10001 10001 10001 01110
V 10001 10001 10001 10001 10001 01010 00100
W 10001 10001 10001 10101 10101 11011 10001
X 10001 10001 01010 00100 01010 10001 10001
Y 10001 10001 01010 00100 00100 00100 00100
Z 11111 00001 00010 00100 01000 10000 11111
0 01110 10001 10011 10101 11001 10001 01110
1 00100 01100 00100 00100 00100 00100 01110
2 01110 10001 00001 00110 01000 10000 11111
3 01110 10001 00001 00110 00001 10001 01110
4 00010 00110 01010 10010 11111 00010 00010
5 11111 10000 11110 00001 00001 10001 01110
6 00110 01000 10000 11110 10001 10001 01110
7 11111 00001 00010 00100 01000 01000 01000
8 01110 10001 10001 01110 10001 10001 01110
9 01110 10001 10001 01111 00001 00010 01100
. 00000 00000 00000 00000 00000 01100 01100
- 00000 00000 00000 11111 00000 00000 00000
: 00000 01100 01100 00000 01100 01100 00000
/ 00001 00010 00010 00100 01000 01000 10000
`;

const FONT = {};
for (const line of FONT_SRC.trim().split("\n")) {
  const [ch, ...rows] = line.trim().split(/\s+/);
  FONT[ch] = rows;
}
const GLYPH_W = 5;
const GLYPH_H = 7;

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Encodes an RGBA canvas as a colour-type-6 PNG. */
function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy
      ? Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(
          raw,
          y * (width * 4 + 1) + 1,
        )
      : null;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function canvas(width, height, [r, g, b]) {
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  return { width, height, data };
}

function blend(cv, x, y, [r, g, b], alpha = 1) {
  if (x < 0 || y < 0 || x >= cv.width || y >= cv.height) return;
  const i = (y * cv.width + x) * 4;
  cv.data[i] = Math.round(cv.data[i] * (1 - alpha) + r * alpha);
  cv.data[i + 1] = Math.round(cv.data[i + 1] * (1 - alpha) + g * alpha);
  cv.data[i + 2] = Math.round(cv.data[i + 2] * (1 - alpha) + b * alpha);
}

function fillRect(cv, x0, y0, w, h, color, alpha = 1) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) blend(cv, x, y, color, alpha);
}

/** Vertical gradient over a rectangle. */
function fillGradient(cv, x0, y0, w, h, top, bottom) {
  for (let y = y0; y < y0 + h; y++) {
    const t = h <= 1 ? 0 : (y - y0) / (h - 1);
    const color = [
      Math.round(top[0] + (bottom[0] - top[0]) * t),
      Math.round(top[1] + (bottom[1] - top[1]) * t),
      Math.round(top[2] + (bottom[2] - top[2]) * t),
    ];
    for (let x = x0; x < x0 + w; x++) blend(cv, x, y, color, 1);
  }
}

/** Soft radial glow, used for the brand's cyan atmosphere. */
function glow(cv, cx, cy, radius, color, strength) {
  for (let y = Math.max(0, cy - radius); y < Math.min(cv.height, cy + radius); y++) {
    for (let x = Math.max(0, cx - radius); x < Math.min(cv.width, cx + radius); x++) {
      const d = Math.hypot(x - cx, y - cy) / radius;
      if (d >= 1) continue;
      blend(cv, x, y, color, strength * (1 - d) ** 2);
    }
  }
}

function roundRect(cv, x0, y0, w, h, radius, color, alpha = 1) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const dx = Math.max(x0 + radius - x, 0, x - (x0 + w - 1 - radius));
      const dy = Math.max(y0 + radius - y, 0, y - (y0 + h - 1 - radius));
      if (dx * dx + dy * dy <= radius * radius) blend(cv, x, y, color, alpha);
    }
  }
}

function textWidth(text, scale) {
  return (text.length * (GLYPH_W + 1) - 1) * scale;
}

function drawText(cv, text, x, y, scale, color) {
  let cx = x;
  for (const raw of text.toUpperCase()) {
    const glyph = FONT[raw];
    if (glyph) {
      for (let gy = 0; gy < GLYPH_H; gy++) {
        for (let gx = 0; gx < GLYPH_W; gx++) {
          if (glyph[gy][gx] === "1") {
            fillRect(cv, cx + gx * scale, y + gy * scale, scale, scale, color, 1);
          }
        }
      }
    }
    cx += (GLYPH_W + 1) * scale;
  }
}

/* ------------------------------------------------------------------ */
/* 3. Images                                                           */
/* ------------------------------------------------------------------ */

const INK = [5, 6, 12];
const INK_2 = [11, 21, 36];
const CYAN = [34, 211, 238];
const PAPER = [236, 240, 248];

function ogImage(trackCount, lessonCount) {
  const cv = canvas(1200, 630, INK);
  fillGradient(cv, 0, 0, 1200, 630, INK, INK_2);
  glow(cv, 980, 120, 620, CYAN, 0.22);
  glow(cv, 160, 600, 480, [99, 102, 241], 0.16);

  // A code-window motif, drawn rather than screenshotted.
  roundRect(cv, 80, 96, 1040, 438, 24, [8, 10, 18], 0.9);
  roundRect(cv, 80, 96, 1040, 44, 24, [16, 20, 32], 0.95);
  fillRect(cv, 104, 114, 12, 12, [239, 68, 68], 0.9);
  fillRect(cv, 124, 114, 12, 12, [234, 179, 8], 0.9);
  fillRect(cv, 144, 114, 12, 12, [34, 197, 94], 0.9);

  drawText(cv, "CODEXTOR", 152, 180, 16, PAPER);
  drawText(cv, "RUN REAL CODE, GET IT GRADED", 154, 320, 5, CYAN);
  const stats = `${lessonCount} LESSONS / ${trackCount} TRACKS / FREE`;
  drawText(cv, stats, 154, 392, 5, [148, 163, 184]);
  drawText(cv, "IN YOUR BROWSER - NOTHING TO INSTALL", 154, 452, 4, [100, 116, 139]);

  return encodePng(cv.width, cv.height, cv.data);
}

function icon(size, { maskable = false } = {}) {
  const cv = canvas(size, size, [3, 3, 5]);
  const inset = maskable ? Math.round(size * 0.14) : 0;
  const radius = Math.round(size * 0.22);
  fillGradient(cv, 0, 0, size, size, [7, 9, 18], [10, 20, 34]);
  roundRect(cv, inset, inset, size - inset * 2, size - inset * 2, radius, [6, 8, 16], 1);
  glow(cv, size * 0.72, size * 0.24, size * 0.7, CYAN, 0.3);
  const scale = Math.max(2, Math.round(size / (maskable ? 16 : 12)));
  const label = "C";
  const w = textWidth(label, scale);
  drawText(cv, label, Math.round((size - w) / 2), Math.round(size / 2 - (GLYPH_H * scale) / 2), scale, CYAN);
  // The slash that turns the C into a code mark.
  for (let i = 0; i < Math.round(size * 0.34); i++) {
    const x = Math.round(size * 0.5 + i * 0.35);
    const y = Math.round(size * 0.72 - i);
    fillRect(cv, x, y, Math.max(2, Math.round(scale / 3)), Math.max(2, Math.round(scale / 3)), [99, 102, 241], 0.95);
  }
  return encodePng(cv.width, cv.height, cv.data);
}

function screenshot(width, height, title, subtitle) {
  const cv = canvas(width, height, INK);
  fillGradient(cv, 0, 0, width, height, INK, INK_2);
  glow(cv, width * 0.8, height * 0.15, width * 0.6, CYAN, 0.2);
  const pad = Math.round(width * 0.06);
  roundRect(cv, pad, pad, width - pad * 2, height - pad * 2, 20, [9, 12, 20], 0.95);
  const scale = Math.max(2, Math.round(width / 120));
  drawText(cv, title, pad * 2, pad * 2, scale + 1, PAPER);
  drawText(cv, subtitle, pad * 2, pad * 2 + (GLYPH_H + 2) * (scale + 1), scale, CYAN);
  // Editor lines.
  for (let i = 0; i < 8; i++) {
    const y = pad * 2 + (GLYPH_H + 6) * (scale + 1) + i * (scale + 6);
    fillRect(cv, pad * 2, y, Math.round((width - pad * 4) * (0.3 + ((i * 37) % 50) / 100)), Math.max(2, Math.round(scale * 0.5)), [45, 55, 72], 0.8);
  }
  return encodePng(cv.width, cv.height, cv.data);
}

/* ------------------------------------------------------------------ */
/* 4. Static pages                                                     */
/* ------------------------------------------------------------------ */

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const PAGE_CSS = `
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; background: #030305; color: #e8eefc;
  font: 16px/1.65 "Inter", system-ui, -apple-system, "Segoe UI", sans-serif; }
a { color: #67e8f9; }
.wrap { max-width: 820px; margin: 0 auto; padding: 48px 24px 96px; }
.eyebrow { font: 500 12px/1 "JetBrains Mono", ui-monospace, monospace;
  letter-spacing: .22em; text-transform: uppercase; color: #22d3ee; }
h1 { font-family: Fraunces, Georgia, serif; font-size: clamp(2rem, 6vw, 3.25rem);
  line-height: 1.05; margin: 12px 0 8px; }
h2 { font-family: Fraunces, Georgia, serif; margin-top: 48px; font-size: 1.4rem; }
p.lede { color: #a8b3c7; font-size: 1.05rem; }
.cta { display: inline-block; margin: 24px 0 8px; padding: 12px 22px; border-radius: 999px;
  background: linear-gradient(120deg,#22d3ee,#6366f1); color: #04060c;
  font-weight: 600; text-decoration: none; }
ol, ul { padding-left: 22px; }
li { margin: 6px 0; }
.card { border: 1px solid rgba(255,255,255,.1); border-radius: 18px;
  background: rgba(255,255,255,.03); padding: 18px 22px; margin: 14px 0; }
.meta { color: #7c8798; font-size: .9rem; }
nav.tracks a { display: inline-block; margin: 4px 12px 4px 0; }
footer { margin-top: 64px; color: #7c8798; font-size: .88rem; }
`;

function page({ title, description, canonical, body, jsonLd }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${canonical}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="Codextor" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${canonical}" />
<meta property="og:image" content="${ORIGIN}/og.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${ORIGIN}/og.png" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Inter:wght@400;600&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet" />
<style>${PAGE_CSS}</style>
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ""}
</head>
<body>
<main class="wrap">
${body}
<footer>
<p>Codextor is a free, browser-based code school. <a href="/">Home</a> ·
<a href="/#/learn">Lessons</a> · <a href="/syllabus/">All tracks</a></p>
</footer>
</main>
</body>
</html>
`;
}

function trackPage(track, index) {
  const canonical = `${ORIGIN}/syllabus/${track.id}/`;
  const lessons = track.lessons;
  const outcomes = lessons
    .map((l) => `      <li>${esc(l.title)} <span class="meta">· ${l.minutes} min</span></li>`)
    .join("\n");
  const outline = lessons
    .map(
      (l, i) =>
        `      <li><strong>${i + 1}.</strong> ${esc(l.title)} <span class="meta">· ${l.minutes} min</span></li>`,
    )
    .join("\n");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: track.title,
    description: track.blurb,
    url: canonical,
    inLanguage: "en",
    isAccessibleForFree: true,
    provider: {
      "@type": "Organization",
      name: "Codextor",
      url: ORIGIN,
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: `PT${lessons.reduce((n, l) => n + l.minutes, 0)}M`,
    },
    syllabusSections: lessons.map((l, i) => ({
      "@type": "Syllabus",
      name: l.title,
      position: i + 1,
    })),
  };

  const body = `
<p class="eyebrow">Track ${esc(track.numeral || String(index + 1))}${track.optional ? " · optional" : ""}</p>
<h1>${esc(track.title)}</h1>
<p class="lede">${esc(track.blurb)}</p>
<p class="meta">${lessons.length} lessons · ${lessons.reduce((n, l) => n + l.minutes, 0)} minutes of guided work · every exercise runs in your browser</p>
<a class="cta" href="/#/learn">Start this track</a>
<h2>Learning outcomes</h2>
<p class="lede">Work through this track and you will be able to do each of these, in order:</p>
<ul>
${outcomes}
</ul>
<h2>Outline</h2>
<ol>
${outline}
</ol>
<p><a href="/#/learn">Open the interactive lessons</a> — the syllabus above is the reading order; the app adds the editor, console and graded exercises.</p>
`;
  return page({
    title: `${track.title} — free interactive lessons | Codextor`,
    description: `${track.blurb} ${lessons.length} hands-on lessons, free forever.`,
    canonical,
    body,
    jsonLd,
  });
}

function syllabusIndexPage(tracks, total) {
  const items = tracks
    .map(
      (t) => `    <div class="card">
      <h3><a href="/syllabus/${t.id}/">${esc(t.title)}</a></h3>
      <p>${esc(t.blurb)}</p>
      <p class="meta">${t.lessons.length} lessons${t.optional ? " · optional track" : ""}</p>
    </div>`,
    )
    .join("\n");

  return page({
    title: "Syllabus — every track and lesson | Codextor",
    description: `The complete Codextor syllabus: ${tracks.length} tracks and ${total} interactive lessons, free forever.`,
    canonical: `${ORIGIN}/syllabus/`,
    body: `
<p class="eyebrow">Syllabus</p>
<h1>Everything Codextor teaches</h1>
<p class="lede">${tracks.length} tracks, ${total} lessons. Each track page lists its learning outcomes and full outline, and the lessons themselves run in your browser.</p>
<a class="cta" href="/#/learn">Start learning</a>
${items}
`,
  });
}

/* ------------------------------------------------------------------ */
/* 5. Counts in the shipped copy                                       */
/* ------------------------------------------------------------------ */

const WORD_NUMBERS = {
  1: "One", 2: "Two", 3: "Three", 4: "Four", 5: "Five", 6: "Six", 7: "Seven",
  8: "Eight", 9: "Nine", 10: "Ten", 11: "Eleven", 12: "Twelve", 13: "Thirteen",
  14: "Fourteen", 15: "Fifteen", 16: "Sixteen", 17: "Seventeen", 18: "Eighteen",
  19: "Nineteen", 20: "Twenty",
};

function replaceBetween(text, name, value, file) {
  const re = new RegExp(`(<!--\\s*counts:${name}\\s*-->)[\\s\\S]*?(<!--\\s*/counts:${name}\\s*-->)`, "g");
  const matches = text.match(re);
  if (!matches) {
    console.error(`gen-site: ${file} is missing the counts:${name} markers.`);
    process.exit(1);
  }
  return text.replace(re, (_m, open, close) => `${open}${value}${close}`);
}

/** Rewrites a `<meta>` tag's content attribute in place. */
function setMetaContent(html, key, attr, value, file) {
  const re = new RegExp(`(<meta[^>]*?${attr}="${key}"[^>]*?content=")[^"]*(")`);
  if (!re.test(html)) {
    console.error(`gen-site: ${file} has no <meta ${attr}="${key}"> tag.`);
    process.exit(1);
  }
  return html.replace(re, `$1${value}$2`);
}

function injectCopy({ tracks, total }) {
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const hero = `${plural(tracks.length, "track", "tracks")} · ${plural(total, "hands-on lesson", "hands-on lessons")}`;
  const pair = `${tracks.length} curriculum tracks, ${total} lessons`;
  const words = `${WORD_NUMBERS[tracks.length] ?? tracks.length} tracks, ${total} hands-on lessons`;
  const tail = `${plural(tracks.length, "track", "tracks")}, ${plural(total, "lesson", "lessons")} of content`;

  const index = join(ROOT, "index.html");
  const readme = join(ROOT, "README.md");
  const description = `Write and run real code from minute one: ${tracks.length} tracks, ${total} hands-on lessons, a live playground and quizzes. Free forever. Every exercise runs in your browser.`;
  let html = replaceBetween(readFile(index), "hero", hero, "index.html");
  html = setMetaContent(html, "og:description", "property", description, "index.html");
  html = setMetaContent(html, "twitter:description", "name", description, "index.html");
  writeFile(index, html);

  let md = replaceBetween(readFile(readme), "words", words, "README.md");
  md = replaceBetween(md, "pair", pair, "README.md");
  md = replaceBetween(md, "tail", tail, "README.md");
  writeFile(readme, md);

  return { hero, pair, words, tail };
}

/* ------------------------------------------------------------------ */
/* 6. Sitemap and llms.txt                                             */
/* ------------------------------------------------------------------ */

function writeSitemap(tracks) {
  const urls = [
    { loc: `${ORIGIN}/`, priority: "1.0", changefreq: "weekly" },
    { loc: `${ORIGIN}/syllabus/`, priority: "0.9", changefreq: "weekly" },
    ...tracks.map((t) => ({
      loc: `${ORIGIN}/syllabus/${t.id}/`,
      priority: "0.8",
      changefreq: "monthly",
    })),
  ];
  const body = urls
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
    )
    .join("\n");
  writeFile(
    join(ROOT, "public/sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`,
  );
}

function writeLlms(tracks, total) {
  const trackLinks = tracks
    .map((t) => `- [${t.title}](${ORIGIN}/syllabus/${t.id}/): ${t.lessons.length} lessons. ${t.blurb}`)
    .join("\n");
  const text = `# Codextor

> Codextor is a free, browser-based coding school. It teaches programming through
> interactive lessons that pair reading with a live editor, a console, and
> self-checking exercises — no videos, no paywall, and no build setup. Everything
> runs client-side in the learner's browser.

Codextor covers ${tracks.length} tracks and ${total} hands-on lessons spanning web
fundamentals, TypeScript, React, back-end and APIs, Python, data structures and
algorithms, Git, testing, DevOps, security, architecture, performance, and AI
agents. Progress, streaks, and badges sync to a free account, and learners can
compare scores on weekly leaderboards or form guilds.

## Curriculum

- [Interactive lessons](${ORIGIN}/#/learn): ${tracks.length} tracks of guided, runnable lessons across the full modern web stack.
- [Syllabus](${ORIGIN}/syllabus/): every track with its learning outcomes and full outline, readable without JavaScript.
- [Live playground](${ORIGIN}/#/playground): a scratch editor for writing and running code outside the lessons.

## Tracks

${trackLinks}

## Practice and projects

- [Projects](${ORIGIN}/#/projects): larger builds that combine lessons into shippable deliverables.
- [Portfolio](${ORIGIN}/#/portfolio): a learner's completed work and certificates in one place.

## Community

- [Leaderboards](${ORIGIN}/#/leaderboard): weekly, monthly, and all-time rankings by experience points.
- [Guilds](${ORIGIN}/#/clans): small teams that pool experience and unlock collective rewards.

## Get started

- [Home](${ORIGIN}/): an overview of the school and a way into the lessons.
- [Create a free account](${ORIGIN}/#/auth): save progress and sync it across devices.
`;
  writeFile(join(ROOT, "public/llms.txt"), text);
}

/* ------------------------------------------------------------------ */
/* 7. Small file helpers                                               */
/* ------------------------------------------------------------------ */

import { readFileSync } from "node:fs";

function readFile(path) {
  return readFileSync(path, "utf8");
}

function writeFile(path, contents) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

/* ------------------------------------------------------------------ */
/* 8. Manifest                                                         */
/* ------------------------------------------------------------------ */

function writeManifest() {
  const manifest = {
    name: "Codextor",
    short_name: "Codextor",
    description:
      "100% free, interactive coding lessons with a built-in editor and quizzes",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#030305",
    theme_color: "#030305",
    icons: [
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Playground",
        short_name: "Playground",
        description: "Scratch editor — write and run code without a lesson",
        url: "/#/playground",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Continue learning",
        short_name: "Continue",
        description: "Jump back into the track you were working through",
        url: "/#/learn",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
    screenshots: [
      { src: "/screenshot-wide.png", sizes: "1280x720", type: "image/png" },
      { src: "/screenshot-wide-2.png", sizes: "1280x720", type: "image/png" },
    ],
  };
  writeFile(join(ROOT, "public/manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
}

/* ------------------------------------------------------------------ */
/* run                                                                 */
/* ------------------------------------------------------------------ */

const { tracks, total } = await loadCurriculum();

writeFile(join(ROOT, "public/og.png"), ogImage(tracks.length, total));
writeFile(join(ROOT, "public/icon-192.png"), icon(192));
writeFile(join(ROOT, "public/icon-512.png"), icon(512));
writeFile(join(ROOT, "public/icon-maskable-512.png"), icon(512, { maskable: true }));
writeFile(join(ROOT, "public/apple-touch-icon.png"), icon(180));
writeFile(
  join(ROOT, "public/screenshot-wide.png"),
  screenshot(1280, 720, "CODEXTOR", "RUN CODE IN YOUR BROWSER"),
);
writeFile(
  join(ROOT, "public/screenshot-wide-2.png"),
  screenshot(1280, 720, "PROGRESS AND GUILDS", "XP, STREAKS, CERTIFICATES"),
);

writeFile(join(ROOT, "public/syllabus/index.html"), syllabusIndexPage(tracks, total));
for (const [i, track] of tracks.entries()) {
  writeFile(join(ROOT, `public/syllabus/${track.id}/index.html`), trackPage(track, i));
}

// The lightweight registry the app reads synchronously. It carries ids,
// titles, minutes and languages — everything the catalog, nav, milestones and
// gamification need — and none of the lesson bodies, which a route loads one
// track at a time. `tests/manifest-split.test.ts` fails if anything on the
// entry path starts importing the full registry again.
const manifestTracks = tracks
  .map((t) => {
    const lessons = t.lessons
      .map((l) => {
        // Exactly the labels the catalog renders today, computed once here.
        const interaction = l.starter
          ? "interactive"
          : l.gitSim
            ? "terminal"
            : l.sandbox
              ? "visual"
              : "reading";
        const lang = l.lang === "ts" || l.lang === "python" ? `, lang: ${JSON.stringify(l.lang)}` : "";
        const code = l.debug?.diagnosis?.answer;
        const debugCode = code ? `, debugCode: ${JSON.stringify(code)}` : "";
        return `    { id: ${JSON.stringify(l.id)}, title: ${JSON.stringify(l.title)}, minutes: ${l.minutes}, interaction: ${JSON.stringify(interaction)}, quizCount: ${l.quiz.length}, hasPredict: ${Boolean(l.predict?.length)}, hasDebug: ${Boolean(l.debug)}${debugCode}${lang} },`;
      })
      .join("\n");
    const optional = t.optional ? `\n    optional: true,` : "";
    const optionalWhy = t.optionalWhy ? `\n    optionalWhy: ${JSON.stringify(t.optionalWhy)},` : "";
    return `  {
    id: ${JSON.stringify(t.id)},
    title: ${JSON.stringify(t.title)},
    blurb: ${JSON.stringify(t.blurb)},
    numeral: ${JSON.stringify(t.numeral)},${optional}${optionalWhy}
    lessons: [
${lessons}
    ],
  },`;
  })
  .join("\n");

writeFile(
  join(ROOT, "src/data/manifest.ts"),
  `/*
 * GENERATED by scripts/gen-site.mjs — do not edit by hand.
 * See tests/manifest-split.test.ts: the entry path must stay on this file.
 */
export type ManifestLesson = {
  id: string;
  title: string;
  minutes: number;
  /** How the lesson is worked — the catalog's own vocabulary. */
  interaction: "interactive" | "terminal" | "visual" | "reading";
  /** Questions in the lesson quiz (0 for a reading-only lesson). */
  quizCount: number;
  /** Predict-the-output challenges, and the break-and-fix lab. */
  hasPredict: boolean;
  hasDebug: boolean;
  /** Taxonomy code the debug lab's declared diagnosis points at, when it has one. */
  debugCode?: string;
  lang?: "ts" | "python";
};

export type ManifestTrack = {
  id: string;
  title: string;
  blurb: string;
  numeral: string;
  optional?: boolean;
  optionalWhy?: string;
  lessons: ManifestLesson[];
};

export const MANIFEST_TRACKS: ManifestTrack[] = [
${manifestTracks}
];

export const TRACK_COUNT = ${tracks.length};
export const TOTAL_LESSONS = ${total};

/** Stable progress-map key for one lesson. */
export function lessonKey(trackId: string, lessonId: string): string {
  return trackId + "/" + lessonId;
}

export function findTrackMeta(trackId: string): ManifestTrack | undefined {
  return MANIFEST_TRACKS.find((t) => t.id === trackId);
}

export function findLessonMeta(trackId: string, lessonId: string): ManifestLesson | undefined {
  return findTrackMeta(trackId)?.lessons.find((l) => l.id === lessonId);
}
`,
);

// The Convex backend cannot bundle `src/data` (it would drag the whole
// curriculum into every deploy), so the only numbers it needs are generated
// into a tiny module next to the functions.
writeFile(
  join(ROOT, "src/convex/curriculum.ts"),
  `/*
 * GENERATED by scripts/gen-site.mjs — do not edit by hand.
 * Convex functions can't bundle the curriculum registry, so the size it needs
 * for validation lives here. tests/site-gen.test.ts fails if it drifts.
 */
export const TRACK_COUNT = ${tracks.length};
export const TOTAL_LESSONS = ${total};
`,
);

writeSitemap(tracks);
writeLlms(tracks, total);
writeManifest();
const counts = injectCopy({ tracks, total });

console.log(
  `gen-site: ${tracks.length} tracks, ${total} lessons — syllabus pages, sitemap, llms.txt, manifest and images written (${counts.hero}).`,
);
