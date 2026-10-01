# engine-runtime Specification

## Purpose

The HTTP contract every engine service (v8, hermes, jsc, sm) exposes to the api gateway: accept one JavaScript snippet, run the engine binary on it under time, output and concurrency limits, and return what the binary printed. All four services behave identically here, so the gateway can treat them as interchangeable.

## Requirements

### Requirement: Run request validation

`POST /run` SHALL accept a JSON body of `{ sourceText, options?: { flags?, timeoutMs? } }`, where `sourceText` is a non-empty string, `flags` is an array of strings and `timeoutMs` is a positive integer. Any other body MUST be rejected with status 400 and `{ ok: false, error }` before a process is spawned.

#### Scenario: Missing or empty source

- **WHEN** a request omits `sourceText` or sends it as an empty string
- **THEN** the response is 400 with `ok: false` and an `error` message

#### Scenario: Timeout that is not a positive integer

- **WHEN** a request sends `options.timeoutMs` of `12.5` or `0`
- **THEN** the response is 400

#### Scenario: Flag that is not a string

- **WHEN** a request sends `options.flags` of `[1]`
- **THEN** the response is 400

### Requirement: Source size limits

A `sourceText` longer than `MAX_SOURCE_LENGTH` characters (default 20000) SHALL be rejected with status 400 and an `error` naming the limit. A request body larger than 512 KiB MUST be rejected with status 413 before it is parsed.

#### Scenario: Source over the length limit

- **WHEN** `MAX_SOURCE_LENGTH` is 16 and `sourceText` is 17 characters long
- **THEN** the response is 400 with `error` equal to `sourceText exceeds limit (16)`

#### Scenario: Oversized body

- **WHEN** the request body is 600 KiB
- **THEN** the response is 413

### Requirement: Run response

A run that finishes within its limits SHALL answer 200 with `{ ok: true, stdout, stderr, artifacts: [], meta }`, where `meta.engine` is the service's engine key and `meta.durationMs` is the request's wall-clock time in milliseconds. `ok` reports that the service ran the snippet, not that the snippet succeeded.

#### Scenario: Snippet prints to both streams

- **WHEN** a snippet writes to stdout and to stderr
- **THEN** the response is 200 with each stream's text in `stdout` and `stderr`
- **AND** `artifacts` is `[]`

#### Scenario: Snippet throws

- **WHEN** the snippet throws an uncaught error and the binary exits non-zero
- **THEN** the response is 200 with `ok: true` and the binary's error text in `stderr`

#### Scenario: Engine binary cannot be started

- **WHEN** the configured binary does not exist
- **THEN** the response is 200 with `ok: true`, an empty `stdout` and the spawn error in `stderr`

### Requirement: Execution time limit

Each run SHALL get a wall-clock budget of `options.timeoutMs`, or `DEFAULT_TIMEOUT_MS` (default 2000) when it is omitted, and never more than `MAX_TIMEOUT_MS` (default 5000). A process still running when the budget ends MUST be killed and the request answered with 408 and `{ ok: false, error: "execution timed out" }`.

#### Scenario: Snippet outlives its budget

- **WHEN** a snippet loops forever with `options.timeoutMs` of 300
- **THEN** the response is 408 with `{ ok: false, error: "execution timed out" }`

#### Scenario: Requested timeout above the maximum

- **WHEN** a snippet loops forever with `options.timeoutMs` of 60000 and `MAX_TIMEOUT_MS` is 300
- **THEN** the process is killed after 300 ms and the response is 408

### Requirement: Output limit

The combined size of `stdout` and `stderr` in a response SHALL NOT exceed `MAX_OUTPUT_BYTES` (default 2 MiB). A process that writes more MUST be killed, and the run still answers 200 with the output that fits, `meta.outputTruncated: true` and `meta.outputLimitBytes` set to the limit. Both fields are absent from a run that was not truncated.

#### Scenario: Snippet floods stdout

- **WHEN** `MAX_OUTPUT_BYTES` is 16384 and a snippet prints several megabytes
- **THEN** the response is 200 with a non-empty `stdout`
- **AND** `stdout` and `stderr` together are at most 16384 bytes
- **AND** `meta.outputTruncated` is `true` and `meta.outputLimitBytes` is 16384

#### Scenario: Output within the limit

- **WHEN** a snippet prints less than `MAX_OUTPUT_BYTES`
- **THEN** `meta` has neither `outputTruncated` nor `outputLimitBytes`

### Requirement: Fair truncation

When output is truncated, each stream SHALL keep up to half of the limit, with whatever one stream leaves unused given to the other. The cut MUST NOT split a multi-byte character.

#### Scenario: Stdout floods while stderr explains

- **WHEN** a snippet writes one line to stderr and then floods stdout past the limit
- **THEN** the stderr line is returned in full and `stdout` fills the rest of the limit

#### Scenario: Cut lands inside a character

- **WHEN** the limit falls in the middle of a multi-byte UTF-8 character
- **THEN** that character is omitted and the returned text contains no replacement character

### Requirement: Flag allowlist

Only flags in the shared flag catalog for the service's own engine SHALL reach the binary. An entry is accepted when, after surrounding whitespace is trimmed, it starts with `-`, its name is in the catalog and its form matches the catalog entry: a plain flag carries no `=value`, and a value-bearing flag carries an `=value` that matches the entry's value pattern.

#### Scenario: Unknown flag

- **WHEN** a v8 request sends `--trace-opt` and `--not-a-real-flag`
- **THEN** the binary receives only `--trace-opt`

#### Scenario: Flag of another engine

- **WHEN** a jsc request sends `-d` and `--print-bytecode`
- **THEN** the binary receives only `-d`

#### Scenario: Value on a plain flag

- **WHEN** a v8 request sends `--print-bytecode=1`
- **THEN** the flag does not reach the binary

#### Scenario: Value-bearing flag

- **WHEN** a v8 request sends `--print-bytecode-filter=foo*`
- **THEN** the binary receives it unchanged

#### Scenario: Value-bearing flag with a missing or disallowed value

- **WHEN** a v8 request sends `--print-bytecode-filter` or `--print-bytecode-filter=a b`
- **THEN** the flag does not reach the binary

### Requirement: Flag list normalization

Accepted flags SHALL be deduplicated by name, keeping the first occurrence, and passed to the binary in sorted order unless the engine service declares that caller order is kept. Only the first `MAX_FLAGS` (default 10) entries of the request's list are considered.

#### Scenario: Default order

- **WHEN** a request sends `--trace-opt` then `--print-bytecode`
- **THEN** the binary receives `--print-bytecode` then `--trace-opt`

#### Scenario: Service that keeps caller order

- **WHEN** a service that keeps caller order receives `--ion-eager` then `--baseline-eager`
- **THEN** the binary receives them in that order

#### Scenario: Repeated flag

- **WHEN** a request sends `--print-bytecode-filter=foo` then `--print-bytecode-filter=bar`
- **THEN** the binary receives only `--print-bytecode-filter=foo`

#### Scenario: List longer than the cap

- **WHEN** `MAX_FLAGS` is 2 and a request sends three valid flags
- **THEN** the binary receives the first two

### Requirement: Dropped flag reporting

Rejected entries SHALL be echoed in `meta.droppedFlags` as sent, whitespace-trimmed, at most `MAX_FLAGS` of them. An entry MUST NOT be reported when it is blank or when a flag of the same name was accepted from the same request. `meta.droppedFlags` is absent when there is nothing to report.

#### Scenario: Mistyped flag

- **WHEN** a v8 request sends `--print-bytecode` and `--typo`
- **THEN** `meta.droppedFlags` is `["--typo"]`

#### Scenario: Duplicate of an accepted flag

- **WHEN** a request sends `--trace-opt` twice
- **THEN** `meta` has no `droppedFlags`

#### Scenario: Every flag accepted

- **WHEN** every flag in the request is accepted
- **THEN** `meta` has no `droppedFlags`

### Requirement: Concurrency limit

A service instance SHALL run at most `MAX_CONCURRENCY` (default 4) snippets at once. A valid request that arrives while every slot is taken MUST be answered at once with 429, a `Retry-After: 1` header and `{ ok: false, error: "engine busy" }`. A slot is freed when its run ends, whatever the outcome.

#### Scenario: Instance is saturated

- **WHEN** `MAX_CONCURRENCY` is 1 and a second request arrives while the first is still running
- **THEN** the second response is 429 with `Retry-After: 1` and `{ ok: false, error: "engine busy" }`
- **AND** a request sent after the first run finishes is served

#### Scenario: Run fails inside the service

- **WHEN** `MAX_CONCURRENCY` is 1 and a run ends in a 500
- **THEN** the next request is not answered with 429

### Requirement: Per-run workspace

Each run SHALL get its own temporary directory under the system temp directory, holding the snippet exactly as sent, as `snippet.js`, plus the engine service's prelude scripts. The directory MUST be removed when the run ends, whatever the outcome.

#### Scenario: Two runs

- **WHEN** two requests are served one after the other
- **THEN** each ran in a different directory and neither directory exists afterwards

#### Scenario: Non-ASCII source

- **WHEN** `sourceText` contains characters outside ASCII
- **THEN** the file the binary reads is identical to `sourceText` in UTF-8

### Requirement: Sandbox lockdown

For an engine service that declares blocked globals, the runtime SHALL supply a lockdown script that makes every listed global unusable by the snippet, ordered ahead of the service's other prelude scripts. A global that cannot be neutralized MUST NOT stop the rest from being neutralized. A service that declares none gets no lockdown script.

#### Scenario: Snippet calls a blocked global

- **WHEN** `read` is blocked and a snippet calls `read()` on a file the process can reach
- **THEN** the call fails and the file's contents do not appear in the output

#### Scenario: One global resists

- **WHEN** one of the listed globals is frozen
- **THEN** the other listed globals are still unusable

#### Scenario: Compile-only engine

- **WHEN** a service declares no blocked globals
- **THEN** its workspace holds no lockdown script

### Requirement: Internal failure

A failure of the service itself while preparing or launching a run SHALL be answered with 500 and `{ ok: false, error }` carrying the failure message.

#### Scenario: Invocation cannot be built

- **WHEN** the engine service fails to build the command line for a run
- **THEN** the response is 500 with `ok: false` and the failure message in `error`

### Requirement: Health endpoint

`GET /healthz` SHALL answer 200 with `{ ok: true, engine, version }` as soon as the service is listening, where `engine` is the service's engine key. Answering MUST NOT spawn a process.

#### Scenario: Before any run

- **WHEN** `/healthz` is requested on a v8 service whose version is not known yet
- **THEN** the response is 200 with `{ ok: true, engine: "v8", version: null }`

### Requirement: Engine version probe

An engine service that declares a version probe SHALL have it run once at startup, never per request, trying the declared invocations in order and reading both output streams. `version` is `null` until the probe answers, and stays `null` when no probe is declared, the binary is missing or its output is not recognized. A reported version MUST NOT exceed 80 characters.

#### Scenario: Probe answers

- **WHEN** the binary prints `V8 version 14.9.0 (candidate)` to the probe
- **THEN** `/healthz` reports `version` as `14.9.0 (candidate)`

#### Scenario: First invocation is refused

- **WHEN** the first declared invocation prints nothing and the second prints a version
- **THEN** the second one's version is reported

#### Scenario: Binary is missing

- **WHEN** the probe's binary does not exist
- **THEN** `version` stays `null` and `/healthz` still answers 200

### Requirement: OpenAPI document

`GET /openapi.json` SHALL be served only by an engine service that opts in, as a document under that service's title listing `/healthz`, `/openapi.json` and `/run`. On any other service the path MUST answer 404.

#### Scenario: Service opts in

- **WHEN** a service declares the title `engine-v8`
- **THEN** `/openapi.json` answers 200 with that title and a `/run` path

#### Scenario: Service does not opt in

- **WHEN** a service declares no title
- **THEN** `/openapi.json` answers 404

### Requirement: Process lifecycle

The service SHALL listen on `HOST` and `PORT` (default `0.0.0.0:8080`) and exit with status 1 when it cannot bind. On `SIGTERM` or `SIGINT` it MUST close the server and exit with status 0.

#### Scenario: Orderly shutdown

- **WHEN** the process receives `SIGTERM`
- **THEN** the server is closed and the process exits with status 0
