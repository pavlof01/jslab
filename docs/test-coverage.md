# Test coverage

Every package has a `test:coverage` script, and all four write the same reports
into `coverage/` (gitignored): a text summary, `coverage-summary.json` for a CI
upload or a badge, and lcov for `coverage/lcov-report/index.html`.

```bash
cd apps/api                 && npm run test:coverage   # vitest + @vitest/coverage-v8
cd packages/engine-runtime  && npm run test:coverage
cd apps/trace-service       && npm run test:coverage
cd apps/frontend/src        && npm run test:coverage    # jest, v8 provider
```

Two things must exist first, or packages fail in ways that look like broken code:

```bash
git submodule update --init --recursive        # trace-service tests need engine262
npm --prefix packages/engine-runtime run build # api and the engines import its dist
```

## Where it stands

Measured on 2026-08-20 against `main`, from `coverage-summary.json`.

| Package                   | Tests | Statements | Branches | Functions |
| ------------------------- | ----: | ---------: | -------: | --------: |
| `apps/api`                |   102 |      76.4% |    63.4% |     85.9% |
| `packages/engine-runtime` |    55 |      88.1% |    79.4% |     86.8% |
| `apps/trace-service`      |   178 |     10.2%¹ |     6.6% |     14.5% |
| `apps/frontend/src`       |   359 |      87.9% |    85.3% |     75.8% |

¹ Not what it looks like. Almost all of trace-service's code runs **inside the
trace worker thread**, which the coverage provider in the main process cannot
instrument, so the files carrying the tracing report near zero while being
exercised end to end by the suites that drive the real sandbox. Read the number
as "how much runs on the main thread", not as how much is tested.

These numbers are a snapshot, not a gate: CI runs `npm test`, not
`test:coverage`, and nothing fails a build for dropping. Re-measure rather than
trusting the table.

## What the tests pin

- **`apps/api`** — the gateway's request pipeline through `app.inject()`: flag
  normalization, the cache key and its timeout bucket, rate-limit buckets and
  their `Retry-After`, api-key issuance and revocation, and what an engine's
  answer maps to (429 through, 5xx → 502, 408 → 504, non-JSON → 502, unreachable
  → 502). Redis is an in-memory fake; the engine is undici's `MockAgent`, so the
  production request path is the one under test.
- **`packages/engine-runtime`** — flag sanitizing, the concurrency gate's 429,
  output truncation, the prelude a spec declares, and that `startEngineServer`
  binds and shuts down cleanly.
- **`apps/trace-service`** — the operations registry, operator detection, spec
  HTML, value serialization, and the execute paths end to end through the worker
  sandbox, including what a caller gets for input that does not parse.
- **`apps/frontend/src`** — the route handlers under `app/api/`, the server-side
  gateway helpers, the stores, and the playground's behaviour.

## Running trace-service's suites

engine262 is vendored as TypeScript sources and decorates its classes. Vite
transforms the tree against the root tsconfig, which does not enable decorators,
so esbuild leaves them in the module — and the vitest runner compiles each module
with `new AsyncFunction`, which cannot parse one. The failure surfaces as a bare
`SyntaxError: Invalid or unexpected token` with no file or line, on whichever
suites reach engine262.

`vitest.config.mts` therefore transforms `engine262/src/**` itself, with
`experimentalDecorators` — which is what `tsx` (the runtime the service actually
uses) picks up from the tsconfig next to those files. Without that plugin, 7 of
the 11 suites do not load.

## Known holes

- `apps/api` branches sit at 63%: the untested ones are mostly logging and
  fail-open paths that need a Redis that breaks mid-command.
- Frontend functions sit at 76%: components rendered but not driven through
  every branch.
