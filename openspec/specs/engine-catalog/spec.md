# engine-catalog Specification

## Purpose

The api gateway's two discovery endpoints. `GET /api/flags` publishes the flags each engine accepts, and `GET /api/engines` reports which engine services answer and the version of the binary behind each.

## Requirements

### Requirement: Flag catalog endpoint

`GET /api/flags` SHALL answer 200 with `{ ok: true, engines }`, where `engines` has one key per engine, `v8`, `hermes`, `sm` and `jsc` in that order, each holding every flag of the shared flag catalog for that engine in catalog order. The document MUST be the same for every caller: the endpoint does not authenticate, is not rate-limited and contacts neither Redis nor an engine.

#### Scenario: Every engine is listed

- **WHEN** `/api/flags` is requested
- **THEN** the response is 200 and the keys of `engines` are `v8`, `hermes`, `sm`, `jsc`
- **AND** `engines.v8` has an entry whose `flag` is `--print-bytecode`

#### Scenario: Unknown API key

- **WHEN** the request presents an API key that is not on file
- **THEN** the response is still 200 with the catalog

#### Scenario: Redis is failing

- **WHEN** Redis rejects every command
- **THEN** the response is still 200 with the catalog

### Requirement: Flag entry shape

Each catalog entry SHALL be `{ flag, description, category }`: the flag as the engine spells it, without any value, a one-sentence description and the topic it is grouped under. An entry for a value-bearing flag MUST also carry `takesValue: true` and `valuePattern`, the source of the regular expression its value has to match. A plain flag has neither field.

#### Scenario: Plain flag

- **WHEN** the catalog is requested
- **THEN** `engines.jsc` is `[{ flag: "-d", description: "Dump JSC bytecode for the compiled script.", category: "bytecode" }]`

#### Scenario: Value-bearing flag

- **WHEN** the catalog is requested
- **THEN** the v8 entry for `--print-bytecode-filter` has `takesValue: true` and `valuePattern` of `^[A-Za-z0-9_$*.]{1,64}$`

### Requirement: Catalog and allowlist agree

The flags listed for an engine SHALL be exactly the flags `POST /api/run` accepts for that engine (see run-api), because both are read from the one shared flag catalog specified in engine-runtime.

#### Scenario: Listed flag

- **WHEN** a v8 run sends `--print-bytecode`, which `engines.v8` lists
- **THEN** the flag is forwarded to the engine

#### Scenario: Unlisted flag

- **WHEN** a v8 run sends `--not-a-real-flag`, which `engines.v8` does not list
- **THEN** the run reports it in `meta.droppedFlags`

### Requirement: Engine versions endpoint

`GET /api/engines` SHALL answer 200 with `{ engines, meta: { cacheHit } }`, where `engines` holds one `{ engine, ok, version }` entry per engine in the order `v8`, `hermes`, `sm`, `jsc`. The body has no top-level `ok`, and the status is 200 however many engines are down. Each request is subject to API-key authentication and the general rate-limit bucket (see api-keys and rate-limiting).

#### Scenario: Every engine answers

- **WHEN** the four engines report the versions `14.9.0 (candidate)`, `1.0.0 (HBC 98)`, `134.0` and none
- **THEN** the response is 200 with `engines` equal to `[{ engine: "v8", ok: true, version: "14.9.0 (candidate)" }, { engine: "hermes", ok: true, version: "1.0.0 (HBC 98)" }, { engine: "sm", ok: true, version: "134.0" }, { engine: "jsc", ok: true, version: null }]`

### Requirement: Engine health probe

On a cache miss the gateway SHALL request `GET /healthz` from every engine service at once, each with a budget of 2000 ms, and build each entry from the answer specified in engine-runtime. `ok` MUST be `true` only when the engine answers 200 with `ok: true`, and `version` is the version the engine reports, or `null` when it reports none.

#### Scenario: Engine that reports a version

- **WHEN** the v8 service answers `{ ok: true, engine: "v8", version: "14.9.0" }`
- **THEN** its entry is `{ engine: "v8", ok: true, version: "14.9.0" }`

#### Scenario: Engine with no version to report

- **WHEN** the jsc service answers `{ ok: true, engine: "jsc", version: null }`
- **THEN** its entry is `{ engine: "jsc", ok: true, version: null }`

### Requirement: Failed engine probe

An engine that cannot be reached, does not answer within 2000 ms, answers with a status other than 200 or reports an engine key other than its own SHALL be listed as `{ engine, ok: false, version: null }`. One engine's failure MUST NOT change the other entries or the 200 status.

#### Scenario: One engine is down

- **WHEN** the sm service answers 503 and the others answer normally
- **THEN** the response is 200 with `{ engine: "sm", ok: false, version: null }` and the other entries intact

#### Scenario: Every engine is down

- **WHEN** all four services answer 503
- **THEN** the response is 200 and every entry has `ok: false`

#### Scenario: Wrong service behind an address

- **WHEN** the service at the v8 address reports `engine: "hermes"`
- **THEN** the v8 entry is `{ engine: "v8", ok: false, version: null }`

#### Scenario: Silent engine

- **WHEN** one service accepts the connection and never answers
- **THEN** the response arrives after about 2000 ms with that entry `ok: false` and the others `ok: true`

### Requirement: Engine versions cache

A fan-out in which at least one engine was `ok` SHALL be stored in Redis under `api-cache:engines` for 60 seconds, and requests within that time MUST be answered from it with `meta.cacheHit: true` and without probing. The cache is shared by every gateway instance on the same Redis and, unlike the run cache, is used whatever `NODE_ENV` is.

#### Scenario: Second request

- **WHEN** `/api/engines` is requested twice
- **THEN** the first response has `meta.cacheHit` of `false` and the second `true`, with equal `engines`
- **AND** each engine was probed once

#### Scenario: Another gateway instance

- **WHEN** a second gateway instance on the same Redis is asked after the first one answered
- **THEN** its response has `meta.cacheHit` of `true` and it probes no engine

### Requirement: Outages and the cache

A fan-out in which every engine failed SHALL NOT be cached, so the next request probes again. A fan-out in which only some engines failed is cached like any other: a failed entry MUST keep being served as `ok: false` until the 60 seconds pass, even after the engine recovers.

#### Scenario: Total outage, then recovery

- **WHEN** every engine fails for one request and answers normally for the next
- **THEN** the second response has `meta.cacheHit` of `false` and every entry `ok: true`

#### Scenario: Partial outage is remembered

- **WHEN** only the v8 service answers and `/api/engines` is requested again within 60 seconds
- **THEN** the second response has `meta.cacheHit` of `true` and still lists the other three as `ok: false`

### Requirement: Concurrent engine requests

Requests that reach one gateway instance while a fan-out is in progress SHALL share its result instead of probing again. Each of them MUST be answered with `meta.cacheHit` of `false`.

#### Scenario: Two requests on a cold cache

- **WHEN** two requests arrive at once and nothing is cached
- **THEN** each engine is probed once
- **AND** both responses carry the same `engines` with `meta.cacheHit` of `false`

### Requirement: Redis failure

A Redis failure MUST NOT fail the endpoint. When the cache cannot be read the request SHALL be treated as a miss and the engines probed, and when the result cannot be written the response is returned as usual.

#### Scenario: Redis rejects every command

- **WHEN** Redis is failing and `/api/engines` is requested twice
- **THEN** both responses are 200 with `meta.cacheHit` of `false`
- **AND** the engines were probed for each request
