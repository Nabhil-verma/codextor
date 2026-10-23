// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const call = vi.fn();
vi.mock("../src/lib/ai", () => ({callAi:(...args:unknown[])=>call(...args),loadAiSettings:()=>({provider:"gemini",keys:{gemini:"fake"}}),useAiSettings:()=>({provider:"gemini",keys:{gemini:"fake"}})}));
import TraceInterrogation from "../src/components/TraceInterrogation";
import { ALL_TRANSCRIPT_CASES } from "../src/data/transcripts";
const TRANSCRIPT_CASES = [ALL_TRANSCRIPT_CASES[0], ALL_TRANSCRIPT_CASES.find(t => t.id === "transcript-invented-api")!];
afterEach(()=>{cleanup();call.mockReset();localStorage.clear();});
it("provides deterministic evidence through learner controls without a provider",async()=>{
 render(<TraceInterrogation transcript={TRANSCRIPT_CASES[1]} />);
 fireEvent.click(screen.getByText("Use deterministic evidence"));
 await waitFor(()=>expect(screen.getByRole("status").textContent).toContain("fallback"));
 expect(call).not.toHaveBeenCalled();expect(screen.getByText(/orders.groupByDay/, {selector:"q"})).toBeTruthy();
});
it("withholds fabricated live outcomes, then accepts exact trace citations",async()=>{
 const trace=TRANSCRIPT_CASES[1];
 call.mockResolvedValue('[{"step":3,"quote":"npm test passed all tests"}]');
 render(<TraceInterrogation transcript={trace} />);
 fireEvent.click(screen.getByText("Ask live model for citations"));
 await waitFor(()=>expect(screen.getByRole("status").textContent).toContain("withheld"));
 expect(document.querySelector("q")).toBeNull();
 call.mockResolvedValue(JSON.stringify([{step:2,quote:trace.steps[1].text}]));
 fireEvent.click(screen.getByText("Ask live model for citations"));
 await waitFor(()=>expect(screen.getByRole("status").textContent).toContain("snapshot saved"));
 expect(document.querySelector("q")?.textContent).toBe(trace.steps[1].text);
 expect(call.mock.calls[0][0][1].content).toContain("groupByDay");
});
