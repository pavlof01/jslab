import fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";

import type { TraceServiceConfig } from "../../config.ts";
import { AVAILABLE_FUNCTIONS, FUNCTION_META, SUPPORTED_OPERATORS } from "./operations.ts";
import { BudgetExceededError, SandboxBusyError, type SandboxTask } from "./execute/sandbox.ts";
import { buildEqualityBodySchema, buildTypeConversionBodySchema } from "./schema.ts";
import { SUPPORTED_SPEC_FUNCTIONS } from "./operations.ts";
import { buildSpecHtmlForFunction } from "./spec-generator.ts";

/**
 * The service's HTTP surface, built without binding a port so the routes can be
 * driven with `app.inject()`. `server.ts` is this plus `listen()` and the
 * signal handlers.
 *
 * The sandbox is injected rather than constructed here: it owns a worker
 * thread, and a test that only exercises routing should not have to boot
 * engine262 to do it.
 */

/** The part of TraceSandbox the routes use. */
export interface SandboxLike {
  run(task: SandboxTask): Promise<unknown>;
  close(): Promise<void> | void;
}

export interface TraceAppDeps {
  config: TraceServiceConfig;
  sandbox: SandboxLike;
}

type UnaryBody = { functionName: string; input: string; preferredType?: "string" | "number" };
type BinaryBody = { input: string };

export function buildTraceApp({ config, sandbox }: TraceAppDeps): FastifyInstance {
  const app = fastify({ logger: { level: config.LOG_LEVEL } });

  // Traces never run on this thread — see execute/sandbox.ts for why.
  app.addHook("onClose", () => sandbox.close());

  const typeConversionBodySchema = buildTypeConversionBodySchema(AVAILABLE_FUNCTIONS, config.MAX_SOURCE_LENGTH);
  const equalityBodySchema = buildEqualityBodySchema(config.MAX_SOURCE_LENGTH);

  /**
   * Runs a task in the sandbox and turns every failure mode into a JSON error.
   */
  async function runTask(request: FastifyRequest, reply: FastifyReply, functionName: string, task: SandboxTask) {
    try {
      const result = (await sandbox.run(task)) as { success: boolean };
      return reply.status(result.success ? 200 : 400).send(result);
    } catch (error) {
      if (error instanceof BudgetExceededError) {
        // The budget is a deterministic property of the submitted input, so this is
        // a client error and a retry would burn the same CPU again — 400, like every
        // other input the service cannot execute.
        return reply.status(400).send({
          success: false,
          functionName,
          code: "execution_budget_exceeded",
          error: error.message,
        });
      }
      if (error instanceof SandboxBusyError) {
        // Same backpressure contract the engine services use: 429 + Retry-After.
        return reply.header("retry-after", "1").status(429).send({
          success: false,
          functionName,
          code: "trace_worker_busy",
          error: error.message,
        });
      }
      request.log.error({ err: error }, "trace worker failed");
      return reply.status(500).send({
        success: false,
        functionName,
        code: "internal_error",
        error: "Trace execution failed",
      });
    }
  }

  app.get("/healthz", async () => ({ ok: true }));

  app.get("/functions", async () => ({
    available_functions: AVAILABLE_FUNCTIONS,
    function_meta: FUNCTION_META,
    supported_operators: SUPPORTED_OPERATORS,
    endpoints: {
      type_conversion: "POST /execute/type-conversion { functionName, input, preferredType? }",
      equality: "POST /execute/equality { input } — input is a binary expression like \"{} == ![]\"",
    },
    note: "Real ECMA262 abstract operation execution with full trace capture",
  }));

  app.post<{ Body: UnaryBody }>(
    "/execute/type-conversion",
    { schema: { body: typeConversionBodySchema } },
    async (request: FastifyRequest<{ Body: UnaryBody }>, reply: FastifyReply) => {
      const { functionName, input, preferredType } = request.body;
      return runTask(request, reply, functionName, { kind: "unary", functionName, input, preferredType });
    },
  );

  app.post<{ Body: BinaryBody }>(
    "/execute/equality",
    { schema: { body: equalityBodySchema } },
    async (request: FastifyRequest<{ Body: BinaryBody }>, reply: FastifyReply) => {
      const { input } = request.body;
      return runTask(request, reply, "BinaryExpression", { kind: "binary", input });
    },
  );

  app.get<{ Params: { functionName: string } }>("/spec/:functionName", async (request, reply) => {
    const { functionName } = request.params;

    if (!SUPPORTED_SPEC_FUNCTIONS.includes(functionName)) {
      return reply.status(404).send({ error: `No spec available for "${functionName}"` });
    }

    const html = await buildSpecHtmlForFunction(functionName);
    if (!html) {
      return reply.status(404).send({ error: `No spec available for "${functionName}"` });
    }

    const cacheControl = process.env.NODE_ENV === "production" ? "public, max-age=3600" : "no-store";

    return reply
      .header("Content-Type", "text/html; charset=utf-8")
      .header("Cache-Control", cacheControl)
      .send(html);
  });

  return app;
}
