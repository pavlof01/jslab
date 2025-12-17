# API (Fastify gateway)

This service is the public API gateway for JSLab. It validates requests, enforces rate limits, caches responses in Redis, and proxies execution requests to the engine services.

## Endpoints

- `GET /healthz` — health check (+ Redis status).
- `POST /api/run` — run/bytecode request (see repo root `README.md` for the full contract).

## Local development

- Install deps: `npm ci`
- Run dev server: `npm run dev` (default `0.0.0.0:8080`)
- Typecheck: `npm run lint`

## Docker

- Build: `docker build -t jslab-api apps/api`
- Run (example): `docker run --rm -p 8080:8080 --env-file .env jslab-api`

## Configuration

All env vars are defined in `apps/api/src/config.ts`. Common ones:

- `REDIS_URL` (default `redis://redis:6379`)
- `ENGINE_V8_URL`, `ENGINE_HERMES_URL`, `ENGINE_SM_URL`, `ENGINE_JSC_URL` (defaults are Kubernetes service URLs)
- `API_KEY` (optional; client must send `x-api-key`)
- `ENGINE_SHARED_SECRET` (optional; forwarded to engines as `x-engine-key`)

