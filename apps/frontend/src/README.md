# Frontend — Source Structure

Next.js 15 App Router application. All routes live under `app/`.

## Pages

| Route | File | Description |
|---|---|---|
| `/` | `app/(landing)/page.tsx` | Landing page with feature sections |
| `/playground` | `app/playground/page.tsx` | Multi-engine JS playground (V8, SM, Hermes, JSC) |
| `/v8-pipeline` | `app/v8-pipeline/page.tsx` | V8 compilation pipeline: Tokens → AST → Bytecode → Sparkplug → Maglev → TurboFan |
| `/abstract-functions-visualizer` | `app/abstract-functions-visualizer/page.tsx` | Step-through ECMAScript abstract operations visualizer |
| `/type-coercion` | `app/type-coercion/page.tsx` | Type coercion explorer |

## Key directories

```
src/
  app/               # Next.js App Router pages and layouts
  components/        # Shared UI components (Header, Samples, EditorPanel, OutputsPanel…)
  lib/               # Domain logic: API client, sample code, engine types, ECMAScript 262 impl
  store/             # Zustand stores
  hooks/             # Custom React hooks
```

## Local development

```bash
# from repo root
skaffold dev --port-forward -n jslab   # full stack

# or frontend only (requires API running separately)
cd apps/frontend/src
npm run dev   # http://localhost:3000
```
