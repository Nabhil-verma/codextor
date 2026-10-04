import type { RepoExercise } from "./types";

/* ═══════════════════════════════════════════════════════════════
   Repo snapshots for the archaeology lab (V2.1 Fix 3).

   A codebase the learner has never seen, small enough to read end
   to end: entry → route → service → data, plus a worker. The
   questions ask for a hop, the callers of a function, and a rename's
   blast radius — the three scoping questions a junior is paid to
   answer before changing anything.
   ═══════════════════════════════════════════════════════════════ */

export const SHOP_API: RepoExercise = {
  id: "shop-api",
  title: "Codebase Archaeology: A Shop API You've Never Seen",
  brief:
    "Six files, one request path. Trace it directly — an agent will happily draw you a confident, wrong map; yours has to be checkable.",
  files: [
    {
      path: "server.ts",
      content: `import express from "express";
import { ordersRouter } from "./src/routes/orders";

export function createServer() {
  const app = express();
  app.use(express.json());
  app.use("/orders", ordersRouter);
  return app;
}`,
    },
    {
      path: "src/routes/orders.ts",
      content: `import { Router } from "express";
import { formatPrice } from "../lib/money";
import { findOrder, listOrders as listOrderRows } from "../db/orders";
import { markOrderPaid, summarize } from "../services/orders";

export const ordersRouter = Router();

// The route layer translates HTTP to function calls. It owns no rules.
ordersRouter.get("/", listOrders);
ordersRouter.get("/:id", getOrder);
ordersRouter.post("/:id/pay", payOrder);

async function listOrders(_req, res) {
  const rows = await listOrderRows();
  res.json(
    rows.map((order) => ({
      id: order.id,
      status: order.status,
      total: formatPrice(order.total),
    }))
  );
}

async function getOrder(req, res) {
  const order = await findOrder(Number(req.params.id));
  if (!order) return res.status(404).json({ error: "not found" });
  res.json(summarize(order));
}

async function payOrder(req, res) {
  await markOrderPaid(Number(req.params.id));
  res.json({ ok: true });
}`,
    },
    {
      path: "src/services/orders.ts",
      content: `import { findOrder, updateOrderStatus } from "../db/orders";

/**
 * The business rule for payment: load the order, decide, then update.
 * Already-paid is a no-op; missing orders do nothing.
 */
export async function markOrderPaid(id: number) {
  const order = await findOrder(id);
  if (!order) return false;
  if (order.status === "paid") return true;
  return updateOrderStatus(id, "paid");
}

/** Shapes an order for the API. */
export function summarize(order: { id: number; status: string; total: number }) {
  return {
    id: order.id,
    status: order.status,
    totalCents: order.total,
  };
}`,
    },
    {
      path: "src/db/orders.ts",
      content: `/** In-memory stand-in for the orders table. */
export async function listOrders() {
  return [
    { id: 101, status: "pending", total: 4599 },
    { id: 102, status: "paid", total: 1899 },
  ];
}

export async function findOrder(id: number) {
  const rows = await listOrders();
  return rows.find((row) => row.id === id) ?? null;
}

export async function updateOrderStatus(id: number, status: string) {
  if (!id) throw new Error("id required");
  return status === "paid";
}`,
    },
    {
      path: "src/lib/money.ts",
      content: `/** Formats a cent amount for display. Currency-agnostic on purpose. */
export function formatPrice(cents: number): string {
  return "$" + (cents / 100).toFixed(2);
}`,
    },
    {
      path: "workers/email.ts",
      content: `import { formatPrice } from "../lib/money";

/** Builds the receipt line sent after an order is paid. */
export function sendReceipt(order: { id: number; status: string; total: number }) {
  return "Order #" + order.id + " — " + formatPrice(order.total);
}`,
    },
  ],
  questions: [
    {
      kind: "locate",
      prompt:
        "POST /orders/:id/pay flips the order's status. Which function owns that rule — loads the order, decides, then updates?",
      choices: [
        { file: "server.ts", symbol: "createServer" },
        { file: "src/routes/orders.ts", symbol: "listOrders" },
        { file: "src/routes/orders.ts", symbol: "payOrder" },
        { file: "src/services/orders.ts", symbol: "markOrderPaid" },
        { file: "src/services/orders.ts", symbol: "summarize" },
        { file: "src/db/orders.ts", symbol: "listOrders" },
        { file: "src/db/orders.ts", symbol: "updateOrderStatus" },
        { file: "src/lib/money.ts", symbol: "formatPrice" },
        { file: "workers/email.ts", symbol: "sendReceipt" },
      ],
      answer: { file: "src/services/orders.ts", symbol: "markOrderPaid" },
      why: "The route only delegates. markOrderPaid() loads the order, applies the rule (already paid is a no-op), and performs the update through the DB layer. Finding the layer that owns a rule — not the one that owns the URL — is the whole point of the trace.",
    },
    {
      kind: "select",
      prompt: "Which code paths call formatPrice()? Select every true caller.",
      options: [
        { label: "src/routes/orders.ts → listOrders()", correct: true },
        { label: "workers/email.ts → sendReceipt()", correct: true },
        { label: "src/services/orders.ts → markOrderPaid()", correct: false },
        { label: "src/lib/money.ts → formatPrice()", correct: false },
        { label: "src/db/orders.ts → listOrders()", correct: false },
      ],
      why: "The listing route formats each row's total for the API response, and the receipt worker formats it for the email line. money.ts is the definition, not a caller — a grep hit that is not a call site. The service and the raw DB read never touch display formatting.",
    },
    {
      kind: "select",
      prompt:
        "Order.total is about to be renamed amountCents. Which files must change in the same rename?",
      options: [
        { label: "server.ts", correct: false },
        { label: "src/routes/orders.ts", correct: true },
        { label: "src/services/orders.ts", correct: true },
        { label: "src/db/orders.ts", correct: true },
        { label: "src/lib/money.ts", correct: false },
        { label: "workers/email.ts", correct: true },
      ],
      why: "Four files read or construct the field: the route formats it, the service summarizes it, the DB rows carry it, and the receipt worker formats it. server.ts only wires middleware; money.ts formats a cents number that could come from anywhere — it never names the field. That's a blast radius of four, not six.",
    },
  ],
};

/* ═══════════════════════════════════════════════════════════════
   Fix 5 (Wave 2) — production debugging.

   The incident logs and the incident repo are deliberately small:
   the exercise is not to read everything, it is to pick the right
   three lines out of forty-eight and the right file out of six.
   ═══════════════════════════════════════════════════════════════ */

export const INCIDENT_LOGS: RepoExercise = {
  id: "incident-logs",
  title: "Structured Logs: Reconstructing What Happened",
  brief:
    "Four services, five request ids, one real incident. The logs are JSON lines — filter with your eyes, not with vibes: request ids connect the services, and the first fault is rarely the loudest one.",
  files: [
    {
      path: "logs/gateway.log",
      content: `{"ts":"14:20:00.114","svc":"gateway","level":"info","req":"req_8f21","msg":"POST /checkout/pay accepted"}
{"ts":"14:20:00.220","svc":"gateway","level":"info","req":"req_8f04","msg":"POST /checkout/pay accepted"}
{"ts":"14:20:00.331","svc":"gateway","level":"info","req":"req_8f3a","msg":"GET /catalog accepted"}
{"ts":"14:20:05.402","svc":"gateway","level":"info","req":"req_8f9b","msg":"POST /checkout/pay rejected: cart empty","status":400}
{"ts":"14:20:06.610","svc":"gateway","level":"warn","req":"req_8f3a","msg":"catalog cache miss; retrying","attempt":1}
{"ts":"14:20:09.871","svc":"gateway","level":"info","req":"req_8f3a","msg":"GET /catalog 200 after retry","status":200}
{"ts":"14:20:14.002","svc":"gateway","level":"warn","req":"req_8f77","msg":"upstream slow: orders 1.8s","status":200}
{"ts":"14:20:31.900","svc":"gateway","level":"error","req":"req_8f21","msg":"upstream 502 from orders","status":502}
{"ts":"14:20:32.100","svc":"gateway","level":"error","req":"req_8f04","msg":"upstream 500 from orders","status":500}`,
    },
    {
      path: "logs/orders.log",
      content: `{"ts":"14:20:00.250","svc":"orders","level":"info","req":"req_8f21","msg":"order 5521 captured; calling payments.charge"}
{"ts":"14:20:00.263","svc":"orders","level":"info","req":"req_8f04","msg":"order 5522 capture started"}
{"ts":"14:20:06.720","svc":"orders","level":"error","req":"req_8f21","msg":"payments.charge timed out; will retry","code":"ETIMEDOUT"}
{"ts":"14:20:07.010","svc":"orders","level":"info","req":"req_8f21","msg":"retry 1: payments.charge"}
{"ts":"14:20:12.202","svc":"orders","level":"info","req":"req_8f21","msg":"retry 2: payments.charge"}
{"ts":"14:20:18.450","svc":"orders","level":"error","req":"req_8f04","msg":"inventory lock conflict after 3 waits","code":"LOCK_TIMEOUT"}
{"ts":"14:20:28.700","svc":"orders","level":"error","req":"req_8f21","msg":"payments.charge still timing out; failing request","code":"UPSTREAM_TIMEOUT"}`,
    },
    {
      path: "logs/payments.log",
      content: `{"ts":"14:20:00.300","svc":"payments","level":"info","req":"req_8f21","msg":"charge started order=5521"}
{"ts":"14:20:05.482","svc":"payments","level":"error","req":"req_8f21","msg":"charge timeout after 5000ms","code":"ETIMEDOUT"}
{"ts":"14:20:05.990","svc":"payments","level":"warn","req":"req_8f21","msg":"provider latency p99 climbed to 4.8s this minute","code":"SLOW_PROVIDER"}`,
    },
    {
      path: "logs/queue.log",
      content: `{"ts":"14:20:12.900","svc":"queue","level":"warn","msg":"payment retry backlog growing","depth":87}
{"ts":"14:20:31.600","svc":"queue","level":"warn","msg":"payment retry backlog peaked","depth":214}
{"ts":"14:20:44.010","svc":"queue","level":"info","msg":"backlog draining after provider recovered","depth":12}`,
    },
  ],
  questions: [
    {
      kind: "select",
      prompt:
        "Which request ids actually failed? Select every id whose *final* outcome was a system fault — not a rejection, not a recovered retry.",
      options: [
        { label: "req_8f21 — payment chain timed out, gateway 502", correct: true },
        { label: "req_8f04 — inventory lock conflict, gateway 500", correct: true },
        { label: "req_8f3a — catalog cache miss, recovered on retry (200)", correct: false },
        { label: "req_8f77 — upstream slow (1.8s) but answered 200", correct: false },
        { label: "req_8f9b — empty cart rejected with 400 by design", correct: false },
      ],
      why: "Exactly two requests ended in a fault: req_8f21 (payment timeouts that the gateway surfaced as 502) and req_8f04 (an inventory lock conflict surfaced as 500). The other three are noise with the wrong shape: a cache miss that recovered is a warning, not a failure; a slow-but-200 request is a latency observation; and a 400 rejection is the system working as intended. 'Warnings are loud, 200s are quiet' is how incident reviews blame the wrong request.",
    },
    {
      kind: "select",
      single: true,
      prompt:
        "Which line is the first fault — the earliest error the rest of the chain descends from?",
      options: [
        { label: "14:20:00.300 payments — charge started (req_8f21)", correct: false },
        { label: "14:20:05.482 payments — charge timeout after 5000ms, ETIMEDOUT (req_8f21)", correct: true },
        { label: "14:20:06.720 orders — notices the timeout and schedules a retry (req_8f21)", correct: false },
        { label: "14:20:31.900 gateway — returns 502 to the client (req_8f21)", correct: false },
        { label: "14:20:18.450 orders — inventory lock conflict (req_8f04)", correct: false },
      ],
      why: "The chain descends from the payments charge timing out at 14:20:05.482 — everything after it (orders' notice, the retries, the queue backlog, the gateway's 502) is a consequence or a symptom. The 'charge started' line is normal operation; the inventory conflict is a separate incident on a different request. Finding the *first* fault is what turns a wall of errors into a causal chain.",
    },
    {
      kind: "select",
      single: true,
      prompt: "Which service originated the incident — the one whose failure the others were reacting to?",
      options: [
        { label: "payments — its charge call stopped answering in time", correct: true },
        { label: "orders — it retried and then failed the request", correct: false },
        { label: "gateway — it returned the 502 the user saw", correct: false },
        { label: "queue — its backlog grew during the incident", correct: false },
      ],
      why: "Payments originated it: its charge call exceeded the 5s budget (and its own log shows provider p99 latency climbing). Orders was reacting (timeout → retry → fail), the gateway was reporting (502), and the queue was absorbing (backlog). Naming the origin service is the last step before you open a file — and it is decided by causality, not by which service logged the loudest error.",
    },
  ],
};

export const INCIDENT_TIMELINE: RepoExercise = {
  id: "incident-timeline",
  title: "The Incident Timeline: Pick the First File to Check",
  brief:
    "The timeline says payments timed out. The sort exercise proves you can order the chain; this snapshot asks the reviewer's next question — which file do you actually open first to confirm it?",
  files: [
    {
      path: "src/gateway/server.ts",
      content: `import { ordersHandler } from "../orders/handler";

/** Public entry point: proxies checkout calls to the orders service. */
export async function handleCheckout(req: Request) {
  const res = await ordersHandler(req);
  if (res.status >= 500) {
    return new Response("Bad Gateway", { status: 502 });
  }
  return res;
}`,
    },
    {
      path: "src/orders/handler.ts",
      content: `import { chargeCard } from "../payments/client";

const MAX_RETRIES = 2;

/** Captures an order, retrying the payment call while it looks transient. */
export async function ordersHandler(req: Request) {
  const id = await createOrder(req);
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await chargeCard(id);
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
    }
  }
}`,
    },
    {
      path: "src/payments/client.ts",
      content: `const TIMEOUT_MS = 5000;
const PROVIDER_URL = "https://psp.example.com";

/**
 * Charges the card and rejects when the provider doesn't answer inside the
 * budget. The timeout is what the incident timeline points at.
 */
export async function chargeCard(orderId: number) {
  const res = await fetchWithTimeout(PROVIDER_URL + "/charges", {
    orderId,
    timeoutMs: TIMEOUT_MS,
  });
  if (!res.ok) throw new Error("charge failed: " + res.status);
  return res.json();
}`,
    },
    {
      path: "src/queue/worker.ts",
      content: `import { chargeCard } from "../payments/client";

/** Drains payment retries — one slow provider backs up the whole queue. */
export async function drainRetries(jobs: Job[]) {
  for (const job of jobs) {
    await chargeCard(job.orderId);
  }
}`,
    },
  ],
  questions: [
    {
      kind: "locate",
      prompt:
        "The timeline points at payments as the origin. Which file + function do you open first to confirm the timeout path?",
      choices: [
        { file: "src/gateway/server.ts", symbol: "handleCheckout" },
        { file: "src/orders/handler.ts", symbol: "ordersHandler" },
        { file: "src/payments/client.ts", symbol: "chargeCard" },
        { file: "src/queue/worker.ts", symbol: "drainRetries" },
      ],
      answer: { file: "src/payments/client.ts", symbol: "chargeCard" },
      why: "chargeCard() is where the timeout budget lives (TIMEOUT_MS = 5000) and where the provider call is made — the timeline's 'payments timeout' maps to exactly this function. The gateway 502 and the queue backlog are downstream reactions; opening them first confirms symptoms you already have in the logs, not the cause.",
    },
    {
      kind: "select",
      prompt:
        "Which of these are downstream symptoms to *ignore for now* rather than the fault itself? Select all that apply.",
      options: [
        { label: "The queue backlog growing", correct: true },
        { label: "The gateway returning 502", correct: true },
        { label: "The orders service retrying twice", correct: true },
        { label: "The payments charge exceeding its 5s budget", correct: false },
        { label: "The provider's climbing p99 latency", correct: false },
      ],
      why: "The backlog, the 502 and the retries are all reactions to the payment call failing — fix the origin and they disappear. The charge timeout is the fault, and the provider latency is its leading indicator (the signal that makes the timeout plausible), not a separate symptom to triage.",
    },
  ],
};

export const REPO_SNAPSHOTS: RepoExercise[] = [SHOP_API, INCIDENT_LOGS, INCIDENT_TIMELINE];

export function repoSnapshot(id: string): RepoExercise {
  const found = REPO_SNAPSHOTS.find((r) => r.id === id);
  if (!found) {
    throw new Error(
      `Unknown repo snapshot "${id}" — add it to src/data/repo-snapshots.ts`
    );
  }
  return found;
}
