import { describe,expect,it } from 'vitest';
import { TOOL_WRAPPER,INJECTION_TRACE } from '../src/data/guardrails';
import { runUserCode,evaluateCheck } from '../src/lib/runner';
import { scoreSelect } from '../src/lib/labGrade';
describe('guardrails are executable boundaries',()=>{
 it('rejects bad wrapper and accepts enforced wrapper',async()=>{
  for(const [source,want] of [[TOOL_WRAPPER.broken,false],[TOOL_WRAPPER.fix,true]] as const){
   const run=await runUserCode(source);expect(run.error).toBeNull();expect(evaluateCheck(TOOL_WRAPPER.fixCheck,run.logs.join('\n'))).toBe(want);
  }
 });
 it('requires confirmation even for trusted reads and strips arbitrary returned secrets',async()=>{
  const noConfirm=TOOL_WRAPPER.fix.replace('if (!request.confirmed) return "CONFIRM";','');
  const unsafeReturn=TOOL_WRAPPER.fix.replace('return { summary: toolOutput.summary };','return toolOutput;');
  for(const source of [noConfirm,unsafeReturn]){const r=await runUserCode(source);expect(evaluateCheck(TOOL_WRAPPER.fixCheck,r.logs.join('\n'))).toBe(false);}
 });
 it('pins first boundary crossing instead of the later leak',()=>{
  const q=INJECTION_TRACE.questions[0];if(q.kind!=='select')throw Error('select required');
  expect(scoreSelect(q,[2])).toBe(1);expect(scoreSelect(q,[3])).toBe(0);
 });
});
