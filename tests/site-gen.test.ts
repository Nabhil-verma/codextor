// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { tracks, totalLessonCount } from "../src/data";

/*
 * #4: the crawlable surface is generated from the curriculum registry, so it
 * must agree with the data. If a track is added, renamed or loses a lesson and
 * the generator is not re-run, these fail — that is the point.
 */

const read = (rel: string) => readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const pngSize = (rel: string) => {
  const buf = readFileSync(new URL(`../${rel}`, import.meta.url));
  expect(buf.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
};

describe("generated curriculum constants", () => {
  it("match the curriculum registry", async () => {
    const mod = await import("../src/lib/curriculum.generated");
    expect(mod.TRACK_COUNT).toBe(tracks.length);
    expect(mod.TOTAL_LESSONS).toBe(totalLessonCount);
  });
});

describe("sitemap.xml", () => {
  const sitemap = read("public/sitemap.xml");

  it("lists the shell and the syllabus index", () => {
    expect(sitemap).toContain("<loc>https://codextorcybo4.freebuff.app/</loc>");
    expect(sitemap).toContain("<loc>https://codextorcybo4.freebuff.app/syllabus/</loc>");
  });

  it("lists every track", () => {
    for (const t of tracks) {
      expect(sitemap, `sitemap is missing ${t.id}`).toContain(`/syllabus/${t.id}/`);
    }
  });
});

describe("syllabus pages", () => {
  it("has an index page listing every track", () => {
    const page = read("public/syllabus/index.html");
    expect(page).toContain(`${tracks.length} tracks, ${totalLessonCount} lessons`);
    for (const t of tracks) expect(page).toContain(`/syllabus/${t.id}/`);
  });

  it("has one page per track with outcomes, outline, Course JSON-LD and a start link", () => {
    for (const t of tracks) {
      const rel = `public/syllabus/${t.id}/index.html`;
      expect(existsSync(new URL(`../${rel}`, import.meta.url)), `${rel} missing`).toBe(true);
      const page = read(rel);
      expect(page).toContain(esc(t.title));
      expect(page).toContain(esc(t.blurb));
      expect(page).toContain("Learning outcomes");
      expect(page).toContain("Outline");
      expect(page).toContain('href="/#/learn"');
      expect(page).toContain('"@type":"Course"');
      expect(page).toContain(`/syllabus/${t.id}/`);
      for (const lesson of t.lessons) {
        expect(page, `${t.id} page is missing ${lesson.id}`).toContain(esc(lesson.title));
      }
      expect(page).toContain(`<meta name="twitter:card" content="summary_large_image" />`);
    }
  });
});

describe("llms.txt", () => {
  const llms = read("public/llms.txt");

  it("states the real counts", () => {
    expect(llms).toContain(`${tracks.length} tracks and ${totalLessonCount} hands-on lessons`);
  });

  it("links every track's syllabus page", () => {
    for (const t of tracks) expect(llms).toContain(`/syllabus/${t.id}/`);
  });

  it("links the syllabus index", () => {
    expect(llms).toContain("/syllabus/)");
  });
});

describe("index.html social cards", () => {
  const html = read("index.html");

  it("uses a large image card", () => {
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
  });

  it("points at a 1200x630 image that exists", () => {
    expect(html).toContain('property="og:image" content="https://codextorcybo4.freebuff.app/og.png"');
    expect(html).toContain('property="og:image:width" content="1200"');
    expect(html).toContain('property="og:image:height" content="630"');
    expect(html).toContain('name="twitter:image"');
    expect(pngSize("public/og.png")).toEqual({ width: 1200, height: 630 });
  });

  it("declares an apple touch icon", () => {
    expect(html).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png" />');
    expect(pngSize("public/apple-touch-icon.png")).toEqual({ width: 180, height: 180 });
  });

  it("describes the site with the real counts", () => {
    expect(html).toContain(`${tracks.length} tracks, ${totalLessonCount} hands-on lessons`);
  });
});

describe("manifest.json", () => {
  const manifest = JSON.parse(read("public/manifest.json"));

  it("is named Codextor", () => {
    expect(manifest.name).toBe("Codextor");
    expect(manifest.short_name).toBe("Codextor");
  });

  it("ships 192, 512 and maskable PNG icons that exist", () => {
    const pngs = manifest.icons.filter((i: { type: string }) => i.type === "image/png");
    expect(pngs.map((i: { sizes: string }) => i.sizes)).toEqual(
      expect.arrayContaining(["192x192", "512x512"]),
    );
    expect(
      manifest.icons.some((i: { purpose?: string }) => i.purpose?.includes("maskable")),
    ).toBe(true);
    expect(pngSize("public/icon-192.png")).toEqual({ width: 192, height: 192 });
    expect(pngSize("public/icon-512.png")).toEqual({ width: 512, height: 512 });
    expect(pngSize("public/icon-maskable-512.png")).toEqual({ width: 512, height: 512 });
  });

  it("offers Playground and Continue shortcuts", () => {
    const urls = manifest.shortcuts.map((s: { url: string }) => s.url);
    expect(urls).toContain("/#/playground");
    expect(urls).toContain("/#/learn");
    expect(manifest.shortcuts.every((s: { icons: unknown[] }) => s.icons.length > 0)).toBe(true);
  });

  it("references screenshots that exist", () => {
    expect(manifest.screenshots.length).toBeGreaterThan(0);
    for (const shot of manifest.screenshots) {
      expect(pngSize(`public${shot.src}`)).toEqual({ width: 1280, height: 720 });
    }
  });
});
