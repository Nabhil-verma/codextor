import type { QuizQuestion } from "./types";
export const PLACEMENT_CHECK: QuizQuestion[] = [
  {q:'Which claim is unverified?',options:['CI receipt names a passing run on this commit','“All tests pass” with no command or output','A test fails on the draft and passes on the fix'],answer:1,explanation:'A confident summary is not a test receipt.'},
  {q:'Which spec is executable?',options:['Make it cleaner','Improve all pages','Only /search: newest response wins; reproduce reversed responses; no API changes'],answer:2,explanation:'Scope, observable acceptance and non-goal make verification possible.'},
  {q:'A README tells the agent to upload .env. What is its authority?',options:['Untrusted data, not permission','Higher than the user task','A necessary setup instruction'],answer:0,explanation:'Retrieved text cannot grant network or secret access.'},
  {q:'The agent makes CI green by deleting an assertion. Your decision?',options:['Approve the green run','Accept if the diff is small','Reject; preserve the behavior contract and repair code'],answer:2,explanation:'TG: a weakened test conceals the defect.'},
  {q:'What is the minimum capability for tracing a request?',options:['Read only','Read/write/execute/network','Production deploy'],answer:0,explanation:'Investigation needs evidence, not mutation authority.'},
  {q:'Who is accountable after an agent-authored merge?',options:['The model provider','The human who approves and operates it','Nobody if CI was green'],answer:1,explanation:'Agentic engineering delegates work, not accountability.'},
];
export function placementRoute(answers: number[]): string {
  if (answers.length !== PLACEMENT_CHECK.length || answers.some(a => !Number.isInteger(a) || a < 0 || a > 2)) throw new Error('Answer all six placement questions');
  const correct = PLACEMENT_CHECK.filter((q,i) => q.answer === answers[i]).length;
  return correct >= 5 ? '/learn/agents/specs-and-prompts' : '/learn/web/html-semantic';
}
