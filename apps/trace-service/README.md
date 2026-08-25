# Trace service

A Fastify service that executes ECMAScript abstract operations on a vendored,
trace-instrumented build of [engine262](https://github.com/pavlof01/engine262)
and returns the spec steps it walked.

**Purpose**: given `ToNumber("42")` or `{} == ![]`, produce the actual sequence
of spec steps the algorithm takes — not a description of them. Execution is
real; there is no mock data.

**Pattern**: same shape as the `engine-*` services (stateless HTTP, called only
by the api gateway), but it runs engine262 in a worker thread rather than
spawning a CLI binary, so it does not use `packages/engine-runtime`.

## Getting the source

The engine262 fork is a git submodule at `apps/trace-service/engine262` and is
imported directly — nothing here builds or tests without it:

```bash
git submodule update --init --recursive
```

## Running it

```bash
npm ci
npm run dev     # tsx watch src/server/server.ts → 0.0.0.0:8080
npm start       # same entry point, without the watcher
npm run typecheck   # tsc --noEmit  (this is what CI runs; `npm run build` is the same check)
npm test        # vitest
```

Under Docker Compose and Skaffold the service listens on 8080 in-container and
is published on **localhost:8085** — the api gateway's `TRACE_SERVICE_URL` and
the frontend's direct calls both point at it.

```bash
docker compose up --build            # from the repo root
skaffold dev --port-forward -n jslab # exposes trace-service on localhost:8085
kubectl apply -k infra/k8s/base      # cluster deploy (namespace: jslab)
```

## API

Clients reach these through the api gateway (`POST /api/trace/execute/*`), which
is where rate limiting and metrics live. The paths below are the service's own.

### `GET /healthz`

```bash
curl http://localhost:8085/healthz
# { "ok": true }
```

### `GET /functions`

The catalog the visualizer builds its UI from: `available_functions`
(`ToNumber`, `ToNumeric`, `ToString`, `ToBoolean`, `ToPrimitive`, `ToObject`,
`ToPropertyKey`, `ToLength`, `ToIndex`), `function_meta`, `supported_operators`
(`===`, `!==`, `==`, `!=`, `<=`, `>=`, `<`, `>`) and an `endpoints` hint.

### `POST /execute/type-conversion`

```bash
curl -X POST http://localhost:8085/execute/type-conversion \
  -H "Content-Type: application/json" \
  -d '{ "functionName": "ToNumber", "input": "\"42\"", "preferredType": "number" }'
```

`input` is source text for the value to convert, evaluated inside the sandbox.
`preferredType` (`"string"` / `"number"`) is optional and only meaningful for
`ToPrimitive`. The response carries `success`, `functionName`, the result value
and type, and the trace tree the run produced.

### `POST /execute/equality`

```bash
curl -X POST http://localhost:8085/execute/equality \
  -H "Content-Type: application/json" \
  -d '{ "input": "{} == ![]" }'
```

`input` is a whole binary expression; the service detects the operator, picks
the matching spec algorithm (`IsLooselyEqual`, `IsStrictlyEqual`,
`AbstractRelationalComparison`) and traces it.

### `GET /spec/:functionName`

The ECMA-262 algorithm text for one operation, rendered to HTML by ecmarkup
from `src/server/ecma-spec.html`. 404 for anything outside the supported set.
Cached for an hour in production, `no-store` otherwise.

## Configuration

Environment variables (see `config.ts` in this directory):

| Variable            | Default | Description                                                                        |
| ------------------- | ------- | ---------------------------------------------------------------------------------- |
| `PORT`              | 8080    | HTTP server port                                                                   |
| `HOST`              | 0.0.0.0 | HTTP server binding address                                                        |
| `MAX_TIMEOUT_MS`    | 5000    | Hard execution budget (every request uses this — there is no per-request override) |
| `MAX_SOURCE_LENGTH` | 20000   | Maximum input length                                                               |
| `LOG_LEVEL`         | info    | Pino log level                                                                     |

## Execution limits

Inputs are arbitrary JavaScript — `{ valueOf: () => { while (true) {} } }` is a valid
thing to ask ToNumber about — and engine262 evaluates them synchronously. Two limits
keep one request from taking the pod down:

- **`MAX_SOURCE_LENGTH`** is a `maxLength` on the request schemas, so an oversized
  payload is rejected during validation and never reaches the engine (`400`).
- **`MAX_TIMEOUT_MS`** is a hard budget enforced by `src/server/execute/sandbox.ts`.
  Traces run in a worker thread; a task that outlives the budget has its thread
  terminated and the request answers `400 { code: "execution_budget_exceeded" }`.
  One task runs at a time, so a burst of expensive inputs queues and then answers
  `429 { code: "trace_worker_busy" }` with `Retry-After` rather than piling up.

## Integration

The visualizer pages (`/type-conversion`, `/equality`) reach `/execute/*`
**through the api gateway** — the Next.js handler at
`app/api/trace/execute/[category]/route.ts` proxies to `POST /api/trace/execute/:category`,
which is the only place trace runs are rate limited, charged to an API-key
budget and counted in `/metrics`.

Two paths still bypass the gateway and call this service directly from the
frontend's server side, because the gateway has no equivalent route yet:
`GET /functions` and `GET /spec/:functionName` (plus the SSR fetch in
`app/abstract-functions-visualizer/server-data.ts`). That is the sole reason the
NetworkPolicy still allows frontend → trace-service; see the "Network policy
model" section of [`infra/README.md`](../../infra/README.md).

```typescript
// apps/frontend/src/app/api/trace/execute/[category]/route.ts
const response = await fetch(`${TRACE_SERVICE_URL}/execute/type-conversion`, {
  method: "POST",
  body: JSON.stringify({ functionName, input, preferredType }),
});
```

Service URL is configurable via `TRACE_SERVICE_URL` (defaults to the skaffold-forwarded
`http://localhost:8085` in the frontend, and to `http://trace-service:8080` in the api).

### Network Policy

In Kubernetes, the trace-service is allowed to receive requests from:

- Traefik ingress controller
- Next.js frontend API routes

See `infra/k8s/base/networkpolicy.yaml` for details.

## Development Tips

### Adding a New ECMA262 Function

1. Add one entry to `UNARY_OPERATIONS` in `src/server/operations.ts`: its category, its
   engine262 call, and the spec clauses its panel should show. The advertised
   function list, the request schema's enum, the metadata map and the spec route
   are all derived from that table.
2. Add the clauses themselves to `src/server/ecma-spec.html` (and a spec URL to
   `ALGO_SPEC_URL` in `src/server/spec-generator.ts`) so the panel has something to render.

### Testing

```bash
# Local testing
npm run dev

# In another terminal
curl -X POST http://localhost:8080/execute/type-conversion \
  -H "Content-Type: application/json" \
  -d '{"functionName": "ToNumber", "input": "\"42\"", "preferredType": null}'
```

### Debugging

```bash
LOG_LEVEL=debug npm run dev
```

## File structure

```
apps/trace-service/
├── config.ts               # Env validation (zod) — at the package root, not in src/
├── src/
│   ├── index.mts           # Package entry (#self)
│   ├── engine262.d.ts      # Types for the vendored engine262
│   ├── server/
│   │   ├── server.ts       # Fastify app and routes
│   │   ├── operations.ts   # The traceable abstract operations — one table
│   │   ├── schema.ts       # Request body schemas
│   │   ├── types.ts
│   │   ├── spec-generator.ts + ecma-spec.html   # /spec/:functionName rendering
│   │   └── execute/        # sandbox (worker thread), worker, helpers, serialization
│   └── trace/index.mts     # Trace capture on top of engine262
├── test/                   # Vitest suites
├── engine262/              # git submodule (fork with trace instrumentation)
├── Dockerfile              # dev + prod targets; build context is this directory
└── vitest.config.mts
```

```

## See Also

- [Infra map](../../docs/infra.md)
- [API gateway](../api/README.md)
- [Frontend integration](../frontend/src/app/api/trace/)
```
