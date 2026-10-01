# run-api Specification

## Purpose

The api gateway's `POST /api/run`, the one public entry point for running a JavaScript snippet on an engine. It validates and normalizes the request, answers from a Redis response cache when it can, forwards the rest to the engine service of the requested engine, and maps whatever comes back onto the response a client sees.

## Requirements

### Requirement: Run request validation

`POST /api/run` SHALL accept a JSON body of `{ engine, sourceText, options?: { flags?, timeoutMs? } }`, where `engine` is one of `v8`, `hermes`, `sm`, `jsc`, `sourceText` is a non-empty string, `flags` is an array of strings and `timeoutMs` is a positive integer. Any other body MUST be rejected with status 400 and `{ ok: false, error }`, where `error` is the first problem found, prefixed with the path of its field when it has one. Properties the schema does not name are ignored.

#### Scenario: Unknown engine

- **WHEN** a request sends `engine` as `nope`
- **THEN** the response is 400 with `error` equal to `engine: Invalid enum value. Expected 'v8' | 'hermes' | 'sm' | 'jsc', received 'nope'`

#### Scenario: Missing or empty source

- **WHEN** a request omits `sourceText`
- **THEN** the response is 400 with `error` equal to `sourceText: Required`
- **AND** a request that sends it as an empty string is answered 400 with an `error` that begins `sourceText:`

#### Scenario: Timeout that is not a positive integer

- **WHEN** a request sends `options.timeoutMs` of `12.5` or `0`
- **THEN** the response is 400 with an `error` that begins `options.timeoutMs:`

#### Scenario: Flag that is not a string

- **WHEN** a request sends `options.flags` of `[1]`
- **THEN** the response is 400 with an `error` that begins `options.flags.0:`

#### Scenario: Body that is not an object

- **WHEN** the JSON body is an array
- **THEN** the response is 400 with `error` equal to `Expected object, received array`

#### Scenario: Unknown property

- **WHEN** an otherwise valid request carries a property the schema does not name
- **THEN** the request is served as if the property were absent

### Requirement: Validation order

A request SHALL be validated before the caller is authenticated, before any rate-limit bucket is spent and before Redis or an engine is contacted. A body that fails validation MUST be answered 400 whoever sent it.

#### Scenario: Invalid body with an unknown API key

- **WHEN** a request with an unknown `engine` also presents an API key that is not on file
- **THEN** the response is 400, not 401

#### Scenario: Invalid body from a caller with no budget left

- **WHEN** `RATE_LIMIT_PER_MIN` is 0, `MAX_SOURCE_LENGTH` is 10 and `sourceText` is 11 characters long
- **THEN** the response is 400, not 429

### Requirement: Unparseable request body

A body declared as JSON that cannot be parsed MUST be rejected with status 400 before the request is validated, in the HTTP framework's error shape (`statusCode`, `error`, `message`) rather than `{ ok: false, error }`. A body sent as `text/plain` is not parsed as JSON; it SHALL fail validation as a non-object.

#### Scenario: Truncated JSON

- **WHEN** the body is `{nope` with `Content-Type: application/json`
- **THEN** the response is 400 with `statusCode: 400` and `error: "Bad Request"` in the body, and no `ok` field

#### Scenario: Empty JSON body

- **WHEN** a request declares `Content-Type: application/json` and sends no body
- **THEN** the response is 400 with `code: "FST_ERR_CTP_EMPTY_JSON_BODY"`

#### Scenario: Plain-text body

- **WHEN** a valid JSON document is sent with `Content-Type: text/plain`
- **THEN** the response is 400 with `{ ok: false, error: "Expected object, received string" }`

#### Scenario: No body at all

- **WHEN** a request has neither a body nor a content type
- **THEN** the response is 400 with `{ ok: false, error: "Required" }`

### Requirement: Request size limits

A `sourceText` longer than `MAX_SOURCE_LENGTH` characters (default 20000) SHALL be rejected with status 400 and an `error` naming the limit. A request body larger than `REQUEST_BODY_LIMIT_BYTES` (default 524288, 512 KiB) MUST be rejected with status 413 before it is parsed; that response has the HTTP framework's error shape, not `{ ok: false, error }`.

#### Scenario: Source over the length limit

- **WHEN** `MAX_SOURCE_LENGTH` is 10 and `sourceText` is 11 characters long
- **THEN** the response is 400 with `error` equal to `sourceText exceeds limit (10 chars)`

#### Scenario: Source exactly at the limit

- **WHEN** `sourceText` is 20000 characters long under the default limit
- **THEN** the request is forwarded to the engine

#### Scenario: Oversized body

- **WHEN** the request body is 600 KiB
- **THEN** the response is 413 with `code: "FST_ERR_CTP_BODY_TOO_LARGE"` in the body, and no `ok` field

### Requirement: Timeout normalization

The run's time budget SHALL be `options.timeoutMs`, or `DEFAULT_TIMEOUT_MS` (default 2000) when it is omitted, raised to `MIN_TIMEOUT_MS` (default 250) and capped at `MAX_TIMEOUT_MS` (default 5000). A positive integer outside that range MUST be clamped, not rejected, and the clamped value is what the engine receives.

#### Scenario: Timeout omitted

- **WHEN** a request has no `options.timeoutMs`
- **THEN** the engine receives `timeoutMs` of 2000

#### Scenario: Timeout too small to ever succeed

- **WHEN** a request sends `options.timeoutMs` of 1
- **THEN** the engine receives `timeoutMs` of 250

#### Scenario: Timeout above the maximum

- **WHEN** a request sends `options.timeoutMs` of 60000
- **THEN** the engine receives `timeoutMs` of 5000

#### Scenario: Timeout within the range

- **WHEN** a request sends `options.timeoutMs` of 1234
- **THEN** the engine receives `timeoutMs` of 1234

### Requirement: Flag normalization

Before forwarding, the gateway SHALL filter `options.flags` by the flag allowlist, deduplication and `MAX_FLAGS` (default 10) rules specified in engine-runtime, against the catalog of the requested engine, and MUST forward the accepted flags in sorted order for every engine. A list of more than 256 entries is not filtered; the request is rejected with status 400.

#### Scenario: Unknown flag

- **WHEN** a v8 request sends `--print-bytecode` and `--not-a-real-flag`
- **THEN** the engine receives only `--print-bytecode`

#### Scenario: Flag of another engine

- **WHEN** a hermes request sends `-strict`, `-O` and `--print-bytecode`
- **THEN** the engine receives `-O` then `-strict`

#### Scenario: Caller order is not kept

- **WHEN** an sm request sends `--ion-eager` then `--baseline-eager`
- **THEN** the engine receives `--baseline-eager` then `--ion-eager`

#### Scenario: No flags

- **WHEN** a request has no `options.flags`
- **THEN** the engine receives `flags` of `[]`

#### Scenario: List longer than the wire cap

- **WHEN** a request sends 257 flags
- **THEN** the response is 400 with `error` equal to `options.flags: Array must contain at most 256 element(s)`
- **AND** a request that sends 256 flags is not rejected

### Requirement: Dropped flag reporting

Entries the gateway rejected SHALL be reported in `meta.droppedFlags`, by the dropped-flag rules specified in engine-runtime, on every response that carries a `meta` object, whether fresh, cached or shared with a concurrent request. The list reflects the request being answered, never the request that produced a cached result. `meta.droppedFlags` MUST be absent when nothing was rejected, and a response without `meta` does not report them.

#### Scenario: Mistyped flag on a fresh run

- **WHEN** a v8 request sends `--print-bytecode` and `--not-a-real-flag` and the run succeeds
- **THEN** `meta.droppedFlags` is `["--not-a-real-flag"]`

#### Scenario: Mistyped flag on a cache hit

- **WHEN** a result is cached for v8 with `--print-bytecode` and a later request sends `--print-bytecode` and `--not-a-real-flag`
- **THEN** the response is served from the cache with `meta.droppedFlags` of `["--not-a-real-flag"]`

#### Scenario: Every flag accepted

- **WHEN** every flag in the request is accepted
- **THEN** `meta` has no `droppedFlags`

#### Scenario: Failed run

- **WHEN** a request with a mistyped flag ends in `{ ok: false, error }`
- **THEN** the response does not mention the mistyped flag

### Requirement: Forwarding to the engine

A valid request that is not answered from the cache is subject to the heavy rate-limit bucket (see rate-limiting) and, unless it joins a run in progress, SHALL be sent as `POST /run` to the service configured for its engine in `ENGINE_V8_URL`, `ENGINE_HERMES_URL`, `ENGINE_SM_URL` or `ENGINE_JSC_URL`, with the body `{ sourceText, options: { flags, timeoutMs } }` holding the normalized flags and timeout, as specified in engine-runtime. `engine` MUST NOT be part of the forwarded body.

#### Scenario: Normalized payload

- **WHEN** a v8 request sends `sourceText` of `1+1`, the flag `--print-bytecode` and `timeoutMs` of 1234
- **THEN** the v8 service receives `{ sourceText: "1+1", options: { flags: ["--print-bytecode"], timeoutMs: 1234 } }`

#### Scenario: Options omitted

- **WHEN** a request has no `options`
- **THEN** the engine receives `options` of `{ flags: [], timeoutMs: 2000 }`

#### Scenario: Default engine addresses

- **WHEN** none of the four variables is set
- **THEN** v8, hermes, sm and jsc runs go to `http://engine-v8:8080`, `http://engine-hermes:8080`, `http://engine-spidermonkey:8080` and `http://engine-jsc:8080`

#### Scenario: Address with a trailing slash

- **WHEN** `ENGINE_V8_URL` ends in `/`
- **THEN** the request path is still `/run`

### Requirement: Run response

An engine answer with a status below 500 other than 429 and a body with `ok: true` SHALL be returned with status 200 as `{ ok, stdout, stderr, artifacts, meta }`, the engine's fields unchanged except in `meta`. There the gateway MUST set `engine` to the requested engine, `durationMs` to the milliseconds it spent on the engine call and `cacheHit` to `false`, and keep every other field the engine sent.

#### Scenario: Successful run

- **WHEN** the v8 service answers `{ ok: true, stdout: "2", stderr: "", artifacts: [] }`
- **THEN** the response is 200 with `stdout` of `2`, `meta.engine` of `v8`, `meta.cacheHit` of `false` and a numeric `meta.durationMs`

#### Scenario: Truncated output

- **WHEN** the engine's `meta` carries `outputTruncated: true` and `outputLimitBytes`
- **THEN** both fields are present in the response's `meta`

#### Scenario: Engine's own timing

- **WHEN** the engine's `meta` carries its own `durationMs` and `engine`
- **THEN** the response carries the gateway's values for both

### Requirement: Engine-reported failure

An engine answer with a JSON body whose `ok` is not true SHALL be relayed with the engine's body unchanged and a status mapped from the engine's: 400 stays 400, 408 becomes 504, and any other status below 500 except 429 becomes 502.

#### Scenario: Engine reports a timeout

- **WHEN** the engine answers 408 with `{ ok: false, error: "execution timed out" }`
- **THEN** the response is 504 with that body

#### Scenario: Engine rejects the request

- **WHEN** the engine answers 400 with `{ ok: false, error }`
- **THEN** the response is 400 with that body

#### Scenario: Failure under an unexpected status

- **WHEN** the engine answers 200 or 404 with `{ ok: false, error }`
- **THEN** the response is 502 with that body

### Requirement: Engine saturation

An engine answer with status 429 SHALL be relayed as 429 whatever its body, with the engine's `Retry-After` header when it sent one. The body MUST be the engine's JSON body, or `{ ok: false, error: "engine busy" }` when the engine's body is not JSON.

#### Scenario: Saturated engine

- **WHEN** the engine answers 429 with `Retry-After: 7`
- **THEN** the response is 429 with `Retry-After: 7` and the engine's body

#### Scenario: Saturation without a JSON body

- **WHEN** the engine answers 429 with an HTML body and no `Retry-After`
- **THEN** the response is 429 with `{ ok: false, error: "engine busy" }` and no `Retry-After` header

### Requirement: Engine failure

An engine answer with status 500 or above SHALL be answered with 502 and `{ ok: false, error: "engine unavailable (<status>)" }`, discarding the engine's body. Any other answer whose body is not JSON MUST be answered with 502 and `{ ok: false, error: "engine returned invalid response" }`.

#### Scenario: Engine answers 500

- **WHEN** the engine answers 500 with `{ ok: false, error: "boom" }`
- **THEN** the response is 502 with `{ ok: false, error: "engine unavailable (500)" }`

#### Scenario: Body that is not JSON

- **WHEN** the engine answers 200 with `<html>gateway</html>`
- **THEN** the response is 502 with `{ ok: false, error: "engine returned invalid response" }`

### Requirement: Unreachable engine

When the engine cannot be reached, does not finish answering within the run's timeout plus 1000 ms, or sends a body larger than 4 MiB, the gateway SHALL answer 502 with `{ ok: false, error }`, where `error` names the failure and begins with `engine`. That includes the gateway giving up on a silent engine: it is a 502, and 504 is used only for a timeout the engine itself reported.

#### Scenario: Connection refused

- **WHEN** nothing listens at the engine's address
- **THEN** the response is 502 with `{ ok: false, error: "engine connection refused" }`

#### Scenario: Name that does not resolve

- **WHEN** the engine's host name cannot be resolved
- **THEN** the response is 502 with `{ ok: false, error: "engine DNS lookup failed" }`

#### Scenario: Silent engine

- **WHEN** a request with `timeoutMs` of 250 reaches an engine that accepts the connection and never answers
- **THEN** after about 1250 ms the response is 502 with an `error` of `engine request failed` or `engine headers timeout`

#### Scenario: Oversized answer

- **WHEN** the engine's response body is larger than 4 MiB
- **THEN** the response is 502 with `{ ok: false, error: "engine response too large" }`

### Requirement: Response cache

When `NODE_ENV` is `production`, a successful run SHALL be stored in Redis for `CACHE_TTL_SECONDS` (default 600), and a later request with the same cache key MUST be answered from it without contacting the engine: the stored response with `meta.cacheHit` set to `true` and `meta.durationMs` set to the time spent serving the hit. In any other environment the cache is neither read nor written.

#### Scenario: Repeated run

- **WHEN** the same request is sent twice in production
- **THEN** the first response has `meta.cacheHit` of `false` and the second `true`, with the same `stdout`
- **AND** the engine received one request

#### Scenario: Entry expires

- **WHEN** `CACHE_TTL_SECONDS` is 1 and the same request is sent again after 1.2 seconds
- **THEN** the response has `meta.cacheHit` of `false`

#### Scenario: Outside production

- **WHEN** `NODE_ENV` is not `production` and the same request is sent twice
- **THEN** the engine receives both and both responses have `meta.cacheHit` of `false`

### Requirement: Cache key

The cache key SHALL be derived from the engine, the exact `sourceText`, the accepted flags after normalization and the normalized timeout rounded up to the next 100 ms. Rejected entries, the order of the accepted flags and repeats of an accepted flag MUST NOT change the key. Entries are stored under Redis keys that begin `api-cache:`.

#### Scenario: Timeouts in the same 100 ms bucket

- **WHEN** a request with `timeoutMs` of 1001 is followed by the same request with `timeoutMs` of 1100
- **THEN** the second is answered from the cache

#### Scenario: Timeouts in different buckets

- **WHEN** two otherwise identical requests send `timeoutMs` of 2099 and 2101
- **THEN** the second is not answered from the first one's entry

#### Scenario: Rejected flags

- **WHEN** a result is cached for v8 with `--print-bytecode` and a later request adds `--not-a-real-flag`
- **THEN** the later request is answered from the cache

#### Scenario: Different engine, source or flags

- **WHEN** two requests differ in `engine`, in `sourceText` or in their accepted flags
- **THEN** neither is answered from the other's entry

### Requirement: Negative caching

In production, a run the engine rejected with 400 or reported as timed out SHALL be stored for `NEGATIVE_CACHE_TTL_SECONDS` (default 30) and replayed to requests with the same cache key, with the same status and body, without contacting the engine. Any other failure, including a relayed 429 and every 502, MUST NOT be cached.

#### Scenario: Engine rejects the request

- **WHEN** the engine answers 400 in production
- **THEN** the 400 is stored in Redis with a time to live of at most 30 seconds

#### Scenario: Timed-out snippet is requested again

- **WHEN** the engine answers 408 and the same request is sent again within 30 seconds
- **THEN** the second response is 504 with the same body and the engine received one request

#### Scenario: Unreachable engine

- **WHEN** the engine refuses the connection for two identical requests
- **THEN** both requests are sent to the engine

#### Scenario: Engine answers 500

- **WHEN** the engine answers 500 for two identical requests
- **THEN** both requests are sent to the engine

### Requirement: Cache size guard

A response whose stored form is larger than 256 KiB (262144 bytes) SHALL NOT be written to Redis. The response is still returned to the client, and the next identical request runs the engine again.

#### Scenario: Output-heavy run

- **WHEN** a run returns 300 KiB of `stdout` in production and the same request is sent again
- **THEN** both responses are 200 with `meta.cacheHit` of `false`
- **AND** the engine received both requests

### Requirement: Cache failure tolerance

A Redis failure MUST NOT fail a run. A cache read that errors or returns an entry that cannot be parsed SHALL be treated as a miss, and a cache write that errors is skipped while the response is returned as usual.

#### Scenario: Redis rejects every command

- **WHEN** Redis is failing in production and the same request is sent twice
- **THEN** both responses are 200 with `meta.cacheHit` of `false`
- **AND** the engine received both requests

#### Scenario: Unreadable entry

- **WHEN** the stored entry for a request is not valid JSON
- **THEN** the request is forwarded to the engine and answered 200

### Requirement: Concurrent identical runs

Requests with the same cache key that reach one gateway instance while a run for that key is in progress SHALL share that run's result instead of starting another, in every environment. Each sharing response MUST carry the same status and body as the first, including `meta.durationMs` and a `meta.cacheHit` of `false`, apart from its own `meta.droppedFlags`.

#### Scenario: Three identical requests at once

- **WHEN** three identical requests arrive while the engine takes 300 ms to answer
- **THEN** the engine receives one request
- **AND** all three responses are 200 with `meta.cacheHit` of `false`

#### Scenario: Different request at the same time

- **WHEN** a request with another `sourceText` arrives during that run
- **THEN** it is forwarded to the engine on its own
