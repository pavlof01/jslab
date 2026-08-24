import type { FastifyInstance } from "fastify";
import { extractApiKey, issueApiKey, revokeApiKey } from "../apiKeys.js";
import type { AppContext } from "../context.js";
import { hashIdentity } from "../rateLimit.js";
import { clientIp, consume, requireJsonContentType } from "../security.js";

export function registerKeyRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { config, redis } = ctx;

  app.post("/api/keys", async (req, reply) => {
    if (!requireJsonContentType(req, reply)) return;

    const ip = clientIp(req, config.CLIENT_IP_HEADER);
    const issued = await consume(
      ctx,
      ip,
      {
        suffix: "key-issue",
        limit: config.API_KEY_ISSUE_PER_HOUR,
        windowSeconds: 3600,
        message: "key issuance limit reached",
      },
      req,
      reply,
    );
    if (issued) return;

    const result = await issueApiKey(
      redis,
      config.API_KEY_RATE_LIMIT_PER_MIN,
      Date.now(),
      config.API_KEY_TTL_SECONDS,
      hashIdentity(ip),
      config.API_KEY_MAX_PER_ISSUER,
      req.log,
    );

    if (!result.ok) {
      if (result.reason === "owner_limit") {
        reply.code(429).send({
          ok: false,
          error: "too many live keys for this address; revoke one before minting another",
        });
        return;
      }
      reply.code(503).send({ ok: false, error: "could not issue key" });
      return;
    }

    reply.code(201).send({
      ok: true,
      apiKey: result.key,
      rateLimitPerMin: config.API_KEY_RATE_LIMIT_PER_MIN,
      expiresInSeconds: config.API_KEY_TTL_SECONDS,
      usage:
        "Send the key as an 'x-api-key' header or 'Authorization: Bearer <key>' on /api/run and /api/trace/*.",
    });
  });

  app.delete("/api/keys", async (req, reply) => {
    const key = extractApiKey(req.headers ?? {});
    if (!key) {
      reply.code(400).send({ ok: false, error: "no API key presented" });
      return;
    }
    const revoked = await revokeApiKey(redis, key, req.log);
    reply.code(revoked ? 200 : 404).send({ ok: revoked });
  });
}
