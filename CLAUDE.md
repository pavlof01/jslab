# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

```
Browser → Next.js frontend (port 3000)
              ↓ POST /api/run
          Fastify API gateway (port 8080)  ←→  Redis (cache + rate limit)
              ↓ POST /run (normalized)
          Engine microservices (each port 8080)
          ├─ engine-v8          (d8 binary; flags decide the output)
          ├─ engine-hermes      (hermes -dump-bytecode)
          ├─ engine-jsc         (jsc -d)
          ├─ engine-spidermonkey (js shell, dis() wrapper)
          └─ trace-service      (engine262 ECMAScript interpreter)
```

Engine services are **stateless HTTP wrappers** — no inter-service communication, no shared state. The API gateway is the sole orchestrator. The four `engine-*` services share one implementation: `packages/engine-runtime` (`@jslab/engine-runtime`, consumed as a `file:` dependency).

### Request flow

1. Frontend calls `POST /api/run` with `{ engine, sourceText, options: { flags?, timeoutMs? } }`
2. API normalizes: clamps timeout, filters flags against per-engine allowlist, checks Redis cache
3. Forwards to the engine service as `POST /run` with `{ sourceText, options: { flags, timeoutMs } }`
4. Engine spawns the CLI binary, captures stdout/stderr, returns `{ ok, stdout, stderr, artifacts: [] }`
5. API writes to cache, returns `ApiResponse` (adds `meta.durationMs`, `meta.cacheHit`, `meta.engine`)

The `/api/trace/execute/{type-conversion,equality}` endpoints talk to `trace-service` for ECMAScript abstract-operations tracing.

### Key types (`apps/api/src/types.ts`)

```typescript
type RunRequest    = { engine: EngineKind; sourceText: string; options?: { flags?: string[]; timeoutMs?: number } }
type ApiResponse   = { ok: boolean; stdout: string; stderr: string; artifacts: Artifact[]; meta: { durationMs, engine, cacheHit } }
type Artifact      = { kind: "bytecode"; mime: string; dataBase64: string }
```

`Artifact` is part of the contract, but every engine currently returns
`artifacts: []` — all output comes back as text on stdout/stderr.

---

## Development commands

### Formatting and linting (repo root)

Biome is the formatter and linter for the entire tree; `biome.jsonc` at the root
is the only config, and it explains each choice inline. Run `npm install` at the
root once (tooling only — it is not an npm workspace root and does not change how
services install).

```bash
npm run check      # what CI runs: format + lint + import order, read-only
npm run check:fix  # apply the safe fixes
npm run format     # formatting only
```

Notes:
- Suppress a rule at the site with a single-line `// biome-ignore lint/<group>/<rule>: reason`
  directly above the code. A multi-line reason silently breaks the suppression.
- ESLint still runs in `apps/frontend/src` for the Next.js and React-hooks rules
  Biome cannot express. Biome's `useExhaustiveDependencies` is off so the two
  never report the same thing.
- Warnings (e.g. `noExplicitAny`) do not fail CI; errors do.
- `apps/frontend/src/next.config.ts` pins `turbopack.root`/`outputFileTracingRoot`
  to that directory — the root lockfile would otherwise make Next guess the
  workspace root and warn.

### Frontend (`apps/frontend/src/`)
```bash
npm run dev          # Next.js dev server with Turbopack → localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Jest (jsdom)
npm run test:watch   # Jest watch mode
npm run typegen      # Chakra recipe/style types (prelint + prebuild run it for you)
```
TypeScript check: `node_modules/.bin/tsc --noEmit -p tsconfig.json` (no `tsc` on PATH).

### API gateway (`apps/api/`)
```bash
npm run dev          # tsx watch → localhost:8080
npm run build        # tsc → dist/
npm run lint         # tsc --noEmit
npm run test         # vitest
```

### Trace service (`apps/trace-service/`)
```bash
npm run dev        # tsx watch → localhost:8080 (compose/skaffold publish it on localhost:8085)
npm run test       # vitest
npm run typecheck  # tsc --noEmit — what CI runs (`npm run build` is the same check, emits nothing)
```
Needs the `engine262` submodule (`git submodule update --init --recursive`).

### Engine services (`apps/engine-v8/`, `apps/engine-hermes/`, etc.)
```bash
npm run dev    # tsx watch → localhost:8080
npm run lint   # tsc --noEmit
```
They consume `@jslab/engine-runtime` as a `file:` dependency, so build it first:
`cd packages/engine-runtime && npm ci && npm run build`. The api gateway needs
the same.

### Shared engine runtime (`packages/engine-runtime/`)
```bash
npm run build  # tsc -p tsconfig.build.json → dist/
npm run lint   # tsc --noEmit
npm run test   # vitest
```

### Full stack
```bash
docker compose up --build              # all services + redis, hot-reload, no k8s needed
skaffold dev --port-forward -n jslab   # rebuilds + port-forwards all services
kubectl apply -k infra/k8s/base        # deploy to k3s (namespace: jslab)
```

---

## Frontend architecture

**Pages** (all under `apps/frontend/src/app/`):

| Route | Client component | Description |
|---|---|---|
| `/` | `(landing)/page.tsx` | Marketing landing page |
| `/playground` | `_components/PlaygroundClient.tsx` | Multi-engine code runner |
| `/v8-pipeline` | `v8-pipeline/components/PipelineClient.tsx` | Stage-by-stage V8 visualization |
| `/type-conversion` | `type-conversion/page.tsx` → `abstract-functions-visualizer/components/AbstractFunctionsVisualizer.tsx` | ECMAScript type-conversion spec step-through (`initialCategory="typeConversion"`) |
| `/equality` | `equality/page.tsx` → same shared `AbstractFunctionsVisualizer` | Equality-operator spec step-through (`initialCategory="equality"`) |
| `/embed/playground` | `embed/playground/EmbedPlaygroundClient.tsx` | Embeddable playground widget (`noindex`) |
| `/embed/bytecode` | `embed/bytecode/EmbedBytecodeClient.tsx` | Embeddable bytecode snapshot widget (`noindex`) |

`app/abstract-functions-visualizer/` is a shared implementation directory, **not** a route — only `/type-conversion` and `/equality` mount it. `app/embed/oembed/route.ts` is the oEmbed provider for the two widgets.

**Server-side route handlers** (`app/api/`): `run/` and `trace/execute/[category]/` proxy to the api gateway; `trace/functions/` and `spec/[functionName]/` still call `trace-service` directly (as does the SSR fetch in `abstract-functions-visualizer/server-data.ts`) — that's why the NetworkPolicy still allows frontend → trace-service.

**State**: Zustand stores in `store/`. `useEngineOutputs.ts` is the main store for Playground — holds code, engine selection, outputs, status, and `flags` (a per-engine map: every engine accepts flags, so the toolbar renders one `FlagSelector` per enabled engine the catalog has entries for). The abstract-functions visualizer has its own store at `app/abstract-functions-visualizer/store.ts`, with its background work in `effects.ts` (spec HTML, debounced tracing, playback, catalog).

**Flags**: `lib/server/flags.ts` fetches the whole `/api/flags` catalog server-side; `components/FlagSelector` renders one engine's flags, grouped by category. Share links and run history carry the per-engine map and still decode the older flat V8 list.

**UI**: Chakra UI v3, and the design system *is* the theme (`src/style/`). `theme.ts` holds the tokens and registers everything; `textStyles.ts` names the kinds of text (`label`, `code`, `body`, …), `layerStyles.ts` the kinds of surface (`panel`, `section`, `overlay`), `recipes.ts` the controls (`button` with variant × typeface × size, `band`, `chip`, `link`, `input`) and `slotRecipes.ts` the components that portal (menu, select, dialog, drawer, popover — kept apart because their Ark anatomies cannot enter a server module). Call sites wear it through props: `textStyle`, `layerStyle`, `variant`. There is no second styling layer and no `chakra.*` factory use — portal components stay Chakra, presentational ones are compositions in `src/components/ui/`. Colour comes from one vocabulary (`surface.*`, `rule.*`, `ink.*`, `accent`, `status.*`); the header's height is the `sizes.header` token (`h="header"`, `top="header"`), not a CSS variable. Run `npm run typegen` after changing a recipe or a style so the variant props stay typed.

**Samples**: `lib/samples.ts` exports `samples` (basic code snippets), `sampleCatalog`, `v8Samples` (V8-internals examples with inline comments), and `v8SampleCatalog`.

**API client**: `lib/api.ts` — `runEngine()` calls `POST /api/run` via Next.js route proxy.

---

## Engine service pattern

Each engine service (`apps/engine-*/src/server.ts`) is a thin `startEngineServer()` call into the shared `packages/engine-runtime` package. The service supplies an `EngineSpec` — engine name (also the flag-catalog key), temp-dir prefix, config, the globals to lock down, any prelude scripts, an optional `version` probe (the flags to ask the binary for its version, and the parser for what that binary prints), and an `invoke()` callback that builds the binary command line — and the runtime handles the rest (`packages/engine-runtime/src/app.ts`, wrapped by `index.ts` for the listening socket):
- Zod schema validates `{ sourceText, options: { flags?, timeoutMs? } }`
- `sanitizeFlags()` filters client-supplied flags against the shared `flagCatalog`; rejected flags are reported back in `meta.droppedFlags`
- Per-pod concurrency gate returns 429 + `Retry-After` when saturated
- A temp dir gets the snippet plus each prelude script; `invoke()` receives their absolute paths as `preludePaths`, in load order
- `child_process.spawn()` runs the binary with timeout; combined stdout+stderr capped at `MAX_OUTPUT_BYTES` (default 2 MB), truncation flagged in `meta.outputTruncated`
- Returns `{ ok, stdout, stderr, artifacts: [], meta }`
- `GET /healthz` reports `{ ok, engine, version }`; the version probe runs once at startup (never per request) and stays `null` for a binary with no way to say, such as jsc

**Config**: each service's `config.ts` extends `engineEnvBase` (`packages/engine-runtime/src/config.ts`) with only its own fields — the binary path, v8's `MAX_HEAP_MB` — and calls `loadEnv(schema, "engine-x")`. Shared defaults (timeouts, output caps, concurrency) live in the base schema only.

**Sandboxing**: `blockedGlobals` on the spec makes the runtime generate the in-realm lockdown shim (`lockdown.ts`) and hand its path back first in `preludePaths`. Set it for any shell that executes the snippet (d8, jsc); compile-only shells (hermesc, sm) need no lockdown.

**Flag catalog**: `flagCatalog` in `packages/engine-runtime/src/flags.ts` — the single source of truth. The api gateway builds from the repo root and depends on the package the same way the engine services do (`file:../../packages/engine-runtime`, `install-links=true` in `.npmrc`), so it imports `flagCatalog`/`sanitizeFlags` directly instead of keeping its own copy.

To add a flag to V8: add a `FlagSpec` to `flagCatalog.v8` in `packages/engine-runtime/src/flags.ts`. Both the api and every engine service pick it up automatically.

---

## API gateway key behaviors

**Layout**: `server.ts` only reads the environment, opens Redis and listens. `buildApp({ config, redis })` in `app.ts` assembles the routes (`routes/run.ts`, `routes/keys.ts`, `routes/trace.ts`) over shared helpers — `security.ts` (client IP, authentication, budgets, the `consume()` rate-limit helper) and `upstream.ts` (`postJson` for both the engines and trace-service). Because nothing is read or dialled at import time, routes are tested through `app.inject()` with a fake Redis (`app.test.ts`).

- **Engine kinds**: `EngineKind` and `ENGINE_KINDS` come from the flag catalog, not a literal list; `engineBaseUrls()` in `engines.ts` returns `Record<EngineKind, string>`, so a new engine is a compile error there until its URL is configured.
- **Flag allowlist**: `normalizeFlags()` in `apps/api/src/schemas.ts` runs `sanitizeFlags()` from `@jslab/engine-runtime` over its `flagCatalog`. Engine services import and run the same functions.
- **Cache key**: `engine + sourceText + sorted-flags + ceil(timeoutMs/100)` — timeout is bucketed to reduce misses.
- **Rate limit**: 60 req/min per IP by default, layered per bucket (general/heavy/trace); a self-service API key raises the general and trace quotas, with a lower, separate cap on the heavy (engine-spawning) bucket. Identity is hashed before it becomes a Redis key name; see `rateLimit.ts` and `apiKeys.ts`. Client IP is read from `CF-Connecting-IP` when present (see `infra/README.md`'s "Client IP trust" section), falling back to `req.ip` under a configurable trusted-hop count.
- **Trace endpoints**: `POST /api/trace/execute/type-conversion` → `{ functionName, input, preferredType? }` and `POST /api/trace/execute/equality` → `{ input }` → proxy to `trace-service`.
- **Other routes**: `GET /healthz`, `GET /metrics` (Prometheus), `GET /api/flags` (the catalog as JSON), `GET /api/engines` (per-engine binary versions, fanned out to each engine's `/healthz`, rate-limited on the general bucket and cached in Redis for 60s — an all-failed fan-out is not cached), `GET /api/openapi.json` + `/api/docs` (Scalar UI), `POST`/`DELETE /api/keys` (self-service API keys).

---

## Trace service

`apps/trace-service/` runs a trace-instrumented fork of [engine262](https://github.com/pavlof01/engine262) (branch `jslab/trace-instrumentation`, vendored as a git submodule at `apps/trace-service/engine262`) to produce step-by-step traces of abstract operations (ToNumber, ToPrimitive, etc.).

- Entry: `src/server/server.ts` (Fastify, port 8080; compose and skaffold both publish it on localhost:8085)
- Routes: `GET /healthz`, `GET /functions`, `POST /execute/type-conversion`, `POST /execute/equality`, `GET /spec/:functionName`
- Trace logic: `src/trace/index.mts`; the execution sandbox (worker thread + budget) is `src/server/execute/`, and `execute/parse.ts` handles expression parsing only
- **Operations registry**: `src/server/operations.ts` is the single table of traceable abstract operations — each entry carries its category, its engine262 call and the spec clauses its panel shows. `AVAILABLE_FUNCTIONS` (which becomes the request schema's enum), `FUNCTION_META`, `FUNCTION_ALGOS` and `SUPPORTED_SPEC_FUNCTIONS` are all derived from it, so adding an operation is one entry plus its clauses in `ecma-spec.html`.
- Config lives at the package root (`apps/trace-service/config.ts`), not under `src/`
- Tests use **vitest** (not Jest); nothing builds or tests without the engine262 submodule
- Does **not** use `packages/engine-runtime` — it runs engine262 in a worker thread rather than spawning a binary

---

## Infrastructure notes

- Namespace: `jslab` (all k8s resources)
- NetworkPolicy: default-deny ingress **and** egress for the namespace, with additive allowlists — Traefik → frontend/api; api → engines, trace-service, Redis; frontend → api and (still) trace-service; engines and trace-service get no egress beyond DNS. Engines cannot talk to each other.
- All pods: `runAsNonRoot`, `readOnlyRootFilesystem`, `/tmp` from `emptyDir`
- Overlays: `infra/k8s/base` (full stack), `prod` (base + CI-injected image tags, plus per-service slices), `dev` (Skaffold; excludes Traefik CRDs and NetworkPolicies), `monitoring` (Grafana Alloy, off by default)
- The api and engine images build from the **repo root** (`-f apps/<svc>/Dockerfile .`) because they bake in `packages/engine-runtime`; frontend and trace-service build from their own directory
- Apple Silicon: if engine binaries are `amd64`, run skaffold with `--check-cluster-node-platforms=false`
- Deeper detail: [`infra/README.md`](infra/README.md) (ingress priorities, network policy, client-IP trust, node disk management) and [`docs/infra.md`](docs/infra.md) (diagrams)
