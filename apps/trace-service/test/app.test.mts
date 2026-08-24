/**
 * HTTP-layer tests for the trace service: routing, request validation, and the
 * mapping from a sandbox failure to a status code. The sandbox is a stub — the
 * real one owns a worker thread and engine262, whose behaviour is covered by
 * execute.test.mts and sandbox.test.mts.
 */

import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import type { TraceServiceConfig } from "../config.ts";
import { buildTraceApp, type SandboxLike } from "../src/server/app.ts";
import {
  BudgetExceededError,
  SandboxBusyError,
  type SandboxTask,
} from "../src/server/execute/sandbox.ts";
import type { ExecuteResponse } from "../src/server/types.ts";

const config: TraceServiceConfig = {
  PORT: 0,
  HOST: "127.0.0.1",
  MAX_TIMEOUT_MS: 5_000,
  MAX_SOURCE_LENGTH: 64,
  LOG_LEVEL: "silent",
};

type StubSandbox = SandboxLike & { tasks: SandboxTask[]; closed: boolean };

function stubSandbox(
  run: (task: SandboxTask) => ExecuteResponse | Promise<ExecuteResponse> = () =>
    ({ success: true }) as ExecuteResponse,
): StubSandbox {
  const stub: StubSandbox = {
    tasks: [],
    closed: false,
    async run(task) {
      stub.tasks.push(task);
      return run(task);
    },
    close() {
      stub.closed = true;
    },
  };
  return stub;
}

let open: FastifyInstance[] = [];

function makeApp(
  sandbox: StubSandbox,
  overrides: Partial<TraceServiceConfig> = {},
): FastifyInstance {
  const app = buildTraceApp({ config: { ...config, ...overrides }, sandbox });
  open.push(app);
  return app;
}

afterEach(async () => {
  await Promise.all(open.map((app) => app.close()));
  open = [];
});

describe("GET /healthz", () => {
  it("answers without touching the sandbox", async () => {
    const sandbox = stubSandbox();
    const res = await makeApp(sandbox).inject({ method: "GET", url: "/healthz" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(sandbox.tasks).toHaveLength(0);
  });
});

describe("GET /functions", () => {
  it("advertises the operations, operators and endpoints a client needs", async () => {
    const res = await makeApp(stubSandbox()).inject({ method: "GET", url: "/functions" });
    const body = res.json();

    expect(res.statusCode).toBe(200);
    expect(body.available_functions).toContain("ToNumber");
    expect(body.supported_operators).toContain("===");
    expect(body.endpoints.type_conversion).toContain("/execute/type-conversion");
    expect(body.endpoints.equality).toContain("/execute/equality");
    // Every advertised function must carry the metadata the UI switches on.
    for (const name of body.available_functions) {
      expect(body.function_meta[name]).toBeDefined();
    }
  });
});

describe("POST /execute/type-conversion", () => {
  it("hands the request to the sandbox as a unary task", async () => {
    const sandbox = stubSandbox(() => ({
      success: true,
      functionName: "ToNumber",
      result: { type: "Number", value: 1 },
    }));
    const res = await makeApp(sandbox).inject({
      method: "POST",
      url: "/execute/type-conversion",
      payload: { functionName: "ToNumber", input: "'1'", preferredType: "number" },
    });

    expect(res.statusCode).toBe(200);
    expect(sandbox.tasks[0]).toEqual({
      kind: "unary",
      functionName: "ToNumber",
      input: "'1'",
      preferredType: "number",
    });
  });

  it("answers 400 when the trace itself reports failure", async () => {
    const sandbox = stubSandbox(() => ({
      success: false,
      functionName: "ToNumber",
      error: "nope",
    }));
    const res = await makeApp(sandbox).inject({
      method: "POST",
      url: "/execute/type-conversion",
      payload: { functionName: "ToNumber", input: "1" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ success: false, error: "nope" });
  });

  it("rejects a function it does not offer, before running anything", async () => {
    const sandbox = stubSandbox();
    const res = await makeApp(sandbox).inject({
      method: "POST",
      url: "/execute/type-conversion",
      payload: { functionName: "DropTables", input: "1" },
    });

    expect(res.statusCode).toBe(400);
    expect(sandbox.tasks).toHaveLength(0);
  });

  it("rejects an input over MAX_SOURCE_LENGTH", async () => {
    const sandbox = stubSandbox();
    const res = await makeApp(sandbox).inject({
      method: "POST",
      url: "/execute/type-conversion",
      payload: { functionName: "ToNumber", input: "0".repeat(config.MAX_SOURCE_LENGTH + 1) },
    });

    expect(res.statusCode).toBe(400);
    expect(sandbox.tasks).toHaveLength(0);
  });

  it("rejects a preferredType outside the two the spec defines", async () => {
    const res = await makeApp(stubSandbox()).inject({
      method: "POST",
      url: "/execute/type-conversion",
      payload: { functionName: "ToPrimitive", input: "{}", preferredType: "default" },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("POST /execute/equality", () => {
  it("hands the expression to the sandbox as a binary task", async () => {
    const sandbox = stubSandbox();
    const res = await makeApp(sandbox).inject({
      method: "POST",
      url: "/execute/equality",
      payload: { input: "[] == ![]" },
    });

    expect(res.statusCode).toBe(200);
    expect(sandbox.tasks[0]).toEqual({ kind: "binary", input: "[] == ![]" });
  });

  it("labels a failure as BinaryExpression, since there is no function name", async () => {
    const sandbox = stubSandbox(() => {
      throw new Error("worker died");
    });
    const res = await makeApp(sandbox).inject({
      method: "POST",
      url: "/execute/equality",
      payload: { input: "1 == 1" },
    });

    expect(res.statusCode).toBe(500);
    expect(res.json().functionName).toBe("BinaryExpression");
  });

  it("rejects an empty expression", async () => {
    const res = await makeApp(stubSandbox()).inject({
      method: "POST",
      url: "/execute/equality",
      payload: { input: "" },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("sandbox failure mapping", () => {
  it("turns an exhausted budget into a 400 with a code the client can switch on", async () => {
    const sandbox = stubSandbox(() => {
      throw new BudgetExceededError(5_000);
    });
    const res = await makeApp(sandbox).inject({
      method: "POST",
      url: "/execute/type-conversion",
      payload: { functionName: "ToNumber", input: "1" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      success: false,
      code: "execution_budget_exceeded",
      functionName: "ToNumber",
    });
  });

  it("turns backpressure into a 429 with Retry-After", async () => {
    const sandbox = stubSandbox(() => {
      throw new SandboxBusyError(4);
    });
    const res = await makeApp(sandbox).inject({
      method: "POST",
      url: "/execute/equality",
      payload: { input: "1 == 1" },
    });

    expect(res.statusCode).toBe(429);
    expect(res.headers["retry-after"]).toBe("1");
    expect(res.json().code).toBe("trace_worker_busy");
  });

  it("turns anything else into a 500 that leaks nothing", async () => {
    const sandbox = stubSandbox(() => {
      throw new Error("ECONNRESET at /internal/path/secret");
    });
    const res = await makeApp(sandbox).inject({
      method: "POST",
      url: "/execute/type-conversion",
      payload: { functionName: "ToNumber", input: "1" },
    });

    expect(res.statusCode).toBe(500);
    expect(res.json()).toMatchObject({ code: "internal_error", error: "Trace execution failed" });
    expect(res.body).not.toContain("secret");
  });
});

describe("GET /spec/:functionName", () => {
  it("serves the spec HTML for a supported operation", async () => {
    const res = await makeApp(stubSandbox()).inject({ method: "GET", url: "/spec/ToNumber" });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.body).toContain("<emu-clause");
    // The generated clause links back out to the published specification.
    expect(res.body).toContain("262.ecma-international.org");
  }, 60_000);

  it("serves the equality algorithms too", async () => {
    const res = await makeApp(stubSandbox()).inject({ method: "GET", url: "/spec/IsLooselyEqual" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("IsLooselyEqual");
  }, 60_000);

  it("404s an operation with no spec, without generating anything", async () => {
    const res = await makeApp(stubSandbox()).inject({ method: "GET", url: "/spec/NotAnOperation" });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'No spec available for "NotAnOperation"' });
  });

  it("does not let the client cache outside production", async () => {
    const res = await makeApp(stubSandbox()).inject({ method: "GET", url: "/spec/ToBoolean" });
    expect(res.headers["cache-control"]).toBe("no-store");
  }, 60_000);
});

describe("shutdown", () => {
  it("closes the sandbox with the app", async () => {
    const sandbox = stubSandbox();
    const app = buildTraceApp({ config, sandbox });
    await app.close();
    expect(sandbox.closed).toBe(true);
  });
});
