import type { FastifyReply, FastifyRequest } from "fastify";

import { extractApiKey, lookupApiKey } from "./apiKeys.js";
import type { ApiConfig } from "./config.js";
import type { AppContext } from "./context.js";
import { rateLimited } from "./metrics.js";
import { enforceLimit } from "./rateLimit.js";

/**
 * Who is calling, and what they are allowed to spend.
 *
 * Authentication and quota selection are separate steps on purpose: "is this a
 * valid key?" and "how much may this caller spend on engine spawns?" answer
 * different questions, and only the first can reject a request outright.
 */

const IP_SHAPE = /^[0-9a-fA-F.:]{1,64}$/;

export function clientIp(req: FastifyRequest, header: string): string {
  if (header) {
    const raw = req.headers[header];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value && IP_SHAPE.test(value)) return value;
  }
  return IP_SHAPE.test(req.ip) ? req.ip : "unknown";
}

/** One rate-limit budget: a Redis key suffix, its ceiling, and its window. */
export interface Bucket {
  suffix: string;
  limit: number;
  /** Defaults to a minute; key issuance uses an hour. */
  windowSeconds?: number;
  /** Client-facing message when this bucket is the one that rejected. */
  message?: string;
}

/** The three layered buckets a caller spends from. */
export interface Budget {
  id: string;
  general: Bucket;
  heavy: Bucket;
  trace: Bucket;
}

export type Caller = { kind: "anonymous"; id: string } | { kind: "key"; id: string; rpm: number };

/**
 * Spend one unit of `bucket`. Returns true when the request was rejected — the
 * 429 has already been sent by then.
 *
 * Every limited path goes through here so the metric can't be forgotten: it was
 * missing on key issuance while each of the other four call sites repeated the
 * same three lines by hand.
 */
export async function consume(
  ctx: AppContext,
  identity: string,
  bucket: Bucket,
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<boolean> {
  const result = await enforceLimit(
    ctx.redis,
    identity,
    bucket.suffix,
    bucket.limit,
    bucket.windowSeconds ?? 60,
    reply,
    req.log,
  );
  if (!result.limited) return false;

  rateLimited.inc({ budget: bucket.suffix });
  reply.code(429).send({
    ok: false,
    error: bucket.message ?? "rate limit exceeded",
    meta: { retryAfter: result.retryAfter },
  });
  return true;
}

function anonymousBudget(config: ApiConfig, id: string): Budget {
  return {
    id,
    general: { suffix: "general", limit: config.RATE_LIMIT_PER_MIN },
    heavy: { suffix: "heavy", limit: config.RATE_LIMIT_HEAVY_PER_MIN },
    trace: { suffix: "trace", limit: config.TRACE_RATE_LIMIT_PER_MIN },
  };
}

/** Quotas for an authenticated caller. */
export function budgetFor(config: ApiConfig, caller: Caller): Budget {
  if (caller.kind === "anonymous") return anonymousBudget(config, caller.id);
  return {
    id: caller.id,
    general: { suffix: "key-general", limit: caller.rpm },
    heavy: {
      suffix: "key-heavy",
      limit: Math.min(caller.rpm, config.API_KEY_HEAVY_RATE_LIMIT_PER_MIN),
    },
    trace: { suffix: "key-trace", limit: caller.rpm },
  };
}

/**
 * Identify the caller. Returns null when the request is already answered — an
 * unknown key gets a 401, but only after spending from the anonymous budget, so
 * guessing keys costs the guesser exactly what any other traffic from that
 * address costs.
 */
export async function authenticate(
  ctx: AppContext,
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<Caller | null> {
  const key = extractApiKey(req.headers ?? {});
  const ip = () => clientIp(req, ctx.config.CLIENT_IP_HEADER);

  if (!key) return { kind: "anonymous", id: ip() };

  const record = await lookupApiKey(ctx.redis, key, req.log);
  if (record) return { kind: "key", id: key, rpm: record.rpm };

  const anonymous = anonymousBudget(ctx.config, ip());
  if (await consume(ctx, anonymous.id, anonymous.general, req, reply)) return null;

  reply.code(401).send({ ok: false, error: "invalid API key" });
  return null;
}

/** Authenticate and pick the caller's quotas. Null means a reply was already sent. */
export async function resolveBudget(
  ctx: AppContext,
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<Budget | null> {
  const caller = await authenticate(ctx, req, reply);
  return caller && budgetFor(ctx.config, caller);
}

export function requireJsonContentType(req: FastifyRequest, reply: FastifyReply): boolean {
  const contentType = String(req.headers["content-type"] ?? "");
  if (contentType.split(";")[0].trim().toLowerCase() === "application/json") return true;
  reply.code(415).send({ ok: false, error: "Content-Type must be application/json" });
  return false;
}
