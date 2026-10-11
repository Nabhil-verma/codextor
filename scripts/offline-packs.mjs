/*
 * Build-time index of the offline track packs.
 *
 * The app's lessons are lazy chunks (one `src/data/track-*.ts` per track), so
 * "what does a track need to run offline" is a question about the Rollup
 * chunk graph, not about the source. This module answers it from the bundle
 * and writes `offline-packs.json` next to index.html. The runtime half lives in
 * src/lib/offlinePacks.ts; the service worker serves whatever it stores.
 *
 * Deliberately excluded: /pyodide/ (≈13 MB, never cached by public/sw.js), so
 * Python lessons still need a network connection.
 */
import { createHash } from "node:crypto";

export const PACK_INDEX_FILE = "offline-packs.json";

const TRACK_FACADE = /(?:^|[\\/])src[\\/]data[\\/]track-([a-z0-9-]+)\.ts$/;
const CORE_FACADE = /(?:^|[\\/])src[\\/](?:main\.tsx|pages[\\/](?:Learn|Lesson)\.tsx)$/;
const TS_RUNTIME_FACADE = /(?:^|[\\/])src[\\/]lib[\\/]tsRunner\.ts$/;

/**
 * Builds the pack index from a Rollup bundle object (`generateBundle`'s
 * second argument). Only JS chunks and CSS files are included; each URL is
 * absolute from the site root, matching how the browser requests them.
 */
export function buildPackIndex(bundle) {
  const chunks = Object.values(bundle).filter((item) => item.type === "chunk");
  const byFile = new Map(chunks.map((chunk) => [chunk.fileName, chunk]));

  // Transitive static imports: everything the chunk needs before it can run.
  const closure = (fileName) => {
    const seen = new Set();
    const stack = [fileName];
    while (stack.length > 0) {
      const file = stack.pop();
      if (seen.has(file)) continue;
      seen.add(file);
      const chunk = byFile.get(file);
      if (chunk) stack.push(...chunk.imports);
    }
    return [...seen];
  };

  const facadeChunks = (pattern) =>
    chunks.filter((chunk) => chunk.facadeModuleId && pattern.test(chunk.facadeModuleId));

  const cssFiles = Object.keys(bundle).filter((file) => file.endsWith(".css"));
  const entryFiles = chunks.filter((chunk) => chunk.isEntry).flatMap((c) => closure(c.fileName));
  const coreFiles = facadeChunks(CORE_FACADE).flatMap((chunk) => closure(chunk.fileName));
  const core = unique([...entryFiles, ...coreFiles, ...cssFiles]);

  const tracks = {};
  for (const chunk of chunks) {
    const match = chunk.facadeModuleId && TRACK_FACADE.exec(chunk.facadeModuleId);
    if (match) tracks[match[1]] = closure(chunk.fileName);
  }

  const ts = facadeChunks(TS_RUNTIME_FACADE).flatMap((chunk) => closure(chunk.fileName));

  const toUrls = (files) => unique(files).map((file) => `/${file}`).sort();
  const index = {
    version: "",
    core: toUrls(core),
    tracks: Object.fromEntries(
      Object.entries(tracks)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([id, files]) => [id, toUrls(files)]),
    ),
    runtimes: { ts: toUrls(ts) },
  };
  // Content-addressed: the version changes whenever any pack file changes.
  index.version = createHash("sha256")
    .update(JSON.stringify({ core: index.core, tracks: index.tracks, runtimes: index.runtimes }))
    .digest("hex")
    .slice(0, 12);
  return index;
}

function unique(items) {
  return [...new Set(items)];
}

/** Vite plugin: emits offline-packs.json into the build output. */
export function offlinePacksPlugin() {
  return {
    name: "codexter-offline-packs",
    apply: "build",
    generateBundle(_options, bundle) {
      this.emitFile({
        type: "asset",
        fileName: PACK_INDEX_FILE,
        source: `${JSON.stringify(buildPackIndex(bundle), null, 2)}\n`,
      });
    },
  };
}
