/** Verify configuration at generation time, not just the flag parser. Restore baseline on success/failure. */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import assert from "node:assert/strict";
const names = ["VITE_FLAG_AGENT_INTERNALS", "VITE_FLAG_FIELD_REPORTS", "VITE_FLAG_GIT_WORKTREE_LAB", "VITE_FLAG_BYOK_INTERROGATION", "VITE_FLAG_REVIEWER_CERTIFICATE"];
const checkRoutes = env => {
  const result = spawnSync(process.execPath, ["node_modules/vitest/vitest.mjs", "run", "tests/agentic-release.test.tsx"], {env:{...process.env,...env},encoding:"utf8"});
  if (result.status !== 0) throw new Error(result.stderr + result.stdout);
};
const run = env => {
  const result = spawnSync(process.execPath, ["scripts/gen-site.mjs"], {env:{...process.env,...env},encoding:"utf8"});
  if(result.status!==0) throw new Error(result.stderr || result.stdout);
  return readFileSync("src/data/manifest.ts","utf8");
};
const base=Object.fromEntries(names.map(n=>[n,"0"]));
try {
  for(const flags of [[], ...names.map(n => [n]), names]) {
    const env={...base,...Object.fromEntries(flags.map(n=>[n,"1"]))};
    const manifest=run(env);
    assert.equal(manifest.includes('id: "agent-internals"'),flags.includes(names[0]));
    assert.equal(manifest.includes('id: "field-reports"'),flags.includes(names[1]));
    assert.equal(existsSync('public/syllabus/agent-internals/index.html'), flags.includes(names[0]));
    assert.equal(existsSync('public/syllabus/field-reports/index.html'), flags.includes(names[1]));
    const moved = flags.includes(names[0]);
    const { loadCurriculum, profile, rawData } = await import('./curriculum-profile.mjs');
    Object.assign(process.env, env);
    const tracks = await loadCurriculum();
    const p = profile(tracks, rawData());
    assert.equal(p.keys.includes('python/python-llm-api'), !moved);
    assert.equal(p.keys.includes('agent-internals/python-llm-api'), moved);
    assert.ok(p.taxonomy.every(c => c.debug >= 1 && c.diff >= 1), 'taxonomy gaps');
    if (flags.length === names.length) {
      assert.deepEqual(p.validation.numeralGaps, []);
      assert.ok(p.concepts.every(c => c.bodyLessons.length > 0), 'untaught concept');
    }
    const numerals=[...manifest.matchAll(/numeral: "([^"]+)"/g)].map(m=>m[1].normalize("NFKC"));
    assert.equal(new Set(numerals).size,numerals.length,"numeral collision");
    checkRoutes(env);
    console.log(`features verified: ${flags.join(",")||"all off"}`);
  }
} finally { run(base); }
