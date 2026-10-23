/** Sequential mandatory gates with preserved exits and durable, item-specific logs. */
import { spawnSync } from 'node:child_process';
import { mkdirSync, openSync, closeSync, writeFileSync, readFileSync } from 'node:fs';
const item = process.argv[2];
if (!item || !/^[\w-]+$/.test(item)) throw new Error('Supply an item label');
const dir = `docs/verification/${item}`;
mkdirSync(dir, { recursive: true });
const results = [];
for (const args of [['run','typecheck'],['test'],['run','build']]) {
  const name = args.at(-1); const log = `${dir}/${name}.log`; const fd = openSync(log, 'w');
  const start = performance.now();
  const result = spawnSync('npm', args, { stdio: ['ignore',fd,fd] }); closeSync(fd);
  results.push({command: `npm ${args.join(' ')}`, exitCode: result.status, signal: result.signal, seconds: +( (performance.now()-start)/1000).toFixed(2), log});
  writeFileSync(`${dir}/results.json`, JSON.stringify(results,null,2)+'\n');
  console.log(JSON.stringify(results.at(-1)));
  console.log(readFileSync(log,'utf8').split('\n').slice(-12).join('\n'));
  if (result.status !== 0) process.exit(result.status ?? 1);
}
