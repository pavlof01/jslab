# rate-limiting Specification

## Purpose

How the api gateway meters its public routes: which client a request is charged to, the buckets it spends from and their quotas, what a rejected request receives, and what metering does when Redis cannot answer. An API key changes who is charged and how much; the keys themselves are specified in `api-keys`.

## Requirements

### Requirement: Client address

A request without an API key SHALL be charged to the address in the header named by `CLIENT_IP_HEADER` (default `cf-connecting-ip`) when that header holds 1 to 64 characters, each a hex digit, `.` or `:`. Otherwise it MUST be charged to the address derived from the connection and `X-Forwarded-For`, or to the shared identity `unknown` when that address does not have this shape either. An empty `CLIENT_IP_HEADER` turns the header off.

#### Scenario: Header names the client

- **WHEN** a request carries `cf-connecting-ip: 203.0.113.9` and `X-Forwarded-For: 198.51.100.1`
- **THEN** it is charged to `203.0.113.9`

#### Scenario: Header is not an address

- **WHEN** a request carries `cf-connecting-ip: not an ip!`
- **THEN** the header is ignored and the request is charged to the address derived from the connection

#### Scenario: Header turned off

- **WHEN** `CLIENT_IP_HEADER` is an empty string and a request carries `cf-connecting-ip: 203.0.113.9`
- **THEN** the request is charged to the address derived from the connection

#### Scenario: Operator names another header

- **WHEN** `CLIENT_IP_HEADER` is `x-real-ip` and a request carries `x-real-ip: 203.0.113.77` and `cf-connecting-ip: 203.0.113.9`
- **THEN** it is charged to `203.0.113.77`

#### Scenario: No usable address at all

- **WHEN** a request has no client address header and its `X-Forwarded-For` is `evil key`
- **THEN** it is charged to `unknown`, together with every other such request

### Requirement: Trusted proxy hops

When the client address header is not used, the address SHALL be the entry `TRUST_PROXY_HOPS` (default 1) positions from the right-hand end of `X-Forwarded-For`, so entries a client prepends are ignored. Without that header, or with `TRUST_PROXY_HOPS` of 0, it is the connection's own address. A `TRUST_PROXY_HOPS` that is negative or not an integer MUST be rejected when the gateway loads its environment.

#### Scenario: One proxy

- **WHEN** `TRUST_PROXY_HOPS` is 1 and a request arrives with `X-Forwarded-For: 198.51.100.1, 198.51.100.2`
- **THEN** it is charged to `198.51.100.2`

#### Scenario: Two proxies

- **WHEN** `TRUST_PROXY_HOPS` is 2 and a request arrives with `X-Forwarded-For: 198.51.100.1, 198.51.100.2`
- **THEN** it is charged to `198.51.100.1`

#### Scenario: No proxy trusted

- **WHEN** `TRUST_PROXY_HOPS` is 0 and a request arrives from `10.0.0.1` with an `X-Forwarded-For` header
- **THEN** it is charged to `10.0.0.1`

#### Scenario: Invalid hop count

- **WHEN** `TRUST_PROXY_HOPS` is `-1` or `1.5`
- **THEN** loading the environment fails with an `Invalid environment` error

### Requirement: Anonymous quotas

A request without an API key SHALL spend from buckets kept per client address: `general` admits `RATE_LIMIT_PER_MIN` (default 60) requests per minute, `heavy` admits `RATE_LIMIT_HEAVY_PER_MIN` (default 20) and `trace` admits `TRACE_RATE_LIMIT_PER_MIN` (default 30). Each bucket and each address MUST be counted separately. A limit of 0 rejects every request.

#### Scenario: Up to the limit

- **WHEN** a bucket's limit is 3 and one address sends four requests within one window
- **THEN** the first three are admitted and the fourth is rejected

#### Scenario: Another bucket, another address

- **WHEN** an address has used up its `general` bucket
- **THEN** its `heavy` bucket is untouched
- **AND** a different address is still admitted to `general`

#### Scenario: Limit of zero

- **WHEN** `RATE_LIMIT_PER_MIN` is 0
- **THEN** the first request to a metered route is rejected

### Requirement: Metered routes

`GET /api/engines`, `POST /api/run` and `POST /api/trace/execute/*` SHALL each spend one unit of `general`. A trace request then spends one unit of `trace`, and a run that is not answered from the cache then spends one unit of `heavy`. A request refused by `general` MUST NOT spend from the second bucket, and a run or trace request whose body fails validation spends from none.

#### Scenario: Trace request

- **WHEN** a valid trace request is admitted
- **THEN** the caller's `general` and `trace` counters each rise by one

#### Scenario: Run that reaches an engine

- **WHEN** a valid run is not in the cache
- **THEN** the caller's `general` and `heavy` counters each rise by one

#### Scenario: Run answered from the cache

- **WHEN** a valid run is answered from the cache
- **THEN** only the caller's `general` counter rises

#### Scenario: General bucket is spent

- **WHEN** `RATE_LIMIT_PER_MIN` is 0 and a trace request arrives
- **THEN** it is rejected and no `trace` counter is created for the caller

#### Scenario: Invalid body

- **WHEN** a run names an unknown engine, or a trace request sends an empty `input` to the equality endpoint
- **THEN** the response is 400 and no counter changes

### Requirement: Unmetered routes

`GET /healthz`, `GET /metrics`, `GET /api/flags`, `GET /api/openapi.json`, `GET /api/docs` and `DELETE /api/keys` SHALL NOT spend from any bucket and carry no rate limit headers. `POST /api/keys` MUST spend only from its own hourly issuance bucket, described in `api-keys`, and never from `general`.

#### Scenario: Caller is over the general limit

- **WHEN** an address has used up its `general` bucket
- **THEN** `GET /api/flags` still answers 200 without `X-RateLimit-*` headers
- **AND** `DELETE /api/keys` from that address is still processed
- **AND** `POST /api/keys` from that address still answers 201

### Requirement: Over-limit response

A request that exceeds a bucket SHALL be answered 429 with `{ ok: false, error: "rate limit exceeded", meta: { retryAfter } }` and a `Retry-After` header carrying the same whole number of seconds. It MUST NOT be forwarded to an engine or to trace-service.

#### Scenario: General bucket spent on a run

- **WHEN** `RATE_LIMIT_PER_MIN` is 0 and a valid `POST /api/run` arrives
- **THEN** the response is 429 with a `Retry-After` header and a `meta.retryAfter` greater than 0

#### Scenario: Trace bucket spent

- **WHEN** `TRACE_RATE_LIMIT_PER_MIN` is 1 and an address sends an equality trace followed by a type-conversion trace
- **THEN** the second response is 429 with `error` equal to `rate limit exceeded`
- **AND** trace-service receives only the first request

#### Scenario: Concurrent runs

- **WHEN** `RATE_LIMIT_HEAVY_PER_MIN` is 3 and one address sends five different uncached runs at once
- **THEN** exactly three are answered 200 and two are answered 429

### Requirement: Rate limit headers

Every response to a request that was checked against a bucket SHALL carry `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset` (Unix seconds) for the last bucket checked: a run that reaches `heavy` or a trace that reaches `trace` reports that bucket, not `general`. `X-RateLimit-Remaining` MUST NOT go below 0. The limiter adds `Retry-After` only to a rejection.

#### Scenario: Admitted request

- **WHEN** a bucket's limit is 3 and an address sends its first request
- **THEN** the response carries `X-RateLimit-Limit: 3`, `X-RateLimit-Remaining: 2` and an `X-RateLimit-Reset` later than now
- **AND** it carries no `Retry-After`

#### Scenario: Last admitted request

- **WHEN** the same address sends its third request
- **THEN** the response carries `X-RateLimit-Remaining: 0`

#### Scenario: Trace reports the trace bucket

- **WHEN** an address sends its first trace request under the default limits
- **THEN** the response carries `X-RateLimit-Limit: 30` and `X-RateLimit-Remaining: 29`

#### Scenario: Cached run reports the general bucket

- **WHEN** an address's first run under the default limits is answered from the cache
- **THEN** the response carries `X-RateLimit-Limit: 60` and `X-RateLimit-Remaining: 59`

#### Scenario: Rejected request

- **WHEN** a request is rejected by a bucket whose limit is 1
- **THEN** the 429 carries `X-RateLimit-Limit: 1` and `X-RateLimit-Remaining: 0`

### Requirement: Windows and advertised wait

Counters SHALL be kept per fixed window aligned to Unix time, 60 seconds long for every bucket and 3600 for key issuance, so a bucket is full again when the next window starts. The advertised wait (`Retry-After`, `meta.retryAfter`, and `X-RateLimit-Reset` as a timestamp) MUST be the remaining lifetime of the window's counter, which lasts one window length from the first request counted in it and is reported as at least 1 second. It can therefore point past the start of the next window.

#### Scenario: Window turns over

- **WHEN** an address exceeds a limit of 1 during the last 10 seconds of a window
- **THEN** its requests are rejected until the window ends
- **AND** its first request of the next window is admitted

#### Scenario: Wait outlasts the window

- **WHEN** an address's first request of a window arrives 50 seconds into it and its next request is rejected
- **THEN** the 429 advertises a wait of up to 60 seconds, although the bucket is full again 10 seconds later

#### Scenario: Counter without an expiry

- **WHEN** a rejected request's counter reports no remaining lifetime
- **THEN** `meta.retryAfter` is 1

#### Scenario: Key issuance window

- **WHEN** a key issuance request is rejected right after the window's first request
- **THEN** the 429 advertises a wait of up to 3600 seconds

### Requirement: Counter storage

Counters SHALL be stored in Redis under `ratelimit:<bucket>:<digest>:<window>`, where `<digest>` is the first 32 hex characters of the SHA-256 of the charged identity (a client address or an API key) and `<window>` is the window's number. The identity itself MUST NOT appear in a key name. A counter expires one window length after its first increment.

#### Scenario: Anonymous request

- **WHEN** a request charged to `203.0.113.9` spends from `general`
- **THEN** Redis holds a key matching `ratelimit:general:[0-9a-f]{32}:\d+`
- **AND** no key name contains `203.0.113.9`

#### Scenario: Identity of any length

- **WHEN** the charged identity is empty or 100000 characters long
- **THEN** its digest is still 32 hex characters

### Requirement: API key quotas

A request that presents a valid API key SHALL be charged to the key instead of the address, in the buckets `key-general`, `key-trace` and `key-heavy`. `key-general` and `key-trace` each admit the key's own per-minute quota, fixed when the key was issued from `API_KEY_RATE_LIMIT_PER_MIN` (default 240); `key-heavy` admits the smaller of that quota and the current `API_KEY_HEAVY_RATE_LIMIT_PER_MIN` (default 60). Keyed requests MUST NOT spend from any address's anonymous buckets.

#### Scenario: Keyed trace under the defaults

- **WHEN** a key's first request is a trace
- **THEN** the response carries `X-RateLimit-Limit: 240` and `X-RateLimit-Remaining: 239`

#### Scenario: Keyed run under the defaults

- **WHEN** a key's first request is a run that reaches an engine
- **THEN** the response carries `X-RateLimit-Limit: 60` and `X-RateLimit-Remaining: 59`

#### Scenario: One key, two addresses

- **WHEN** the same key is used from two different addresses
- **THEN** both requests are counted in the same counters

#### Scenario: Key is spent, address is not

- **WHEN** a key issued with a quota of 3 sends a fourth trace within one window
- **THEN** the response is 429
- **AND** a request from the same address without the key is still admitted

#### Scenario: Quota changed after issue

- **WHEN** a key was issued while `API_KEY_RATE_LIMIT_PER_MIN` was 240, and the gateway now runs with 10 and with `API_KEY_HEAVY_RATE_LIMIT_PER_MIN` of 5
- **THEN** the key is still admitted to `key-general` 240 times per minute
- **AND** it is admitted to `key-heavy` 5 times per minute

### Requirement: Unrecognized key charge

A request to a metered route that presents an API key the gateway does not recognize SHALL spend one unit of the anonymous `general` bucket of its address before it is refused with the 401 that `api-keys` describes. When that bucket is already spent, the request MUST get the over-limit response instead of the 401.

#### Scenario: Unknown key within the limit

- **WHEN** a request presents an unknown key and its address has `general` quota left
- **THEN** the response is 401 with `X-RateLimit-*` headers for the anonymous `general` bucket
- **AND** the address's `general` counter has risen by one

#### Scenario: Unknown key past the limit

- **WHEN** `RATE_LIMIT_PER_MIN` is 1 and an address presents an unknown key twice
- **THEN** the first response is 401 and the second is 429 with `error` equal to `rate limit exceeded`
- **AND** a request from that address without a key is rejected too

### Requirement: Redis failure

When Redis cannot be reached, or the counter update itself fails, the limiter SHALL admit the request, log the failure and set no `X-RateLimit-*` headers. A Redis transaction that ends without a result MUST instead be treated as over the limit, with a wait equal to the window length.

#### Scenario: Redis is unreachable

- **WHEN** Redis rejects every command and a valid trace request arrives
- **THEN** the request is relayed and answered as usual, without `X-RateLimit-*` headers

#### Scenario: Counter cannot be incremented

- **WHEN** Redis answers the increment with an error
- **THEN** the request is admitted, no `X-RateLimit-*` headers are set and the failure is logged

#### Scenario: Transaction without a result

- **WHEN** the counter transaction returns no result and the window is 60 seconds
- **THEN** the request is rejected with a `retryAfter` of 60

### Requirement: Rejection metric

Each request the limiter rejects SHALL increment the `jslab_api_rate_limited_total` counter served on `/metrics`, labelled `budget` with the bucket that rejected it: `general`, `heavy`, `trace`, `key-general`, `key-heavy`, `key-trace` or `key-issue`.

#### Scenario: Trace bucket rejects a request

- **WHEN** a request is rejected by the anonymous `trace` bucket
- **THEN** `jslab_api_rate_limited_total{budget="trace"}` rises by one
