# JSLab Copilot Instructions

## Project Overview

**JSLab** is a multi-service platform for visualizing and comparing JavaScript engine internals (V8, SpiderMonkey, JavaScriptCore, Hermes). The architecture follows a microservices pattern with isolated engine services, a Fastify API gateway, and a Next.js frontend UI.

### Service Architecture

```
Client → Next.js Frontend → Fastify API Gateway (Redis cache + rate limit)
                              ↓
                    Engine HTTP Services
                    ├─ engine-v8 (d8; flags decide the output)
                    ├─ engine-hermes (hermes -dump-bytecode)
                    ├─ engine-jsc (jsc -d)
                    ├─ engine-spidermonkey (js, dis() wrapper)
                    └─ trace-service (engine262 in a worker thread)
```

**Key constraint**: Engine services are stateless HTTP wrappers around CLI tools. No shared state and no inter-service communication exists — only the API gateway orchestrates requests. The only filesystem they touch is a per-request temp dir under `/tmp` (an `emptyDir`, since the root filesystem is read-only), which holds the snippet and any shim scripts and is removed when the run ends.

## Critical Developer Workflows

### Local Development (Skaffold + k3s)

```bash
# Everything, no cluster needed (recommended)
docker compose up --build

# Full k8s stack with auto-rebuild
skaffold dev --port-forward -n jslab

# Individual app development
cd packages/engine-runtime && npm ci && npm run build  # api + engines need this first
cd apps/api && npm run dev          # Fastify @ localhost:8080
cd apps/frontend/src && npm run dev # Next.js @ localhost:3000
cd apps/engine-v8 && npm run dev    # Engine @ localhost:8080
```

The trace service vendors engine262 as a git submodule — clone with
`--recurse-submodules`, or run `git submodule update --init --recursive`.

### Build & Deploy

- **Docker images**: Each app has a `Dockerfile` with `dev` and `prod` targets (see `apps/*/Dockerfile`). The api and the four engines bake in `packages/engine-runtime`, so they build **from the repo root**: `docker build -f apps/api/Dockerfile -t jslab-api .`. The frontend and trace-service build from their own directory.
- **Kubernetes**: `kubectl apply -k infra/k8s/base` (namespace: `jslab`).
- **Ingress**: four Traefik Ingress objects share the hosts and are ordered by explicit router priorities — `/api/trace/functions` + `/api/spec` → frontend (2000), `/api` → api (1000), `/embed` → frontend with relaxed frame headers (500), `/` → frontend (10). See `infra/k8s/base/ingress.yaml` and `infra/README.md`.

### Type Safety & Validation

- All services use **Zod** for schema validation and type inference (e.g., `apps/api/src/schemas.ts`, `packages/engine-runtime/src/index.ts`).
- **TypeScript** with `"type": "module"` and ESM imports throughout.
- Run `npm run lint` (tsc --noEmit) in each app to check types.

## Data Flow & Contract Types

### API Request/Response Contract

See [apps/api/src/types.ts](../apps/api/src/types.ts):

```typescript
type RunRequest = {
  engine: "v8" | "hermes" | "sm" | "jsc";
  sourceText: string;
  options?: { flags?: string[]; timeoutMs?: number };
};

type ApiResponse = {
  ok: boolean;
  stdout: string;
  stderr: string;
  artifacts: Artifact[];
  meta: { durationMs: number; engine: string; cacheHit: boolean; ... };
};
```

**Critical points**:

- Frontend → API: POST `/api/run` with `RunRequest`.
- API → Engine services: POST `/run` (same schema).
- All engine services filter flags against the shared `flagCatalog` (e.g., V8: `--print-bytecode`, `--trace-ignition`; Hermes: `-O`, `-gc-sanitize-handles`). Rejected flags are reported back in `meta.droppedFlags`.
- `artifacts` is part of the contract but is currently always `[]` — every engine returns its output as text on stdout/stderr.
- `sourceText` is immutable; flags and timeout are normalized server-side (`timeoutMs` clamped to `[MIN_TIMEOUT_MS, MAX_TIMEOUT_MS]` = `[250, 5000]`, source capped at `MAX_SOURCE_LENGTH` = 20000).
- **Cache key** includes engine, sourceText, flags, and a timeout bucket (Math.ceil(timeoutMs/100)) to reduce cache misses on timeout variations.

## Essential Patterns

### 1. Engine Service Template

All engines ([engine-v8](../apps/engine-v8/src/server.ts), [engine-hermes](../apps/engine-hermes/src/server.ts), etc.) are thin wrappers around the shared [packages/engine-runtime](../packages/engine-runtime/src/) package:

- Each `server.ts` calls `startEngineServer()` with an `EngineSpec`: the engine name (also the flag-catalog key), a temp-dir prefix, its config, the globals to lock down, any prelude scripts, and an `invoke()` callback that builds the binary command line. For V8, flags drive all behavior (e.g. `--print-bytecode` to get bytecode output).
- Each `config.ts` extends `engineEnvBase` from the shared package with only its own fields (the binary path, v8's heap cap) and loads it with `loadEnv()`.
- The shared runtime provides the single POST `/run` endpoint: Zod validation, `sanitizeFlags()` against the `flagCatalog` in [packages/engine-runtime/src/flags.ts](../packages/engine-runtime/src/flags.ts), a per-pod concurrency gate (429 when saturated), `child_process.spawn()` with timeout, and a combined stdout+stderr cap (`MAX_OUTPUT_BYTES`, default 2 MB).
- Return shape: `{ ok, stdout, stderr, artifacts: [], meta }` — rejected flags come back in `meta.droppedFlags`, truncated output is flagged with `meta.outputTruncated`.
- No external state—each request is independent.

**Example snippet** (V8, [apps/engine-v8/src/server.ts](../apps/engine-v8/src/server.ts)):

```typescript
startEngineServer({
  engine: "v8",
  tmpPrefix: "engine-v8-",
  openapiTitle: "engine-v8",
  config,
  // d8 executes the snippet, so its file-reading globals are neutralized
  // in-realm; the runtime writes the shim and passes back its path.
  blockedGlobals: ["read", "readbuffer", "readline"],
  invoke: ({ scriptPath, flags, preludePaths }) => ({
    cmd: config.D8_PATH,
    // Heap cap is engine-controlled, not client-supplied.
    args: [`--max-old-space-size=${config.MAX_HEAP_MB}`, ...flags, ...preludePaths, scriptPath],
  }),
});
```

### 2. API Gateway Patterns

`server.ts` only reads the environment, opens Redis and listens; `buildApp({ config, redis })` in [apps/api/src/app.ts](../apps/api/src/app.ts) assembles the routes ([routes/](../apps/api/src/routes/)) over `security.ts` and `upstream.ts`. Routes are tested with `app.inject()` and a fake Redis.

- **Request validation**: Normalize sourceText length, timeout bounds, flags via schema.
- **Cache-aside**: Check Redis before proxying to engine; write response if cache miss.
- **Rate limiting**: Three buckets (`general`, `heavy` for engine spawns, `trace`) per identity/window using Redis counters; return `429 Retry-After`. Identity is the client IP, or a self-service API key when one is presented (`POST /api/keys`), which raises the general and trace quotas while the heavy bucket stays separately capped. See `rateLimit.ts` and `apiKeys.ts`.
- **Error mapping**: Best-effort HTTP status mapping (e.g., timeout → 504, invalid → 400).
- **Proxy with undici**: Forward normalized request to engine service URL.

### 3. Frontend State Management

See [apps/frontend/src/store/useEngineOutputs.ts](../apps/frontend/src/store/useEngineOutputs.ts):

- **Zustand store**: Single source of truth for engine outputs, status, errors.
- **Shallow selectors**: Use `useShallow()` to avoid unnecessary re-renders.
- **Engine selection**: User can toggle which engines to run in parallel.
- **Concurrent requests**: All selected engines run simultaneously after user submits code.
- **Playground component**: User can edit code, select flags (V8 only), compare outputs side-by-side.

### 4. Configuration Management

Every service uses Zod schema validation for environment variables:

```typescript
// apps/api/src/config.ts
const envSchema = z.object({
  PORT: z.coerce.number().default(8080),
  REDIS_URL: z.string().default("redis://redis:6379"),
  ENGINE_*_URL: z.string().default("http://service-name:8080"),
  MAX_TIMEOUT_MS, CACHE_TTL_SECONDS, MAX_FLAGS, MAX_SOURCE_LENGTH, etc.
});

export function loadConfig(): ApiConfig {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) throw new Error(`Invalid environment: ...`);
  return parsed.data;
}
```

## Common Pitfalls & Design Constraints

1. **Flag whitelisting is strict**: Client-supplied flags not in the `flagCatalog` are dropped (and reported in `meta.droppedFlags`). The catalog lives in [packages/engine-runtime/src/flags.ts](../packages/engine-runtime/src/flags.ts) — the single source of truth. The api gateway and every engine service import it as a `file:` dependency (`@jslab/engine-runtime`), so there is nothing to keep in sync.

2. **Cache key normalization**: Timeouts are bucketed (every 100ms) to avoid cache explosion. If latency within ±100ms matters, reduce bucket size or disable cache for specific tasks.

3. **Bytecode output**: `artifacts` exists in the contract (`{ kind, mime, dataBase64 }`) but the engine services currently return it empty — bytecode arrives as text on stdout. Don't write frontend code that assumes an artifact is there.

4. **Timeout propagation**: Client supplies `timeoutMs` (e.g., 2000). API clamps it to `[MIN_TIMEOUT_MS, MAX_TIMEOUT_MS]` = `[250, 5000]` (default 2000) and passes it to the engine, which uses it for the `spawn()` abort. The floor exists because a shorter budget cannot outlast the spawn itself, so the run could only ever time out.

5. **Cross-partition communication**: the Kubernetes NetworkPolicy is default-deny ingress *and* egress for the namespace, with additive allowlists:
   - Traefik → frontend and api
   - frontend → api, and (still) → trace-service for the catalog/spec routes
   - api → engines, trace-service, Redis
   - Engines and trace-service get no egress beyond DNS — they execute untrusted JS. Do not add broad egress to these pods.

6. **No persistent state**: Engines are stateless. Request logs are ephemeral (logged to stdout, visible in k8s logs or local console). For debugging, rely on stderr capture in the response.

## TypeScript & Module Setup

- **All packages**: `"type": "module"` with `.ts` source → ESM imports.
- **Build**: `tsc -p tsconfig.json` → `dist/` for the api and the engines; `packages/engine-runtime` uses `tsconfig.build.json`. The frontend builds with `next build`, and the trace service never emits — its `build`/`typecheck` are both `tsc --noEmit`, and it runs straight from source via `tsx`.
- **Runtime**: `tsx watch src/server.ts` (dev), `node dist/server.js` (prod, api + engines).
- **No CommonJS**. Relative imports in the api, the engine services and `engine-runtime` carry `.js` extensions (they resolve against emitted output); the frontend uses `@/` path aliases, and the trace service imports `.ts`/`.mts` directly because it runs from source.

## Testing & Validation

CI ([.github/workflows/ci.yml](workflows/ci.yml)) runs one matrix leg per workspace, plus a kustomize/kubeconform job over the manifests:

| Workspace | Typecheck / lint | Tests |
| --- | --- | --- |
| `packages/engine-runtime` | `npm run lint` | `npm test` (Vitest) |
| `apps/api` | `npm run lint` | `npm test` (Vitest) |
| `apps/engine-*` | `npm run lint` | — |
| `apps/trace-service` | `npm run typecheck` | `npm test` (Vitest) |
| `apps/frontend/src` | `npx tsc --noEmit -p tsconfig.json` + `npm run lint` | `npm test` (Jest, jsdom) |

- Smoke test script: [scripts/smoke-test.sh](../scripts/smoke-test.sh) — hits a **deployed** stack (`JSLAB_BASE_URL`, default `https://jslab.su`) and checks that `/`, `/api/run` and `/api/trace/execute/type-conversion` answer, and that the two API paths are served by the gateway rather than falling through to Next.js.
- Kubernetes validation: [scripts/validate-k8s.sh](../scripts/validate-k8s.sh) — renders `KUSTOMIZE_PATH` (default `infra/k8s/base`) and runs kubeconform + conftest against `infra/policy/`. Needs `kubectl`, `kubeconform` and `conftest` on PATH.
- The api and engine legs build `packages/engine-runtime` first; the trace-service and frontend legs check out submodules.

## When Adding a New Feature

1. **New engine?** Create `apps/engine-<name>/`, follow [engine-v8](../apps/engine-v8/) template, add an entry to `flagCatalog`, and add the service to `skaffold.yaml`, `docker-compose.yml`, `infra/k8s/base/` (including `networkpolicy.yaml`) and the CI matrix.
2. **New API endpoint?** Update [apps/api/src/schemas.ts](../apps/api/src/schemas.ts), add a route module under [apps/api/src/routes/](../apps/api/src/routes/) and register it in `app.ts`, update [openapi.ts](../apps/api/src/openapi.ts) (a hand-maintained mirror of the schemas), and check whether it needs its own rate-limit bucket and an ingress rule.
3. **New flag?** Add a `FlagSpec` to `flagCatalog` in [packages/engine-runtime/src/flags.ts](../packages/engine-runtime/src/flags.ts). The api, every engine service and the frontend's flag selector all pick it up automatically — the selector is fed from `GET /api/flags` through `lib/server/flags.ts`.
4. **Frontend feature?** Ensure useEngineOutputs store is updated if new state shape is needed; update PlaygroundClient or component tree. Style through the theme in `src/style/` and run `npm run typegen` after touching a recipe.

## Key File References

- **API Gateway**: [apps/api/src/](../apps/api/src/) (server, app, routes/, security, upstream, cache, rateLimit, apiKeys, metrics, openapi, config, schemas, types)
- **Engine Runtime (shared)**: [packages/engine-runtime/src/](../packages/engine-runtime/src/) (server wrapper, flag catalog, process spawning)
- **Engine Template**: [apps/engine-v8/src/](../apps/engine-v8/src/) (server, config)
- **Trace Service**: [apps/trace-service/src/](../apps/trace-service/src/) (server, execute sandbox, spec generator, trace capture)
- **Frontend UI**: [apps/frontend/src/app/](../apps/frontend/src/app/), [apps/frontend/src/store/](../apps/frontend/src/store/), [apps/frontend/src/style/](../apps/frontend/src/style/)
- **Kubernetes**: [infra/k8s/base/](../infra/k8s/base/) (manifests, NetworkPolicy, kustomization); see [infra/README.md](../infra/README.md) for the routing and policy models
- **Docker**: [apps/\*/Dockerfile](../apps/), [engines/dockerfiles/](../engines/dockerfiles/), [docker-compose.yml](../docker-compose.yml)
