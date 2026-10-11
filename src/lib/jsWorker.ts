/* ═══════════════════════════════════════════════════════════════
   The JavaScript sandbox worker (browser entry).

   Loaded as a module worker by runner.ts, one worker per run. The
   worker hardens its own global scope, runs the code with the shared
   core from jsSandbox.ts, posts the result, and closes itself. The page
   terminates it on timeout, which is the hard limit.

   Trust boundary: see the header of jsSandbox.ts.
   ═══════════════════════════════════════════════════════════════ */

import { hardenGlobals, runSandboxedCode, type RunResult } from "./jsSandbox";

type Request = { code: string; timeoutMs: number };

// Capture what the worker needs to reply before hardening removes it.
const reply = (self as unknown as { postMessage: (m: RunResult) => void }).postMessage.bind(self);
const close = (self as unknown as { close: () => void }).close.bind(self);

hardenGlobals(self as unknown as Record<string, unknown>);

self.onmessage = (event: MessageEvent<Request>) => {
  const { code, timeoutMs } = event.data;
  void runSandboxedCode(code, timeoutMs).then(
    (result) => {
      reply(result);
      close();
    },
    (e: unknown) => {
      reply({ logs: [], error: e instanceof Error ? e.message : String(e) });
      close();
    },
  );
};
