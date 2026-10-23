/** Keep the real compiler intact, but out of Rollup's high-memory CJS AST pass. */
import { build } from "esbuild";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

export async function compilerAsset() {
  const result = await build({
    entryPoints: [require.resolve("typescript")], bundle: true, write: false,
    format: "esm", platform: "browser", target: "es2020", minify: true,
    external: ["fs", "path", "os", "perf_hooks", "crypto", "buffer", "inspector"],
    legalComments: "inline", logLevel: "silent",
  });
  const source = result.outputFiles[0].text;
  const name = `typescript-compiler-${createHash("sha256").update(source).digest("hex").slice(0, 12)}.js`;
  return { name, source };
}

export function compilerAssetPlugin() {
  let artifact;
  return {
    name: "codextor-real-compiler-asset", apply: "build", enforce: "pre",
    async buildStart() {
      artifact = await compilerAsset();
      this.emitFile({ type: "asset", fileName: `assets/${artifact.name}`, source: artifact.source });
    },
    resolveId(id) {
      if (id === "typescript") return "\0codextor-real-compiler";
      if (artifact && id === `./${artifact.name}`) return { id, external: true };
    },
    load(id) {
      if (id === "\0codextor-real-compiler") return `import ts from ${JSON.stringify(`./${artifact.name}`)}; export default ts;`;
    },
  };
}
