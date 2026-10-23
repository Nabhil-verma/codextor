import { useRef, useState } from "react";
import type { CatchExercise } from "../data/catch-agent";
import CodeEditor from "./CodeEditor";
import ProofRunner from "./ProofRunner";
export default function CatchAgentLab({exercise,onScore}:{exercise:CatchExercise;onScore:(score:number)=>void}) {
 const runRef = useRef<(() => void) | null>(null);
 const [test,setTest]=useState(exercise.starter);
 return <section className="glass glass-edge mt-8 rounded-3xl border border-paper-200 p-6" aria-label={exercise.title}>
  <p className="eyebrow">Independent verification</p><h3 className="mt-3 font-display text-2xl text-ink-950">{exercise.title}</h3><p className="my-4 text-ink-600">{exercise.brief}</p>
  <details><summary className="text-ink-700">Read-only bad draft and fixed fixture</summary><pre className="my-3 overflow-auto rounded-xl bg-paper-100 p-4 text-ink-950">{exercise.buggy}</pre><pre className="overflow-auto rounded-xl bg-paper-100 p-4 text-ink-950">{exercise.fixed}</pre></details>
  <p className="my-3 text-sm text-ink-700">Write only the verification; call subject and throw ASSERTION: on incorrect behavior.</p>
  <CodeEditor onRun={() => runRef.current?.()} value={test} onChange={setTest} label={`Test for ${exercise.title}`} />
  <ProofRunner key={test} runRef={runRef} proof={{buggy:exercise.buggy,test,fixed:exercise.fixed}} assertionPrefix="ASSERTION:" onScore={onScore}/>
 </section>;
}
