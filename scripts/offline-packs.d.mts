/** Types for scripts/offline-packs.mjs (the build-time pack index). */
export const PACK_INDEX_FILE: string;

export type PackIndexOutput = {
  version: string;
  core: string[];
  tracks: Record<string, string[]>;
  runtimes: { ts: string[] };
};

export function buildPackIndex(bundle: Record<string, unknown>): PackIndexOutput;

export function offlinePacksPlugin(): {
  name: string;
  apply: "build";
  generateBundle(this: { emitFile(file: unknown): void }, options: unknown, bundle: Record<string, unknown>): void;
};
