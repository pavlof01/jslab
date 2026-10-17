# frontend-api-proxy Specification

## Purpose

The route handlers the Next.js frontend serves under `/api`, which let a browser reach the backend through the frontend's own origin: run and trace requests are relayed to the api gateway, and the trace catalog and spec text are read from trace-service. What the gateway does with a relayed request is specified in `run-api`, `rate-limiting` and `trace-api`. In production the ingress sends `/api` straight to the gateway and only `/api/trace/functions` and `/api/spec` to the frontend, so the run and trace relays serve local, compose and e2e setups.

## Requirements

### Requirement: Run relay

`POST /api/run` SHALL forward the request's JSON body to the gateway as `POST /api/run`, re-serialized but otherwise unchanged. The body MUST NOT be validated here beyond being parseable JSON; an engine, source or flag the gateway refuses is refused by the gateway.

#### Scenario: Run is relayed

- **WHEN** `JSLAB_BACKEND_URL` is `http://api:8080` and the body is `{ "engine": "v8", "sourceText": "print(42)" }`
- **THEN** the gateway receives `POST http://api:8080/api/run` with that same JSON body
- **AND** the caller gets the gateway's 200 and its JSON body

#### Scenario: Engine the gateway does not know

- **WHEN** the body names the engine `quickjs` and the gateway answers 400 with `{ ok: false, error: "engine: invalid" }`
- **THEN** the request is still forwarded and the caller gets that 400 and that body

### Requirement: Run route methods

`GET /api/run` SHALL be answered with 405 and `{ error: "Method Not Allowed" }` without contacting the gateway.

#### Scenario: GET on the run route

- **WHEN** `/api/run` is requested with GET
- **THEN** the response is 405 with `{ error: "Method Not Allowed" }`

### Requirement: Malformed request body

A `POST` to `/api/run` or `/api/trace/execute/{category}` whose body is not valid JSON MUST be answered with 400 and `{ error: "Invalid JSON body" }`, and the gateway SHALL NOT be contacted.

#### Scenario: Body is not JSON

- **WHEN** the body is `{not json`
- **THEN** the response is 400 with `{ error: "Invalid JSON body" }`
- **AND** no request reaches the gateway

### Requirement: Gateway address

Run requests SHALL be sent to `JSLAB_BACKEND_URL` (default `http://localhost:8080`). Trace requests SHALL be sent to `JSLAB_TRACE_BACKEND_URL` when it is set, and to the run address otherwise. One trailing slash on a configured address is dropped.

#### Scenario: Nothing configured

- **WHEN** neither variable is set
- **THEN** run and trace requests both go to `http://localhost:8080`

#### Scenario: Trailing slash

- **WHEN** `JSLAB_BACKEND_URL` is `http://api:8080/`
- **THEN** a run is sent to `http://api:8080/api/run`

#### Scenario: Separate trace backend

- **WHEN** `JSLAB_BACKEND_URL` is `http://api:8080` and `JSLAB_TRACE_BACKEND_URL` is `http://trace-api:8080`
- **THEN** a run goes to `http://api:8080` and an equality trace goes to `http://trace-api:8080/api/trace/execute/equality`

### Requirement: Forwarded request headers

A request relayed to the gateway SHALL carry `content-type: application/json` and, each only when the caller sent it, the caller's `x-forwarded-for`, `cf-connecting-ip` and `x-api-key` headers with their values unchanged. No other request header MUST be forwarded.

#### Scenario: Caller identifies itself

- **WHEN** the caller sends `x-forwarded-for: 1.1.1.1`, `cf-connecting-ip: 2.2.2.2` and `x-api-key: jslab_abc`
- **THEN** the gateway receives those three headers with the same values, plus `content-type: application/json`

#### Scenario: Caller sends none of them

- **WHEN** the caller sends none of the three headers
- **THEN** the gateway receives only `content-type: application/json`

#### Scenario: Cookies and authorization

- **WHEN** the caller sends `cookie` and `authorization` headers
- **THEN** neither reaches the gateway

### Requirement: Gateway response relay

The gateway's answer to a relayed request SHALL be returned with the gateway's status code and its JSON body, whatever that status is. The gateway's response headers MUST NOT be copied onto the response.

#### Scenario: Rate-limited run

- **WHEN** the gateway answers 429 with `{ error: "rate limit exceeded" }`
- **THEN** the caller gets 429 with `{ error: "rate limit exceeded" }`

#### Scenario: Retry-After header

- **WHEN** the gateway answers 429 with a `Retry-After` header
- **THEN** the caller's response has no `Retry-After` header

#### Scenario: Trace refused upstream

- **WHEN** the gateway answers a trace with 400 and `{ success: false, error: "budget exceeded" }`
- **THEN** the caller gets that 400 and that body

### Requirement: Gateway unreachable

A relayed request SHALL wait at most 15 seconds for the gateway. When the gateway cannot be reached or does not answer in that time, the response MUST be 503 with `{ error: "The engine service is unavailable. Try again in a moment." }`.

#### Scenario: Connection refused

- **WHEN** the connection to the gateway is refused
- **THEN** the response is 503 with `{ error: "The engine service is unavailable. Try again in a moment." }`

#### Scenario: Gateway hangs

- **WHEN** the gateway has not answered after 15 seconds
- **THEN** the request to it is aborted and the response is the same 503

### Requirement: Unreadable gateway response

When the gateway answers with a body that is not JSON, the response MUST be 502 with `{ error: "The engine service returned an unreadable response." }`, whatever status the gateway sent.

#### Scenario: HTML from the gateway

- **WHEN** the gateway answers 200 with the body `<html>502</html>`
- **THEN** the response is 502 with `{ error: "The engine service returned an unreadable response." }`

### Requirement: Trace category routing

`POST /api/trace/execute/{category}` SHALL accept the categories `equality` and `type-conversion` and forward each to the gateway's path of the same name. Any other category MUST be answered with 404 and `{ error: "Unknown trace category \"<category>\"" }` before the body is read.

#### Scenario: Known categories

- **WHEN** `JSLAB_BACKEND_URL` is `http://api:8080` and valid requests arrive for `equality` and `type-conversion`
- **THEN** they are sent to `http://api:8080/api/trace/execute/equality` and `http://api:8080/api/trace/execute/type-conversion`

#### Scenario: Unknown category

- **WHEN** a request arrives for the category `coercion`
- **THEN** the response is 404 with `{ error: "Unknown trace category \"coercion\"" }`
- **AND** no request reaches the gateway

### Requirement: Trace body shape

A trace request body that parses to anything other than an object or an array MUST be answered with 400 and `{ error: "Request body must be an object" }`. An array is treated as an object carrying no fields and is refused by the category's field checks instead.

#### Scenario: Scalar or null body

- **WHEN** the body is `5`, `"text"` or `null`
- **THEN** the response is 400 with `{ error: "Request body must be an object" }`

#### Scenario: Array body

- **WHEN** the body of an `equality` request is `[1,2]`
- **THEN** the response is 400 with `{ error: "input must be a non-empty string expression" }`

### Requirement: Equality request validation

An `equality` request SHALL be forwarded only when `input` is a string with at least one non-whitespace character. Otherwise the response MUST be 400 with `{ error: "input must be a non-empty string expression" }` and the gateway is not contacted. The forwarded body is `{ input }` alone.

#### Scenario: Missing, blank or non-string input

- **WHEN** the body is `{}`, `{ "input": "" }`, `{ "input": "   " }` or `{ "input": 42 }`
- **THEN** the response is 400 with `{ error: "input must be a non-empty string expression" }`
- **AND** no request reaches the gateway

#### Scenario: Valid expression

- **WHEN** the body is `{ "input": "[] == ![]" }`
- **THEN** the request is forwarded and the gateway's answer is returned

### Requirement: Type-conversion request validation

A `type-conversion` request SHALL be forwarded only when `functionName` is a non-empty string, `input` is a string (an empty one included) and `preferredType`, if present, is `"string"` or `"number"`. The first check that fails, in that order, MUST be answered with 400 and its own `error`. The operation name is not checked against the catalog here.

#### Scenario: No function name

- **WHEN** the body is `{ "input": "1" }`
- **THEN** the response is 400 with `{ error: "functionName is required and must be a string" }`

#### Scenario: Input that is not source text

- **WHEN** `functionName` is `ToNumber` and `input` is absent, `null`, `0`, `false`, `[]` or `{}`
- **THEN** the response is 400 with `{ error: "input must be a string of source text (e.g. \"0\" or \"{ valueOf: () => 1 }\")" }`

#### Scenario: Source text that spells a falsy value

- **WHEN** `functionName` is `ToNumber` and `input` is `"null"`, `"0"`, `"false"` or `""`
- **THEN** the request is forwarded

#### Scenario: Unsupported hint

- **WHEN** `preferredType` is `"default"`
- **THEN** the response is 400 with `{ error: "preferredType must be 'string' or 'number'" }`

### Requirement: Type-conversion forwarded fields

The body forwarded for a `type-conversion` request SHALL contain `functionName` and `input`, plus `preferredType` only when the caller sent one. Every other field of the caller's body MUST be left out.

#### Scenario: Extra field

- **WHEN** the body is `{ "functionName": "ToNumber", "input": "'1'", "preferredType": "number", "extra": "ignored" }`
- **THEN** the gateway receives `{ "functionName": "ToNumber", "input": "'1'", "preferredType": "number" }`

#### Scenario: No hint sent

- **WHEN** the body is `{ "functionName": "ToNumber", "input": "'1'" }`
- **THEN** the forwarded body has no `preferredType` field

### Requirement: Trace-service address

`GET /api/trace/functions` and `GET /api/spec/{functionName}` SHALL read trace-service directly at `TRACE_SERVICE_URL` (default `http://localhost:8085`), not through the gateway. When `JSLAB_REMOTE_SITE` is set they MUST instead read that site's public paths of the same name, even if `TRACE_SERVICE_URL` is also set. One trailing slash on either address is dropped, and none of the caller's headers are forwarded.

#### Scenario: Service address configured

- **WHEN** `TRACE_SERVICE_URL` is `http://trace-service:8080`
- **THEN** the catalog is read from `http://trace-service:8080/functions` and a spec from `http://trace-service:8080/spec/ToNumber`

#### Scenario: Nothing configured

- **WHEN** neither variable is set
- **THEN** the catalog is read from `http://localhost:8085/functions`

#### Scenario: Remote site configured

- **WHEN** `JSLAB_REMOTE_SITE` is `https://jslab.su/` and `TRACE_SERVICE_URL` is `http://trace-service:8080`
- **THEN** the catalog is read from `https://jslab.su/api/trace/functions` and a spec from `https://jslab.su/api/spec/ToNumber`

### Requirement: Function catalog

`GET /api/trace/functions` SHALL answer with the status and JSON body of the upstream catalog, unchanged.

#### Scenario: Catalog is relayed

- **WHEN** the upstream answers 200 with `{ available_functions: ["ToNumber"], function_meta: {}, supported_operators: ["=="] }`
- **THEN** the response is 200 with that same body

#### Scenario: Upstream error

- **WHEN** the upstream answers 500 with `{ error: "nope" }`
- **THEN** the response is 500 with that body

### Requirement: Spec operation name validation

`GET /api/spec/{functionName}` SHALL accept only a name made of segments that start with a letter and continue with letters or digits, joined by `::` or `.`. Any other name MUST be answered with 400 and `{ error: "Not a valid abstract operation name" }` without contacting the upstream. An accepted name is percent-encoded into the upstream path.

#### Scenario: Accepted names

- **WHEN** the name is `ToNumber`, `ToInt32`, `Number::toString` or `Object.prototype`
- **THEN** the upstream is asked for it

#### Scenario: Rejected names

- **WHEN** the name is `../../etc/passwd`, `To/Number`, `ToNumber?x=1`, `2Number`, `ToNumber::` or empty
- **THEN** the response is 400 with `{ error: "Not a valid abstract operation name" }`
- **AND** no request reaches the upstream

#### Scenario: Name with a separator

- **WHEN** the name is `Number::toString`
- **THEN** the upstream path ends in `Number%3A%3AtoString`

### Requirement: Spec response

The upstream SHALL be asked for a spec with `Accept: text/html`. A successful answer MUST be returned as 200 with the upstream's body and the headers `Content-Type: text/html; charset=utf-8`, `Cache-Control: public, max-age=3600` and `X-Content-Type-Options: nosniff`. An unsuccessful answer is returned with the upstream's status and JSON body.

#### Scenario: Spec found

- **WHEN** the upstream answers 200 with `<emu-alg>steps</emu-alg>`
- **THEN** the response is 200 with that text and the three headers above

#### Scenario: No spec for the operation

- **WHEN** the upstream answers 404 with `{ error: "No spec available for \"Nope\"" }`
- **THEN** the response is 404 with that body

### Requirement: Trace-service failure

When the upstream of `/api/trace/functions` or `/api/spec/{functionName}` cannot be reached, the response MUST be 503 with `{ error: "trace-service unavailable: <reason>" }`, where the reason is the connection error's message. When the upstream answers with a body that is not JSON where JSON is expected, the response MUST be 502 with `{ error: "Invalid response from trace-service" }`.

#### Scenario: Upstream is down

- **WHEN** the connection fails with `fetch failed`
- **THEN** the response is 503 with `{ error: "trace-service unavailable: fetch failed" }`

#### Scenario: Catalog is not JSON

- **WHEN** the upstream answers the catalog request with 200 and the body `<html>`
- **THEN** the response is 502 with `{ error: "Invalid response from trace-service" }`

#### Scenario: Spec error without a body

- **WHEN** the upstream answers a spec request with 503 and an empty body
- **THEN** the response is 502 with `{ error: "Invalid response from trace-service" }`
