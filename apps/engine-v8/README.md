# Engine V8 (d8 wrapper)

HTTP microservice used by the JSLab API to run V8’s `d8` shell and (optionally) dump Ignition bytecode.

## Endpoints

- `GET /healthz`
- `POST /run`

Request body (engine-internal):

```json
{ "task": "run | bytecode", "sourceText": "string", "options": { "flags": ["..."], "timeoutMs": 2000 } }
```

For `task=bytecode` the service ensures `--print-bytecode` is present.

## Local development

- `npm ci`
- `npm run dev` (default `0.0.0.0:8080`)

## Docker

- Build: `docker build --build-arg V8_BASE_IMAGE=pavlof01/v8-d8:latest -t jslab-engine-v8 apps/engine-v8`

## Configuration

See `apps/engine-v8/src/config.ts`.

- `D8_PATH` (default `/usr/bin/d8`)
