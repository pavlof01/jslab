# spec-visualizer Specification

## Purpose

The `/type-conversion` and `/equality` pages: one shared step-through of ECMAScript abstract operations. The person enters an expression, the page obtains its trace and plays it back step by step as a tree of algorithm calls beside the ECMA-262 clauses those steps come from.

## Requirements

### Requirement: Two pages, one visualizer

`/type-conversion` SHALL open on the operation `ToNumber` with the expression `{ valueOf: () => "1" }`, and `/equality` on the expression `[] == !{}`. Both show the same screen: an expression field labelled `your expression` (accessible name `Expression to trace`), a `trace` button, preset expressions, a step counter with `prev`, `play` and `next`, the spec pane and the call tree. Only `/type-conversion` MUST show the operation picker.

#### Scenario: Type-conversion page

- **WHEN** `/type-conversion` is opened
- **THEN** the field holds `{ valueOf: () => "1" }` and a picker named `Abstract operation to trace` is shown

#### Scenario: Equality page

- **WHEN** `/equality` is opened
- **THEN** the field holds `[] == !{}` and no operation picker is shown

### Requirement: Input guidance

Each page SHALL show a hint under the field saying what it accepts, and use its first preset as the field's placeholder. `/equality`: `two literals and an operator — == != === !== < > <= >= + over numbers, strings, booleans, null, undefined, arrays, objects`. `/type-conversion`: `one literal to convert — a number, string, boolean, null, undefined, array, or an object literal (methods like valueOf / toString included)`.

#### Scenario: Field emptied on the equality page

- **WHEN** the field on `/equality` is cleared
- **THEN** it shows the placeholder `[] == ![]` and the hint stays visible

### Requirement: Server-rendered first trace

On each page request the server SHALL ask the trace service (`TRACE_SERVICE_URL`, default `http://localhost:8085`) for the operation catalog, the spec text of the page's default operation and the trace of its default expression, and render the page with them, so the first trace is on screen without any trace request from the browser. A result whose trace succeeded MUST be reused for 5 minutes, separately per page; one whose trace failed is not reused.

#### Scenario: Healthy trace service

- **WHEN** `/type-conversion` is opened and the trace service answers
- **THEN** the step counter, the call tree, the result and the spec text are present on load
- **AND** the browser sends no trace, spec or catalog request

#### Scenario: Equality prefetch

- **WHEN** `/equality` is rendered
- **THEN** the server posts `{ input: "[] == !{}" }` to the trace service's `/execute/equality` and reads `/spec/BinaryExpression`

#### Scenario: Second request within five minutes

- **WHEN** the same page is requested again within 5 minutes of a successful prefetch
- **THEN** it is rendered from the earlier result and the trace service is not called

#### Scenario: Six minutes later

- **WHEN** the page is requested 6 minutes after a successful prefetch
- **THEN** the trace service is asked again

#### Scenario: Prefetch whose trace failed

- **WHEN** the trace request of a prefetch fails and the page is requested again
- **THEN** the trace service is asked again

### Requirement: Degraded first load

Each of the three server-side requests SHALL be allowed to fail on its own without failing the page. With no catalog the browser requests `GET /api/trace/functions` after load and fills the picker when the answer lists operations; with no spec text it requests `GET /api/spec/<operation>`; with a failed trace the page is rendered with the failure's message as its error and no trace, and the browser requests the trace 150 ms after load (routes: see `frontend-api-proxy`).

#### Scenario: Trace service unreachable

- **WHEN** every request to the trace service fails with `ECONNREFUSED`
- **THEN** the page still renders with the field and the default expression, the error `ECONNREFUSED` and an empty spec pane, and on `/type-conversion` a picker without options
- **AND** the browser then requests the trace, the spec text and the catalog itself

#### Scenario: Trace service answers with an error message

- **WHEN** the prefetched trace is answered 400 with `error: "execution budget exceeded"`
- **THEN** the page is rendered with the error `execution budget exceeded` and no trace

#### Scenario: Error answer without a message

- **WHEN** the prefetched trace is answered 503 with an empty body
- **THEN** the error shown is the status text, `Service Unavailable`

#### Scenario: Success flag is false

- **WHEN** the prefetched trace is answered 200 with `success: false` and no `error`
- **THEN** the error shown is `trace-service returned failure`

#### Scenario: Only the catalog fails

- **WHEN** the catalog request fails and the trace request succeeds
- **THEN** the page is rendered with the trace and a picker without options, which the browser fills after load

#### Scenario: Browser cannot reach the trace routes either

- **WHEN** `/equality` is opened while every request to `/api/trace/execute/` is failing
- **THEN** the expression field is still shown

### Requirement: Committing an expression

Typing in the field SHALL NOT request a trace. An expression is committed by pressing Enter in the field, pressing `trace` or picking a preset, and every commit MUST lead to a trace request, including one that repeats the expression already traced.

#### Scenario: Typing without committing

- **WHEN** the field's text is changed to `'99'` and nothing else is done
- **THEN** no request is sent and the trace on screen stays as it was

#### Scenario: Enter in the field

- **WHEN** `[] + {}` is typed on `/equality` and Enter is pressed
- **THEN** a trace of `[] + {}` is requested

#### Scenario: Same expression again

- **WHEN** `trace` is pressed twice in a row without changing the field
- **THEN** each press leads to a trace request

### Requirement: Presets

After the label `try` the page SHALL list five preset expressions. `/equality`: `[] == ![]`, `"0" == false`, `null == undefined`, `NaN === NaN`, `[] + {}`. `/type-conversion`: `{ valueOf: () => "1" }`, `"42"`, `[]`, `true`, `" "`. Picking one puts it in the field and commits it. The preset equal to the last committed expression MUST be marked as pressed.

#### Scenario: Picking a preset

- **WHEN** `[] == ![]` is picked on `/equality`
- **THEN** the field holds `[] == ![]`, the preset is marked as pressed and the trace arrives with the result `true`

#### Scenario: Presets on first load

- **WHEN** each page has just opened
- **THEN** on `/type-conversion` the preset `{ valueOf: () => "1" }` is marked as pressed
- **AND** on `/equality` no preset is, because `[] == !{}` is not among them

### Requirement: Operation picker

The picker on `/type-conversion` SHALL list the operation names of the catalog, as delivered. Choosing one MUST load that operation's spec text from `GET /api/spec/<operation>` into the spec pane and request a trace of the last committed expression under the new operation.

#### Scenario: Switching to ToString

- **WHEN** `ToString` is chosen
- **THEN** the spec pane shows the text for `ToString` and a new trace with steps is shown

#### Scenario: Uncommitted text in the field

- **WHEN** the field has been edited but not committed and another operation is chosen
- **THEN** the trace requested is of the last committed expression, not of the text in the field

#### Scenario: Spec text cannot be loaded

- **WHEN** the spec request for the chosen operation fails
- **THEN** the spec pane is left empty

### Requirement: Trace request

A trace SHALL be requested 150 ms after the latest commit or operation change, so that several of them inside that window produce one request: `POST /api/trace/execute/type-conversion` with `{ functionName, input }`, or `POST /api/trace/execute/equality` with `{ input }` (see `frontend-api-proxy`). While a request is in flight the button MUST read `tracing…` and be disabled; the field stays editable and the previous trace stays on screen.

#### Scenario: Type-conversion request

- **WHEN** `'42'` is committed with `ToNumber` selected
- **THEN** the body posted to `/api/trace/execute/type-conversion` is `{ functionName: "ToNumber", input: "'42'" }`

#### Scenario: Equality request

- **WHEN** `[] == ![]` is committed on `/equality`
- **THEN** the body posted to `/api/trace/execute/equality` is `{ input: "[] == ![]" }`

#### Scenario: Button after the answer

- **WHEN** `trace` is pressed and the answer has arrived
- **THEN** the button reads `trace` again and can be pressed

### Requirement: Superseded responses

Only the answer to the most recent trace request SHALL be shown. An answer to an earlier request that arrives later, whether a trace or a failure, MUST be discarded.

#### Scenario: Slow first answer

- **WHEN** a second request is answered before the first, and the first answer arrives afterwards
- **THEN** the trace and result of the second request stay on screen

#### Scenario: Late failure

- **WHEN** an earlier request fails after a later one has succeeded
- **THEN** no error is shown

### Requirement: Successful trace

A successful answer SHALL replace what was shown: the call tree is rebuilt, playback is stopped and returned to the first step, the result the service reports is shown beside the field as `⟶ value`, and the spec pane's header names the algorithm the service reports as the one actually run.

#### Scenario: The + operator

- **WHEN** `[] + {}` is committed on `/equality`
- **THEN** the result reads `"[object Object]"` and `ApplyStringOrNumericBinaryOperator` is named on the page

#### Scenario: Retracing a different expression

- **WHEN** `'42'` and then `{ valueOf: () => 7 }` are committed on `/type-conversion`
- **THEN** the result reads `42` after the first and `7` after the second

### Requirement: Value formatting

Values in the result and in the call tree SHALL be written in full, without truncation: `undefined`, `null`, booleans and numbers as in source, with `NaN` and `-0` kept distinct; strings in double quotes; BigInts with an `n` suffix; arrays as JSON; a type tag as `TypeTag(Name)`; a symbol as `Symbol("description")@id` or `Symbol()@id`; an object as `Class(preview)`, as the preview alone when it has no class name, or as `Class#id` when it has no preview.

#### Scenario: Primitive values

- **WHEN** a trace carries the string `hi`, the BigInt `10`, negative zero and the array `[1, "a"]`
- **THEN** they are shown as `"hi"`, `10n`, `-0` and `[1,"a"]`

#### Scenario: Objects

- **WHEN** a trace carries an object of class `Object` with preview `{ a: 1 }`, and one with id `o2` and no preview
- **THEN** they are shown as `Object({ a: 1 })` and `Object#o2`

#### Scenario: Symbols

- **WHEN** a trace carries a symbol with id `s1` and description `tag`, and one with id `s2` and no description
- **THEN** they are shown as `Symbol("tag")@s1` and `Symbol()@s2`

### Requirement: Failed trace

When a trace request is not answered 2xx, is answered without `success: true`, or cannot be made at all, the page SHALL show the failure's message as an alert under the field and remove the previous trace: the result disappears, the step counter reads `00 / 00` and the tree shows `No trace yet — enter an expression to run one.`. The alert MUST be removed when the next trace request starts.

#### Scenario: Expression the equality page cannot parse

- **WHEN** `42` is committed on `/equality`
- **THEN** an alert says a binary expression was expected and names the supported operators, `+` among them
- **AND** the tree shows `No trace yet — enter an expression to run one.`

#### Scenario: Retry after a failure

- **WHEN** a valid expression is committed while an alert is shown
- **THEN** the alert is removed as the request starts

### Requirement: Failure message

The alert SHALL show the `error` text of the response when it has one, whatever the status. Without one it reads `trace-service error <status>` for a non-2xx answer and `trace-service returned failure` for a 2xx answer that does not report success. When the request itself fails, the alert shows the browser's error message, or `Unknown executor error` when the failure carries none.

#### Scenario: Execution budget exceeded

- **WHEN** a trace request is answered 400 with `error: "execution budget exceeded"`
- **THEN** the alert reads `execution budget exceeded`

#### Scenario: Service unavailable without a message

- **WHEN** a trace request is answered 503 with a body that has no `error`
- **THEN** the alert reads `trace-service error 503`

#### Scenario: Error body that is not JSON

- **WHEN** a trace request is answered 502 with a body that is not JSON
- **THEN** the alert reads `trace-service error 502`

#### Scenario: 200 that reports failure

- **WHEN** a trace request is answered 200 with `success: false` and `error: "Unknown function: ToFoo"`
- **THEN** the alert reads `Unknown function: ToFoo`

#### Scenario: Network failure

- **WHEN** the request fails with `Failed to fetch`
- **THEN** the alert reads `Failed to fetch`

### Requirement: Step order and counter

The steps of a trace SHALL be numbered in execution order, depth-first: a step that calls another algorithm is followed by that algorithm's steps before its own next step. The counter shows the current step and the total as two-digit numbers, `NN / MM`, with the accessible name `Step N of M`. `prev` and `next` move one step; `prev` MUST be disabled on the first step and `next` on the last one or when there are no steps.

#### Scenario: Nested call

- **WHEN** a trace has a step, a call whose algorithm has two steps, and a final step
- **THEN** the counter's total is `05` and the two inner steps are steps 3 and 4

#### Scenario: Stepping forward and back

- **WHEN** `next` and then `prev` are pressed
- **THEN** the counter goes up by one and returns to where it was

#### Scenario: Last step

- **WHEN** `next` has been pressed until the last step
- **THEN** `next` is disabled

#### Scenario: No trace

- **WHEN** there is no trace
- **THEN** the counter reads `00 / 00` with the name `Step 0 of 0`, and `prev` and `next` are disabled

### Requirement: Playback

The transport button SHALL read `play`, `pause` while playing, and `replay` when stopped on the last step. Playing advances one step every 650 ms and stops by itself one interval after the last step is reached. Pressing the button on the last step restarts from the first step. Choosing a step by hand — `prev`, `next`, the arrow keys or a click in the tree — and starting a new trace request MUST stop playback.

#### Scenario: Playing

- **WHEN** `play` is pressed on a trace with several steps
- **THEN** the button reads `pause` and the counter increases without further input

#### Scenario: Reaching the end

- **WHEN** the last step has been reached
- **THEN** the button reads `replay`

#### Scenario: Replay

- **WHEN** `replay` is pressed
- **THEN** the counter returns to step 1 and playback starts

#### Scenario: Stepping by hand during playback

- **WHEN** `prev` is pressed while playing
- **THEN** playback stops and the button reads `play` or `replay`

#### Scenario: Nothing to play

- **WHEN** `play` is pressed while there is no trace or the trace has a single step
- **THEN** the button reads `pause`, the counter does not change and playback does not stop by itself

### Requirement: Keyboard control

ArrowRight and ArrowLeft SHALL move one step forward and back, and Space SHALL toggle playback, from anywhere on the page. A key press MUST be ignored when Alt, Ctrl or Meta is held, or when focus is inside a text field, select, button, link, the pane divider or editable content.

#### Scenario: Focus outside the controls

- **WHEN** the step counter has been clicked and ArrowRight, then ArrowLeft, are pressed
- **THEN** the current step moves forward by one and back again

#### Scenario: Focus on a control

- **WHEN** `next` has focus and ArrowRight is pressed
- **THEN** the current step does not change

### Requirement: Call tree

The tree SHALL show one frame per algorithm invocation, in call order and indented by call depth. A frame's header gives the algorithm's name, its arguments in parentheses and its result as `⟶ value`. Under it come one row per condition the algorithm tested — `✓` when taken, `×` when not, the cited step and the condition's text — and at most one action row, `→`: the frame's return or throw with its value, or, when it has neither, its first other step.

#### Scenario: Nested invocation

- **WHEN** `ToNumber` tests one condition and then calls `ToPrimitive`, which returns
- **THEN** the tree shows a `ToNumber` frame with one condition row, and a `ToPrimitive` frame indented under it with an action row

#### Scenario: Hint that cites a step

- **WHEN** a condition carries the hint `Step 1: Type(x) is Object, Type(y) is Boolean — different types, continue.` and no description
- **THEN** its row cites `1` and reads `Type(x) is Object, Type(y) is Boolean — different types, continue.`

#### Scenario: Short clause id as the hint

- **WHEN** a condition carries the hint `3.b.ii` and the description `argument is a String`
- **THEN** its row cites `3.b.ii` and reads `argument is a String`

#### Scenario: Prose hint without a citation

- **WHEN** a condition carries the hint `no clause here, just words` and no description
- **THEN** its row has no citation and reads `no clause here, just words`

### Requirement: Tree follows playback

The tree SHALL reflect the current step: frames that open later and rows that come later are shown as pending, the row of the current step is marked as current and its frame as active, and a frame's result MUST stay hidden until the current step has reached that frame's action row or, lacking one, its last condition row. Clicking a frame selects the step at which the frame opens; clicking a condition row selects that condition's step.

#### Scenario: Frame not yet returned

- **WHEN** the current step is the call that opens the `ToPrimitive` frame
- **THEN** the frame is active and its result is not shown

#### Scenario: Frame's action reached

- **WHEN** the current step is the `ToPrimitive` frame's return
- **THEN** the frame's result is shown

#### Scenario: Clicking a condition row

- **WHEN** a condition row is clicked
- **THEN** that condition becomes the current step and playback stops

#### Scenario: Step without a row

- **WHEN** the current step is a plain step of a frame that is neither a condition nor the frame's action
- **THEN** the counter shows that step, and no row is marked as current

### Requirement: Spec pane

The spec pane SHALL show the ECMA-262 text delivered for the selected operation under the header `ECMA-262 · <algorithm>`, where the algorithm is the one the latest trace reports as run, or else the selected operation. The header's `tc39.es ↗` link MUST open `https://tc39.es/ecma262/#sec-<algorithm, lower-cased>` in a new tab, or `https://tc39.es/ecma262/` when the algorithm is `BinaryExpression`.

#### Scenario: Type conversion

- **WHEN** the latest trace ran `ToNumber`
- **THEN** the header reads `ECMA-262 · ToNumber` and the link opens `https://tc39.es/ecma262/#sec-tonumber`

#### Scenario: Equality with a detected algorithm

- **WHEN** the latest trace on `/equality` reports `IsLooselyEqual`
- **THEN** the header reads `ECMA-262 · IsLooselyEqual` and the link opens `https://tc39.es/ecma262/#sec-islooselyequal`

#### Scenario: Equality without a trace

- **WHEN** the trace on `/equality` has failed
- **THEN** the header reads `ECMA-262 · BinaryExpression` and the link opens `https://tc39.es/ecma262/`

### Requirement: Spec step highlighting

A step whose hint begins with `Step <n>` (`Step 3`, `Step 2a`) SHALL be tied to the element of the spec text whose id is `<algorithm>-step-<n>`. For every algorithm that has had such a step up to the current one, the clause heading and the latest such step are highlighted; the one belonging to the current step's algorithm MUST be marked as the current step. Conditions that were not taken earlier in the current call frame are de-emphasized.

#### Scenario: Stepping into a nested algorithm

- **WHEN** the current step is `Step 2` of `ToPrimitive`, reached from `Step 1` of `ToNumber`
- **THEN** `ToPrimitive-step-2` is marked as the current step, `ToNumber-step-1` is highlighted, and both clause headings are highlighted

#### Scenario: Step without a citation

- **WHEN** the current step's hint does not begin with `Step <n>`
- **THEN** the latest cited step of the same algorithm stays marked as current

#### Scenario: No cited step yet

- **WHEN** no step up to the current one cites a spec step
- **THEN** nothing in the spec pane is highlighted

### Requirement: Panes follow the current step

When the step marked as current in the spec pane changes, that pane SHALL scroll so the step sits in the middle of it. When the current step changes, the tree SHALL scroll just far enough to bring the current row, or else the active frame, back inside a 24 px margin of its edges. Both scroll smoothly, or jump when the person's system asks for reduced motion.

#### Scenario: Current row already in view

- **WHEN** the next step's row is inside the tree's visible area, more than 24 px from its edges
- **THEN** the tree does not scroll

#### Scenario: Reduced motion

- **WHEN** the system setting for reduced motion is on and the current step moves out of view
- **THEN** the panes jump to it without animation

### Requirement: Pane split persistence

At and above the `md` breakpoint (48em) the spec pane and the tree SHALL sit side by side with a draggable divider, the spec pane taking 20% by default, at least 18%, and leaving the tree at least 35%. When a drag ends, the spec pane's share MUST be stored in `localStorage` under `jsl-split-spectrace` and applied on later visits to either page. A stored value that is not a number strictly between 0 and 100 is ignored. Below the breakpoint the panes are stacked, spec first, without a divider.

#### Scenario: Divider dragged

- **WHEN** the divider is dragged so the spec pane takes 30% and the page is reloaded
- **THEN** `jsl-split-spectrace` holds `30` and the spec pane takes 30% again

#### Scenario: Unusable stored value

- **WHEN** `jsl-split-spectrace` holds `0` or text that is not a number
- **THEN** the spec pane takes 20%

### Requirement: Page state lifetime

Apart from the pane split, the page SHALL keep nothing across visits: the expression, the selected operation and the current step are not written to the URL or to browser storage, and each page starts from its own defaults.

#### Scenario: Reload

- **WHEN** another expression has been traced and the page is reloaded
- **THEN** the field holds the page's default expression and its trace is shown from step 1

#### Scenario: Moving between the two pages

- **WHEN** `/equality` is opened after working on `/type-conversion`
- **THEN** it shows `[] == !{}` and its trace, and nothing of the earlier expression
