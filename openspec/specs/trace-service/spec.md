# trace-service Specification

## Purpose

The HTTP contract of the trace service: evaluate a JavaScript expression, run one ECMAScript abstract operation on it in a trace-instrumented engine262, and return the spec steps the run took together with its result. The service also publishes the catalog of traceable operations and the spec text shown beside a trace, and bounds every run by time, memory and queue depth.

## Requirements

### Requirement: Health endpoint

`GET /healthz` SHALL answer 200 with `{ ok: true }`. Answering MUST NOT run anything in the trace worker.

#### Scenario: Health check

- **WHEN** `/healthz` is requested
- **THEN** the response is 200 with `{ ok: true }`
- **AND** no trace was started

### Requirement: Operation catalog

`GET /functions` SHALL answer 200 with `{ available_functions, function_meta, supported_operators, endpoints, note }`. `available_functions` lists, without duplicates, the operation names the type-conversion endpoint accepts; `function_meta` holds `{ category, arity }` for each of them; `supported_operators` lists the operators the equality endpoint splits on; `endpoints` describes the two execute endpoints as text under `type_conversion` and `equality`.

#### Scenario: Type-conversion operations

- **WHEN** `/functions` is requested
- **THEN** `available_functions` contains `ToNumber` and `ToPrimitive`
- **AND** `function_meta.ToNumber` is `{ category: "typeConversion", arity: "unary" }`
- **AND** every name in `available_functions` has an entry in `function_meta` with that same category and arity

#### Scenario: Operators

- **WHEN** `/functions` is requested
- **THEN** `supported_operators` is `["===", "!==", "==", "!=", "<=", ">=", "<", ">", "+"]`

#### Scenario: Equality algorithms

- **WHEN** `/functions` is requested
- **THEN** neither `available_functions` nor `function_meta` has an entry for `IsLooselyEqual` or any other algorithm the equality endpoint traces

### Requirement: Type-conversion request validation

`POST /execute/type-conversion` SHALL accept a JSON body of `{ functionName, input, preferredType? }`, where `functionName` is one of the names in `available_functions`, `input` is a string and `preferredType` is `"string"` or `"number"`. A body that omits `functionName` or `input`, names an operation outside the catalog or sends any other `preferredType` MUST be rejected with status 400 before anything is executed.

#### Scenario: Operation outside the catalog

- **WHEN** a request sends `functionName` of `DropTables`
- **THEN** the response is 400 and no trace was started

#### Scenario: Missing field

- **WHEN** a request omits `functionName` or omits `input`
- **THEN** the response is 400

#### Scenario: Unknown preferred type

- **WHEN** a `ToPrimitive` request sends `preferredType` of `default`
- **THEN** the response is 400

### Requirement: Equality request validation

`POST /execute/equality` SHALL accept a JSON body of `{ input }`, where `input` is a non-empty string holding a whole binary expression. A body without `input`, or with an empty one, MUST be rejected with status 400 before anything is executed.

#### Scenario: Empty expression

- **WHEN** a request sends `input` of `""`
- **THEN** the response is 400

#### Scenario: Missing expression

- **WHEN** a request body has no `input`
- **THEN** the response is 400

### Requirement: Input length limit

On both execute endpoints an `input` longer than `MAX_SOURCE_LENGTH` characters (default 20000) SHALL be rejected by validation with status 400 before anything is executed. An `input` of exactly that length MUST be accepted.

#### Scenario: Input over the limit

- **WHEN** `MAX_SOURCE_LENGTH` is 32 and `input` is 33 characters long
- **THEN** the response is 400 with a `message` containing `must NOT have more than 32 characters`

#### Scenario: Input at the limit

- **WHEN** `MAX_SOURCE_LENGTH` is 32 and `input` is 32 characters long
- **THEN** the request passes validation

### Requirement: Validation error response

A request rejected by validation SHALL be answered with status 400 and the body `{ statusCode: 400, code: "FST_ERR_VALIDATION", error: "Bad Request", message }`, where `message` names the field and the rule it broke. Unlike every other error of the execute endpoints, this body has no `success` and no `functionName`.

#### Scenario: Operation outside the catalog

- **WHEN** a type-conversion request sends `functionName` of `DropTables`
- **THEN** the body is `{ statusCode: 400, code: "FST_ERR_VALIDATION", error: "Bad Request", message: "body/functionName must be equal to one of the allowed values" }`

#### Scenario: Missing expression

- **WHEN** an equality request has no `input`
- **THEN** `message` is `body must have required property 'input'`

### Requirement: Input evaluation

A type-conversion `input`, and each operand of an equality `input`, SHALL be evaluated as a JavaScript expression — as if wrapped in parentheses, so `{ … }` is an object literal — and the operation runs on the value it produces. Every request MUST be evaluated in a realm of its own. A type-conversion `input` that cannot be evaluated is answered with 400 and `{ success: false, functionName, error }`, where `error` begins `Failed to parse input "<text>":`.

#### Scenario: Object literal with a method

- **WHEN** `ToNumber` is requested with `input` of `{ valueOf: () => '1' }`
- **THEN** `result` is `{ type: "Number", value: 1 }`
- **AND** the trace tree contains a `ToPrimitive` call

#### Scenario: Text that is not an expression

- **WHEN** `ToNumber` is requested with `input` of `this is not javascript`
- **THEN** the response is 400 with `success: false` and `functionName: "ToNumber"`
- **AND** `error` begins `Failed to parse input "this is not javascript":` and contains `SyntaxError`

#### Scenario: Expression that throws while being evaluated

- **WHEN** `ToNumber` is requested with `input` of `nope`
- **THEN** the response is 400 with an `error` that begins `Failed to parse input "nope": ReferenceError`

#### Scenario: Empty type-conversion input

- **WHEN** `ToNumber` is requested with `input` of `""`
- **THEN** the request passes validation and is answered 400 with `success: false` and an `error` that begins `Failed to parse input "":`

#### Scenario: State from an earlier request

- **WHEN** one request evaluates `globalThis.leak = 5` and a later request evaluates `leak`
- **THEN** the later one fails with a `ReferenceError`

### Requirement: Type-conversion response

A type-conversion that completes SHALL answer 200 with `{ success: true, functionName, result, root }`, where `functionName` echoes the request, `result` is the value the operation returned and `root` is the trace tree of the run. `result` is absent when the operation returns something that is not an ECMAScript language value.

#### Scenario: String to Number

- **WHEN** `ToNumber` is requested with `input` of `'42'`
- **THEN** the response is 200 with `success: true`, `functionName: "ToNumber"` and `result` of `{ type: "Number", value: 42 }`
- **AND** `root.algoId` is `ToNumber`

#### Scenario: Result keeps its spec type

- **WHEN** `ToString` is requested with `input` of `true`
- **THEN** `result` is `{ type: "String", value: "true" }`

#### Scenario: Operation without a language value

- **WHEN** `ToIndex` is requested with `input` of `3`
- **THEN** the response is 200 with `success: true` and a `root`
- **AND** the body has no `result`

### Requirement: Preferred type hint

`preferredType` SHALL be passed to `ToPrimitive` as its preferred type. When it is omitted, `ToPrimitive` runs with no preference. Every other operation MUST ignore it.

#### Scenario: Hint decides which method answers

- **WHEN** `ToPrimitive` is requested with `input` of `{ valueOf: () => 1, toString: () => 'one' }`
- **THEN** `preferredType` of `string` gives `result` of `{ type: "String", value: "one" }`
- **AND** `preferredType` of `number` gives `{ type: "Number", value: 1 }`

#### Scenario: Hint on another operation

- **WHEN** `ToNumber` is requested with `input` of `'1'` and `preferredType` of `string`
- **THEN** `result` is `{ type: "Number", value: 1 }`

### Requirement: Operator detection

The equality endpoint SHALL split `input` at an operator at the top level of the expression — outside string, template and regular-expression literals and outside any `()`, `[]` or `{}`. Equality operators win over relational ones and those over `+`; among several of one tier the last is the split point. The longest operator at a position is taken, `=>` is never an operator, and a `+` that is unary, doubled or the sign of a numeric exponent MUST NOT be a split point.

#### Scenario: Tiers

- **WHEN** `input` is `1 < 2 == true`
- **THEN** `detectedOperator` is `==` and the left operand is `1 < 2`

#### Scenario: Addition inside a comparison

- **WHEN** `input` is `1 + 2 == 3`
- **THEN** `detectedOperator` is `==` and `result` is `{ type: "Boolean", value: true }`

#### Scenario: Chain of the same tier

- **WHEN** `input` is `"a" + 1 + 2`
- **THEN** the operands are `"a" + 1` and `2`, and `result` is `{ type: "String", value: "a12" }`

#### Scenario: Longest operator

- **WHEN** `input` is `1 === 1` or `1 <= 2`
- **THEN** `detectedOperator` is `===` or `<=`, not `==` or `<`

#### Scenario: Operator inside a literal or a nested expression

- **WHEN** `input` is `'a == b'`, `[1 == 2]`, `/a+b/` or `() => 1`
- **THEN** no operator is detected

#### Scenario: Operator after an object literal

- **WHEN** `input` is `{ valueOf: () => 1 } == 1`
- **THEN** `detectedOperator` is `==` and the left operand is `{ valueOf: () => 1 }`

#### Scenario: Plus that is not binary

- **WHEN** `input` is `1e+5`, `typeof +1` or `1 ++ 1`
- **THEN** no operator is detected
- **AND** for `+1 == 1` the detected operator is `==`

### Requirement: Operator dispatch

The equality endpoint SHALL evaluate both operands and trace one algorithm chosen by the operator: `IsLooselyEqual` for `==` and `!=`, `IsStrictlyEqual` for `===` and `!==`, `AbstractRelationalComparison` for `<`, `>`, `<=` and `>=`, and `ApplyStringOrNumericBinaryOperator` for `+`. A run that completes answers 200 with `{ success: true, functionName: "BinaryExpression", result, root, effectiveAlgoId, detectedOperator }`, naming the algorithm and the operator.

#### Scenario: Loose equality

- **WHEN** `input` is `[] == ![]`
- **THEN** the response is 200 with `functionName: "BinaryExpression"`, `detectedOperator: "=="` and `effectiveAlgoId: "IsLooselyEqual"`
- **AND** `result` is `{ type: "Boolean", value: true }` and `root.algoId` is `IsLooselyEqual`

#### Scenario: Strict equality

- **WHEN** `input` is `'1' === 1`
- **THEN** `effectiveAlgoId` is `IsStrictlyEqual` and `result` is `{ type: "Boolean", value: false }`

#### Scenario: Relational operator

- **WHEN** `input` is `1 < 2`
- **THEN** `effectiveAlgoId` is `AbstractRelationalComparison` and `result` is `{ type: "Boolean", value: true }`

#### Scenario: Addition

- **WHEN** `input` is `[] + {}`
- **THEN** `effectiveAlgoId` is `ApplyStringOrNumericBinaryOperator` and `result` is `{ type: "String", value: "[object Object]" }`

### Requirement: Operator result

`result` SHALL be the value of the expression as written, while `root` shows the algorithm as it was invoked. `!=` and `!==` negate the algorithm's answer; `>` and `<=` invoke the comparison with the operands swapped; `<=` and `>=` negate its answer; and a comparison whose answer is undefined MUST yield `false` for all four relational operators.

#### Scenario: Negated equality

- **WHEN** `input` is `1 != 2`
- **THEN** `result` is `{ type: "Boolean", value: true }`
- **AND** `root.output` is `{ type: "Boolean", value: false }`

#### Scenario: Swapped operands

- **WHEN** `input` is `2 > 1`
- **THEN** `result` is `{ type: "Boolean", value: true }`
- **AND** `root.inputs` holds `1` and then `2`

#### Scenario: Less than or equal

- **WHEN** `input` is `1 <= 1`
- **THEN** `result` is `{ type: "Boolean", value: true }`
- **AND** `root.output` is `{ type: "Boolean", value: false }`

#### Scenario: Comparison with NaN

- **WHEN** `input` is `NaN < 1`, `NaN > 1`, `NaN <= 1` or `NaN >= 1`
- **THEN** `result` is `{ type: "Boolean", value: false }`

### Requirement: Unusable expression

An equality `input` the service cannot split and evaluate SHALL be answered with 400 and `{ success: false, functionName: "BinaryExpression", error }`, where `error` says what is wrong: no supported operator at the top level, an empty side, or an operand that cannot be evaluated. An operator outside `supported_operators` MUST be treated as no operator.

#### Scenario: No operator

- **WHEN** `input` is `42`
- **THEN** `error` is `Expected a binary expression with one of: ===, !==, ==, !=, <=, >=, <, >, + (e.g. "{} == ![]").`

#### Scenario: Unsupported operator

- **WHEN** `input` is `1 - 2`
- **THEN** the response is the same as for no operator

#### Scenario: Missing operand

- **WHEN** `input` is `1 ==`
- **THEN** `error` is `Expression "1 ==" is missing an operand around "==".`

#### Scenario: Operand that cannot be evaluated

- **WHEN** `input` is `this is not js == 1` or `1 == this is not js`
- **THEN** `error` begins `Failed to parse left operand "this is not js":` or `Failed to parse right operand "this is not js":`

### Requirement: Failed trace response

A request that passes validation but whose operation throws SHALL be answered with 400 and `{ success: false, functionName, error }`, with neither `result` nor `root`. For a thrown JavaScript error, `error` MUST name the error type and its message. On the equality endpoint the body carries `effectiveAlgoId` and `detectedOperator` only for some throws, and `error` is prefixed with `Execution threw: ` for the others.

#### Scenario: Operation throws a spec error

- **WHEN** `ToNumber` is requested with `input` of `Symbol('x')`
- **THEN** the response is 400 with `{ success: false, functionName: "ToNumber", error: "TypeError: Cannot convert a Symbol value to a number" }`

#### Scenario: User code throws

- **WHEN** `ToNumber` is requested with `input` of `({ valueOf: () => { throw new TypeError('custom'); } })`
- **THEN** the response is 400 with an `error` that begins `TypeError: custom`

#### Scenario: Comparison throws in user code

- **WHEN** the equality `input` is `({ valueOf: () => { throw new Error('nope'); } }) == 1`
- **THEN** the response is 400 with an `error` that begins `Execution threw: Error: nope`
- **AND** the body has neither `effectiveAlgoId` nor `detectedOperator`

#### Scenario: Addition mixes BigInt and Number

- **WHEN** the equality `input` is `1n + 1`
- **THEN** the response is 400 with `error` of `TypeError: Cannot mix BigInt and other types in + operation`
- **AND** the body carries `effectiveAlgoId: "ApplyStringOrNumericBinaryOperator"` and `detectedOperator: "+"`

### Requirement: Result value

`result` SHALL carry the spec type of the returned value: `{ type: "Undefined" }`, `{ type: "Null", value: null }`, `{ type: "Boolean", value }`, `{ type: "Number", value }`, `{ type: "String", value }`, `{ type: "BigInt", value }` with the decimal digits as a string, `{ type: "Symbol", value: { id: "sym", description? } }` or `{ type: "Object", value }`. Numbers JSON cannot carry MUST travel as the strings `"NaN"`, `"Infinity"`, `"-Infinity"` and `"-0"`.

#### Scenario: Not a number

- **WHEN** `ToNumber` is requested with `input` of `'not a number'`
- **THEN** the response is 200 with `result` of `{ type: "Number", value: "NaN" }`

#### Scenario: Negative zero

- **WHEN** `ToNumber` is requested with `input` of `'-0'`
- **THEN** `result` is `{ type: "Number", value: "-0" }`

#### Scenario: BigInt

- **WHEN** `ToNumeric` is requested with `input` of `10n`
- **THEN** `result` is `{ type: "BigInt", value: "10" }`

#### Scenario: Symbol

- **WHEN** `ToPropertyKey` is requested with `input` of `Symbol('tag')`
- **THEN** `result` is `{ type: "Symbol", value: { id: "sym", description: "tag" } }`

#### Scenario: Undefined and null

- **WHEN** `ToPrimitive` is requested with `input` of `undefined` or `null`
- **THEN** `result` is `{ type: "Undefined" }` or `{ type: "Null", value: null }`

### Requirement: Object result

An Object `result` SHALL be `{ type: "Object", value: { id: "obj", class, preview? } }`. For a primitive wrapper, `class` is `Number`, `String`, `Boolean`, `Symbol` or `BigInt` and `preview` renders the wrapped value. Every other object MUST be reported with `class: "Object"` and no `preview`; a function is reported that way too.

#### Scenario: String wrapper

- **WHEN** `ToObject` is requested with `input` of `'hi'`
- **THEN** `result` is `{ type: "Object", value: { id: "obj", class: "String", preview: "\"hi\"" } }`

#### Scenario: Other wrappers

- **WHEN** `ToObject` is requested with `input` of `5`, `Object(1n)` or `Object(Symbol('s'))`
- **THEN** `result.value` has `class` and `preview` of `Number` and `5`, `BigInt` and `1n`, or `Symbol` and `Symbol(s)`

#### Scenario: Function

- **WHEN** `ToObject` is requested with `input` of `() => 1`
- **THEN** `result` is `{ type: "Object", value: { id: "obj", class: "Object" } }`

### Requirement: Value size limit

A String payload, the digits of a BigInt, a Symbol description and an object preview SHALL each be cut to their first 10000 characters, followed by `… (truncated, N more chars)` where N is the number of characters dropped. The limit applies to `result` and to every value in the trace tree; it is fixed, not configurable through the environment.

#### Scenario: Long String result

- **WHEN** `ToString` is requested with `input` of `'a'.repeat(20000)`
- **THEN** `result.value` is 10000 `a` characters followed by `… (truncated, 10000 more chars)`

#### Scenario: Long BigInt result

- **WHEN** `ToNumeric` is requested with `input` of `10n ** 20000n`
- **THEN** `result.value` is the first 10000 digits followed by `… (truncated, 10001 more chars)`

#### Scenario: Value within the limit

- **WHEN** `ToString` is requested with `input` of `'hello'`
- **THEN** `result` is `{ type: "String", value: "hello" }`

### Requirement: Trace tree

`root` SHALL be `{ algoId, inputs, output?, error?, steps, specUrl? }` for the algorithm that was run, with its steps in execution order. Every step has a `kind` and may have a `hint` and a `description`. An `if` step carries `taken` when a branch decision was recorded, a `return` step its value in `value`, an `operation` step its outcome in `result` when it has one. A `call` step that names a sub-algorithm MUST nest that run as `algoId`, `inputs`, `output` or `error`, `steps` and `specUrl`.

#### Scenario: Branches and return

- **WHEN** `ToBoolean` is requested with `input` of `0`
- **THEN** `root.algoId` is `ToBoolean`, `root.inputs` is `[{ type: "Number", value: 0 }]` and `root.output` is `{ type: "Boolean", value: false }`
- **AND** every step's `hint` begins `Step ` and a number, and every `if` step has a boolean `taken`
- **AND** the last step has `kind: "return"`, a `hint` beginning `Step 2` and `value` of `{ type: "Boolean", value: false }`

#### Scenario: Nested sub-algorithm

- **WHEN** `ToNumber` is requested with `input` of `'42'`
- **THEN** `root.steps` contains a step with `kind: "call"`, `algoId: "StringToNumber"`, `inputs` of `[{ type: "String", value: "42" }]`, `output` of `{ type: "Number", value: 42 }` and `steps` of its own

#### Scenario: Spec link

- **WHEN** the equality `input` is `1n + 2n`
- **THEN** `root.specUrl` is `https://262.ecma-international.org/#sec-applystringornumericbinaryoperator`
- **AND** the nested `BigInt::add` call step has `specUrl` of `https://262.ecma-international.org/#sec-numeric-types-bigint-add`

#### Scenario: Algorithm without a known link

- **WHEN** the recorder emits a `call` step for an algorithm the service has no link for
- **THEN** the step carries no `specUrl`

#### Scenario: Call step without a sub-algorithm

- **WHEN** the recorder emits a `call` step that names no algorithm
- **THEN** the step has only `kind`, `hint` and `description`

### Requirement: Trace values

Values inside the trace tree — `inputs`, `output`, a step's `value` and `result` — SHALL use the typed shape of `result` but are rebuilt from the text the trace recorder stored, so their type is a best guess: quoted text is a String, numeric text a Number, `<digits>n` a BigInt, text in braces or brackets an Object `{ id: "display", class: "", preview }`, a bare type name that type's placeholder, anything else a String. Only the top-level `result` is typed from the value itself.

#### Scenario: Object operand

- **WHEN** the equality `input` is `[] == ![]`
- **THEN** `root.inputs` is `{ type: "Object", value: { id: "display", class: "", preview: "{ length: 0 }" } }` followed by `{ type: "Boolean", value: false }`

#### Scenario: Infinity

- **WHEN** `ToNumber` is requested with `input` of `'Infinity'`
- **THEN** `result` is `{ type: "Number", value: "Infinity" }` while `root.output` is `{ type: "String", value: "+∞" }`

#### Scenario: Negative zero

- **WHEN** `ToNumber` is requested with `input` of `'-0'`
- **THEN** `result` is `{ type: "Number", value: "-0" }` while `root.output` is `{ type: "Number", value: 0 }`

#### Scenario: Symbol

- **WHEN** `ToPropertyKey` is requested with `input` of `Symbol('tag')`
- **THEN** `root.inputs` is `[{ type: "String", value: "Symbol()" }]`

#### Scenario: Step with no recorded value

- **WHEN** `ToObject` is requested with `input` of `'hi'`
- **THEN** the final `return` step has `value` of `{ type: "Undefined" }` and `root` has no `output`
- **AND** `result` is the String wrapper object

### Requirement: Execution time limit

Every trace SHALL get a wall-clock budget of `MAX_TIMEOUT_MS` (default 5000) that a request cannot change. The budget is counted from the moment the request is accepted, so it includes time spent waiting behind other traces and for a trace worker to start. A trace still running when the budget ends MUST be killed and the request answered with 400 and `{ success: false, functionName, code: "execution_budget_exceeded", error }`.

#### Scenario: Input that never returns

- **WHEN** `MAX_TIMEOUT_MS` is 3000 and `ToNumber` is requested with `input` of `{ valueOf: () => { while (true) {} } }`
- **THEN** after 3000 ms the response is 400 with `{ success: false, functionName: "ToNumber", code: "execution_budget_exceeded", error: "Execution exceeded the 3000ms budget and was aborted" }`

#### Scenario: Waiting behind a runaway trace

- **WHEN** two requests arrive together and the first never returns
- **THEN** the second is also answered 400 with `code: "execution_budget_exceeded"` and is never run

#### Scenario: Waiting with budget to spare

- **WHEN** two quick requests arrive together
- **THEN** the second runs after the first and both are answered 200

### Requirement: Worker isolation

Traces SHALL run one at a time on a worker separate from the thread that serves HTTP, so an input that never returns cannot stop the service from answering other requests. A worker that is killed or dies MUST be replaced, and later requests are served by the replacement.

#### Scenario: Runaway trace in progress

- **WHEN** `/healthz` or `/functions` is requested while a trace that never returns is running
- **THEN** it is answered 200 at once

#### Scenario: After a killed trace

- **WHEN** a trace was killed for exceeding its budget
- **THEN** a later request is served with `success: true`

#### Scenario: After a worker crash

- **WHEN** the worker died while running a trace
- **THEN** a later request is served with `success: true`

### Requirement: Queue limit

While one trace runs, at most two more requests SHALL wait for the worker; the number is fixed and not configurable through the environment. A valid request that arrives while two are already waiting MUST be answered at once with 429, a `Retry-After: 1` header and `{ success: false, functionName, code: "trace_worker_busy", error }`.

#### Scenario: Burst of five

- **WHEN** five requests arrive together and the first never returns
- **THEN** the fourth and fifth are answered at once with 429, `Retry-After: 1`, `code: "trace_worker_busy"` and `error` of `Trace worker is busy (2 requests already queued)`

#### Scenario: Equality request turned away

- **WHEN** an equality request is turned away
- **THEN** the body's `functionName` is `BinaryExpression`

### Requirement: Memory limit

A trace worker SHALL be limited to a 256 MB heap, a fixed value that is not configurable through the environment. A trace that exceeds it MUST end with the worker terminated and the request answered as an internal failure, while the service itself keeps running.

#### Scenario: Input that allocates past the limit

- **WHEN** `ToString` is requested with `input` of `'a'.repeat(2 ** 29 - 24)`
- **THEN** the response is 500 with `code: "internal_error"`
- **AND** the next request is served with `success: true`

### Requirement: Internal failure

A failure of the service itself while running a trace — a worker that dies, cannot start or reports an unexpected error — SHALL be answered with 500 and `{ success: false, functionName, code: "internal_error", error: "Trace execution failed" }`. The cause MUST NOT appear in the response.

#### Scenario: Worker fails with internal detail

- **WHEN** a type-conversion run fails with an error that mentions an internal path
- **THEN** the response is 500 with `code: "internal_error"` and `error: "Trace execution failed"`
- **AND** the body does not contain the path

#### Scenario: Equality request fails

- **WHEN** an equality run fails inside the service
- **THEN** the response is 500 with `functionName: "BinaryExpression"`

#### Scenario: Worker cannot start

- **WHEN** the worker dies before it is ready to run traces
- **THEN** every request waiting for it is answered 500

### Requirement: Spec text endpoint

`GET /spec/:functionName` SHALL answer 200 with `Content-Type: text/html; charset=utf-8` and a body made of rendered `<emu-clause>` elements, one per algorithm the entry point can reach, in a fixed reading order, each with the algorithm's name as its `id`. The body is a fragment, not a whole document. A clause whose algorithm has a published counterpart MUST carry, in its heading, a link to it under `https://262.ecma-international.org/`.

#### Scenario: Type-conversion operation

- **WHEN** `/spec/ToNumber` is requested
- **THEN** the response is 200 with an HTML body whose first element is `<emu-clause id="ToNumber"`
- **AND** the body also holds the clauses `StringToNumber` and `ToPrimitive`

#### Scenario: Link to the published specification

- **WHEN** `/spec/ToBoolean` is requested
- **THEN** the clause heading holds a link to `https://262.ecma-international.org/#sec-toboolean` with `rel="noopener noreferrer"` and `aria-label="Open ToBoolean in ECMAScript specification"`

#### Scenario: Whole binary expression

- **WHEN** `/spec/BinaryExpression` is requested
- **THEN** the body begins with the `IsLooselyEqual` clause and also holds `IsStrictlyEqual`, `AbstractRelationalComparison` and `ApplyStringOrNumericBinaryOperator`

### Requirement: Spec availability

Spec text SHALL be served for every name in `available_functions`, for the four algorithms the equality endpoint traces and for `BinaryExpression`, and for nothing else. Any other name — names are matched case-sensitively, and an algorithm that only appears inside another entry's text is not an entry — MUST be answered with 404 and `{ error: "No spec available for \"<name>\"" }`.

#### Scenario: Equality algorithm

- **WHEN** `/spec/IsLooselyEqual` is requested
- **THEN** the response is 200 with a body containing `IsLooselyEqual`

#### Scenario: Unknown name

- **WHEN** `/spec/NotAnOperation` is requested
- **THEN** the response is 404 with `{ error: "No spec available for \"NotAnOperation\"" }`

#### Scenario: Sub-algorithm or different case

- **WHEN** `/spec/Get` or `/spec/tonumber` is requested
- **THEN** the response is 404

### Requirement: Spec step anchors

For algorithms whose clauses carry step ids, a trace step `hint` that begins `Step <label>` SHALL have a matching element with id `<algoId>-step-<label>` in the spec text, where `<algoId>` is the algorithm the step belongs to and `<label>` is a step label such as `6`, `2a` or `2b-iv`. A hint without such a prefix has no anchor.

#### Scenario: Top-level step

- **WHEN** `ToNumber` is traced with `input` of `'42'` and a step's `hint` begins `Step 6`
- **THEN** `/spec/ToNumber` contains an element with id `ToNumber-step-6`

#### Scenario: Lettered step of a sub-algorithm

- **WHEN** `ToNumber` is traced with `input` of `{ valueOf: () => '1' }` and its nested `ToPrimitive` run has a step whose `hint` begins `Step 2a`
- **THEN** `/spec/ToNumber` contains an element with id `ToPrimitive-step-2a`

### Requirement: Spec response caching

A 200 response of `/spec/:functionName` SHALL carry `Cache-Control: public, max-age=3600` when `NODE_ENV` is `production`. In any other environment it MUST carry `Cache-Control: no-store`.

#### Scenario: Outside production

- **WHEN** `/spec/ToBoolean` is requested and `NODE_ENV` is not `production`
- **THEN** the `Cache-Control` header is `no-store`

#### Scenario: Production

- **WHEN** `/spec/ToBoolean` is requested and `NODE_ENV` is `production`
- **THEN** the `Cache-Control` header is `public, max-age=3600`

### Requirement: Configuration

The service SHALL read `PORT` (default 8080), `HOST` (default `0.0.0.0`), `MAX_TIMEOUT_MS` (default 5000), `MAX_SOURCE_LENGTH` (default 20000) and `LOG_LEVEL` (default `info`) from the environment, converting numeric settings from their text form. A numeric setting whose value is not a number MUST stop the service from starting, with an error that begins `Invalid environment`.

#### Scenario: Empty environment

- **WHEN** none of the variables is set
- **THEN** the service runs with `PORT` 8080, `HOST` `0.0.0.0`, `MAX_TIMEOUT_MS` 5000, `MAX_SOURCE_LENGTH` 20000 and `LOG_LEVEL` `info`

#### Scenario: Numeric text

- **WHEN** `MAX_TIMEOUT_MS` is `1500` and `MAX_SOURCE_LENGTH` is `500`
- **THEN** the budget is 1500 ms and the input limit is 500 characters

#### Scenario: Value that is not a number

- **WHEN** `MAX_TIMEOUT_MS` is `soon`
- **THEN** the service does not start and reports `Invalid environment`

### Requirement: Process lifecycle

The service SHALL listen on `HOST` and `PORT` and exit with status 1 when it cannot bind, and it begins starting its trace worker at startup rather than on the first request. On `SIGTERM` or `SIGINT` it MUST close the server, stop the trace worker and exit with status 0.

#### Scenario: Orderly shutdown

- **WHEN** the process receives `SIGTERM`
- **THEN** the server is closed, the trace worker is stopped and the process exits with status 0
