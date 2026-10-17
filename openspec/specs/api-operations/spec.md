# api-operations Specification

## Purpose

What an operator of the api gateway relies on rather than a client: the health and metrics endpoints, the published API description, the overload guard, and how the process reads its environment, starts and stops.

## Requirements

### Requirement: Health endpoint

`GET /healthz` SHALL answer 200 with `{ ok: true, redis }`, where `redis` is the current state of the gateway's Redis connection, such as `ready` or `reconnecting`. `ok` is `true` whatever that state is. Answering MUST NOT contact Redis or any upstream service, and the endpoint neither authenticates nor rate-limits.

#### Scenario: Redis is connected

- **WHEN** `/healthz` is requested while the Redis connection is up
- **THEN** the response is 200 with `{ ok: true, redis: "ready" }`

#### Scenario: Redis is unreachable

- **WHEN** `/healthz` is requested while Redis cannot be reached
- **THEN** the response is 200 with `ok: true` and a `redis` other than `ready`, such as `reconnecting`

### Requirement: Metrics endpoint

`GET /metrics` SHALL answer 200 in the Prometheus text format (`Content-Type: text/plain; version=0.0.4; charset=utf-8`) with the default process and Node.js runtime metrics under the prefix `jslab_api_`, plus the gateway's own series `jslab_api_runs_total`, `jslab_api_run_duration_seconds`, `jslab_api_cache_events_total` and `jslab_api_rate_limited_total`. The endpoint neither authenticates nor rate-limits.

#### Scenario: Scrape

- **WHEN** `/metrics` is requested
- **THEN** the response is 200 and declares `jslab_api_nodejs_eventloop_lag_seconds`, `jslab_api_nodejs_heap_size_used_bytes` and the four gateway series

### Requirement: Run metrics

Every `POST /api/run` request that passes validation, authentication and its rate limits SHALL add one to `jslab_api_runs_total{engine, outcome}`: `cache_hit` for a response served from the cache, `ok` for a 200, `engine_busy` for a 429 relayed from the engine, `error` for anything else. All but cache hits MUST also be observed, in seconds, in the histogram `jslab_api_run_duration_seconds{engine, outcome}`, whose buckets are 0.05, 0.1, 0.25, 0.5, 1, 2 and 5.

#### Scenario: Successful run

- **WHEN** a v8 run is answered 200 by its engine
- **THEN** `jslab_api_runs_total{engine="v8",outcome="ok"}` and the count of `jslab_api_run_duration_seconds{engine="v8",outcome="ok"}` each grow by one

#### Scenario: Cache hit

- **WHEN** a v8 run is served from the cache, whatever status the cached entry replays
- **THEN** `jslab_api_runs_total{engine="v8",outcome="cache_hit"}` grows by one and no duration is observed

#### Scenario: Unreachable engine

- **WHEN** a v8 run ends in a 502
- **THEN** `jslab_api_runs_total{engine="v8",outcome="error"}` grows by one

#### Scenario: Request that fails validation

- **WHEN** a run request is answered 400 by validation
- **THEN** neither series changes

### Requirement: Cache metrics

`jslab_api_cache_events_total{result}` SHALL count cache lookups and refused writes: `hit` or `miss` for each `POST /api/run` lookup made while the response cache is active and for each `GET /api/engines` lookup, and `skip_too_large` each time a value is refused by the cache size guard (see run-api).

#### Scenario: Miss, then hit

- **WHEN** the same run is requested twice in production
- **THEN** `/metrics` reports `jslab_api_cache_events_total{result="miss"}` and `{result="hit"}` of at least one each

#### Scenario: Oversized value

- **WHEN** a run's response is refused by the cache size guard
- **THEN** `jslab_api_cache_events_total{result="skip_too_large"}` grows by one

#### Scenario: Run outside production

- **WHEN** a run is served while `NODE_ENV` is not `production`
- **THEN** neither `hit` nor `miss` changes

### Requirement: OpenAPI document

`GET /api/openapi.json` SHALL answer 200 with an OpenAPI 3.0.3 document titled `JSLab API`, version `1.0.0`, that describes `/healthz`, `/metrics`, `/api/flags`, `/api/engines`, `/api/run`, `/api/keys` and the two `/api/trace/execute/*` paths, but not itself or `/api/docs`. The `engine` enum of the run request MUST list the engine keys of the shared flag catalog. The rest of the document is static and does not follow the configured limits.

#### Scenario: Document is fetched

- **WHEN** `/api/openapi.json` is requested
- **THEN** the response is 200 with `openapi` of `3.0.3` and `info` of `{ title: "JSLab API", version: "1.0.0" }`
- **AND** the run request's `engine` enum is `["v8", "hermes", "sm", "jsc"]`

#### Scenario: Limits are changed

- **WHEN** `MIN_TIMEOUT_MS` or `MAX_TIMEOUT_MS` is set to a non-default value
- **THEN** the document still describes `timeoutMs` as clamped to 250–5000 ms

### Requirement: API reference page

`GET /api/docs/` SHALL serve an HTML page that renders the same OpenAPI document as an interactive reference, and `GET /api/docs` MUST redirect to it with status 301. The page loads the document from `/api/docs/openapi.json`, which serves the same content as `/api/openapi.json`.

#### Scenario: Path without the trailing slash

- **WHEN** `/api/docs` is requested
- **THEN** the response is 301 with `Location: /api/docs/`

#### Scenario: Reference page

- **WHEN** `/api/docs/` is requested
- **THEN** the response is 200 with `Content-Type: text/html`

### Requirement: Overload protection

While the gateway's event-loop delay exceeds 1000 ms, its heap use exceeds 480 MiB or its resident memory exceeds 600 MiB, every route, `/healthz` and `/metrics` included, SHALL answer 503 with a `Retry-After: 10` header and a body whose `message` is `under pressure`. The body has the HTTP framework's error shape, not `{ ok: false, error }`. The thresholds are fixed, not read from the environment.

#### Scenario: Heap over the threshold

- **WHEN** `/healthz` is requested while the heap holds more than 480 MiB
- **THEN** the response is 503 with `Retry-After: 10` and `{ statusCode: 503, code: "FST_UNDER_PRESSURE", error: "Service Unavailable", message: "under pressure" }`

#### Scenario: Run request under pressure

- **WHEN** `POST /api/run` is requested in the same state
- **THEN** the response is the same 503 and no engine is contacted

### Requirement: Environment configuration

The gateway SHALL read its settings from environment variables once, at startup. A variable that is unset takes its default, and a numeric setting MUST be converted from its string form to a number.

#### Scenario: Empty environment

- **WHEN** none of the gateway's variables is set
- **THEN** `PORT` is 8080, `HOST` is `0.0.0.0`, `REDIS_URL` is `redis://redis:6379` and `ENGINE_V8_URL` is `http://engine-v8:8080`

#### Scenario: Numeric strings

- **WHEN** `PORT` is `9999` and `MAX_TIMEOUT_MS` is `12000`
- **THEN** the gateway uses them as the numbers 9999 and 12000

### Requirement: Invalid environment

A setting that cannot be parsed SHALL stop the process before it listens, with exit status 1 and an error that begins `Invalid environment for api:` and names the variable. Numeric settings accept any number, except `TRUST_PROXY_HOPS`, which MUST be a non-negative integer.

#### Scenario: Value that is not a number

- **WHEN** `PORT` is `not-a-port`
- **THEN** the process exits with status 1 and an error that begins `Invalid environment for api:` and names `PORT`

#### Scenario: Hop count that is negative or fractional

- **WHEN** `TRUST_PROXY_HOPS` is `-1` or `1.5`
- **THEN** startup fails with an error that begins `Invalid environment`

#### Scenario: Hop count of zero

- **WHEN** `TRUST_PROXY_HOPS` is `0`
- **THEN** the gateway starts

#### Scenario: Unknown log level

- **WHEN** `LOG_LEVEL` is `bogus`
- **THEN** the process exits with status 1 before it listens, with the logger's error rather than `Invalid environment`

### Requirement: Process lifecycle

The gateway SHALL listen on `HOST` and `PORT` (default `0.0.0.0:8080`) and exit with status 1 when it cannot bind. On `SIGTERM` or `SIGINT` it MUST close the server, close its Redis connection and exit with status 0.

#### Scenario: Orderly shutdown

- **WHEN** the process receives `SIGTERM`
- **THEN** the server is closed and the process exits with status 0

#### Scenario: Port already taken

- **WHEN** another process is listening on the configured address
- **THEN** the gateway logs the bind error and exits with status 1

### Requirement: Startup without Redis

The gateway SHALL start listening without waiting for Redis at `REDIS_URL` (default `redis://redis:6379`) and keep serving requests while Redis is unreachable, reconnecting in the background. A Redis command MUST be abandoned after `REDIS_COMMAND_TIMEOUT_MS` (default 300); how a route copes with that is specified with the route.

#### Scenario: Redis is unreachable at startup

- **WHEN** the gateway starts while nothing listens at `REDIS_URL`
- **THEN** it listens, and `/healthz` answers 200 with a `redis` other than `ready`

#### Scenario: Request while Redis is unreachable

- **WHEN** `GET /api/engines` is requested in that state
- **THEN** the response is 200 with `meta.cacheHit` of `false`, about 300 ms later per Redis command than with Redis up
