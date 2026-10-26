// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createBackend, type Backend } from "./helpers/backend";
import { api } from "../src/lib/api";
import { REVIEW_BANK } from "../sites/api/reviewerBank";
import { practiceReviewerMetrics, type Telemetry } from "../src/lib/telemetry";

const account = vi.hoisted(() => ({ signedIn: true }));
const hooks = vi.hoisted(() => ({ start: vi.fn(), finish: vi.fn(), status: undefined as unknown }));

vi.mock("../src/AccountProvider", () => ({
  useAccount: () => ({ user: account.signedIn ? { displayName: "Ada" } : null }),
}));

vi.mock("../src/lib/cloud", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/cloud")>();
  return {
    ...actual,
    useQuery: () => hooks.status,
    // The component asks for these two endpoints by name.
    useMutation: (ref: { name: string }) =>
      ref.name === "progress.startUnseenExercise" ? hooks.start : hooks.finish,
  };
});

import ReviewerAssessment from "../src/components/ReviewerAssessment";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  hooks.start.mockReset();
  hooks.finish.mockReset();
  hooks.status = undefined;
  account.signedIn = true;
});

async function serverWithAda(): Promise<{ t: Backend; as: ReturnType<Backend["as"]> }> {
  const t = createBackend();
  const userId = await t.seedUser({ name: "Ada" });
  return { t, as: t.as(userId) };
}

describe("reviewer learner flow", () => {
  it("shows signed-out guidance without starting an assessment", () => {
    account.signedIn = false;
    render(<ReviewerAssessment />);
    expect(screen.getByText(/Sign in to start/)).toBeTruthy();
    expect(hooks.start).not.toHaveBeenCalled();
  });

  it("drives learner choices through real server grading and persists the certificate", async () => {
    const { as } = await serverWithAda();
    const now = vi.spyOn(Date, "now").mockReturnValue(0);
    hooks.start.mockImplementation(() => as.mutation(api.progress.startUnseenExercise, {}));
    hooks.finish.mockImplementation((args) =>
      as.mutation(api.progress.finishUnseenExercise, args),
    );

    render(<ReviewerAssessment />);
    fireEvent.click(screen.getByRole("button", { name: "Start or resume assessment" }));

    for (let i = 0; i < 3; i++) {
      const item = REVIEW_BANK[0].items[i];
      const radio = await screen.findByRole("radio", { name: item.options[item.answer] });
      now.mockReturnValue((i + 1) * 21_000);
      fireEvent.click(radio);
      fireEvent.click(screen.getByRole("button", { name: "Submit assessment answer" }));
      await waitFor(() => expect(hooks.finish).toHaveBeenCalledTimes(i + 1));
    }

    await screen.findByText("Certificate earned and saved on your account.");
    const saved = (await as.query(api.progress.reviewerStatus, {})) as {
      certificate: { score: number } | null;
      metrics: Record<string, number>;
    };
    expect(saved.certificate?.score).toBe(1);
    expect(saved.metrics).toMatchObject({ catchRate: 1, falseAlarmRate: 0 });
  });

  it("reports a failed mutation instead of claiming an assessment started", async () => {
    hooks.start.mockRejectedValue(new Error("server unavailable"));
    render(<ReviewerAssessment />);
    fireEvent.click(screen.getByRole("button", { name: "Start or resume assessment" }));
    expect(await screen.findByText("server unavailable")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Submit assessment answer" })).toBeNull();
  });
});

it("practice metrics keep first exposure and distinguish clean false alarms from diagnoses", () => {
  const t: Telemetry = {
    attempts: [
      {
        key: "review/a",
        element: "diff",
        score: 0,
        at: 1,
        day: "2026-10-23",
        review: { category: "TG", defective: true, decision: "approve", elapsedMs: 1000 },
      },
      {
        key: "review/a",
        element: "diff",
        score: 1,
        at: 2,
        day: "2026-10-23",
        review: { category: "TG", defective: true, decision: "block", elapsedMs: 2000 },
      },
      {
        key: "review/b",
        element: "diff",
        score: 1,
        at: 3,
        day: "2026-10-23",
        review: { category: "TG", defective: true, decision: "block", elapsedMs: 3000 },
      },
      {
        key: "review/c",
        element: "diff",
        score: 0,
        at: 4,
        day: "2026-10-23",
        review: { category: "clean", defective: false, decision: "block", elapsedMs: 4000 },
      },
    ],
  };
  expect(practiceReviewerMetrics(t)).toEqual([
    { code: "TG", count: 2, catchRate: 0.5, falseAlarmRate: null, meanFindMs: 3000 },
    { code: "clean", count: 1, catchRate: null, falseAlarmRate: 1, meanFindMs: null },
  ]);
});
