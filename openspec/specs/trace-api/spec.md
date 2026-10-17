# trace-api Specification

## Purpose

The gateway's public entry to ECMAScript abstract-operation tracing: `POST /api/trace/execute/type-conversion` and `POST /api/trace/execute/equality`. The gateway checks the shape of a request, meters it and relays it to trace-service; which operations exist and what a trace contains are specified in `trace-service`.

## Requirements

### Requirement: Type-conversion request validation

`POST /api/trace/execute/type-conversion` SHALL accept a JSON body of `{ functionName, input, preferredType? }`, where `functionName` is a non-empty string, `input` is a string of at most 20000 characters, possibly empty, and `preferredType` is `"string"` or `"number"`. Any other body MUST be rejected with 400 and `{ ok: false, error }`, where `error` is the first validation problem and does not name the field it concerns.

#### Scenario: Input that is not a string

- **WHEN** a request sends `input` as `0`, `true`, `null`, `[]` or `{ "x": 1 }`
- **THEN** the response is 400 with `ok: false`

#### Scenario: Source text that spells a non-string value

- **WHEN** a request sends `input` as `"0"`, `"null"` or `"{ valueOf: () => 1 }"`
- **THEN** the request passes validation

#### Scenario: Input over the length limit

- **WHEN** `input` is 20001 characters long
- **THEN** the response is 400 with `error` equal to `String must contain at most 20000 character(s)`

#### Scenario: Missing function name

- **WHEN** a request sends only `{ "input": "1" }`
- **THEN** the response is 400 with `error` equal to `Required`

#### Scenario: Unknown preferred type

- **WHEN** a request sends `preferredType` of `"default"`
- **THEN** the response is 400

### Requirement: Equality request validation

`POST /api/trace/execute/equality` SHALL accept a JSON body of `{ input }`, where `input` is a string of 1 to 20000 characters. Any other body MUST be rejected with 400 and `{ ok: false, error }` in the same way as on the type-conversion endpoint.

#### Scenario: Empty input

- **WHEN** a request sends `{ "input": "" }`
- **THEN** the response is 400 with `error` equal to `String must contain at least 1 character(s)`

#### Scenario: Input over the length limit

- **WHEN** `input` is 20001 characters long
- **THEN** the response is 400

#### Scenario: No body

- **WHEN** a request arrives with no body and no `Content-Type`
- **THEN** the response is 400 with `error` equal to `Required`

### Requirement: Validation comes first

A request that fails validation SHALL be answered 400 before a presented API key is examined and before any rate limit bucket is spent. It MUST NOT reach trace-service.

#### Scenario: Invalid body from an anonymous client

- **WHEN** a client sends `{ "input": "" }` to the equality endpoint
- **THEN** the response is 400, no rate limit counter changes and trace-service receives nothing

#### Scenario: Invalid body with an unknown key

- **WHEN** the same body is sent with an API key that is not on file
- **THEN** the response is 400, not 401

### Requirement: Metering

A valid trace request SHALL spend one unit of the caller's `general` bucket and then one unit of its `trace` bucket, both defined in `rate-limiting`; the two endpoints draw on the same buckets. A presented API key is authenticated first, as in `api-keys`. A request refused at any of these steps MUST get that capability's 401 or 429 and is not relayed.

#### Scenario: Admitted request

- **WHEN** a valid request is admitted under the default limits
- **THEN** the response carries `X-RateLimit-Limit: 30` for the `trace` bucket

#### Scenario: Trace bucket shared by both endpoints

- **WHEN** `TRACE_RATE_LIMIT_PER_MIN` is 1 and a client sends an equality request followed by a type-conversion request
- **THEN** the second response is 429 and trace-service receives only the first request

#### Scenario: Key that is not on file

- **WHEN** a valid request presents an unknown API key
- **THEN** the response is 401 and trace-service receives nothing

### Requirement: Relay to trace-service

An admitted request SHALL be sent to trace-service under `TRACE_SERVICE_URL` (default `http://trace-service:8080`) as `POST /execute/type-conversion` or `POST /execute/equality`, with a JSON body holding only the validated fields. Unknown fields of the client's body MUST be dropped, and none of the client's headers, its API key included, are passed on. The gateway does not check `functionName` against the operations trace-service knows, nor does it parse `input`.

#### Scenario: Type-conversion request

- **WHEN** a client sends `{ "functionName": "ToNumber", "input": "1", "preferredType": "number", "extra": "x" }`
- **THEN** trace-service receives `POST /execute/type-conversion` with `{ "functionName": "ToNumber", "input": "1", "preferredType": "number" }`

#### Scenario: Equality request

- **WHEN** a client sends `{ "input": "1 == '1'", "junk": 1 }`
- **THEN** trace-service receives `POST /execute/equality` with `{ "input": "1 == '1'" }`

#### Scenario: Operation the service does not have

- **WHEN** a client sends `functionName` of `NotAnOperation` with an empty `input`
- **THEN** the request is relayed and the client receives whatever trace-service answers

#### Scenario: Base URL with a trailing slash

- **WHEN** `TRACE_SERVICE_URL` ends in `/`
- **THEN** trace-service is still called at `/execute/equality`, without a doubled slash

### Requirement: Response passthrough

When trace-service answers with a JSON body, the gateway SHALL return that body with trace-service's own status code, whatever the status: a 4xx or 5xx from trace-service reaches the client as it is, not as 502. The gateway MUST NOT add `ok` or a `meta` of its own to the body, and of trace-service's headers it repeats only `Retry-After`.

#### Scenario: Trace succeeds

- **WHEN** trace-service answers 200 with a trace
- **THEN** the client receives 200 with the same body

#### Scenario: Trace-service rejects the request

- **WHEN** trace-service answers 400 with `{ success: false, functionName, error, code }`
- **THEN** the client receives 400 with the same body

#### Scenario: Trace-service fails

- **WHEN** trace-service answers 500 or 503 with a JSON body
- **THEN** the client receives the same status and the same body

#### Scenario: Other response headers

- **WHEN** trace-service's response carries a header of its own, such as `x-custom`
- **THEN** the client's response does not carry it

### Requirement: Retry-After relay

When trace-service's response carries `Retry-After`, the gateway SHALL repeat the header and, if the body is a JSON object without `meta.retryAfter`, add `meta.retryAfter` to it: a number when the header is numeric, otherwise the header's text. Other `meta` fields are kept. An existing `meta.retryAfter` MUST be left as it is, and a body that is not an object is not modified.

#### Scenario: Busy trace-service

- **WHEN** trace-service answers 429 with `Retry-After: 3` and `{ success: false, error: "busy" }`
- **THEN** the client receives 429 with `Retry-After: 3` and `{ success: false, error: "busy", meta: { retryAfter: 3 } }`

#### Scenario: Body already says when to retry

- **WHEN** trace-service answers with `Retry-After: 3` and a body whose `meta` is `{ retryAfter: 9, other: 1 }`
- **THEN** the client receives `Retry-After: 3` and the body unchanged

#### Scenario: Header is a date

- **WHEN** trace-service answers with `Retry-After: Wed, 21 Oct 2026 07:28:00 GMT` and a body whose `meta` is `{ other: 1 }`
- **THEN** the body's `meta` becomes `{ other: 1, retryAfter: "Wed, 21 Oct 2026 07:28:00 GMT" }`

#### Scenario: Body is an array

- **WHEN** trace-service answers with `Retry-After: 4` and the body `[1, 2]`
- **THEN** the client receives `Retry-After: 4` and `[1, 2]`

### Requirement: Unusable upstream body

A trace-service response whose body is not JSON, an empty body included, SHALL be answered 502 with `{ ok: false, error: "trace-service returned invalid response" }`, whatever status it carried. A body larger than 4 MiB MUST NOT be read to its end and is answered 502 with `{ ok: false, error: "trace-service response too large" }`.

#### Scenario: HTML instead of JSON

- **WHEN** trace-service answers 200 with `<html>oops</html>`
- **THEN** the response is 502 with `error` equal to `trace-service returned invalid response`

#### Scenario: Empty body

- **WHEN** trace-service answers 200 with no body
- **THEN** the response is 502 with `error` equal to `trace-service returned invalid response`

#### Scenario: Oversized body

- **WHEN** trace-service answers with a JSON body just over 4 MiB
- **THEN** the response is 502 with `error` equal to `trace-service response too large`

### Requirement: Unreachable trace-service

When the request to trace-service fails before a response arrives, the gateway SHALL answer 502 with `{ ok: false, error }`, where `error` names trace-service and the kind of failure. The failure MUST be logged, and the request has still spent from both buckets.

#### Scenario: Connection refused

- **WHEN** nothing listens at `TRACE_SERVICE_URL`
- **THEN** the response is 502 with `error` equal to `trace-service connection refused`

#### Scenario: Host does not resolve

- **WHEN** the host in `TRACE_SERVICE_URL` cannot be resolved
- **THEN** the response is 502 with `error` equal to `trace-service DNS lookup failed`

### Requirement: Upstream time limit

The gateway SHALL wait at most `MAX_TIMEOUT_MS` (default 5000) plus 1000 milliseconds for trace-service's complete response. When that time runs out, the request MUST be abandoned and answered 502 with `{ ok: false, error: "trace-service request failed" }`; the status is not 504 and the message does not mention a timeout.

#### Scenario: Trace-service never answers

- **WHEN** trace-service accepts the request and sends nothing, under the default limits
- **THEN** after 6 seconds the response is 502 with `error` equal to `trace-service request failed`

#### Scenario: Body stalls

- **WHEN** trace-service sends its headers and part of a body, then nothing more
- **THEN** 6 seconds after the request was relayed the response is 502 with `error` equal to `trace-service request failed`

#### Scenario: Lower limit

- **WHEN** `MAX_TIMEOUT_MS` is 200 and trace-service never answers
- **THEN** the response is 502 after about 1200 milliseconds
