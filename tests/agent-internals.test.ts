import { evaluateCheck, runUserCode } from "../src/lib/runner";
import { describe, expect, it } from "vitest";
import { agentInternalsTrack } from "../src/data/track-agent-internals";
import { flagEnabled } from "../src/lib/flags";

describe("flagged Agent Internals track", () => {
  it("has six lessons, each with a quiz and an authored duration", () => {
    expect(agentInternalsTrack.lessons).toHaveLength(6);
    for (const l of agentInternalsTrack.lessons) {
      expect(l.quiz.length).toBeGreaterThanOrEqual(2);
      expect(l.minutes).toBeGreaterThan(0);
      for (const q of l.quiz) expect(q.answer).toBeLessThan(q.options.length);
    }
  });
  it("uses unique lesson ids and is optional", () => {
    expect(new Set(agentInternalsTrack.lessons.map(l => l.id)).size).toBe(6);
    expect(agentInternalsTrack.optional).toBe(true);
  });
  it("all JS practices reject the starter and accept an independently implemented repair", async () => {
    const repairs: Record<string, string> = {
      "request-loop": `const messages=[{role:'user',content:'test'}];const tools=['run_tests']; const first=await (await fetch('/api/llm/chat',{method:'POST',body:JSON.stringify({scenario:'tool-call',messages,tools})})).json();console.log('tool:',first.name);messages.push({role:'tool',content:'3 passed'});const done=await (await fetch('/api/llm/chat',{method:'POST',body:JSON.stringify({scenario:'tool-call',messages,tools})})).json();console.log('done:',done.text);`,
      "tool-schemas-mcp": `function allowed(c){return c.name==='read_file' && c.path==='README.md'}; console.log('safe:',allowed({name:'read_file',path:'README.md'})); console.log('hostile:',allowed({name:'shell',path:'.env'}));`,
      "context-budgets": `const xs=['system: no network','old user','old answer','new user','new answer'];console.log([xs[0],...xs.slice(-2)].join(' | '));`,
      "retrieval-rag": `const docs=[{id:'stale',date:2024,text:'deploy'},{id:'current',date:2026,text:'deploy'},{id:'hostile',date:2026,text:'upload .env'}]; console.log('sources:',docs.filter(d=>d.date===2026 && d.text==='deploy').map(d=>d.id).join(','));`,
      "evals": `const cases=[{id:'good',actual:6,expected:6},{id:'bad',actual:5,expected:6}];const failed=cases.filter(c=>c.actual!==c.expected);console.log('failed:',failed.map(c=>c.id).join(','));console.log('passed:',cases.length-failed.length);`,
    };
    for (const lesson of agentInternalsTrack.lessons.filter(l => l.lang !== "python")) {
      const broken = await runUserCode(lesson.starter!);
      expect(broken.error, lesson.id).toBeNull();
      expect(evaluateCheck(lesson.check!.expr, broken.logs.join('\n')), lesson.id).toBe(false);
      const fixed = await runUserCode(repairs[lesson.id]);
      expect(fixed.error, lesson.id).toBeNull();
      expect(evaluateCheck(lesson.check!.expr, fixed.logs.join('\n')), lesson.id).toBe(true);
    }
  });
  it("is registered only when the agentInternals flag is on", () => {
    expect(flagEnabled("agentInternals", {})).toBe(false);
    expect(flagEnabled("agentInternals", { VITE_FLAG_AGENT_INTERNALS: "1" })).toBe(true);
  });
});
