import type { FastifyInstance } from "fastify";
import { readJsonCache, writeJsonCache } from "../cache.js";
import type { AppContext } from "../context.js";
import { ENGINE_KINDS, engineBaseUrls } from "../engines.js";
import { cacheEvents } from "../metrics.js";
import { consume, resolveBudget } from "../security.js";
import type { EngineKind } from "../types.js";
import { getJson, joinUrl, parseJson } from "../upstream.js";

const CACHE_TTL_SECONDS = 60;
const PROBE_TIMEOUT_MS = 2_000;
const CACHE_KEY = "api-cache:engines";

export interface EngineStatus {
  engine: EngineKind;
  ok: boolean;
  version: string | null;
}

interface HealthzBody {
  ok?: boolean;
  engine?: string;
  version?: string | null;
}

export function registerEngineRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { config, redis } = ctx;
  const baseUrls = engineBaseUrls(config);

  let inFlight: Promise<EngineStatus[]> | null = null;

  async function probe(engine: EngineKind): Promise<EngineStatus> {
    const res = await getJson(`engine-${engine}`, joinUrl(baseUrls[engine], "/healthz"), PROBE_TIMEOUT_MS);
    if (!res.ok || res.status !== 200) return { engine, ok: false, version: null };

    const body = parseJson<HealthzBody>(res.text);
    if (body?.engine && body.engine !== engine) {
      app.log.error({ expected: engine, reported: body.engine }, "engine identity mismatch");
      return { engine, ok: false, version: null };
    }
    return { engine, ok: body?.ok === true, version: body?.version ?? null };
  }

  async function fanOut(log: FastifyInstance["log"]): Promise<EngineStatus[]> {
    const engines = await Promise.all(ENGINE_KINDS.map((engine) => probe(engine)));
    const unreachable = engines.filter((entry) => !entry.ok).map((entry) => entry.engine);
    if (unreachable.length > 0) log.warn({ unreachable }, "engine health probe failed");

    if (unreachable.length < engines.length) {
      await writeJsonCache(redis, CACHE_KEY, engines, CACHE_TTL_SECONDS, log);
    }
    return engines;
  }

  app.get("/api/engines", async (req, reply) => {
    const budget = await resolveBudget(ctx, req, reply);
    if (!budget) return reply;
    if (await consume(ctx, budget.id, budget.general, req, reply)) return reply;

    const cached = await readJsonCache<EngineStatus[]>(redis, CACHE_KEY, req.log);
    if (cached) {
      cacheEvents.inc({ result: "hit" });
      return { engines: cached, meta: { cacheHit: true } };
    }
    cacheEvents.inc({ result: "miss" });

    inFlight ??= fanOut(req.log).finally(() => {
      inFlight = null;
    });

    return { engines: await inFlight, meta: { cacheHit: false } };
  });
}
