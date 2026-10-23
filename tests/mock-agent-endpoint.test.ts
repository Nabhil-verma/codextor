import { describe, expect, it } from "vitest";
import { mockAgentReply } from "../src/lib/mockAgentEndpoint";

const user = (content: string) => ({ messages: [{ role: "user" as const, content }], tools: ["read_file", "run_tests"] });

describe("deterministic mock endpoint", () => {
  it("chooses run_tests for a test request when the tool is offered", () => {
    expect(mockAgentReply(user("please run the tests"))).toEqual({ type: "tool_call", name: "run_tests", args: {} });
  });
  it("extracts a file path for read requests", () => {
    expect(mockAgentReply(user("read src/app.ts first"))).toEqual({ type: "tool_call", name: "read_file", args: { path: "src/app.ts" } });
  });
  it("answers directly when no offered tool matches", () => {
    expect(mockAgentReply({ messages: [{ role: "user", content: "run the tests" }], tools: [] }).type).toBe("text");
  });
  it("ends the loop after a tool result", () => {
    const r = mockAgentReply({ messages: [{ role: "user", content: "read a.ts" }, { role: "tool", content: "42 lines" }], tools: ["read_file"] });
    expect(r).toEqual({ type: "text", text: "done: 42 lines" });
  });
  it("is deterministic", () => {
    expect(mockAgentReply(user("read a.ts"))).toEqual(mockAgentReply(user("read a.ts")));
  });
});
