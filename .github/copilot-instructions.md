# JSLab Copilot Instructions

## Project Overview

**JSLab** is a multi-service platform for visualizing and comparing JavaScript engine internals (V8, SpiderMonkey, JavaScriptCore, Hermes). The architecture follows a microservices pattern with isolated engine services, a Fastify API gateway, and a Next.js frontend UI.

### Service Architecture

```
Client → Next.js Frontend → Fastify API Gateway (Redis cache + rate limit)
                              ↓
                    Engine HTTP Services
                    ├─ engine-v8 (d8)
                    ├─ engine-hermes (hermesc)
                    ├─ engine-jsc (jsc)
                    └─ engine-spidermonkey (js)
```

**Key constraint**: Engine services are stateless HTTP wrappers around CLI tools. No direct file system access or inter-service communication exists—only the API gateway orchestrates requests.

## Critical Developer Workflows

### Local Development (Skaffold + k3s)

```bash
# Full k8s stack with auto-rebuild
skaffold dev --port-forward

# Individual app development
cd apps/api && npm run dev          # Fastify @ localhost:8080
cd apps/frontend/src && npm run dev # Next.js @ localhost:3000
cd apps/engine-v8 && npm run dev    # Engine @ localhost:8080
```

### Build & Deploy

- **Docker images**: Each app has a `Dockerfile` with `dev` and `prod` targets (see `apps/*/Dockerfile`).
- **Kubernetes**: `kubectl apply -k infra/k8s/base` (namespace: `jslab`).
- **Ingress**: Traefik routes `/api/*` → API service, `/` → frontend (see `infra/k8s/base/ingress.yaml`).

### Type Safety & Validation

- All services use **Zod** for schema validation and type inference (e.g., `apps/api/src/schemas.ts`, `apps/engine-v8/src/server.ts`).
- **TypeScript** with `"type": "module"` and ESM imports throughout.
- Run `npm run lint` (tsc --noEmit) in each app to check types.

## Data Flow & Contract Types

### API Request/Response Contract

See [apps/api/src/types.ts](apps/api/src/types.ts):

```typescript
type RunRequest = {
  engine: "v8" | "hermes" | "sm" | "jsc";
  task: "run" | "bytecode";
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
- All engine services must respect `allowedFlags` whitelist (e.g., V8: `--print-bytecode`, `--trace-ignition`; Hermes: `-O`, `-gc-sanitize-handles`). Unsanitized flags are silently dropped.
- `sourceText` is immutable; flags and timeout are normalized server-side.
- **Cache key** includes engine, task, sourceText, flags, and a timeout bucket (Math.ceil(timeoutMs/100)) to reduce cache misses on timeout variations.

## Essential Patterns

### 1. Engine Service Template

All engines ([engine-v8](apps/engine-v8/src/server.ts), [engine-hermes](apps/engine-hermes/src/server.ts), etc.):

- Single POST `/run` endpoint accepting `RunRequest`.
- **Flag sanitization**: Define `allowedFlags` Set, filter/deduplicate client flags.
- **Process spawning**: Use `child_process.spawn()` with `timeout`, capture stdout/stderr, truncate if >512KB.
- Return `{ ok: boolean; stdout: string; stderr: string; artifacts: [] }`.
- No external state—each request is independent.

**Example snippet** (V8):

```typescript
function sanitizeFlags(flags: string[] = []): string[] {
  const seen = new Set<string>();
  for (const raw of flags.slice(0, config.MAX_FLAGS)) {
    const trimmed = raw.trim();
    if (!allowedFlags.has(trimmed)) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}
```

### 2. API Gateway Patterns

See [apps/api/src/server.ts](apps/api/src/server.ts):

- **Request validation**: Normalize sourceText length, timeout bounds, flags via schema.
- **Cache-aside**: Check Redis before proxying to engine; write response if cache miss.
- **Rate limiting**: Two tiers (`general` and `heavy` per IP/window) using Redis counters; return `429 Retry-After`.
- **Error mapping**: Best-effort HTTP status mapping (e.g., timeout → 504, invalid → 400).
- **Proxy with undici**: Forward normalized request to engine service URL.

### 3. Frontend State Management

See [apps/frontend/src/store/useEngineOutputs.ts](apps/frontend/src/store/useEngineOutputs.ts):

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

1. **Flag whitelisting is strict**: Client-supplied flags not in the engine's `allowedFlags` Set are discarded silently. To add a flag, update both the engine service and optionally the frontend UI.

2. **Cache key normalization**: Timeouts are bucketed (every 100ms) to avoid cache explosion. If latency within ±100ms matters, reduce bucket size or disable cache for specific tasks.

3. **Bytecode output**: Engine services may return base64-encoded artifacts (e.g., Hermes IR). The API passes these through in the `artifacts` field; frontend decodes as needed.

4. **Timeout propagation**: Client supplies `timeoutMs` (e.g., 2000). API clamps it to `[1, MAX_TIMEOUT_MS]` and passes to the engine. Engine uses it for `spawn()` abort.

5. **Cross-partition communication**: Kubernetes NetworkPolicy restricts:
   - Traefik → API only
   - API → Engines + Redis only
   - Engines ↛ Engines (no peer-to-peer)

6. **No persistent state**: Engines are stateless. Request logs are ephemeral (logged to stdout, visible in k8s logs or local console). For debugging, rely on stderr capture in the response.

## TypeScript & Module Setup

- **All packages**: `"type": "module"` with `.ts` source → ESM imports.
- **Build**: `tsc -p tsconfig.json` → `dist/` folder.
- **Runtime**: `tsx watch src/server.ts` (dev), `node dist/server.js` (prod).
- **No CommonJS or .js extensions in imports** (rely on TS module resolution).

## Testing & Validation

- Smoke test script: [scripts/smoke-test.sh](scripts/smoke-test.sh) — validates all engines + API health.
- Kubernetes validation: [scripts/validate-k8s.sh](scripts/validate-k8s.sh) — checks manifests.
- Frontend: Jest config available ([apps/frontend/src/jest.config.ts](apps/frontend/src/jest.config.ts)).

## When Adding a New Feature

1. **New engine?** Create `apps/engine-<name>/`, follow [engine-v8](apps/engine-v8/) template, add to `skaffold.yaml` and `infra/k8s/base/`.
2. **New API endpoint?** Update [apps/api/src/schemas.ts](apps/api/src/schemas.ts), add route in server.ts, update OpenAPI doc.
3. **New flag?** Add to engine's `allowedFlags` Set. No frontend changes needed unless user-facing flag selector is desired.
4. **Frontend feature?** Ensure useEngineOutputs store is updated if new state shape is needed; update PlaygroundClient or component tree.

## Key File References

- **API Gateway**: [apps/api/src/](apps/api/src/) (server, cache, rateLimit, config, schemas, types)
- **Engine Template**: [apps/engine-v8/src/](apps/engine-v8/src/) (server, config)
- **Frontend UI**: [apps/frontend/src/app/](apps/frontend/src/app/), [apps/frontend/src/store/](apps/frontend/src/store/)
- **Kubernetes**: [infra/k8s/base/](infra/k8s/base/) (manifests, NetworkPolicy, kustomization)
- **Docker**: [apps/\*/Dockerfile](apps/), [engines/dockerfiles/](engines/dockerfiles/)
