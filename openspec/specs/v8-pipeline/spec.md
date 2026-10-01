# v8-pipeline Specification

## Purpose

The `/v8-pipeline` page: one JavaScript snippet is run through V8 once per compilation stage, and the page shows what each stage produced — tokens, AST, bytecode, the machine code of the three JIT tiers and the optimization and deoptimization events — as a row of tabs beside the editor.

## Requirements

### Requirement: Stage list

The page SHALL offer seven stages as tabs, in this order, each labelled with its name and its tier: Tokens (Lexer), AST (Parser), Bytecode (Ignition), Sparkplug (Baseline JIT), Maglev (Mid-tier JIT), TurboFan (Opt JIT), Deopts (Runtime). Tokens is selected when the page opens. Selecting a tab MUST only change which stage is shown; it never starts a run.

#### Scenario: Page opens

- **WHEN** `/v8-pipeline` is opened
- **THEN** the heading `V8 Compilation Pipeline` and the seven tabs are shown in the order above
- **AND** the Tokens tab is selected

#### Scenario: Switching stages after a run

- **WHEN** a run has finished and the Bytecode, Sparkplug, Maglev, TurboFan and Deopts tabs are selected one after the other
- **THEN** each becomes the selected tab in turn
- **AND** no request is sent

### Requirement: Starting source

The editor SHALL open with a built-in sample rather than empty: a function `add(a, b)` called 400 times in a loop, followed by commented-out lines that call it more often or force optimization with `%PrepareFunctionForOptimization` and `%OptimizeFunctionOnNextCall`.

#### Scenario: First visit

- **WHEN** the page opens
- **THEN** the editor holds the `add` sample and no stage has a result

### Requirement: Intrinsic completion in the editor

The editor SHALL be the same one the playground uses, and offer the `%` completions for V8 intrinsics that the `playground` capability specifies.

#### Scenario: Typing a percent sign

- **WHEN** `%` is typed in the editor
- **THEN** completions labelled `%<Name>` are offered, `%OptimizeFunctionOnNextCall` among them

### Requirement: Starting a run

A run SHALL start when the `Run` button is pressed or Ctrl/Cmd+Enter is pressed inside the editor, using the source in the editor at that moment. While a run is in progress the button MUST read `Running` and be disabled, and it returns to `Run` once every request of the run has settled. The keyboard shortcut is not disabled during a run.

#### Scenario: Button while running

- **WHEN** `Run` is pressed
- **THEN** the button reads `Running` and cannot be pressed until every stage's request has settled

#### Scenario: Shortcut in the editor

- **WHEN** Ctrl/Cmd+Enter is pressed with the cursor in the editor
- **THEN** a run starts as if `Run` had been pressed

#### Scenario: Shortcut while a run is in progress

- **WHEN** Ctrl/Cmd+Enter is pressed in the editor before the current run has settled
- **THEN** a second run starts alongside the first, with its own six requests

### Requirement: Per-stage engine requests

A run SHALL send six requests at once to `POST /api/run` (see `frontend-api-proxy`), all for engine `v8` with the same source, one per stage, with these flags: AST `--print-ast`; Bytecode `--print-bytecode`; Sparkplug `--print-code`; Maglev `--print-maglev-code`; TurboFan `--print-opt-code`; Deopts `--trace-opt` and `--trace-deopt`. Every request MUST also carry `--allow-natives-syntax`. The Tokens stage sends no request.

#### Scenario: One run

- **WHEN** a run starts with the source `function f(){}`
- **THEN** exactly six requests are sent, each with engine `v8`, that source and the flags of one stage

#### Scenario: Natives syntax

- **WHEN** any of the six requests is inspected
- **THEN** its flags include `--allow-natives-syntax`

### Requirement: Stage status indicators

Each tab SHALL carry an indicator of its stage's last outcome. No tab has one before the first run. During a run each engine stage shows a loading indicator until its own request settles, independently of the others. Afterwards a stage shows a success indicator when it produced stdout, an error indicator when it produced stderr and no stdout, and none when it produced neither. The Tokens tab shows the success indicator when the source that was run is not empty.

#### Scenario: Before the first run

- **WHEN** the page has just opened
- **THEN** no tab shows an indicator

#### Scenario: Stage produced output

- **WHEN** the Bytecode request returns stdout
- **THEN** the Bytecode tab shows the success indicator

#### Scenario: Stage wrote to both streams

- **WHEN** a stage's request returns stdout `code` and stderr `a warning`
- **THEN** its tab shows the success indicator

#### Scenario: Stage produced only stderr

- **WHEN** the TurboFan request returns no stdout and stderr `SyntaxError: Unexpected token`
- **THEN** the TurboFan tab shows the error indicator

#### Scenario: Tier never reached

- **WHEN** the Maglev request returns neither stdout nor stderr
- **THEN** the Maglev tab shows no indicator

#### Scenario: Empty source

- **WHEN** a run starts with an empty editor
- **THEN** the Tokens tab shows no indicator

### Requirement: Tokens stage

The Tokens stage SHALL be computed in the browser, when a run starts, from the source being run. Before the first run it shows `⌘↵ to run`. Afterwards it shows a table with the columns `#`, `Kind` and `Value`, one numbered row per token in source order with whitespace left out, or `No tokens found` when there is no row to show. A value longer than 80 characters MUST be cut to its first 77 characters followed by `…`.

#### Scenario: Before the first run

- **WHEN** the page has just opened and the Tokens tab is selected
- **THEN** the stage shows `⌘↵ to run` and no table

#### Scenario: After a run

- **WHEN** `const x = 42` is run
- **THEN** the table lists, in order, Keyword `const`, Identifier `x`, Operator `=` and NumericLiteral `42`, numbered 1 to 4

#### Scenario: Source edited after a run

- **WHEN** the source is changed after a run and no new run is started
- **THEN** the table still shows the tokens of the source that was run

#### Scenario: Empty source

- **WHEN** an empty editor is run
- **THEN** the stage shows `No tokens found`

#### Scenario: Source of whitespace only

- **WHEN** a source consisting only of spaces or line breaks is run
- **THEN** the stage shows `No tokens found`
- **AND** the Tokens tab shows the success indicator

### Requirement: Token classification

Each token SHALL be given one kind — Keyword, Identifier, NumericLiteral, StringLiteral, TemplateLiteral, RegExpLiteral, Operator, Punctuator, LineComment or BlockComment — by a tokenizer that approximates V8's lexer and does not call the engine. The operators `===`, `!==`, `**=`, `>>>` and `...` MUST be matched whole, ahead of any two-character operator; no other operator longer than two characters is. A character the tokenizer does not recognize is left out of the table.

#### Scenario: Keyword prefix inside an identifier

- **WHEN** `constant` is run
- **THEN** it is listed as one Identifier

#### Scenario: Three-character operator

- **WHEN** `a === b` is run
- **THEN** `===` is listed as one Operator, not as `==` and `=`

#### Scenario: String and template literals

- **WHEN** `"hi"` and `` `t` `` are run
- **THEN** each is listed as a single token, quotes included

#### Scenario: Comments

- **WHEN** a source contains `// c` and `/* c */`
- **THEN** they are listed as LineComment and BlockComment

#### Scenario: Slash after an operator and after an operand

- **WHEN** `x = /ab+c/gi` and `a / b` are run
- **THEN** `/ab+c/gi` is listed as one RegExpLiteral and the `/` between `a` and `b` as an Operator

#### Scenario: Natives-syntax call

- **WHEN** `%OptimizeFunctionOnNextCall(add);` is run
- **THEN** `%` is listed as an Operator and `OptimizeFunctionOnNextCall` as an Identifier

#### Scenario: Operator the tokenizer splits

- **WHEN** `a ??= b` is run
- **THEN** `??` and `=` are listed as two Operators

#### Scenario: Character outside the tokenizer's alphabet

- **WHEN** `café` is run
- **THEN** the table lists the Identifier `caf` and nothing for `é`

### Requirement: Engine stage output

The AST, Bytecode, Sparkplug, Maglev and TurboFan stages SHALL each show the stdout of their own request as a syntax-highlighted listing with a copy control, never as a diff against an earlier run. A stage with no stdout MUST show `⌘↵ to run` instead — before the first run, while its request is in flight and after a run in which it printed nothing alike.

#### Scenario: Bytecode of the sample

- **WHEN** the starting sample is run and the Bytecode tab is selected
- **THEN** the listing contains V8 bytecode mnemonics such as `Ldar`, `Star` or `Return`

#### Scenario: AST of the sample

- **WHEN** the starting sample is run and the AST tab is selected
- **THEN** the listing contains V8's AST dump, with node names such as `FUNC`, `RETURN` or `LITERAL`

#### Scenario: Stage that printed nothing

- **WHEN** a run has finished and the Maglev request returned no stdout
- **THEN** the Maglev stage shows `⌘↵ to run`

### Requirement: Opcode reference in listings

Tokens in the AST and Bytecode listings SHALL be clickable the way the `playground` capability specifies for V8 listings (its opcode reference): a token the V8 reference knows opens a popover describing it. The Sparkplug, Maglev and TurboFan listings MUST NOT offer this.

#### Scenario: Bytecode mnemonic

- **WHEN** `Ldar` is clicked in the Bytecode listing
- **THEN** a popover describing it opens

#### Scenario: Machine-code listing

- **WHEN** text in the Maglev listing is clicked
- **THEN** no popover opens

### Requirement: Stage tips

The Tokens, Sparkplug, Maglev and TurboFan stages SHALL show a line starting with `Tip:` above their content at all times, whether or not anything has been run: Tokens says its tokenizer runs in the browser and only approximates V8's lexer; the three JIT stages say how hot a function has to be before that tier compiles it. AST, Bytecode and Deopts have no tip.

#### Scenario: Cold function on the TurboFan stage

- **WHEN** a snippet whose functions never get hot is run and the TurboFan tab is selected
- **THEN** the stage shows `Tip: The optimizing JIT only processes very hot, type-stable functions. Add a loop that calls your function ~10 000+ times.`

#### Scenario: Maglev and Sparkplug

- **WHEN** the Maglev or the Sparkplug tab is selected
- **THEN** Maglev shows `Tip: The JIT mid-tier compiler only processes hot functions. Add a loop that calls your function ~500+ times.`
- **AND** Sparkplug shows a tip that it compiles bytecode directly to machine code after a function has been interpreted a few times (~dozens of calls)

### Requirement: Stage error output

When an engine stage's request returns stderr and no stdout, the stage SHALL show that stderr text as an alert above its content. Stderr that arrives together with stdout MUST NOT be shown, except on the Deopts stage, where it is parsed for events.

#### Scenario: Only stderr

- **WHEN** a stage's request returns no stdout and stderr `SyntaxError: Unexpected token`
- **THEN** the stage shows an alert with `SyntaxError: Unexpected token`

#### Scenario: Both streams

- **WHEN** the Bytecode request returns stdout `code` and stderr `a warning`
- **THEN** the stage shows the listing of `code` and no alert

### Requirement: Diagnostic line removal

Every line containing `Concurrent maglev has been disabled for tracing.` SHALL be removed from the stdout and stderr of every stage, and the remaining text trimmed, before anything else is derived from it. A stage whose output consisted only of that line counts as having produced nothing.

#### Scenario: Notice ahead of the output

- **WHEN** a stage returns `Concurrent maglev has been disabled for tracing.` followed by `real output` on the next line
- **THEN** the stage shows `real output` only

#### Scenario: Notice in the middle

- **WHEN** a stage returns the lines `first`, the notice and `last`
- **THEN** the stage shows `first` and `last` on consecutive lines

#### Scenario: Notice was all there was

- **WHEN** the Maglev request returns only the notice
- **THEN** the Maglev stage shows `⌘↵ to run` and its tab has no indicator

### Requirement: Deopts stage

The Deopts stage SHALL read its request's stdout followed by its stderr as a V8 trace and show, first, a summary — `N optimized`, `N deoptimized`, `N IC` when there is at least one, and `deopted:` with the distinct names of the deoptimized functions when there are any — and then one row per event in output order, labelled `OPT`, `DEOPT` or `IC`, with the function name, source location and reason the event carries.

#### Scenario: Function optimized, then deoptimized

- **WHEN** the output holds a `marking … for optimization`, a `compiling method` and an `optimizing` line for `add`, then `[deoptimizing (DEOPT eager): begin 0x3e2 <JSFunction add …>` followed by `;;; deoptimize at <stdin>:3:10, reason: Insufficient type feedback for binary operation`
- **THEN** the summary reads `3 optimized`, `1 deoptimized` and `deopted: add`
- **AND** three `OPT` rows for `add` are followed by one `DEOPT·eager` row for `add` at `stdin:3:10` with the reason `Insufficient type feedback for binary operation`

#### Scenario: Output without events

- **WHEN** the request returned text in which no line is recognized as an event
- **THEN** the stage shows `No optimization or deoptimization events. Try a hot loop (e.g. call a function a few hundred times) so V8 tiers it up — then feed it a changing type to force a deopt.`

#### Scenario: No output

- **WHEN** nothing has been run yet, the request is still in flight, or it returned neither stdout nor stderr
- **THEN** the stage shows `Run to trace optimization and deoptimization events. Deopts happen when V8 has to throw away optimized code — usually because a value’s type changed from what the optimizer assumed.`

### Requirement: Trace line classification

Each non-blank trace line SHALL be classified without regard to case, first match winning: a deoptimization when it contains `deoptimizing`, `bailout` or `;;; deoptimize`; an optimization when it contains `optimizing`, `for optimization` or `compiling method`; an inline-cache event when it starts with `[` and contains a word ending in `IC`. Any other line MUST be ignored.

#### Scenario: Optimization lines

- **WHEN** the output is `[marking 0x3e2 <JSFunction add (sfi = 0x1)> for optimization to TURBOFAN, …]`, `[compiling method 0x3e2 <JSFunction add> (target TURBOFAN)]` and `[optimizing 0x3e2 <JSFunction add> - took 0.1, 0.2, 0.3 ms]`
- **THEN** three optimization events for `add` are shown

#### Scenario: Inline-cache line

- **WHEN** the output is `[LoadIC in 0x1 <JSFunction add> (MONOMORPHIC->POLYMORPHIC) map 0x2]`
- **THEN** one `IC` row for `add` is shown with `MONOMORPHIC->POLYMORPHIC`

#### Scenario: Noise

- **WHEN** the output is `hello world` and `random d8 output`
- **THEN** no event is shown

#### Scenario: Snippet prints a matching word

- **WHEN** the snippet itself prints `I am optimizing my code`
- **THEN** that line is shown as an `OPT` row without a function name

### Requirement: Deoptimization continuation lines

A deoptimization line that names no function and either starts with `;;;` or contains `deoptimize at` SHALL be merged into the deoptimization directly before it instead of becoming an event of its own, supplying the reason and the location that event does not have yet. When the preceding event is not a deoptimization, the line becomes its own event.

#### Scenario: Continuation line

- **WHEN** a `[deoptimizing …]` line for `add` is followed by `;;; deoptimize at <stdin>:3:10, reason: Insufficient type feedback for binary operation`
- **THEN** one deoptimization of `add` is shown, with the location `stdin:3:10` and that reason

### Requirement: Trace event details

For each event the page SHALL take the function name from `<JSFunction name` or `<JS Function name`; the reason from the text after `reason:` to the end of the line, less a closing `]`; the location from `at file:line:column`, shown without angle brackets around the file; and, for a deoptimization, the bailout kind `eager`, `lazy` or `soft`, shown as `DEOPT·kind`. An inline-cache event shows its parenthesized state or transition as its reason. A detail the line lacks is left out.

#### Scenario: Reason on an optimization

- **WHEN** a line ends with `reason: hot and stable]`
- **THEN** its row shows the reason `hot and stable`

#### Scenario: Location in angle brackets

- **WHEN** a deoptimization carries `at <stdin>:3:10`
- **THEN** its row shows `stdin:3:10`

#### Scenario: Line without a function

- **WHEN** an event line names no function
- **THEN** its row shows the label and whatever other details were found, and no name

### Requirement: Run failure alert

When at least one request of a run fails — a non-2xx answer, a body whose `ok` is not true, or a network error — the page SHALL show a single alert above the editor and the stages once every request has settled. A rate-limited (429) failure MUST take precedence; otherwise the first failure to arrive is the one described. The alert is removed when the next run starts. A stage whose request failed without output shows no indicator, and stages that succeeded still show their output.

#### Scenario: Mixed failures

- **WHEN** one request of a run fails with 500 and another with 429
- **THEN** the alert shows the rate-limit message

#### Scenario: Next run succeeds

- **WHEN** a run that ended with an alert is followed by a run in which every request succeeds
- **THEN** no alert is shown

#### Scenario: Every request succeeds

- **WHEN** all six requests of a run succeed
- **THEN** no alert is shown

### Requirement: Run failure wording

The alert SHALL read `Too many runs — the rate limit kicked in. Try again in N seconds.` for a 429, with `N` taken from the body's `meta.retryAfter` or else the `Retry-After` header, and `Try again in a moment.` when neither gives a positive number; `Could not reach the engine service: <message>` when the request itself failed; and `Run failed (HTTP <status>): <message>` otherwise, where `<message>` is the response's `error` or else `HTTP <status>`.

#### Scenario: Rate limited with a delay

- **WHEN** a request is answered 429 with `meta.retryAfter` of 5
- **THEN** the alert reads `Too many runs — the rate limit kicked in. Try again in 5 seconds.`

#### Scenario: Delay of one second

- **WHEN** a request is answered 429 with a `Retry-After` header of `1`
- **THEN** the alert ends with `Try again in 1 second.`

#### Scenario: Rate limited without a delay

- **WHEN** a request is answered 429 with no retry delay
- **THEN** the alert reads `Too many runs — the rate limit kicked in. Try again in a moment.`

#### Scenario: Engine unavailable

- **WHEN** a request is answered 502 with `error: "engine unavailable"`
- **THEN** the alert reads `Run failed (HTTP 502): engine unavailable`

#### Scenario: Unparseable error body

- **WHEN** a request is answered 500 with a body that is not JSON
- **THEN** the alert reads `Run failed (HTTP 500): HTTP 500`

#### Scenario: Network failure

- **WHEN** a request fails with `Failed to fetch`
- **THEN** the alert reads `Could not reach the engine service: Failed to fetch`

### Requirement: Truncated output and dropped flags

The page SHALL show a stage's output exactly as returned when the response reports it as truncated (`meta.outputTruncated`) or reports dropped flags (`meta.droppedFlags`): neither condition produces a notice on this page.

#### Scenario: Stage output hit the size cap

- **WHEN** a stage's request returns partial stdout with `meta.outputTruncated: true`
- **THEN** the stage shows the partial output and its tab the success indicator
- **AND** nothing on the page says the output was truncated

### Requirement: Page state lifetime

The source, the selected stage and the results SHALL live only in the open page: nothing is read from or written to the URL or browser storage.

#### Scenario: Reload after a run

- **WHEN** the source has been edited and run, and the page is reloaded
- **THEN** the editor holds the starting sample again, the Tokens tab is selected and no stage has a result or an indicator
