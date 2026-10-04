/*
 * Minimal PNG reader used to sanity-check the preview screenshots.
 *
 * The headless preview webview would not composite in this environment, so the
 * screenshots are taken with headless Chrome and verified here instead: a blank
 * or error page compresses to a tiny, near-uniform PNG, while a real render has
 * ink coverage and a spread of colours. Uses only node:zlib, no dependencies.
 */

import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

function readPng(path) {
  const buf = readFileSync(path);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error(`${path} is not a PNG`);

  let offset = 8;
  let width = 0;
  let height = 0;
  let depth = 0;
  let colourType = 0;
  const idat = [];

  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    const body = buf.subarray(offset + 8, offset + 8 + length);

    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      depth = body[8];
      colourType = body[9];
    } else if (type === "IDAT") {
      idat.push(body);
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }

  if (depth !== 8) throw new Error(`${path}: only 8-bit PNGs supported (got ${depth})`);
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colourType];
  if (!channels) throw new Error(`${path}: unsupported colour type ${colourType}`);

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);

  // Undo the per-scanline filters (PNG spec 9.2).
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const out = pixels.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[x - channels] : 0;
      const b = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const c = x >= channels && y > 0 ? pixels[(y - 1) * stride + x - channels] : 0;
      let value = line[x];
      if (filter === 1) value += a;
      else if (filter === 2) value += b;
      else if (filter === 3) value += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[x] = value & 0xff;
    }
  }

  return { width, height, channels, pixels };
}

/** Buckets colours coarsely and reports coverage, plus how dark the page reads. */
function analyse(path) {
  const { width, height, channels, pixels } = readPng(path);
  const buckets = new Map();
  let sampled = 0;
  let lit = 0;
  let dark = 0;

  for (let y = 0; y < height; y += 3) {
    for (let x = 0; x < width; x += 3) {
      const i = (y * width + x) * channels;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      sampled++;
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (luma > 70) lit++;
      else dark++;

      // 4-bit-per-channel buckets: enough to separate cyan/violet accents.
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }

  const top = [...buckets.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, count]) => {
      const r = ((key >> 8) & 0xf) * 17;
      const g = ((key >> 4) & 0xf) * 17;
      const b = (key & 0xf) * 17;
      return `rgb(${r},${g},${b}) ${((count / sampled) * 100).toFixed(1)}%`;
    });

  return {
    file: path.split(/[\\/]/).pop(),
    size: `${width}x${height}`,
    distinctColours: buckets.size,
    darkShare: `${((dark / sampled) * 100).toFixed(1)}%`,
    litShare: `${((lit / sampled) * 100).toFixed(1)}%`,
    topColours: top,
  };
}

let failed = 0;
for (const path of process.argv.slice(2)) {
  try {
    const report = analyse(path);
    // A blank render: one dominant colour and almost no lit pixels.
    const blank = report.distinctColours < 12 || report.litShare === "0.0%";
    console.log(
      `${blank ? "BLANK" : "RENDERED"}  ${report.file.padEnd(18)} ${report.size.padEnd(10)} ` +
        `colours=${String(report.distinctColours).padEnd(5)} dark=${report.darkShare.padEnd(7)} lit=${report.litShare.padEnd(7)}`,
    );
    console.log(`          top colours: ${report.topColours.join("  |  ")}`);
    if (blank) failed++;
  } catch (error) {
    console.log(`ERROR     ${path}: ${error.message}`);
    failed++;
  }
}
process.exit(failed ? 1 : 0);
