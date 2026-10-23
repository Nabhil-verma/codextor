// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {CATCH_EXERCISES} from '../src/data/catch-agent';
import {runUserCode} from '../src/lib/runner';
import CatchAgentLab from '../src/components/CatchAgentLab';
afterEach(cleanup);
describe('learner-owned verification fixtures',()=>{
 it('all four reference tests deliberately fail bad draft and pass fixed, unlike empty tests',async()=>{
  for(const e of CATCH_EXERCISES){
   expect((await runUserCode(e.buggy+'\n'+e.referenceTest)).error).toMatch(/^ASSERTION:/);
   expect((await runUserCode(e.fixed+'\n'+e.referenceTest)).error).toBeNull();
   expect((await runUserCode(e.buggy+'\n'+e.starter)).error).toBeNull();
  }
 },30_000);
 it('grades edited test through actual dual-run UI',async()=>{
  const e=CATCH_EXERCISES[2], score=vi.fn();render(<CatchAgentLab exercise={e} onScore={score}/>);
  fireEvent.change(screen.getByRole('textbox'),{target:{value:e.referenceTest}});
  fireEvent.click(screen.getByRole('button',{name:'Run the proof'}));
  await waitFor(()=>expect(score).toHaveBeenCalledWith(1));
  expect(screen.getByRole('status').textContent).toContain('dual run verified');
 });
 it('does not mistake a typo for a behavioral catch',async()=>{
  const e=CATCH_EXERCISES[0],score=vi.fn();render(<CatchAgentLab exercise={e} onScore={score}/>);
  fireEvent.change(screen.getByRole('textbox'),{target:{value:'missingHelper();'}});
  fireEvent.click(screen.getByRole('button',{name:'Run the proof'}));
  await waitFor(()=>expect(score).toHaveBeenCalledWith(0));
 });
});
