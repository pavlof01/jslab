# Engine Hermes (hermes/hermesc wrapper)

HTTP microservice used by the JSLab API to run Hermes tooling.

## Endpoints

- `GET /healthz`
- `POST /run`

Request body (engine-internal):

```json
{ "sourceText": "string", "options": { "flags": ["..."], "timeoutMs": 2000 } }
```

When `-dump-bytecode` is present in flags the service compiles `sourceText` to an `.hbc` file via `hermesc`, then disassembles it via `hbcdump`. The `.hbc` binary is returned as an artifact.

## Local development

- `npm ci`
- `npm run dev` (default `0.0.0.0:8080`)

## Docker

- Build: `docker build --build-arg HERMES_BASE_IMAGE=pavlof01/hermes:latest -t jslab-engine-hermes apps/engine-hermes`

## Configuration

See `apps/engine-hermes/src/config.ts`.

- `HERMES_PATH`
