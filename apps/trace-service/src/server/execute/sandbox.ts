/**
 * Runs traces in a worker thread so that no input can wedge the service.
 *
 * engine262 evaluates user-supplied code synchronously: `{ valueOf: () => { while (true) {} } }`
 * never returns to the event loop, so nothing living in this thread — a timer, an
 * AbortSignal, a counter around `callGenerator` — can ever regain control. A worker
 * thread can be killed mid-loop with `terminate()`, which is the only reliable
 * budget for a single-process pod on a shared node.
 *
 * One worker handles one task at a time; tasks queue behind it and the queue is
 * bounded, so a burst of expensive inputs turns into backpressure instead of a
 * fork bomb on a 4-CPU node.
 */
import { Worker } from "node:worker_threads";
import type { ExecuteResponse } from "../types.ts";

export type SandboxTask =
  | { kind: "unary"; functionName: string; input: string; preferredType?: "string" | "number" }
  | { kind: "binary"; input: string };

/** Worker → host message; `id` guards against replies from a recycled worker. */
export type SandboxReply =
  | { id: number; ok: true; value: ExecuteResponse }
  | { id: number; ok: false; error: string }
  | { ready: true };

export class BudgetExceededError extends Error {
  constructor(readonly budgetMs: number) {
    super(`Execution exceeded the ${budgetMs}ms budget and was aborted`);
    this.name = "BudgetExceededError";
  }
}

export class SandboxBusyError extends Error {
  constructor(readonly queueDepth: number) {
    super(`Trace worker is busy (${queueDepth} requests already queued)`);
    this.name = "SandboxBusyError";
  }
}

export interface TraceSandboxOptions {
  /** Hard deadline for a single task; the worker is killed when it passes. */
  budgetMs: number;
  /** How many tasks may wait while one executes. */
  maxQueueDepth?: number;
  /** Worker entry point. Overridden by tests to exercise the budget without engine262. */
  workerUrl?: URL;
  /** Heap cap, so a memory bomb dies as a worker error instead of an OOM kill of the pod. */
  maxOldGenerationSizeMb?: number;
}

interface Pending {
  task: SandboxTask;
  resolve: (response: ExecuteResponse) => void;
  reject: (error: Error) => void;
  /** Absolute deadline, set when the task is QUEUED — see #pump. */
  deadlineAt: number;
}

interface InFlight extends Pending {
  id: number;
  timer: NodeJS.Timeout;
}

// The budget is a whole-request deadline, so anything beyond a task or two in
// the queue is guaranteed to expire before it runs. Failing fast with a 429 is
// more useful to the caller than a late timeout the gateway already gave up on.
const DEFAULT_MAX_QUEUE_DEPTH = 2;
const DEFAULT_MAX_OLD_GENERATION_MB = 256;

export class TraceSandbox {
  readonly #budgetMs: number;
  readonly #maxQueueDepth: number;
  readonly #workerUrl: URL;
  readonly #maxOldGenerationSizeMb: number;
  #worker: Worker | null = null;
  /** Set when the current worker has finished importing engine262. */
  #ready = false;
  #queue: Pending[] = [];
  #inFlight: InFlight | null = null;
  #nextId = 1;
  #closed = false;

  constructor(options: TraceSandboxOptions) {
    this.#budgetMs = options.budgetMs;
    this.#maxQueueDepth = options.maxQueueDepth ?? DEFAULT_MAX_QUEUE_DEPTH;
    // The .mjs bootstrap, not worker.ts: see worker-bootstrap.mjs for why the
    // TypeScript body cannot be a worker entry point directly.
    this.#workerUrl = options.workerUrl ?? new URL("./worker-bootstrap.mjs", import.meta.url);
    this.#maxOldGenerationSizeMb = options.maxOldGenerationSizeMb ?? DEFAULT_MAX_OLD_GENERATION_MB;
  }

  get budgetMs(): number {
    return this.#budgetMs;
  }

  /** Boots the worker ahead of time so its startup is not billed to a caller's budget. */
  warm(): void {
    if (!this.#closed) this.#ensureWorker();
  }

  run(task: SandboxTask): Promise<ExecuteResponse> {
    if (this.#closed) return Promise.reject(new Error("Trace sandbox is closed"));
    // Tasks also sit in the queue while a cold worker boots, and the head of
    // the queue is then the one about to execute rather than one waiting behind
    // another — so count waiters, not queue entries.
    const waiting = this.#queue.length - (this.#inFlight ? 0 : 1);
    if (waiting >= this.#maxQueueDepth) {
      return Promise.reject(new SandboxBusyError(this.#queue.length));
    }
    // The clock starts here, not at dispatch: the caller's connection is bounded
    // by the gateway's upstream timeout, so time spent waiting behind another
    // trace is time the caller has already lost.
    const deadlineAt = Date.now() + this.#budgetMs;
    return new Promise<ExecuteResponse>((resolve, reject) => {
      this.#queue.push({ task, resolve, reject, deadlineAt });
      this.#pump();
    });
  }

  async close(): Promise<void> {
    this.#closed = true;
    const queued = this.#queue;
    this.#queue = [];
    for (const pending of queued) pending.reject(new Error("Trace sandbox is closed"));
    if (this.#inFlight) {
      clearTimeout(this.#inFlight.timer);
      this.#inFlight.reject(new Error("Trace sandbox is closed"));
      this.#inFlight = null;
    }
    await this.#recycleWorker();
  }

  #pump(): void {
    if (this.#inFlight || this.#queue.length === 0) return;

    // Boot is not billed to the caller: until the worker says it is ready, the
    // task stays queued and this returns. #onReady pumps again. Without this a
    // recycled (cold) worker would spend the next caller's whole budget on
    // importing engine262, killing a worker that never ran anything — a loop
    // that used to sustain itself across every subsequent request.
    const worker = this.#ensureWorker();
    if (!this.#ready) return;

    const now = Date.now();
    const pending = this.#queue.shift();
    if (!pending) return;
    const remaining = pending.deadlineAt - now;
    if (remaining <= 0) {
      pending.reject(new BudgetExceededError(this.#budgetMs));
      this.#pump();
      return;
    }

    const id = this.#nextId++;
    const timer = setTimeout(() => this.#onBudgetExceeded(id), remaining);
    // The live worker already keeps the loop alive; the timer must not do so on its own.
    timer.unref();
    this.#inFlight = { ...pending, id, timer };
    worker.postMessage({ id, task: pending.task });
  }

  #ensureWorker(): Worker {
    if (this.#worker) return this.#worker;
    this.#ready = false;
    const worker = new Worker(this.#workerUrl, {
      resourceLimits: { maxOldGenerationSizeMb: this.#maxOldGenerationSizeMb },
    });
    worker.on("message", (reply: SandboxReply) => this.#onReply(worker, reply));
    worker.on("error", (error: Error) => this.#onWorkerFailure(worker, error));
    worker.on("exit", (code: number) => {
      if (code !== 0)
        this.#onWorkerFailure(worker, new Error(`Trace worker exited with code ${code}`));
    });
    this.#worker = worker;
    return worker;
  }

  #onReply(worker: Worker, reply: SandboxReply): void {
    if (this.#worker !== worker) return;
    if ("ready" in reply) {
      this.#ready = true;
      this.#pump();
      return;
    }
    const inFlight = this.#settle(reply.id);
    if (!inFlight) return;
    if (reply.ok) inFlight.resolve(reply.value);
    else inFlight.reject(new Error(reply.error));
    this.#pump();
  }

  #onWorkerFailure(worker: Worker, error: Error): void {
    if (this.#worker !== worker) return;
    const inFlight = this.#inFlight;
    this.#inFlight = null;
    if (inFlight) {
      clearTimeout(inFlight.timer);
      inFlight.reject(error);
    }

    // A worker that dies before it ever reports ready failed to boot, and
    // respawning it for the next caller would fail the same way. Nothing has a
    // deadline armed yet at that point (the budget starts at dispatch), so
    // queued callers would hang forever instead of hearing about it — fail
    // them now and let the next request pay for one fresh boot attempt.
    if (!this.#ready) {
      const queued = this.#queue;
      this.#queue = [];
      for (const pending of queued) pending.reject(error);
    }

    void this.#recycleWorker();
    this.#pump();
  }

  #onBudgetExceeded(id: number): void {
    const inFlight = this.#settle(id);
    if (!inFlight) return;
    inFlight.reject(new BudgetExceededError(this.#budgetMs));
    // The thread is stuck inside engine262; only terminate can reclaim it.
    void this.#recycleWorker();
    this.#pump();
  }

  /** Clears the in-flight task if `id` still matches, guarding late/stale events. */
  #settle(id: number): InFlight | null {
    const inFlight = this.#inFlight;
    if (!inFlight || inFlight.id !== id) return null;
    clearTimeout(inFlight.timer);
    this.#inFlight = null;
    return inFlight;
  }

  async #recycleWorker(): Promise<void> {
    const worker = this.#worker;
    this.#worker = null;
    this.#ready = false;
    if (!worker) return;
    // Detach first so the termination does not re-enter the failure path.
    worker.removeAllListeners();
    await worker.terminate();
  }
}
