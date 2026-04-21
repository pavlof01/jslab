# Engine SpiderMonkey (js shell wrapper)

HTTP microservice used by the JSLab API to run Mozilla’s SpiderMonkey shell (`js`) and dump bytecode via `dis()`.

## Endpoints

- `GET /healthz`
- `POST /run`

Request body (engine-internal):

```json
{ "sourceText": "string", "options": { "flags": ["..."], "timeoutMs": 2000 } }
```

The service wraps `sourceText` in `new Function(...)` and calls `dis(fn)` (or `disassemble*` when available) to produce bytecode output.

## Local `dis()` example

```bash
docker run --rm -it pavlof01/spidermonkey:debug \
  -e 'const fn=new Function("let x=1; let y=2; x+y"); dis(fn);'
```

## Local development

- `npm ci`
- `npm run dev` (default `0.0.0.0:8080`)

## Docker

- Build: `docker build --build-arg SPIDERMONKEY_BASE_IMAGE=pavlof01/spidermonkey:debug -t jslab-engine-spidermonkey apps/engine-spidermonkey`

## Configuration

See `apps/engine-spidermonkey/src/config.ts`.

- `SM_PATH` (default `js`)
