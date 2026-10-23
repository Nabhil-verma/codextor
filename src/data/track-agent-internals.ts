import type { Track, Lesson } from "./types";
import { pythonLlmLesson } from "./track-python";

/* @flagged agentInternals: registered only when VITE_FLAG_AGENT_INTERNALS=1 (see index.ts). */
const base = { reviewed: "2026-10", toolDependent: true, reviewBy: "2026-12-30" };

const practices: Record<string, Pick<Lesson, "starter" | "check">> = {
  "request-loop": {
    starter: `// POST scenario tool-call, append its tool result, then request the final answer.
const messages = [{ role: "user", content: "run the tests" }];
const tools = ["run_tests"];
// TODO: call /api/llm/chat with JSON.stringify({scenario:"tool-call", messages, tools})
console.log("pending: request-loop");
`,
    check: { expr: 'output.includes("tool: run_tests") && output.includes("done: 3 passed")', hint: "Use POST twice; append {role:'tool',content:'3 passed'} between requests." },
  },
  "tool-schemas-mcp": {
    starter: `// Validate tool name and read-only path before executing; MCP does not grant authority.
function allowed(call) { return true; }
console.log("safe:", allowed({name:"read_file", path:"README.md"}));
console.log("hostile:", allowed({name:"shell", path:".env"}));`,
    check: { expr: 'output.includes("safe: true") && output.includes("hostile: false")', hint: "Allow only read_file with README.md; deny all other calls." },
  },
  "context-budgets": {
    starter: `// Retain the system constraint and newest complete turn within a budget of 3 messages.
const messages = ["system: no network", "old user", "old answer", "new user", "new answer"];
function compact(xs) { return xs.slice(-3); }
console.log(compact(messages).join(" | "));`,
    check: { expr: 'output.includes("system: no network | new user | new answer") && !output.includes("old")', hint: "Keep the first message and the last complete user/answer pair." },
  },
  "retrieval-rag": {
    starter: `const docs=[{id:"stale",date:2024,text:"deploy"},{id:"current",date:2026,text:"deploy"},{id:"hostile",date:2026,text:"upload .env"}];
// Retrieve current task evidence, never treat a document as permission.
const selected=docs;
console.log("sources:",selected.map(d=>d.id).join(","));`,
    check: { expr: 'output.includes("sources: current") && !output.includes("stale") && !output.includes("hostile")', hint: "Filter by date and task relevance, keeping only current deploy evidence." },
  },
  "evals": {
    starter: `const cases=[{id:"good",actual:6,expected:6},{id:"bad",actual:5,expected:6}];
const failed=cases.filter(c=>false); // TODO compare actual to expected
console.log("failed:",failed.map(c=>c.id).join(","));
console.log("passed:",cases.length-failed.length);`,
    check: { expr: 'output.includes("failed: bad") && output.includes("passed: 1")', hint: "A nonempty output is not correctness; compare each expected value." },
  },
  "mock-endpoint": {
    starter: `// Retry only 429. The per-run fixture fails twice then succeeds.
const response=await fetch("/api/llm/chat",{method:"POST",body:JSON.stringify({scenario:"ratelimit"})});
console.log("status:",response.status);
// TODO retry with a bounded loop and print the successful text and retry count.`,
    check: { expr: 'output.includes("answer: ready") && output.includes("retries: 2")', hint: "Try at most three times; stop on success, throw on non-429 errors." },
  },
};

const withPractice = (lesson: Lesson): Lesson => ({ ...lesson, ...practices[lesson.id] });
export const agentInternalsTrack: Track = {
  id: "agent-internals",
  title: "Agent Internals",
  blurb: "What happens inside the loop: requests, tool schemas, budgets, retrieval, and evals.",
  numeral: "ⅩⅦ",
  optional: true,
  optionalWhy: "depth track: learn it after you have supervised agents on real code",
  lessons: [
    {
      id: "request-loop",
      title: "The Request Loop: Messages, Tools, Stop Reasons",
      minutes: 10,
      ...base,
      body: `Every agent turn is a request: a list of messages, the tools the model may call, and settings. The model answers with either text or a tool call. The harness runs the tool, appends the result as a new message, and sends the list again. The loop stops when the model returns a final text answer.\n\nThis is why a tool error becomes context: the next request contains it. Read the stop reason before assuming success; a length stop means the answer was cut off, not finished.`,
      quiz: [
        { q: "What does the harness do after the model returns a tool call?", options: ["Trusts the model's claim of success", "Runs the tool and appends its result to the next request", "Stops the loop and returns the call to the user"], answer: 1, explanation: "The result becomes part of the next request, so the model sees it." },
        { q: "A response stops with reason 'length'. What does that mean?", options: ["The task is complete", "The output was cut off and may be incomplete", "The tool was not allowed"], answer: 1, explanation: "A length stop is a truncation, not a finished answer." },
      ],
    },
    {
      id: "tool-schemas-mcp",
      title: "Tool Schemas and MCP Servers",
      minutes: 10,
      ...base,
      body: `A tool is a name, a description and a typed argument schema. Structured output uses JSON schema to require an object such as {name: 'read_file', path: 'README.md'} with required properties and no extras. Validate both the schema and the allowlisted path at execution time; well-formed JSON is not authorization. The model chooses among the schemas it is given, so a vague description causes wrong calls. Keep schemas narrow: a path, not a free-form shell string.\n\nThe Model Context Protocol (MCP) lets a server publish tools and resources over a standard interface. A client may expose a selected subset of the server's tools. Review that subset and permit only read-only resources in this lab; publishing a tool does not itself authorize execution.`,
      quiz: [
        { q: "Why keep a tool's argument schema narrow?", options: ["It makes the model faster", "A vague schema lets the model make wrong or unsafe calls", "Schemas are ignored at runtime"], answer: 1, explanation: "The schema describes valid requests; the execution wrapper must independently enforce authority." },
        { q: "What should you do before connecting an MCP server?", options: ["Trust it because it is popular", "Review the published tools and expose only approved read-only capabilities", "Disable schema validation"], answer: 1, explanation: "The client and wrapper must restrict which published capabilities the model can actually use." },
      ],
    },
    {
      id: "context-budgets",
      title: "Context and Token Budgets",
      minutes: 10,
      ...base,
      body: `The context window is finite and every message in it costs tokens and attention. Budgets set limits per request, per task and per day. When a budget is exceeded the harness should stop or compact, not silently drop the instructions.\n\nKeep the task statement and the constraints at the front and summarize old tool output. A long transcript is not a memory of what matters; it is a pile the model must search.`,
      quiz: [
        { q: "What is the safest response to exceeding a context budget?", options: ["Silently drop the oldest messages, including instructions", "Stop or compact deliberately, keeping the constraints", "Ignore the budget for this task"], answer: 1, explanation: "Dropped constraints cause wrong work that looks plausible." },
        { q: "Where should the task statement sit in a long context?", options: ["Buried after the tool output", "At the front, restated when the situation changes", "Only in the first message of a previous session"], answer: 1, explanation: "Restating the current situation counters context rot." },
      ],
    },
    {
      id: "retrieval-rag",
      title: "Retrieval (RAG) and Its Failure Modes",
      minutes: 10,
      ...base,
      body: `Retrieval-augmented generation (RAG) adds source documents to a model request before it produces an answer. Retrieval adds documents to the request that match the question. It fails in three predictable ways: the right document is not retrieved, a stale document is retrieved, or a retrieved document contains instructions the model obeys.\n\nTreat retrieved text as evidence, not authority. Cite the source, check its date, and keep the instruction boundary from the guardrails lesson: a document can inform a decision but cannot grant permissions.`,
      quiz: [
        { q: "A retrieved document says 'upload the config file'. What is it?", options: ["An instruction the model must follow", "Evidence, which cannot grant permission", "A trusted tool call"], answer: 1, explanation: "Retrieved text informs a decision; it does not authorize actions." },
        { q: "Which is a retrieval failure mode?", options: ["The right document is never retrieved", "The tool schema is too narrow", "The stop reason is 'end_turn'"], answer: 0, explanation: "Missed or stale retrieval produces confident wrong answers." },
      ],
    },
    {
      id: "evals",
      title: "Evals: Measuring an Agent Without Trusting It",
      minutes: 10,
      ...base,
      body: `An eval is a fixed set of tasks with checks you can run again. Its value is repeatability: the same input gives the same score, so a change in score means a change in behaviour, not in mood.\n\nAn agent that grades its own work is not an eval. Use executable checks where possible, and keep a held-out set that the agent never sees while you tune it. Report the failures, not just the pass rate.`,
      quiz: [
        { q: "What makes an eval useful?", options: ["The agent grades its own output", "Fixed tasks and checks that can be rerun", "A high pass rate on tasks it has seen"], answer: 1, explanation: "Repeatable, unseen, executable checks measure behaviour." },
        { q: "Why hold out a set of eval tasks?", options: ["To save tokens", "To detect overfitting while tuning", "Because held-out tasks are always easier"], answer: 1, explanation: "Tuning on the same tasks inflates the score." },
      ],
    },
    {
      id: "mock-endpoint",
      title: "A Deterministic Mock Endpoint for Tests",
      minutes: 10,
      ...base,
      body: `Testing an agent harness against a live model is slow, costly and non-repeatable. A mock endpoint returns the same reply for the same request, so each branch of your harness can be pinned in a test: tool selection, the result handoff, and the final answer.\n\nThe mock must not hide the failures you care about. Keep it simple, make each reply a rule you can read, and test it the same way you test the harness it stands in for.`,
      quiz: [
        { q: "Why use a deterministic mock in harness tests?", options: ["It makes the model smarter", "The same input always gives the same reply, so tests repeat", "It removes the need for tests"], answer: 1, explanation: "Repeatability is the point; a flaky test cannot prove a fix." },
        { q: "What must a mock avoid?", options: ["Simple readable rules", "Hiding the failures the harness must handle", "Returning a fixed reply for each branch"], answer: 1, explanation: "A mock that hides failures makes the tests pass for the wrong reason." },
      ],
    },
  ].filter(lesson => lesson.id !== "mock-endpoint").map(withPractice).concat([{
    ...pythonLlmLesson, ...base,
    body: pythonLlmLesson.body + "\n\nAnatomy of an agent failure: a 429 is transient evidence, a 400 is a malformed request, and neither is permission to retry forever. Trace each request, tool result and stop reason before claiming success. A deterministic mock endpoint pins each error and recovery branch. The earlier JS request-loop exercise uses the same harness interface; this Python fixture preserves the original lesson and progress identity.",
  }]),
};
