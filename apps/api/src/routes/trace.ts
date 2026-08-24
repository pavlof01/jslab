import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { z } from "zod";
import type { AppContext } from "../context.js";
import { traceExecuteEqualitySchema, traceExecuteRequestSchema } from "../schemas.js";
import { consume, resolveBudget } from "../security.js";
import { joinUrl, parseJson, postJson } from "../upstream.js";

/**
 * Both trace endpoints are the same route with a different body schema, so they
 * are registered from one factory: a new abstract-operation category is a line
 * at the bottom of this file, not another copy of the handler.
 */
type TraceCategory = "type-conversion" | "equality";

/** Echo the upstream's Retry-After into the body, where the visualizer reads it. */
function withRetryAfter(payload: unknown, retryAfter: string): unknown {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;

  const meta = (payload as { meta?: Record<string, unknown> }).meta;
  if (meta?.retryAfter !== undefined) return payload;

  const seconds = Number(retryAfter);
  return {
    ...(payload as Record<string, unknown>),
    meta: { ...(meta ?? {}), retryAfter: Number.isFinite(seconds) ? seconds : retryAfter },
  };
}

export function registerTraceRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { config } = ctx;

  async function proxy(
    req: FastifyRequest,
    reply: FastifyReply,
    upstreamPath: string,
    body: unknown,
  ): Promise<void> {
    const url = joinUrl(config.TRACE_SERVICE_URL, upstreamPath);
    const res = await postJson("trace-service", url, body, config.MAX_TIMEOUT_MS + 1000);

    if (!res.ok) {
      req.log.error(
        { err: res.error, traceServiceUrl: url, kind: res.kind },
        "trace-service request failed",
      );
      reply.code(502).send({ ok: false, error: res.message });
      return;
    }

    const payload = parseJson<unknown>(res.text);
    if (payload === undefined) {
      req.log.error(
        { status: res.status, sample: res.text.slice(0, 2000) },
        "trace-service returned non-json",
      );
      reply.code(502).send({ ok: false, error: "trace-service returned invalid response" });
      return;
    }

    const retryAfter = res.headers["retry-after"];
    if (retryAfter === undefined) {
      reply.code(res.status).send(payload);
      return;
    }

    reply.header("retry-after", String(retryAfter));
    reply.code(res.status).send(withRetryAfter(payload, String(retryAfter)));
  }

  /** Traces are cheap per call but bursty, so they spend from their own bucket too. */
  async function limited(req: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    const budget = await resolveBudget(ctx, req, reply);
    if (!budget) return true; // invalid API key → 401 already sent
    if (await consume(ctx, budget.id, budget.general, req, reply)) return true;
    return consume(ctx, budget.id, budget.trace, req, reply);
  }

  function register(name: TraceCategory, schema: z.ZodType<unknown>): void {
    app.post(`/api/trace/execute/${name}`, async (req, reply) => {
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        reply
          .code(400)
          .send({ ok: false, error: parsed.error.issues[0]?.message ?? "invalid payload" });
        return;
      }
      if (await limited(req, reply)) return;
      await proxy(req, reply, `/execute/${name}`, parsed.data);
    });
  }

  register("type-conversion", traceExecuteRequestSchema);
  register("equality", traceExecuteEqualitySchema);
}
