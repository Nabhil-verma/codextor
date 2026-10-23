import { afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../src/convex/schema";
import { api } from "../src/convex/_generated/api";
import { REVIEW_BANK } from "../src/convex/reviewerBank";
const modules = import.meta.glob("../src/convex/**/*.ts");
afterEach(() => vi.restoreAllMocks());
async function setup() {
  const t = convexTest(schema, modules);
  const userId = await t.run(ctx => ctx.db.insert("users", { name: "Ada", email: "ada@example.com" }));
  const other = await t.run(ctx => ctx.db.insert("users", { name: "Bo", email: "bo@example.com" }));
  return { t, as: t.withIdentity({ subject: userId }), userId, asOther: t.withIdentity({ subject: other }) };
}

describe("server-assigned reviewer certificate", () => {
  it("grades choices on the server, persists issuance, resumes, and reports reviewer metrics", async () => {
    const { as } = await setup();
    const clock = vi.spyOn(Date, "now").mockReturnValue(0);
    const start = await as.mutation(api.progress.startUnseenExercise, {});
    expect(start.seenBefore).toBe(false);
    expect(start.item).not.toHaveProperty("answer");
    expect((await as.mutation(api.progress.startUnseenExercise, {})).attemptId).toBe(start.attemptId);
    let result;
    for (let i = 0; i < 3; i++) {
      clock.mockReturnValue((i + 1) * 21_000);
      result = await as.mutation(api.progress.finishUnseenExercise, {attemptId:start.attemptId,itemIndex:i,answer:REVIEW_BANK[0].items[i].answer});
    }
    expect(result?.done).toBe(true);
    if (!result?.done) throw new Error("not finished");
    expect(result.score).toBe(1);
    expect(result.certificate?.issuedAt).toBe(63_000);
    const saved = await as.query(api.progress.reviewerStatus, {});
    expect(saved?.certificate?.id).toBe(result.certificate?.id);
    expect(saved?.metrics).toMatchObject({accuracy:1,catchRate:1,falseAlarmRate:0,count:3});
    expect(saved?.byCode).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "EC", count: 1, catchRate: 1, meanDecisionMs: 21000 }),
      expect.objectContaining({ code: "SL", count: 1, falseAlarmRate: 0 }),
    ]));
  });
  it("rejects speed, invalid answers, stale items, foreign attempts and signed-out calls", async () => {
    const { as, asOther, t } = await setup();
    const clock = vi.spyOn(Date,"now").mockReturnValue(0);
    const { attemptId } = await as.mutation(api.progress.startUnseenExercise, {});
    await expect(as.mutation(api.progress.finishUnseenExercise,{attemptId,itemIndex:0,answer:1})).rejects.toThrow("minimum 20 seconds");
    clock.mockReturnValue(21_000);
    await expect(as.mutation(api.progress.finishUnseenExercise,{attemptId,itemIndex:0,answer:99})).rejects.toThrow("invalid answer");
    await expect(asOther.mutation(api.progress.finishUnseenExercise,{attemptId,itemIndex:0,answer:1})).rejects.toThrow("not your attempt");
    await as.mutation(api.progress.finishUnseenExercise,{attemptId,itemIndex:0,answer:1});
    await expect(as.mutation(api.progress.finishUnseenExercise,{attemptId,itemIndex:0,answer:1})).rejects.toThrow("stale");
    await expect(t.mutation(api.progress.startUnseenExercise,{})).rejects.toThrow("sign in");
    expect(await t.query(api.progress.reviewerStatus,{})).toBeNull();
  });
  it("a wrong answer lowers the server score and cannot claim a perfect certificate", async () => {
    const { as } = await setup();
    const clock=vi.spyOn(Date,"now").mockReturnValue(0);
    const {attemptId}=await as.mutation(api.progress.startUnseenExercise,{});
    let result;
    for(let i=0;i<3;i++) {clock.mockReturnValue((i+1)*21_000);result=await as.mutation(api.progress.finishUnseenExercise,{attemptId,itemIndex:i,answer:i===0 ? 0 : REVIEW_BANK[0].items[i].answer});}
    if(!result?.done) throw new Error("not finished");
    expect(result.score).toBeCloseTo(2/3);expect(result.certificate).toBeNull();
    await expect(as.mutation(api.progress.finishUnseenExercise,{attemptId,itemIndex:2,answer:0})).rejects.toThrow("already finished");
  });
  it("repeated exposures remain practice; reset clears only the owner's assessment data", async () => {
    const {as,asOther,t,userId}=await setup();
    const clock=vi.spyOn(Date,"now").mockReturnValue(0);
    for(let e=0;e<3;e++) {
      const {attemptId}=await as.mutation(api.progress.startUnseenExercise,{});
      for(let i=0;i<3;i++){clock.mockReturnValue(e*100000+(i+1)*21000);await as.mutation(api.progress.finishUnseenExercise,{attemptId,itemIndex:i,answer:0});}
      clock.mockReturnValue((e+1)*100000);
    }
    const repeated=await as.mutation(api.progress.startUnseenExercise,{});
    expect(repeated.seenBefore).toBe(true);
    const other=await asOther.mutation(api.progress.startUnseenExercise,{});
    await as.mutation(api.progress.wipe,{});
    expect(await t.run(ctx=>ctx.db.query("unseenAttempts").withIndex("by_user",q=>q.eq("userId",userId)).collect())).toEqual([]);
    expect(await t.run(ctx=>ctx.db.get(other.attemptId))).not.toBeNull();
  });
});
