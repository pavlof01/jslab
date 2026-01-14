# Engine JavaScriptCore (jsc wrapper)

HTTP microservice used by the JSLab API to run WebKit’s `jsc` and dump bytecode via `-d`.

## Endpoints

- `GET /healthz`
- `POST /run`

Request body (engine-internal):

```json
{ "task": "run | bytecode", "sourceText": "string", "options": { "flags": ["..."], "timeoutMs": 2000 } }
```

For `task=bytecode` the service ensures `-d` is present and returns the bytecode dump as a text artifact.

## Local development

- `npm ci`
- `npm run dev` (default `0.0.0.0:8080`)

## Docker

- Build: `docker build --build-arg JSC_BASE_IMAGE=pavlof01/jsc:debug -t jslab-engine-jsc apps/engine-jsc`

## Configuration

See `apps/engine-jsc/src/config.ts`.

- `JSCSHELL_PATH` (preferred) or legacy `JSC_PATH`

Note: JSC treats environment variables starting with `JSC_` as VM options. The wrapper strips `JSC_PATH` from the child process environment to avoid noisy `invalid option: JSC_PATH=...` output.
