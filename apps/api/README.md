# API (Fastify gateway)

This service is the public API gateway for JSLab. It validates requests, enforces
rate limits, caches responses in Redis, and proxies execution requests to the
engine services and the trace service. It is the only orchestrator — the engine
services never talk to each other or to Redis.

## Endpoints

| Endpoint                                  | Purpose                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------- |
| `GET /healthz`                            | Health check (+ Redis connection status)                                              |
| `GET /metrics`                            | Prometheus metrics (`prom-client` registry)                                           |
| `POST /api/run`                           | Run a snippet on one engine — see the repo root `README.md` for the full contract     |
| `GET /api/flags`                          | The per-engine flag catalog with descriptions and categories                          |
| `GET /api/engines`                        | One entry per engine key with the version its binary reports; cached in Redis for 60s |
| `POST /api/trace/execute/type-conversion` | `{ functionName, input, preferredType? }` → proxied to `trace-service`                |
| `POST /api/trace/execute/equality`        | `{ input }` (a binary expression such as `{} == ![]`) → proxied to `trace-service`    |
| `POST /api/keys`                          | Mint a self-service API key (201 with the key in plaintext, once)                     |
| `DELETE /api/keys`                        | Revoke the key presented in `x-api-key` / `Authorization: Bearer`                     |
| `GET /api/openapi.json`                   | OpenAPI document                                                                      |
| `GET /api/docs`                           | Scalar API reference UI over that document                                            |

## Rate limits

Redis counters per identity (client IP, or the API key when one is presented),
layered per bucket. 429 responses carry `Retry-After` and `meta.retryAfter`.

| Bucket                                 | Anonymous | With an API key | Env var                                                        |
| -------------------------------------- | --------- | --------------- | -------------------------------------------------------------- |
| `general` (every request)              | 60/min    | 240/min         | `RATE_LIMIT_PER_MIN`, `API_KEY_RATE_LIMIT_PER_MIN`             |
| `heavy` (`/api/run`, spawns an engine) | 20/min    | 60/min          | `RATE_LIMIT_HEAVY_PER_MIN`, `API_KEY_HEAVY_RATE_LIMIT_PER_MIN` |
| `trace` (`/api/trace/execute/*`)       | 30/min    | 240/min         | `TRACE_RATE_LIMIT_PER_MIN`, `API_KEY_RATE_LIMIT_PER_MIN`       |

A key raises the general and trace buckets to its own `rpm`, but the heavy
bucket is capped separately at `min(rpm, API_KEY_HEAVY_RATE_LIMIT_PER_MIN)` —
otherwise a key would be a 12× amplifier over the anonymous engine-spawn limit.

Key issuance is itself limited (`API_KEY_ISSUE_PER_HOUR`, default 5/hour per IP),
keys expire (`API_KEY_TTL_SECONDS`, default 30 days) and one issuer can hold at
most `API_KEY_MAX_PER_ISSUER` (default 10) live keys.

## Local development

- Build the shared runtime first — it is a `file:` dependency:
  `cd ../../packages/engine-runtime && npm ci && npm run build`
- Install deps: `npm ci`
- Run dev server: `npm run dev` (default `0.0.0.0:8080`)
- Typecheck: `npm run lint` (`tsc --noEmit`)
- Tests: `npm test` (Vitest)

## Docker

The image bakes in `packages/engine-runtime`, so it builds **from the repo root**:

- Build: `docker build -f apps/api/Dockerfile -t jslab-api .`
- Run (example): `docker run --rm -p 8080:8080 --env-file .env jslab-api`

## Configuration

All env vars are defined in `apps/api/src/config.ts`. Common ones:

- `REDIS_URL` (default `redis://redis:6379`)
- `ENGINE_V8_URL`, `ENGINE_HERMES_URL`, `ENGINE_SM_URL`, `ENGINE_JSC_URL` (defaults are Kubernetes service URLs)
- `TRACE_SERVICE_URL` (default `http://trace-service:8080`; set explicitly for local non-Kubernetes runs)
- `CACHE_TTL_SECONDS` (600) / `NEGATIVE_CACHE_TTL_SECONDS` (30)
- `MIN_TIMEOUT_MS` (250) / `DEFAULT_TIMEOUT_MS` (2000) / `MAX_TIMEOUT_MS` (5000)
- `MAX_FLAGS` (10), `MAX_SOURCE_LENGTH` (20000), `REQUEST_BODY_LIMIT_BYTES` (512 KiB)
- `TRUST_PROXY_HOPS` (1) and `CLIENT_IP_HEADER` (`cf-connecting-ip`) — see the
  "Client IP trust" section in [`infra/README.md`](../../infra/README.md)
