/** Reproducible lesson-grain audit. Uses the same esbuild loader as gen-site; no new dependency. */
import { build } from 'esbuild';
import { readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';

export async function loadCurriculum(root = process.cwd()) {
  const outfile = join(tmpdir(), `codextor-profile-${process.pid}-${Date.now()}.mjs`);
  try {
    await build({ entryPoints: [join(root, 'src/data/index.ts')], outfile, bundle: true, format: 'esm', platform: 'node', logLevel: 'silent' });
    return (await import(pathToFileURL(outfile).href)).tracks;
  } finally { rmSync(outfile, { force: true }); }
}
export const CONCEPTS = {
  MCP: /\bMCP\b/i,
  evals: /\bevals?\b|evaluation harness/i,
  'worktrees / parallel agents': /\bworktrees?\b|parallel agents?/i,
  'structured output / JSON schema': /structured outputs?|JSON schemas?/i,
  RAG: /\bRAG\b|retrieval[- ]augmented/i,
  'prompt injection': /prompt injection/i,
  'vibe coding': /vibe coding/i,
};
const ELEMENTS = ['starter', 'debug', 'diff', 'repo', 'rubric', 'preview', 'sandbox', 'gitSim', 'predict', 'sort', 'reviews', 'catchTests', 'decisions', 'transcripts', 'worktreeLab'];
const strings = (value) => typeof value === 'string' ? [value] : Array.isArray(value) ? value.flatMap(strings) : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : [];
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const dupes = (xs) => [...new Set(xs.filter((x, i) => xs.indexOf(x) !== i))];
export function romanValue(numeral) {
  const roman = numeral.normalize('NFKC');
  const values = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  return [...roman].reduce((n, c, i) => n + (values[c] < values[roman[i + 1]] ? -values[c] : values[c]), 0);
}
export function profile(tracks, rawFiles = {}) {
  const rows = tracks.flatMap(t => t.lessons.map(l => ({ ...l, trackId: t.id, optional: !!t.optional, key: `${t.id}/${l.id}` })));
  const trackRows = tracks.map((t, i) => ({ order: i + 1, id: t.id, numeral: t.numeral, numeralValue: romanValue(t.numeral), optional: !!t.optional, lessons: t.lessons.length, minutes: sum(t.lessons.map(l => l.minutes)) }));
  const core = trackRows.filter(t => !t.optional);
  const coreMinutes = sum(core.map(t => t.minutes));
  const optionalMinutes = sum(trackRows.filter(t => t.optional).map(t => t.minutes));
  const minutes = sum(rows.map(l => l.minutes));
  const agentic = rows.filter(l => ['agents', 'workflow'].includes(l.trackId));
  const agenticMinutes = sum(agentic.map(l => l.minutes));
  const sorted = rows.map(l => l.minutes).sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  const quizOnly = rows.filter(l => !ELEMENTS.some(e => Array.isArray(l[e]) ? l[e].length > 0 : !!l[e]));
  const before = (order, id) => {
    const i = order.findIndex(t => t.id === id);
    return i < 0 ? null : { minutes: sum(order.slice(0, i).map(t => t.minutes)), lessons: sum(order.slice(0, i).map(t => t.lessons)) };
  };
  const diffs = rows.flatMap(l => [...(l.diff ? [l.diff] : []), ...(l.reviews ?? [])]);
  const codes = ['RC', 'EC', 'SL', 'CX', 'HA', 'ID', 'SC', 'TG', 'NM', 'DL'];
  const taxonomy = codes.map(code => ({ code, debug: rows.filter(l => l.debug?.diagnosis?.answer === code).length, diff: diffs.filter(d => d.planted?.category === code).length }));
  const concepts = Object.entries(CONCEPTS).map(([concept, pattern]) => ({
    concept,
    lessons: rows.filter(l => pattern.test(strings(l).join('\n'))).map(l => l.key),
    bodyLessons: rows.filter(l => pattern.test(l.body)).map(l => l.key),
    rawHits: Object.entries(rawFiles).flatMap(([file, text]) => text.split('\n').flatMap((line, i) => pattern.test(line) ? [{ file, line: i + 1, snippet: line.trim() }] : [])),
  }));
  const coreFields = ['id', 'title', 'minutes', 'body', 'quiz'];
  const nullFields = rows.flatMap(l => coreFields.filter(f => l[f] == null || l[f] === '').map(f => `${l.key}.${f}`));
  const invalidMinutes = rows.filter(l => !Number.isFinite(l.minutes) || l.minutes <= 0).map(l => l.key);
  const numerals = trackRows.map(t => t.numeralValue);
  const gaps = [];
  for (let i = 1; i <= Math.max(...numerals); i++) if (!numerals.includes(i)) gaps.push(i);
  for (const t of tracks) for (const f of ['id', 'title', 'blurb', 'numeral', 'lessons']) assert.ok(t[f] != null && t[f] !== '', `track ${t.id}: missing ${f}`);
  const result = {
    lessons: rows.length, tracks: tracks.length, minutes, median, coreMinutes, optionalMinutes,
    optionalTracks: trackRows.filter(t => t.optional).map(t => t.id),
    agenticLessons: agentic.length, agenticMinutes,
    agenticLessonShare: agentic.length / rows.length * 100, agenticMinuteShare: agenticMinutes / minutes * 100, agenticCoreShare: agenticMinutes / coreMinutes * 100,
    starts: { agents: before(core, 'agents'), workflow: before(core, 'workflow') },
    rawRegistryStarts: { agents: before(trackRows, 'agents'), workflow: before(trackRows, 'workflow') },
    exercises: { debug: rows.filter(l => l.debug).length, diff: diffs.length, uniqueDiff: new Set(diffs.map(d => d.id)).size, repo: rows.filter(l => l.repo).length, rubric: rows.filter(l => l.rubric).length, criteria: sum(rows.map(l => l.rubric?.criteria.length ?? 0)) },
    agentsRunnable: rows.filter(l => l.trackId === 'agents' && ((l.starter && l.check) || l.catchTests?.length)).map(l => l.key),
    agentsDebug: rows.filter(l => l.trackId === 'agents' && l.debug).map(l => l.key),
    quizOnly: quizOnly.map(l => ({ key: l.key, title: l.title, minutes: l.minutes, reading: !!l.reading })),
    quizOnlyMinutes: sum(quizOnly.map(l => l.minutes)),
    validation: { duplicateKeys: dupes(rows.map(l => l.key)), duplicateLessonIds: dupes(rows.map(l => l.id)), duplicateTitles: dupes(rows.map(l => l.title)), duplicateTracks: dupes(tracks.map(t => t.id)), nullFields, invalidMinutes, duplicateNumerals: dupes(numerals), numeralGaps: gaps, numeralsInOrder: numerals.every((n, i) => i === 0 || n > numerals[i - 1]), sumsAgree: sum(trackRows.map(t => t.minutes)) === minutes && coreMinutes + optionalMinutes === minutes },
    trackRows, taxonomy, concepts,
    agenticBodies: agentic.map(l => ({ key: l.key, words: l.body.split(/\s+/).length, exercises: ELEMENTS.filter(e => !!l[e]) })),
    keys: rows.map(l => l.key), titles: rows.map(l => l.title),
  };
  for (const field of ['duplicateKeys', 'duplicateLessonIds', 'duplicateTitles', 'duplicateTracks', 'nullFields', 'invalidMinutes', 'duplicateNumerals']) assert.deepEqual(result.validation[field], [], field);
  assert.ok(result.validation.sumsAgree, 'aggregation mismatch');
  for (const share of [result.agenticLessonShare, result.agenticMinuteShare, result.agenticCoreShare]) assert.ok(share >= 0 && share <= 100, 'share out of range');
  return result;
}
export function rawData(root = process.cwd()) {
  // Raw source presence is diagnostic, not proof of rendered teaching.
  // Include flagged sources; the lesson scan separately measures enabled content.
  return Object.fromEntries(readdirSync(join(root, 'src/data')).filter(f => f.endsWith('.ts')).map(f => [`src/data/${f}`, readFileSync(join(root, 'src/data', f), 'utf8')]));
}
const escape = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
export function charts(baseline, current) {
  const proposedCore = ['web', 'git', 'testing', 'agents', 'workflow', 'security', 'typescript', 'backend', 'react', 'api'];
  const proposed = proposedCore.map(id => current.trackRows.find(t => t.id === id)).filter(Boolean);
  const start = (id) => sum(proposed.slice(0, proposed.findIndex(t => t.id === id)).map(t => t.minutes));
  const series = [ ['agents · baseline', baseline.starts.agents.minutes], ['agents · delivered order', start('agents')], ['workflow · baseline', baseline.starts.workflow.minutes], ['workflow · delivered order', start('workflow')] ];
  const bars = series.map(([label, value], i) => `<text x="250" y="${66 + i * 49}" text-anchor="end">${escape(label)}</text><rect x="265" y="${48 + i * 49}" width="${value / 900 * 405}" height="28" fill="${i % 2 ? '#0e7490' : '#5b21b6'}"/><text x="${273 + value / 900 * 405}" y="${67 + i * 49}">${value} min</text>`).join('');
  const coreAfter = sum(proposed.map(t => t.minutes));
  // Full-plan estimates are scenarios, not observed runtimes or content depth.
  const scenarios = [ ['Baseline', baseline.agenticCoreShare], ['Delivered core (authored)', current.agenticMinutes / coreAfter * 100], ['Full-plan estimate*', (baseline.agenticMinutes + 168) / (baseline.coreMinutes - 166 + 168) * 100] ];
  const shares = scenarios.map(([label, value], i) => `<text x="250" y="${348 + i * 49}" text-anchor="end">${escape(label)}</text><rect x="265" y="${330 + i * 49}" width="${value / 100 * 405}" height="28" fill="#0e7490"/><text x="${273 + value / 100 * 405}" y="${349 + i * 49}">${value.toFixed(1)}%</text>`).join('');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Curriculum path comparison</title><style>body{font:16px/1.6 system-ui;background:#fff;color:#111827;max-width:900px;margin:32px auto;padding:16px}svg{width:100%;height:auto}text{font:14px system-ui;fill:#111827}@media(prefers-color-scheme:dark){body{background:#111827;color:#f9fafb}text{fill:#f9fafb}}</style><main><h1>Earlier agentic practice, larger core share</h1><p>Baseline vs delivered order. Minutes are authored duration estimates, not measured learning time. Horizontal bars share a zero origin.</p><svg viewBox="0 0 820 565" role="img" aria-labelledby="chart-title chart-desc"><title id="chart-title">Minutes before tracks and agentic share of core</title><desc id="chart-desc">${series.map(([l,v]) => `${l}: ${v} minutes`).join('; ')}. ${scenarios.map(([l,v]) => `${l}: ${v.toFixed(1)} percent`).join('; ')}.</desc><text x="265" y="25">Default core minutes before track starts (minutes)</text>${bars}<path d="M265 248H670" stroke="currentColor"/>${[0,300,600,900].map(n => `<text x="${265+n/900*405}" y="269" text-anchor="middle">${n}</text>`).join('')}<text x="265" y="310">Agentic minutes / core minutes (%)</text>${shares}<path d="M265 480H670" stroke="currentColor"/>${[0,25,50,75,100].map(n => `<text x="${265+n/100*405}" y="504" text-anchor="middle">${n}%</text>`).join('')}</svg><p>*Full-plan scenario assumes all 14 new lessons are agentic core content: 168 estimated minutes added, 166 demoted. This is not a delivered or timed result. Actual data lives in curriculum-profile.json.</p></main></html>\n`;
}
async function main() {
  const root = process.cwd();
  const current = profile(await loadCurriculum(root), rawData(root));
  mkdirSync(join(root, 'docs'), { recursive: true });
  const baselinePath = join(root, 'docs/curriculum-baseline.json');
  if (process.argv.includes('--baseline')) {
    assert.ok(!existsSync(baselinePath), 'Baseline already exists: never replace the pre-edit snapshot.');
    assert.deepEqual([current.lessons, current.tracks, current.minutes, current.median, current.coreMinutes, current.optionalMinutes], [103, 17, 1238, 11, 896, 342]);
    assert.deepEqual(current.starts.agents, { minutes: 730, lessons: 62 });
    assert.equal(current.starts.workflow.minutes, 847);
    assert.deepEqual([current.agenticLessons, current.agenticMinutes, current.quizOnly.length, current.quizOnlyMinutes], [13, 166, 25, 270]);
    assert.deepEqual(current.optionalTracks, ['python', 'devops', 'architecture', 'tailwind', 'performance']);
    assert.deepEqual(current.exercises, { debug: 9, diff: 4, uniqueDiff: 3, repo: 3, rubric: 8, criteria: 40 });
    assert.deepEqual(current.agentsRunnable, []);
    assert.ok(current.concepts.every(c => !c.lessons.length && !c.rawHits.length), 'Baseline concept hits differ');
    assert.deepEqual(current.taxonomy.map(c => [c.code, c.debug, c.diff]), [['RC',2,2], ['EC',1,1], ['SL',2,1], ['CX',2,0], ['HA',1,0], ['ID',1,0], ['SC',0,0], ['TG',0,0], ['NM',0,0], ['DL',0,0]]);
    writeFileSync(baselinePath, JSON.stringify(current, null, 2) + '\n');
  }
  writeFileSync(join(root, 'docs/curriculum-profile.json'), JSON.stringify(current, null, 2) + '\n');
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
  writeFileSync(join(root, 'docs/agentic-curriculum-charts.html'), charts(baseline, current));
  console.log(JSON.stringify({ ...current, keys: undefined, titles: undefined, concepts: current.concepts.map(c => ({ ...c, rawHits: c.rawHits.length })) }, null, 2));
}
// Compare canonical file URLs: on Windows `new URL(import.meta.url).pathname`
// yields "/C:/..." and a plain `resolve` comparison silently skips main().
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
