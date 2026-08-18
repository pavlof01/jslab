# Frontend — Source Structure

Next.js 16 App Router application (React 19, Turbopack). All routes live under
`app/`. This directory is the npm workspace root for the frontend — run `npm`
commands here, not in `apps/frontend/`.

## Pages

| Route | File | Description |
| --- | --- | --- |
| `/` | `app/(landing)/page.tsx` | Landing page with feature sections |
| `/playground` | `app/playground/page.tsx` → `app/_components/PlaygroundClient.tsx` | Multi-engine JS playground (V8, SM, Hermes, JSC) |
| `/v8-pipeline` | `app/v8-pipeline/page.tsx` → `app/v8-pipeline/components/PipelineClient.tsx` | V8 compilation pipeline: Tokens → AST → Ignition → Sparkplug → Maglev → TurboFan → Deopt |
| `/type-conversion` | `app/type-conversion/page.tsx` | Spec step-through for type conversion (`ToNumber`, `ToPrimitive`, `ToString`, …) |
| `/equality` | `app/equality/page.tsx` | Spec step-through for `==` / `===` |
| `/embed/playground` | `app/embed/playground/page.tsx` | Embeddable playground widget (`noindex`) |
| `/embed/bytecode` | `app/embed/bytecode/page.tsx` | Embeddable bytecode snapshot widget (`noindex`) |
| `/embed/oembed` | `app/embed/oembed/route.ts` | oEmbed provider endpoint for the widgets above |

`/type-conversion` and `/equality` are two entry points into the same client
component, `app/abstract-functions-visualizer/components/AbstractFunctionsVisualizer.tsx`,
differing only in `initialCategory`. `app/abstract-functions-visualizer/` is
that shared implementation — it is **not** itself a route.

## Route handlers (server side)

| Route | Talks to |
| --- | --- |
| `app/api/run/route.ts` | api gateway `POST /api/run` |
| `app/api/trace/execute/[category]/route.ts` | api gateway `POST /api/trace/execute/{type-conversion,equality}` |
| `app/api/trace/functions/route.ts` | trace-service `GET /functions` (directly) |
| `app/api/spec/[functionName]/route.ts` | trace-service `GET /spec/:functionName` (directly) |

The two direct trace-service calls (plus the SSR fetch in
`app/abstract-functions-visualizer/server-data.ts`) are the reason the
NetworkPolicy still allows frontend → trace-service; see
[`infra/README.md`](../../../infra/README.md).

## Key directories

```
src/
  app/               # Next.js App Router pages, route handlers and layouts
  components/        # Shared UI (Header, Samples, EditorPanel, OutputsPanel, V8FlagSelector…)
  components/ui/     # Presentational primitives built on the theme (band, chip, tab-bar…)
  lib/               # Domain logic: API client, samples, engine metadata, share/embed state
  lib/server/        # Server-only helpers (gateway + trace-service URLs, proxying)
  store/             # Zustand stores (useEngineOutputs)
  style/             # The design system: theme tokens, textStyles, layerStyles, recipes
  hooks/             # Custom React hooks
  utils/             # Pure helpers (bytecode diff)
  scripts/           # Standalone shell/node helpers for poking engines by hand
  test/              # Jest test stubs
```

Styling goes through the Chakra theme in `style/` — `textStyle`, `layerStyle`
and recipe `variant` props at the call sites, no second styling layer. Run
`npm run typegen` after changing a recipe or a style so the variant props stay
typed (`prelint`/`prebuild` already do this for you).

## Local development

```bash
# from repo root — full stack
docker compose up --build
skaffold dev --port-forward -n jslab

# or frontend only (requires the api gateway running separately)
cd apps/frontend/src
npm ci
npm run dev   # http://localhost:3000
```

## Checks

```bash
npx tsc --noEmit -p tsconfig.json   # types
npm run lint                        # ESLint
npm run test                        # Jest (jsdom); npm run test:watch to watch
```
