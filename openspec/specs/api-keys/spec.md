# api-keys Specification

## Purpose

Self-service API keys for the public gateway: how a key is issued, presented, authenticated, stored, expired and revoked. There are no accounts, so a key is a bearer credential whose only effect is to move its holder onto the keyed quotas that `rate-limiting` specifies.

## Requirements

### Requirement: Key issuance

`POST /api/keys` SHALL answer 201 with `{ ok: true, apiKey, rateLimitPerMin, expiresInSeconds, usage }`: `apiKey` is a new key, `rateLimitPerMin` is `API_KEY_RATE_LIMIT_PER_MIN` (default 240), `expiresInSeconds` is `API_KEY_TTL_SECONDS` (default 2592000) and `usage` is a sentence on how to send the key. The request needs no credentials and the content of its body is ignored. The key MUST authenticate from that moment, and this response is the only place it is ever shown.

#### Scenario: Issue under the defaults

- **WHEN** a client posts `{}` to `/api/keys`
- **THEN** the response is 201 with `ok: true`, an `apiKey`, `rateLimitPerMin: 240` and `expiresInSeconds: 2592000`

#### Scenario: Key is used straight away

- **WHEN** the issued key is presented on the next request
- **THEN** that request is served on the keyed quotas

#### Scenario: Body has content

- **WHEN** a client posts `{ "anything": [1, 2] }` to `/api/keys`
- **THEN** the response is 201, the same as for `{}`

### Requirement: Key format

A key SHALL be the prefix `jslab_` followed by 32 lowercase hexadecimal characters, generated from 16 random bytes. A presented value of any other shape MUST be treated as an unrecognized key without Redis being consulted.

#### Scenario: Issued key

- **WHEN** a key is issued
- **THEN** it matches `jslab_[0-9a-f]{32}`

#### Scenario: Wrong prefix, length or case

- **WHEN** a client presents `nope_` plus 32 hex characters, `jslab_` plus 31 hex characters, or an issued key in upper case
- **THEN** the value is not recognized as a key

### Requirement: Issuance content type

`POST /api/keys` SHALL require a `Content-Type` whose media type is `application/json`, compared without regard to case and ignoring parameters. A request with another content type, or with none, MUST be refused with 415 before any issuance limit is spent. Because the body is then parsed as JSON, a request that declares `application/json` and sends no body at all is refused with 400.

#### Scenario: Plain text

- **WHEN** a client posts to `/api/keys` with `Content-Type: text/plain`
- **THEN** the response is 415 with `{ ok: false, error: "Content-Type must be application/json" }`

#### Scenario: No content type

- **WHEN** a client posts to `/api/keys` with no body and no `Content-Type`
- **THEN** the response is 415 with `{ ok: false, error: "Content-Type must be application/json" }`

#### Scenario: Parameters and case

- **WHEN** a client posts `{}` with `Content-Type: Application/JSON; charset=utf-8`
- **THEN** the response is 201

#### Scenario: JSON content type with an empty body

- **WHEN** a client posts to `/api/keys` with `Content-Type: application/json` and no body
- **THEN** the response is 400 and no key is issued

### Requirement: Issuance rate limit

Issuance SHALL be limited to `API_KEY_ISSUE_PER_HOUR` (default 5) requests per hour per client address, the address being resolved as in `rate-limiting`. A request over the limit MUST be answered 429 with `{ ok: false, error: "key issuance limit reached", meta: { retryAfter } }` and a `Retry-After` header. The limit counts requests, not keys: one that is refused afterwards for another reason has still spent from it. Presenting an existing key changes nothing.

#### Scenario: Limit of zero

- **WHEN** `API_KEY_ISSUE_PER_HOUR` is 0 and a client posts `{}` to `/api/keys`
- **THEN** the response is 429 with `error` equal to `key issuance limit reached`

#### Scenario: Third request in an hour

- **WHEN** `API_KEY_ISSUE_PER_HOUR` is 2 and one address requests three keys
- **THEN** the first two responses are 201 and the third is 429 with a `Retry-After` of at most 3600
- **AND** a request from another address is answered 201

#### Scenario: Request that presents a key

- **WHEN** `API_KEY_ISSUE_PER_HOUR` is 0 and the request presents a valid key
- **THEN** the response is still 429

#### Scenario: Refused by the live key cap

- **WHEN** a request passes the hourly limit and is then refused by the live key cap
- **THEN** it has used one of the hour's requests

### Requirement: Live key cap

One client address SHALL hold at most `API_KEY_MAX_PER_ISSUER` (default 10) unexpired keys. A request past the cap MUST be answered 429 with `{ ok: false, error: "too many live keys for this address; revoke one before minting another" }` and no `Retry-After`. A key stops counting only when it expires: revoking one does not free its place, whatever the error text suggests.

#### Scenario: Cap reached

- **WHEN** `API_KEY_MAX_PER_ISSUER` is 3 and an address that holds three keys requests a fourth
- **THEN** the response is 429 with the `too many live keys` error and no key is issued

#### Scenario: Another address

- **WHEN** one address is at the cap and a different address requests a key
- **THEN** the second address gets its key

#### Scenario: Key has expired

- **WHEN** `API_KEY_MAX_PER_ISSUER` is 1 and the address's only key has expired
- **THEN** a new request is answered with a key

#### Scenario: Key has been revoked

- **WHEN** `API_KEY_MAX_PER_ISSUER` is 2 and an address holding two keys revokes one, then requests another
- **THEN** the response is still 429 with the `too many live keys` error

### Requirement: Presenting a key

A client SHALL present a key as `x-api-key: <key>` or as `Authorization: Bearer <key>`, the scheme being matched without regard to case and surrounding whitespace ignored. When both are sent, a non-blank `x-api-key` MUST win. An `Authorization` header with any other scheme counts as no key at all.

#### Scenario: Either header

- **WHEN** a valid key is sent as `x-api-key` on one request and as `Authorization: bearer <key>` on another
- **THEN** both requests are served on the keyed quotas

#### Scenario: Both headers

- **WHEN** a request carries an unknown key in `x-api-key` and a valid key in `Authorization: Bearer`
- **THEN** the response is 401

#### Scenario: Blank x-api-key

- **WHEN** a request carries an `x-api-key` of only spaces and a valid key in `Authorization: Bearer`
- **THEN** the request is served on the keyed quotas

#### Scenario: Another scheme

- **WHEN** a request carries `Authorization: Basic abc` and no `x-api-key`
- **THEN** it is served as an anonymous request

### Requirement: Key authentication

`GET /api/engines`, `POST /api/run` and `POST /api/trace/execute/*` SHALL authenticate a presented key, on the two POST routes only after the request body has passed validation. A key that is on file puts the request on the keyed quotas of `rate-limiting`; a request without a key is anonymous. No route requires a key.

#### Scenario: Valid key

- **WHEN** a trace request presents a key that is on file
- **THEN** it is relayed and its response carries the keyed `X-RateLimit-Limit`

#### Scenario: Invalid body with a key

- **WHEN** a trace request has an invalid body and presents an unknown key
- **THEN** the response is 400, not 401

### Requirement: Unrecognized key

A presented key that is malformed, unknown, expired or revoked SHALL be answered 401 with `{ ok: false, error: "invalid API key" }`. The request MUST NOT be served as anonymous instead, even when the answer is already in the cache. The attempt is first charged to the address's anonymous `general` bucket, as `rate-limiting` describes.

#### Scenario: Key not on file

- **WHEN** a valid `POST /api/run` presents `jslab_` followed by 32 `a` characters and no such key was issued
- **THEN** the response is 401

#### Scenario: Malformed key

- **WHEN** a request to `/api/engines` presents `x-api-key: garbage`
- **THEN** the response is 401 with `error` equal to `invalid API key`

#### Scenario: Cached run

- **WHEN** a run whose answer is in the cache presents an unknown key
- **THEN** the response is 401 and the cached answer is not returned

### Requirement: Key storage

A key SHALL be kept in Redis only as its SHA-256 digest: its record is stored under `apikey:<digest>`, 64 hex characters, and holds the time of issue and the key's per-minute quota. The key itself MUST NOT appear in any Redis key name or value. The keys an address holds are indexed under `apikey-owner:<digest of the address>`, which names neither the address nor the keys in clear.

#### Scenario: After issuance

- **WHEN** a key is issued
- **THEN** Redis holds no entry named `apikey:<key>` and no value containing the key
- **AND** the record under the key's digest holds the quota it was issued with

### Requirement: Key expiry

A key SHALL stop authenticating `API_KEY_TTL_SECONDS` (default 2592000, 30 days) after it was issued, and MUST then be treated as an unrecognized key. Nothing extends a key's life; a client gets a new one by requesting it.

#### Scenario: Record lifetime

- **WHEN** a key is issued under the defaults
- **THEN** its record expires from Redis 2592000 seconds later

#### Scenario: Shorter lifetime

- **WHEN** `API_KEY_TTL_SECONDS` is 3600
- **THEN** issuance answers `expiresInSeconds: 3600`

### Requirement: Key revocation

`DELETE /api/keys` SHALL revoke the key presented on the request itself and answer 200 with `{ ok: true }`, after which the key no longer authenticates. Without a key the answer MUST be 400 with `{ ok: false, error: "no API key presented" }`; for a key that is malformed, unknown, expired or already revoked it is 404 with `{ ok: false }` and no `error`. Holding the key is the only proof of ownership asked for, and revocation is not rate limited.

#### Scenario: Revoke and reuse

- **WHEN** a client revokes its key and then presents it on a request
- **THEN** the revocation answers 200 with `{ ok: true }` and the later request answers 401

#### Scenario: Revoke twice

- **WHEN** a client revokes the same key a second time
- **THEN** the response is 404 with `{ ok: false }`

#### Scenario: No key presented

- **WHEN** `DELETE /api/keys` arrives without `x-api-key` or a bearer token
- **THEN** the response is 400 with `error` equal to `no API key presented`

#### Scenario: Malformed key

- **WHEN** `DELETE /api/keys` presents `x-api-key: garbage`
- **THEN** the response is 404 with `{ ok: false }` and Redis is not consulted

### Requirement: Redis failure

While Redis cannot be reached, issuance SHALL answer 503 with `{ ok: false, error: "could not issue key" }`, every request that presents a key MUST be answered 401 as an unrecognized key, and revocation answers 404 with `{ ok: false }`. Requests that present no key are served as usual.

#### Scenario: Issuance

- **WHEN** Redis rejects every command and a client posts `{}` to `/api/keys`
- **THEN** the response is 503 with `error` equal to `could not issue key`

#### Scenario: Request with a valid key

- **WHEN** Redis rejects every command and a request presents a key that was issued earlier
- **THEN** the response is 401 with `error` equal to `invalid API key`

#### Scenario: Revocation

- **WHEN** Redis rejects every command and a client revokes a key that was issued earlier
- **THEN** the response is 404 with `{ ok: false }`
