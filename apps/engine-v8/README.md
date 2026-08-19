# Engine V8 (d8 wrapper)

HTTP microservice used by the JSLab API to run V8's `d8` shell. It is a thin
`startEngineServer()` call into the shared
[`@jslab/engine-runtime`](../../packages/engine-runtime/) package — validation,
flag filtering, the concurrency gate, spawning and the output cap all live
there; this service only supplies the command line.

## Endpoints

- `GET /healthz`
- `GET /openapi.json`
- `POST /run`

Request body (engine-internal — clients call the gateway's `POST /api/run`):

```json
{ "sourceText": "string", "options": { "flags": ["..."], "timeoutMs": 2000 } }
```

Response: `{ ok, stdout, stderr, artifacts: [], meta }`. `meta.droppedFlags`
lists flags the allowlist rejected; `meta.outputTruncated` is set when the
combined stdout+stderr exceeded `MAX_OUTPUT_BYTES`.

Unlike the other engines, `d8` prints nothing extra on its own — the output type
is determined entirely by the flags passed (e.g. `--print-bytecode` for Ignition
bytecode, `--print-ast` for the AST). Flags are filtered against the `v8` entry
of the shared [flag catalog](../../packages/engine-runtime/src/flags.ts).

## Sandboxing

Two things are added server-side on every run:

- `--max-old-space-size=$MAX_HEAP_MB` (engine-controlled, not client-supplied),
  so a greedy script gets a JS `RangeError` instead of OOM-killing the pod.
- A lockdown shim script loaded before the snippet, which disables the `d8`
  shell's `read`/`readbuffer`/`readline` globals — they can read any file the
  container user can reach.

## Local development

- Build the shared runtime first: `cd ../../packages/engine-runtime && npm ci && npm run build`
- `npm ci`
- `npm run dev` (default `0.0.0.0:8080`)
- Typecheck: `npm run lint`

Requires a real `d8` binary on disk; without one, prefer `docker compose up`
from the repo root.

## Docker

The image bakes in `packages/engine-runtime`, so it builds **from the repo root**:

```bash
docker build -f apps/engine-v8/Dockerfile \
  --build-arg V8_BASE_IMAGE=pavlof01/v8-d8:latest \
  -t jslab-engine-v8 .
```

## Configuration

See `apps/engine-v8/src/config.ts`.

- `D8_PATH` (default `/opt/v8/d8`)
- `MAX_HEAP_MB` (default `1536`)
- `MAX_CONCURRENCY` (default `4`) — excess `/run` requests get 429 + `Retry-After`
- `MAX_OUTPUT_BYTES` (default 2 MiB), `MAX_TIMEOUT_MS` (5000), `MAX_FLAGS` (10),
  `MAX_SOURCE_LENGTH` (20000)
