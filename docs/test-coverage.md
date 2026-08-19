# Test coverage

Every package has a `test:coverage` script:

```bash
cd apps/api                 && npm run test:coverage   # vitest + @vitest/coverage-v8
cd packages/engine-runtime  && npm run test:coverage
cd apps/trace-service       && npm run test:coverage
cd apps/frontend/src        && npm run test:coverage    # jest, v8 provider
```

Each writes `coverage/` (text summary, `coverage-summary.json`, lcov). `coverage/`
is gitignored.

**Run them on the Node the repo pins** (`.nvmrc`: 22). `apps/trace-service`
imports engine262 from the submodule's TypeScript sources, and on newer Node the
suites that reach it fail to load with `SyntaxError: Invalid or unexpected
token` before a single test runs. CI uses 22 and is green.

Two things must exist first, or packages fail in ways that look like broken code:

```bash
git submodule update --init --recursive        # trace-service tests need engine262
npm --prefix packages/engine-runtime run build # api and the engines import its dist
```

## Where it stands

Measured on 2026-08-19 against `main`, on Node 22 for trace-service and Node 26
for the rest.

| Package | Tests | Statements | Branches | Functions |
|---|---:|---:|---:|---:|
| `apps/api` | 103 | 76.4% | 63.4% | 85.9% |
| `packages/engine-runtime` | 55 | 88.1% | 79.4% | 86.8% |
| `apps/frontend/src` | 359 | 87.9% | 85.3% | 75.8% |
| `apps/trace-service` | 42 + 6 suites needing Node 22 | see note | | |

These numbers are a snapshot, not a gate: CI runs `npm test`, not
`test:coverage`, and nothing fails a build for dropping. Treat the table as
"where the holes were on that date" and re-measure rather than trusting it.

## What the tests actually pin

- **`apps/api`** — the gateway's request pipeline through `app.inject()`: flag
  normalization, the cache key (including its timeout bucket), rate-limit
  buckets and their `Retry-After`, api-key issuance and revocation, and what an
  engine's answer maps to (429 through, 5xx → 502, 408 → 504, non-JSON → 502,
  unreachable → 502). Redis is an in-memory fake; the engine is undici's
  `MockAgent`, so the production request path is the one under test.
- **`packages/engine-runtime`** — the shared engine service: flag sanitizing,
  the concurrency gate's 429, output truncation, the prelude a spec declares,
  and that `startEngineServer` binds and shuts down cleanly.
- **`apps/trace-service`** — the operations registry, spec HTML generation,
  value serialization, and the execute paths end to end through the worker
  sandbox.
- **`apps/frontend/src`** — the route handlers under `app/api/`, the server-side
  gateway helpers, the stores, and the playground's own behaviour.

## Known holes

- `apps/api` branches sit at 63%: the untested ones are mostly logging and
  fail-open paths that need a Redis that breaks mid-command.
- `apps/trace-service` reports 0% for `execute/index.ts` and its helpers — they
  only ever run inside the trace worker, which the coverage provider in the main
  process cannot instrument. They are covered end to end instead.
- Frontend functions sit at 76%: mostly React components rendered but not
  exercised through every branch.
