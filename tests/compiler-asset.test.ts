// @vitest-environment node
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";

describe("production real TypeScript compiler artifact", () => {
  it("typechecks good and bad programs in a browser-like realm", () => {
    const script = `
      import { compilerAsset } from './scripts/compiler-asset.mjs';
      import vm from 'node:vm';
      const {source,name} = await compilerAsset();
      const exportMatch = /export default ([\\w$]+\\(\\));?\\s*$/.exec(source);
      if (!exportMatch) throw new Error('Missing ESM compiler export');
      const context = vm.createContext({console, setTimeout, clearTimeout});
      const ts = vm.runInContext(source.slice(0,exportMatch.index)+';'+exportMatch[1],context);
      const options={strict:true,noLib:true,noEmit:true,target:ts.ScriptTarget.ES2020};
      function errors(code){
        const sf=ts.createSourceFile('lesson.ts',code,options.target,true);
        const host={getSourceFile:n=>n==='lesson.ts'?sf:undefined,writeFile(){},getCurrentDirectory:()=> '/',getDirectories:()=>[],fileExists:n=>n==='lesson.ts',readFile:()=>code,getDefaultLibFileName:()=>'',getCanonicalFileName:n=>n,useCaseSensitiveFileNames:()=>true,getNewLine:()=> '\\n'};
        const p=ts.createProgram(['lesson.ts'],options,host);
        return p.getSemanticDiagnostics().map(d=>d.code);
      }
      if(errors('const n: number = 2;').length) throw new Error('Valid program rejected');
      if(!errors('const n: number = "wrong";').includes(2322)) throw new Error('Type error not detected');
      console.log(JSON.stringify({name,version:ts.version,bytes:source.length}));`;
    const result = JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", script], { encoding: "utf8" }));
    expect(result.version).toMatch(/^5\./);
    expect(result.bytes).toBeGreaterThan(1_000_000);
    expect(result.name).toMatch(/^typescript-compiler-[a-f0-9]{12}\.js$/);
  }, 30_000);
});
