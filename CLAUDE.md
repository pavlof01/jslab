# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

```
Browser → Next.js frontend (port 3000)
              ↓ POST /api/run
          Fastify API gateway (port 8080)  ←→  Redis (cache + rate limit)
              ↓ POST /run (normalized)
          Engine microservices (each port 8080)
          ├─ engine-v8          (d8 binary)
          ├─ engine-hermes      (hermesc + hbcdump)
          ├─ engine-jsc         (jsc binary)
          ├─ engine-spidermonkey (js shell)
          └─ trace-service      (engine262 ECMAScript interpreter)
```

Engine services are **stateless HTTP wrappers** — no inter-service communication, no shared state. The API gateway is the sole orchestrator. The four `engine-*` services share one implementation: `packages/engine-runtime` (`@jslab/engine-runtime`, consumed as a `file:` dependency).

### Request flow

1. Frontend calls `POST /api/run` with `{ engine, sourceText, options: { flags?, timeoutMs? } }`
2. API normalizes: clamps timeout, filters flags against per-engine allowlist, checks Redis cache
3. Forwards to the engine service as `POST /run` with `{ sourceText, options: { flags, timeoutMs } }`
4. Engine spawns the CLI binary, captures stdout/stderr, returns `{ ok, stdout, stderr, artifacts }`
5. API writes to cache, returns `ApiResponse` (adds `meta.durationMs`, `meta.cacheHit`, `meta.engine`)

The `/api/trace/execute` endpoint talks to `trace-service` for ECMAScript abstract-operations tracing.

### Key types (`apps/api/src/types.ts`)

```typescript
type RunRequest    = { engine: EngineKind; sourceText: string; options?: { flags?: string[]; timeoutMs?: number } }
type ApiResponse   = { ok: boolean; stdout: string; stderr: string; artifacts: Artifact[]; meta: { durationMs, engine, cacheHit } }
type Artifact      = { kind: "bytecode"; mime: string; dataBase64: string }
```

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
npm run test         # Jest (jsdom)
npm run test:watch   # Jest watch mode
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
npm run dev    # tsx watch → localhost:8080 (skaffold port-forwards it to localhost:8085)
npm run test   # vitest
npm run lint   # tsc --noEmit
```

### Engine services (`apps/engine-v8/`, `apps/engine-hermes/`, etc.)
```bash
npm run dev    # tsx watch → localhost:8080
npm run lint   # tsc --noEmit
```

### Full stack
```bash
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

**State**: Zustand stores in `store/`. `useEngineOutputs.ts` is the main store for Playground — holds code, engine selection, outputs, status. The abstract-functions visualizer has its own store at `app/abstract-functions-visualizer/store.ts`.

**UI**: Chakra UI v3, and the design system *is* the theme (`src/style/`). `theme.ts` holds the tokens and registers everything; `textStyles.ts` names the kinds of text (`label`, `code`, `body`, …), `layerStyles.ts` the kinds of surface (`panel`, `section`, `overlay`), `recipes.ts` the controls (`button` with variant × typeface × size, `band`, `chip`, `link`, `input`) and `slotRecipes.ts` the components that portal (menu, select, dialog, drawer, popover — kept apart because their Ark anatomies cannot enter a server module). Call sites wear it through props: `textStyle`, `layerStyle`, `variant`. There is no second styling layer and no `chakra.*` factory use — portal components stay Chakra, presentational ones are compositions in `src/components/ui/`. Colour comes from one vocabulary (`surface.*`, `rule.*`, `ink.*`, `accent`, `status.*`); the header's height is the `sizes.header` token (`h="header"`, `top="header"`), not a CSS variable. Run `npm run typegen` after changing a recipe or a style so the variant props stay typed.

**Samples**: `lib/samples.ts` exports `samples` (basic code snippets), `sampleCatalog`, `v8Samples` (V8-internals examples with inline comments), and `v8SampleCatalog`.

**API client**: `lib/api.ts` — `runEngine()` calls `POST /api/run` via Next.js route proxy.

---

## Engine service pattern

Each engine service (`apps/engine-*/src/server.ts`) is a thin `startEngineServer()` call into the shared `packages/engine-runtime` package. The service supplies an `EngineSpec` — engine name (also the flag-catalog key), temp-dir prefix, config, and an `invoke()` callback that builds the binary command line — and the runtime handles the rest (`packages/engine-runtime/src/index.ts`):
- Zod schema validates `{ sourceText, options: { flags?, timeoutMs? } }`
- `sanitizeFlags()` filters client-supplied flags against the shared `flagCatalog`; rejected flags are reported back in `meta.droppedFlags`
- Per-pod concurrency gate returns 429 + `Retry-After` when saturated
- `child_process.spawn()` runs the binary with timeout; combined stdout+stderr capped at `MAX_OUTPUT_BYTES` (default 2 MB), truncation flagged in `meta.outputTruncated`
- Returns `{ ok, stdout, stderr, artifacts: [], meta }`

**Flag catalog**: `flagCatalog` in `packages/engine-runtime/src/flags.ts` — the single source of truth. The api gateway builds from the repo root and depends on the package the same way the engine services do (`file:../../packages/engine-runtime`, `install-links=true` in `.npmrc`), so it imports `flagCatalog`/`sanitizeFlags` directly instead of keeping its own copy.

To add a flag to V8: add a `FlagSpec` to `flagCatalog.v8` in `packages/engine-runtime/src/flags.ts`. Both the api and every engine service pick it up automatically.

---

## API gateway key behaviors

- **Flag allowlist**: `normalizeFlags()` in `apps/api/src/schemas.ts` runs `sanitizeFlags()` from `@jslab/engine-runtime` over its `flagCatalog`. Engine services import and run the same functions.
- **Cache key**: `engine + sourceText + sorted-flags + ceil(timeoutMs/100)` — timeout is bucketed to reduce misses.
- **Rate limit**: 60 req/min per IP by default, layered per bucket (general/heavy/trace); a self-service API key raises the general and trace quotas, with a lower, separate cap on the heavy (engine-spawning) bucket. Identity is hashed before it becomes a Redis key name; see `rateLimit.ts` and `apiKeys.ts`. Client IP is read from `CF-Connecting-IP` when present (see `infra/README.md`'s "Client IP trust" section), falling back to `req.ip` under a configurable trusted-hop count.
- **Trace endpoints**: `POST /api/trace/execute/type-conversion` → `{ functionName, input, preferredType? }` and `POST /api/trace/execute/equality` → `{ input }` → proxy to `trace-service`.

---

## Trace service

`apps/trace-service/` runs the [engine262](https://github.com/nicolo-ribaudo/engine262) ECMAScript interpreter to produce step-by-step traces of abstract operations (ToNumber, ToPrimitive, etc.).

- Entry: `src/server/server.ts` (Fastify, port 8080; skaffold port-forwards it to localhost:8085)
- Trace logic: `src/trace/index.mts`
- Tests use **vitest** (not Jest)

---

## Infrastructure notes

- Namespace: `jslab` (all k8s resources)
- NetworkPolicy: Traefik → API only; API → engines + Redis only; engines cannot talk to each other
- All pods: `runAsNonRoot`, `readOnlyRootFilesystem`, `/tmp` from `emptyDir`
- Apple Silicon: if engine binaries are `amd64`, run skaffold with `--check-cluster-node-platforms=false`
