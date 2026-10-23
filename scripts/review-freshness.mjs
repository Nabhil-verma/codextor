/*
 * Warn in CI about tool-dependent lessons whose review is overdue.
 * Emits GitHub ::warning annotations and always exits 0: staleness is a
 * prompt to re-verify, not a broken build.
 *
 * Usage: node scripts/review-freshness.mjs [--now=YYYY-MM-DD]
 * --now pins the clock for deterministic tests.
 */
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { build } from "esbuild";

const nowArg = process.argv.find(a => a.startsWith("--now="))?.slice(6);
const now = nowArg ? new Date(`${nowArg}T00:00:00Z`) : new Date();
if (Number.isNaN(now.getTime())) {
  console.error("review-freshness: --now must be YYYY-MM-DD");
  process.exit(1);
}

const outdir = mkdtempSync(join(tmpdir(), "codextor-review-"));
await build({
  entryPoints: { data: "src/data/index.ts", review: "src/lib/curriculumReview.ts" },
  outdir,
  bundle: true,
  format: "esm",
  platform: "node",
  logLevel: "silent",
});
const { tracks } = await import(`file://${join(outdir, "data.js")}`);
const { staleReviews, reviewWarningLine } = await import(`file://${join(outdir, "review.js")}`);

const stale = staleReviews(tracks, now);
for (const s of stale) console.log(reviewWarningLine(s));
const total = tracks.reduce((n, t) => n + t.lessons.length, 0);
console.log(`review-freshness: ${stale.length} of ${total} lessons need re-verification as of ${now.toISOString().slice(0, 10)}`);
