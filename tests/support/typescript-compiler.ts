import { beforeAll } from "vitest";
import ts from "typescript";

/*
 * In the browser, tsRunner loads the compiler from /typescript/typescript.js
 * (see scripts/sync-typescript.mjs). Node tests have no <script> loader, so
 * they hand the same global to tsRunner directly. The loader's browser path
 * is covered separately in tests/ts-compiler-loader.test.ts.
 */
export function provideTypeScriptCompiler(): void {
  beforeAll(() => {
    (globalThis as { ts?: unknown }).ts = ts;
  });
}
