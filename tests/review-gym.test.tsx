// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { REVIEW_GYM } from "../src/data/review-gym";
import { scoreDiffAttempt } from "../src/lib/labGrade";
import DiffLab from "../src/components/DiffLab";
afterEach(cleanup);
describe("Review Gym answer keys and false alarms", () => {
 it("scores every authored blocker and clean PR; rejects approve-all/block-all strategies",()=>{
  for(const ex of REVIEW_GYM){
   if(ex.planted){
    const p=ex.planted; const file=ex.files.find(f=>f.path===p.file)!;
    expect(file.after.split('\n')[p.line-1]?.trim()).toBeTruthy();
    expect(scoreDiffAttempt(ex,{file:p.file,line:p.line,category:p.category,decision:'block'})).toBe(1);
    expect(scoreDiffAttempt(ex,{file:p.file,line:p.line,category:p.category,decision:'approve'})).toBe(0);
   }else{
    expect(scoreDiffAttempt(ex,{file:null,line:null,category:null,decision:'approve'})).toBe(1);
    expect(scoreDiffAttempt(ex,{file:ex.files[0].path,line:1,category:'SC',decision:'block'})).toBe(0);
   }
  }
 });
 it("lets the learner approve a clean PR through the actual DiffLab",()=>{
  const score=vi.fn();render(<DiffLab exercise={REVIEW_GYM.find(e=>!e.planted)!} onScore={score}/>);
  fireEvent.click(screen.getByLabelText('Approve: no blocking defect'));
  fireEvent.click(screen.getByRole('button',{name:'Submit review'}));
  expect(score).toHaveBeenCalledWith(1);expect(screen.getByRole('status').textContent).toContain('Approved correctly');
 });
});
