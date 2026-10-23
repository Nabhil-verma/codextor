import type { Lesson } from "./types";
export type CatchExercise = { id:string; title:string; brief:string; buggy:string; fixed:string; starter:string; referenceTest:string };
const starter='// Call subject(...) and throw new Error("ASSERTION: describe the violated behavior") if it is wrong.\n// This empty test cannot earn full credit.\n';
export const CATCH_EXERCISES: CatchExercise[] = [
 {id:'catch-csv',title:'A comma inside quotes',brief:'CSV fixture: fields may be quoted; commas inside quoted fields stay inside the value. Scope is one row without escaped quotes.',buggy:'function subject(row) { return row.split(","); }',fixed:`function subject(row) {
 const fields=[]; let field="", quoted=false;
 for (const c of row) { if(c==='"') quoted=!quoted; else if(c===',' && !quoted){fields.push(field);field="";}else field+=c; }
 fields.push(field); return fields;
}`,starter,referenceTest:`const fields=subject('"Ada, Lovelace",42');
if(JSON.stringify(fields)!==JSON.stringify(["Ada, Lovelace","42"])) throw new Error("ASSERTION: comma inside quotes must stay in one field");`},
 {id:'catch-debounce',title:'Old response after new query',brief:'Deterministic debounce/race replay: id is response id, latest is latest issued query. Only newest response may overwrite displayed results. No wall-clock race.',buggy:'function subject(current, response, latest) { return response.value; }',fixed:'function subject(current, response, latest) { return response.id === latest ? response.value : current; }',starter,referenceTest:'const newest=subject("initial",{id:2,value:"new"},2);\nconst afterOld=subject(newest,{id:1,value:"old"},2);\nif(afterOld!=="new") throw new Error("ASSERTION: old response must not replace latest query");'},
 {id:'catch-pagination',title:'The page boundary',brief:'Pages are zero-based. For page=1, size=2, return items at indexes 2 and 3. Test the contract, not just a non-empty result.',buggy:'function subject(items,page,size) { return items.slice(page*size,(page+1)*size-1); }',fixed:'function subject(items,page,size) { return items.slice(page*size,(page+1)*size); }',starter,referenceTest:'if(JSON.stringify(subject([0,1,2,3,4],1,2))!=="[2,3]") throw new Error("ASSERTION: full page contains two items at correct indexes");'},
 {id:'catch-auth',title:'Missing role fails closed',brief:'Pure authorization predicate: missing role denies; admin allows. No real credential or server call.',buggy:'function subject(user) { return (user.role ?? "admin") === "admin"; }',fixed:'function subject(user) { return user.role === "admin"; }',starter,referenceTest:'if(subject({})!==false || subject({role:"admin"})!==true) throw new Error("ASSERTION: missing role denies and admin allows");'},
];
export const catchAgentLesson: Lesson = {
 id:'write-the-catching-test',title:'Write the test that catches the agent',minutes:12,reviewed:'2026-10',toolDependent:true,reviewBy:'2026-12-30',catchTests:CATCH_EXERCISES,
 body:`An agent can generate an implementation and a test that share the same misunderstanding. Your judgment is the independent behavior contract. Write a tiny test yourself, before accepting the draft.

Each exercise fixes the bad draft and the correct implementation as read-only fixtures. Edit only the test. It must **fail on the agent's bad draft and pass on the fixed implementation**. A test that calls a function but asserts nothing earns no proof; a test that always throws cannot pass the fixed side. A syntax error is not a behavioral catch.

Use subject as the implementation under test. Compare the exact value to the contract; throw an Error beginning ASSERTION: with the violated invariant. That marker distinguishes an intended assertion failure from a missing helper or typo. The runtime still has ordinary educational sandbox limits: this is learning evidence, not tamper-proof certification.

The CSV case catches a comma inside quotes. The debounce fixture deterministically replays newest then stale responses, removing timing flakiness. Pagination pins both indexes and count at the boundary. Authorization tests the denied case as well as admin. No live model decides whether your test worked.

Do not edit the test to agree with the bad draft. Keep the failing assertion and repair the implementation in real work; rerun both sides after your final edit, then record what the receipt proves and what is outside its scope.`,
 quiz:[{q:'Your test passes on both implementations. What did it prove?',options:['The draft is necessarily correct','It does not distinguish the planted behavior yet','All edge cases are covered'],answer:1,explanation:'A catch needs the bad draft to fail for the intended invariant.'},{q:'Your test throws on both versions. Accept it?',options:['No: a useful test must also pass the correct implementation','Yes: throwing proves rigor','Only if its title names a bug'],answer:0,explanation:'Always-failing tests prove nothing about the repair.'}],
};
