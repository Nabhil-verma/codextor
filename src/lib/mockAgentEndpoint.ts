/*
 * A deterministic stand-in for a model endpoint. Same request in, same reply
 * out, no network. Lets learners see the loop (request → tool call → tool
 * result → answer) without a key, and lets tests pin each branch.
 */
export type MockMessage = { role: "user" | "tool"; content: string };
export type MockRequest = { messages: MockMessage[]; tools: string[] };
export type MockReply =
  | { type: "tool_call"; name: string; args: Record<string, string> }
  | { type: "text"; text: string };

export function mockAgentReply(req: MockRequest): MockReply {
  const last = req.messages[req.messages.length - 1];
  if (!last) return { type: "text", text: "empty request" };
  if (last.role === "tool") return { type: "text", text: `done: ${last.content.slice(0, 80)}` };
  if (/\btests?\b/i.test(last.content) && req.tools.includes("run_tests")) {
    return { type: "tool_call", name: "run_tests", args: {} };
  }
  if (/\bread\b/i.test(last.content) && req.tools.includes("read_file")) {
    const path = last.content.match(/([\w./-]+\.\w+)/)?.[1] ?? "";
    return { type: "tool_call", name: "read_file", args: { path } };
  }
  return { type: "text", text: "no matching tool; answering directly" };
}

/** Per-run HTTP fixture: response order never depends on network or global state. */
export function createMockAgentEndpoint() {
  let retries = 0;
  return (body: unknown): { status: number; body: unknown } => {
    if (!body || typeof body !== "object") return { status: 400, body: { error: "request must be an object" } };
    const request = body as Record<string, unknown>;
    switch (request.scenario) {
      case "ratelimit": return ++retries <= 2 ? { status: 429, body: { error: "rate limited" } } : { status: 200, body: { text: "ready", retries: 2 } };
      case "malformed": return { status: 200, body: { items: [{ price: "not-a-number" }] } };
      case "sse": return { status: 200, body: { chunks: ["hello", " world"], stopReason: "end_turn" } };
      case "ok": return { status: 200, body: { text: "ready", stopReason: "end_turn" } };
      case "bad-request": return { status: 400, body: { error: "invalid model request" } };
      case "tool-call": {
        if (!Array.isArray(request.messages) || !Array.isArray(request.tools)) return { status: 400, body: { error: "messages and tools required" } };
        const messages = request.messages;
        const tools = request.tools;
        if (!messages.every(m => m && (m.role === "user" || m.role === "tool") && typeof m.content === "string") || !tools.every(t => typeof t === "string")) return { status: 400, body: { error: "invalid message or tool" } };
        return { status: 200, body: mockAgentReply({ messages, tools }) };
      }
      default: return { status: 400, body: { error: "unknown scenario" } };
    }
  };
}
