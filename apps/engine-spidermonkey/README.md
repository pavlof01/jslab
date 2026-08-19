# Engine SpiderMonkey (js shell wrapper)

HTTP microservice used by the JSLab API to disassemble a snippet with Mozilla's
SpiderMonkey shell (`js`). It is a thin `startEngineServer()` call into the
shared [`@jslab/engine-runtime`](../../packages/engine-runtime/) package —
validation, flag filtering, the concurrency gate, spawning and the output cap
all live there; this service only supplies the command line.

## Endpoints

- `GET /healthz`
- `POST /run`

Request body (engine-internal — clients call the gateway's `POST /api/run`):

```json
{ "sourceText": "string", "options": { "flags": ["..."], "timeoutMs": 2000 } }
```

Response: `{ ok, stdout, stderr, artifacts: [], meta }`. The disassembly arrives
as text on stdout — `artifacts` is always empty.

## How the run is built

The snippet is written to `snippet.js` in a per-request temp dir, and the shell
runs from that dir with a fixed `-e` wrapper that reads the file, compiles it
with `new Function(source)` and calls `dis(fn)` (falling back to
`disassemble()` / `disassembleScript()` when a build spells it differently).

Because the snippet is only ever compiled, never called, a SpiderMonkey run
produces no program output — only bytecode. Compile errors are reported as
`ERROR: compile failed` followed by the exception text.

Client-supplied flags are filtered against the `sm` entry of the shared
[flag catalog](../../packages/engine-runtime/src/flags.ts): `--baseline-eager`,
`--ion-eager`.

## Local `dis()` example

```bash
docker run --rm -it pavlof01/spidermonkey:debug \
  -e 'const fn=new Function("let x=1; let y=2; x+y"); dis(fn);'
```

## Local development

- Build the shared runtime first: `cd ../../packages/engine-runtime && npm ci && npm run build`
- `npm ci`
- `npm run dev` (default `0.0.0.0:8080`)
- Typecheck: `npm run lint`

Requires a real `js` shell on disk; without one, prefer `docker compose up`
from the repo root.

## Docker

The image bakes in `packages/engine-runtime`, so it builds **from the repo root**:

```bash
docker build -f apps/engine-spidermonkey/Dockerfile \
  --build-arg SPIDERMONKEY_BASE_IMAGE=pavlof01/spidermonkey:debug \
  -t jslab-engine-spidermonkey .
```

## Configuration

See `apps/engine-spidermonkey/src/config.ts`.

- `SM_PATH` (default `js`, resolved on `PATH`)
- `MAX_CONCURRENCY` (default `4`) — excess `/run` requests get 429 + `Retry-After`
- `MAX_OUTPUT_BYTES` (default 2 MiB), `MAX_TIMEOUT_MS` (5000), `MAX_FLAGS` (10),
  `MAX_SOURCE_LENGTH` (20000)
