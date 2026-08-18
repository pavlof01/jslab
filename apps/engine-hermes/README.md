# Engine Hermes (hermes wrapper)

HTTP microservice used by the JSLab API to compile a snippet with Hermes and
dump its bytecode. It is a thin `startEngineServer()` call into the shared
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

Response: `{ ok, stdout, stderr, artifacts: [], meta }`. `meta.droppedFlags`
lists flags the allowlist rejected; `meta.outputTruncated` is set when the
combined stdout+stderr exceeded `MAX_OUTPUT_BYTES`.

## How the run is built

The service invokes `$HERMES_PATH -dump-bytecode <allowlisted flags> <snippet>`.
`-dump-bytecode` is **always** prepended server-side, so a client never passes
it. Hermes stops after codegen in this mode, which is why a snippet never
produces program output — only the disassembly.

Bytecode comes back as text on stdout; the service does not produce `.hbc`
artifacts, and `artifacts` is always empty. (The base image also ships `hermesc`
and `hbcdump`, but this service does not invoke them.)

Client-supplied flags are filtered against the `hermes` entry of the shared
[flag catalog](../../packages/engine-runtime/src/flags.ts): `-O`, `-strict`,
`-gc-sanitize-handles`.

## Local development

- Build the shared runtime first: `cd ../../packages/engine-runtime && npm ci && npm run build`
- `npm ci`
- `npm run dev` (default `0.0.0.0:8080`)
- Typecheck: `npm run lint`

Requires a real `hermes` binary on disk; without one, prefer `docker compose up`
from the repo root.

## Docker

The image bakes in `packages/engine-runtime`, so it builds **from the repo root**:

```bash
docker build -f apps/engine-hermes/Dockerfile \
  --build-arg HERMES_BASE_IMAGE=pavlof01/hermes:latest \
  -t jslab-engine-hermes .
```

## Configuration

See `apps/engine-hermes/src/config.ts`.

- `HERMES_PATH` (default `/usr/bin/hermes`; the Kubernetes manifest and Compose
  both set `/usr/local/bin/hermes`, which is where the base image symlinks it)
- `MAX_CONCURRENCY` (default `4`) — excess `/run` requests get 429 + `Retry-After`
- `MAX_OUTPUT_BYTES` (default 2 MiB), `MAX_TIMEOUT_MS` (5000), `MAX_FLAGS` (10),
  `MAX_SOURCE_LENGTH` (20000)
