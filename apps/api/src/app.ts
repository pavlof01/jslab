import underPressure from "@fastify/under-pressure";
import apiReference from "@scalar/fastify-api-reference";
import fastify, { type FastifyInstance } from "fastify";
import type { AppContext } from "./context.js";
import { ENGINE_KINDS } from "./engines.js";
import { registry } from "./metrics.js";
import { openapiDoc } from "./openapi.js";
import { registerEngineRoutes } from "./routes/engines.js";
import { registerKeyRoutes } from "./routes/keys.js";
import { registerRunRoute } from "./routes/run.js";
import { registerTraceRoutes } from "./routes/trace.js";
import { flagSpecs } from "./schemas.js";

/** The public flag catalog, built once from the same source the sanitizer uses. */
function buildFlagsDoc() {
  return {
    ok: true,
    engines: Object.fromEntries(
      ENGINE_KINDS.map((engine) => [
        engine,
        flagSpecs(engine).map((spec) => ({
          flag: spec.flag,
          description: spec.description,
          category: spec.category,
          ...(spec.takesValue ? { takesValue: true, valuePattern: spec.valuePattern?.source } : {}),
        })),
      ]),
    ),
  };
}

/**
 * Assemble the gateway from an explicit context.
 *
 * Nothing here reads the environment or opens a connection: `server.ts` owns
 * that. Handing the config and the Redis client in is what lets the routes be
 * driven with `app.inject()` against a fake Redis, which is why the request
 * pipeline can be tested at all.
 */
export function buildApp(ctx: AppContext): FastifyInstance {
  const { config, redis } = ctx;

  const app = fastify({
    logger: { level: config.LOG_LEVEL },
    bodyLimit: config.REQUEST_BODY_LIMIT_BYTES,
    trustProxy: config.TRUST_PROXY_HOPS,
  });

  app.register(underPressure, {
    maxEventLoopDelay: 1000,
    maxHeapUsedBytes: 480 * 1024 * 1024,
    maxRssBytes: 600 * 1024 * 1024,
    message: "under pressure",
    retryAfter: 10,
  });

  app.get("/healthz", async () => ({ ok: true, redis: redis.status }));

  app.get("/metrics", async (_req, reply) => {
    reply.header("Content-Type", registry.contentType);
    return registry.metrics();
  });

  app.get("/api/openapi.json", async () => openapiDoc);

  const flagsDoc = buildFlagsDoc();
  app.get("/api/flags", async () => flagsDoc);

  app.register(apiReference, {
    routePrefix: "/api/docs",
    configuration: { content: openapiDoc },
  });

  registerEngineRoutes(app, ctx);
  registerRunRoute(app, ctx);
  registerKeyRoutes(app, ctx);
  registerTraceRoutes(app, ctx);

  return app;
}
