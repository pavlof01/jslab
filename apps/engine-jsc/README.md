# Engine JavaScriptCore (jsc wrapper)

HTTP microservice used by the JSLab API to run WebKit's `jsc` shell and dump
bytecode. It is a thin `startEngineServer()` call into the shared
[`@jslab/engine-runtime`](../../packages/engine-runtime/) package — validation,
flag filtering, the concurrency gate, spawning and the output cap all live
there; this service only supplies the command line.

## Endpoints

- `GET /healthz`
- `POST /run`

Request body (engine-internal — clients call the gateway's `POST /api/run`):

```json
{ "sourceText": "string", "options": { "flags": ["..."], "timeoutMs": 2000 } }
```

Response: `{ ok, stdout, stderr, artifacts: [], meta }`. The bytecode dump
arrives as text on stdout — `artifacts` is always empty.

## How the run is built

The service invokes `$JSCSHELL_PATH -d <allowlisted flags> <shims> <snippet>`.
`-d` is **always** prepended server-side, so a client never passes it. Flag
order is preserved (the runtime is configured with `sortFlags: false`).

Unlike SpiderMonkey and Hermes, **jsc executes the snippet** — `-d` dumps
bytecode but the file still runs. jsc has no portable per-process heap cap (no
equivalent of d8's `--max-old-space-size`), so a single greedy script is bounded
only by the concurrency gate and the pod memory limit.

Two shim scripts are loaded before the snippet, in this order:

1. **Lockdown** — reassigns the shell's filesystem and loader globals
   (`readFile`, `writeFile`, `openFile`, `load`, `run`, `runString`, `readline`,
   `checkSyntax`, `checkModuleSyntax`) to throwing stubs. None of them is gated
   behind a flag, so they have to be neutralized in-realm.
2. **Console** — the jsc shell has no `console`, so `console.log/info/warn/error/debug`
   are aliased onto the shell's own `print`.

## Local development

- Build the shared runtime first: `cd ../../packages/engine-runtime && npm ci && npm run build`
- `npm ci`
- `npm run dev` (default `0.0.0.0:8080`)
- Typecheck: `npm run lint`

Requires a real `jsc` binary on disk; without one, prefer `docker compose up`
from the repo root.

## Docker

The image bakes in `packages/engine-runtime`, so it builds **from the repo root**:

```bash
docker build -f apps/engine-jsc/Dockerfile \
  --build-arg JSC_BASE_IMAGE=pavlof01/jsc:debug \
  -t jslab-engine-jsc .
```

## Configuration

See `apps/engine-jsc/src/config.ts`.

- `JSCSHELL_PATH` (preferred) or legacy `JSC_PATH`; falls back to `jsc` on `PATH`
- `MAX_CONCURRENCY` (default `4`) — excess `/run` requests get 429 + `Retry-After`
- `MAX_OUTPUT_BYTES` (default 2 MiB), `MAX_TIMEOUT_MS` (5000), `MAX_FLAGS` (10),
  `MAX_SOURCE_LENGTH` (20000)

Note: JSC treats environment variables starting with `JSC_` as VM options. The
wrapper strips `JSC_PATH` from the child process environment to avoid noisy
`invalid option: JSC_PATH=...` output — which is why `JSCSHELL_PATH` is the
preferred name.
