# playground Specification

## Purpose

The `/playground` page: a person edits one JavaScript snippet, runs it on V8 and any of SpiderMonkey, Hermes and JSC through `POST /api/run`, and reads what each engine printed. It also covers what the page keeps for them — custom samples and run history in the browser's storage — and the share links it issues, which have to keep opening.

## Requirements

### Requirement: Initial state

Opening `/playground` without a share link SHALL start with the two-line snippet `function f(x){ return x + 1 }`, `f(41);` in the editor, V8 as the only selected engine, the V8 flags `--print-bytecode` and `--allow-natives-syntax` selected and diffing on. The code, the selection, the flags and the outputs MUST NOT be kept in browser storage, so a reload returns to this state.

#### Scenario: First visit

- **WHEN** `/playground` is opened
- **THEN** there is one output tab, `V8`, and its pane reads `⌘↵ to run`
- **AND** the status line reads `1 engine · click any opcode for its reference`

#### Scenario: Reload after editing

- **WHEN** the code is edited, Hermes is selected and the page is reloaded
- **THEN** the editor, the selection and the flags are back in the initial state

### Requirement: Engine selection

The page SHALL offer the engines V8, SpiderMonkey, Hermes and JSC, in that order, as toggles. V8 is always selected and its toggle is disabled, with the hint `V8 is always on`. Each selected engine has one output tab, and tabs keep the order above whatever order the engines were selected in.

#### Scenario: V8 is pinned

- **WHEN** the page is opened
- **THEN** the V8 toggle is checked and disabled

#### Scenario: Engine switched on and off

- **WHEN** Hermes is switched on
- **THEN** the tabs are `V8`, `Hermes`
- **AND** switching Hermes off again leaves only `V8`

#### Scenario: Selection order

- **WHEN** JSC is switched on and then Hermes
- **THEN** the tabs are `V8`, `Hermes`, `JSC`

### Requirement: Active tab

Exactly one output tab SHALL be active, V8's at first. Switching off the engine of the active tab MUST move the active tab to the first engine still selected; switching off any other engine leaves the active tab where it is.

#### Scenario: Another engine is switched off

- **WHEN** V8 and Hermes are selected, the V8 tab is active and Hermes is switched off
- **THEN** the V8 tab is still active

#### Scenario: The active tab's engine is switched off

- **WHEN** the Hermes tab is active and Hermes is switched off
- **THEN** the V8 tab becomes active

### Requirement: Running a snippet

The `run` button and ⌘/Ctrl+Enter in the editor SHALL send one `POST /api/run` per selected engine, all at once, each with `{ engine, sourceText, options: { flags } }`: the editor's code and the flags selected for that engine, an empty list when there are none. No timeout is requested. Until every engine has answered, the button reads `running` and is disabled, every tab is marked `…` and the previous output is cleared.

#### Scenario: Each engine gets its own flags

- **WHEN** V8 has `--print-bytecode` selected, Hermes has `-O` and both engines are selected
- **THEN** one request carries `engine: "v8"` with `flags: ["--print-bytecode"]` and the other `engine: "hermes"` with `flags: ["-O"]`

#### Scenario: Engine with no flags selected

- **WHEN** a run goes to JSC and flags are selected for V8 only
- **THEN** the JSC request carries `flags: []`

#### Scenario: Keyboard run

- **WHEN** ⌘/Ctrl+Enter is pressed in the editor
- **THEN** the snippet runs as if `run` had been clicked

#### Scenario: Slow engine

- **WHEN** an engine takes 1.5 seconds to answer
- **THEN** the button reads `running` meanwhile and is enabled again once the answer arrives

### Requirement: Empty editor

A run with an editor holding nothing but whitespace MUST NOT send any request. The message line SHALL read `Nothing to run — the editor is empty.`, and nothing is recorded in history.

#### Scenario: Blank editor

- **WHEN** the editor holds three spaces and `run` is clicked
- **THEN** the message line reads `Nothing to run — the editor is empty.`
- **AND** no request is sent and the history stays as it was

### Requirement: Output pane

The pane of the active tab SHALL show that engine's `stdout`, trimmed of surrounding whitespace, as a syntax-highlighted listing, followed by its trimmed `stderr` as a second listing when that is not empty. Each listing has a control that copies its whole text. Where `stdout` is empty — before the first run and after a run that printed nothing — the pane reads `⌘↵ to run` in its place.

#### Scenario: Engine prints bytecode

- **WHEN** `function add(a, b) { return a + b; } add(1, 2);` is run on V8 with `--print-bytecode`
- **THEN** the V8 pane shows a bytecode listing

#### Scenario: Snippet does not parse

- **WHEN** `function ( { syntax error` is run
- **THEN** the engine's error text is shown in the pane

#### Scenario: Nothing on stdout

- **WHEN** an engine answers with an empty `stdout` and `SyntaxError: nope` in `stderr`
- **THEN** its pane reads `⌘↵ to run` followed by a listing with `SyntaxError: nope`

### Requirement: Tab outcome marker

After a run each tab SHALL be marked `stderr` when its engine's result has `stderr` text and `ok` otherwise. A tab has no marker before the first run, nor has the tab of an engine switched on since the last run. The marker reflects `stderr` only: the tab of an engine whose request failed is marked `ok` as well.

#### Scenario: Engine wrote to stderr

- **WHEN** an engine answers with text in `stderr`
- **THEN** its tab is marked `stderr`

#### Scenario: Engine request failed

- **WHEN** V8 answers normally and the Hermes request is answered with 504
- **THEN** both tabs are marked `ok`

### Requirement: Run timing

After a run the status line SHALL read `Duration: <n> ms`, where n is the largest `meta.durationMs` among the engines' answers, followed by ` · cached` only when every answer had `meta.cacheHit` true. When no answer carried a duration it reads `<n> engine · click any opcode for its reference` (`engines` for more than one), counting the selected engines, as it does before the first run.

#### Scenario: Slowest engine

- **WHEN** V8 reports 40 ms and JSC 120 ms
- **THEN** the status line reads `Duration: 120 ms`

#### Scenario: Every engine served from cache

- **WHEN** the only engine reports 7 ms with `cacheHit: true`
- **THEN** the status line reads `Duration: 7 ms · cached`

#### Scenario: One engine not cached

- **WHEN** V8's answer is a cache hit and JSC's is not
- **THEN** the status line does not say `cached`

### Requirement: Pane footer

Below the output the page SHALL show, for the active tab's engine: its version when one is known, its own `meta.durationMs` as `<n> ms` or `—` when it has none, and the number of flags currently selected for it as `<n> flag` or `<n> flags`, left out at zero.

#### Scenario: Before the first run

- **WHEN** the page is opened and V8's version is known as `14.9.0 (candidate)`
- **THEN** the footer reads `V8 14.9.0 (candidate)`, `—` and `2 flags`

#### Scenario: After a run

- **WHEN** V8 answers with `meta.durationMs` of 12
- **THEN** the footer of the V8 tab reads `12 ms`

### Requirement: Failed engine request

An engine's request SHALL count as failed when its status is not 2xx, its body is not JSON, its body's `ok` is not truthy, or it could not be sent at all. A snippet that fails inside the engine is not a failed request: its answer is `ok: true` with the engine's error in `stderr`. A failure's message MUST go to the message line, never into the output pane.

#### Scenario: Rate limited

- **WHEN** the request is answered with 429 and `{ ok: false, error: "rate limit exceeded" }`
- **THEN** the pane still reads `⌘↵ to run` and `rate limit exceeded` appears nowhere in it

#### Scenario: Engine reports a syntax error

- **WHEN** the answer is 200 with `ok: true` and `stderr` of `SyntaxError: unexpected token`
- **THEN** there is no failure message and the pane shows that `stderr`

### Requirement: Failure message

A failed request SHALL be reported in the message line as `Run failed (HTTP <status>): <error>`, where the error is the body's `error`, or `HTTP <status>` when the body has none or is not JSON. A request that could not be sent is reported as `Could not reach the engine service: <reason>`, and a 429 gets the rate limit message instead.

#### Scenario: Snippet timed out

- **WHEN** the answer is 504 with `{ ok: false, error: "execution timed out" }`
- **THEN** the message line reads `Run failed (HTTP 504): execution timed out`

#### Scenario: Engine unavailable

- **WHEN** the answer is 502 with `{ ok: false, error: "engine unavailable" }`
- **THEN** the message line reads `Run failed (HTTP 502): engine unavailable`

#### Scenario: Answer is not JSON

- **WHEN** the answer is 200 with an HTML body
- **THEN** the message line reads `Run failed (HTTP 200): HTTP 200`

#### Scenario: Network failure

- **WHEN** the request fails with `Failed to fetch`
- **THEN** the message line reads `Could not reach the engine service: Failed to fetch`

### Requirement: Rate limit message

A 429 SHALL be reported as `Too many runs — the rate limit kicked in. Try again in <n> seconds.` (`1 second.` for one), where n is the body's `meta.retryAfter` or, failing that, the response's `Retry-After` header, rounded up to a whole number. When neither is a positive number the message MUST end `Try again in a moment.` instead.

#### Scenario: Delay in the body

- **WHEN** the answer is 429 with `meta.retryAfter` of 7
- **THEN** the message line reads `Too many runs — the rate limit kicked in. Try again in 7 seconds.`

#### Scenario: Delay only in the header

- **WHEN** the answer is 429 with `Retry-After: 3` and no `meta.retryAfter`
- **THEN** the message ends `Try again in 3 seconds.`

#### Scenario: No delay advertised

- **WHEN** the answer is 429 with neither
- **THEN** the message line reads `Too many runs — the rate limit kicked in. Try again in a moment.`

### Requirement: Partial failure

A run on several engines SHALL count as failed only when every engine's request failed. When only some failed, the engines that answered show their output and the run is recorded in history. Either way the message line reports a single failure: a 429 if there is one, otherwise that of the first failed engine in the order V8, SpiderMonkey, Hermes, JSC.

#### Scenario: One engine answers

- **WHEN** V8 answers with a listing and the Hermes request is answered with 504 and `error: "execution timed out"`
- **THEN** the V8 pane shows the listing and the message line reads `Run failed (HTTP 504): execution timed out`
- **AND** the run is recorded in history

#### Scenario: Rate limit among other failures

- **WHEN** V8 is answered with 502 and JSC with 429
- **THEN** the message line shows the rate limit message
- **AND** the run is not recorded in history

### Requirement: Run notices

When a run has no failure to report, the message line SHALL show `Output hit the size cap and is truncated.` if any answer had `meta.outputTruncated` true, and `Flag ignored by this engine: <flag>.` — `Flags ignored by this engine: <flag>, <flag>.` for several — naming each string in the answers' `meta.droppedFlags` once. Both sentences appear, in that order, when both apply. A failure message takes the line in place of any notice.

#### Scenario: Truncated output

- **WHEN** an answer has `meta.outputTruncated: true`
- **THEN** the message line reads `Output hit the size cap and is truncated.`

#### Scenario: Flag refused by the gateway

- **WHEN** an answer has `meta.droppedFlags` of `["--totally-made-up"]`
- **THEN** the message line reads `Flag ignored by this engine: --totally-made-up.`

#### Scenario: Same flag dropped by two engines

- **WHEN** V8 drops `--nope` and `--also-nope` and JSC drops `--nope`
- **THEN** the message line reads `Flags ignored by this engine: --nope, --also-nope.`

#### Scenario: Notice alongside a failure

- **WHEN** V8's answer is truncated and the Hermes request failed
- **THEN** the message line shows the failure message only

### Requirement: Run announcements

The page SHALL keep a polite live region (`role="status"`) that reads `Running…` during a run, the message line's text when the run was refused or every engine failed, and otherwise `Run finished. Duration: <n> ms`, with ` · cached` and any notice appended as in the status and message lines. Without a duration it reads `Run finished. No output timing available.`

#### Scenario: Successful run

- **WHEN** a run finishes in 12 ms
- **THEN** the region reads `Run finished. Duration: 12 ms`

#### Scenario: Empty editor

- **WHEN** a run is refused because the editor is blank
- **THEN** the region reads `Nothing to run — the editor is empty.`

#### Scenario: Partial failure

- **WHEN** V8 answers in 12 ms with truncated output and the Hermes request failed
- **THEN** the region reads `Run finished. Duration: 12 ms Output hit the size cap and is truncated.` and does not mention the failure

### Requirement: Overlapping runs

When a run is started while another is still waiting for answers — the keyboard shortcut stays active during a run — only the most recently started run's results SHALL be shown. Answers of the earlier run that arrive afterwards MUST be discarded, and that run is not recorded in history.

#### Scenario: Earlier run answers last

- **WHEN** a second run is started and answered with `fast` in 1 ms, and the first run's answer `slow` arrives afterwards
- **THEN** the pane shows `fast` and the status line reads `Duration: 1 ms`

### Requirement: Output diff

Diffing is on at first and toggled with the `diff` button. While it is on, a listing whose engine also had output in the run before SHALL be shown as a line diff against it: lines only in the new output are marked `+`, lines only in the old one `-`, the rest are unmarked. Lines MUST be compared with hexadecimal addresses, bytecode offsets and runs of whitespace normalized, so a line that differs in those alone is unchanged. `stdout` and `stderr` are diffed separately.

#### Scenario: Second run with different code

- **WHEN** `function f(a) { return a + 1; } f(1);` is run and then `function f(a) { return a * 2; } f(1);`
- **THEN** the listing marks the lines that changed with `-` and `+`

#### Scenario: Only addresses moved

- **WHEN** two runs print the same lines except for a `0x…` address
- **THEN** no line is marked `+` or `-`

#### Scenario: First run

- **WHEN** there is no earlier output for the engine
- **THEN** the listing has no diff markers

#### Scenario: Diffing switched off

- **WHEN** `diff` is switched off after two runs
- **THEN** the listing shows the latest output alone, without markers

### Requirement: Opcode reference

A token in a listing that the engine's opcode reference knows SHALL be clickable; clicking it opens a popover with the token and a description of it. The popover closes when the page is scrolled.

#### Scenario: V8 opcode

- **WHEN** `Ldar`, `Star`, `Return` or `Add` is clicked in a V8 bytecode listing
- **THEN** a popover describing it opens

### Requirement: Flag pickers

For each selected engine the flag catalog has a selectable flag for, the toolbar SHALL show a multi-select picker labelled `<engine> flags`, or `<n> <engine> flag` (`flags` for several) once flags are selected for that engine, with the engine's name in lower case. A flag is selectable when it takes no value and belongs to a category the page labels. Selections are kept per engine and apply from the next run.

#### Scenario: Initial page

- **WHEN** the page is opened and the catalog lists V8 flags
- **THEN** the only picker reads `2 v8 flags`

#### Scenario: Second engine

- **WHEN** Hermes is switched on and the catalog lists Hermes flags
- **THEN** a picker reading `hermes flags` appears, and it disappears when Hermes is switched off

#### Scenario: Value-bearing flag

- **WHEN** the catalog lists `--print-bytecode` and the value-bearing `--print-bytecode-filter` for V8
- **THEN** the V8 picker offers only `--print-bytecode`

#### Scenario: Engine with nothing selectable

- **WHEN** every flag the catalog lists for JSC takes a value
- **THEN** there is no JSC picker

### Requirement: Flag picker options

A picker's options SHALL be grouped under their category's label in the fixed order Bytecode, AST & parser, Machine code, Optimisation, Inline caches, Object shapes, RegExp, Wasm, GC, Diagnostics, Runtime, with empty categories left out. Each option shows the flag without its leading dashes, and the catalog's description of it.

#### Scenario: Catalog order differs

- **WHEN** the catalog lists `--print-ast` (parser) before `--print-bytecode` (bytecode)
- **THEN** the picker shows the group `Bytecode` with `print-bytecode`, then `AST & parser` with `print-ast`

#### Scenario: Picking a flag

- **WHEN** `print-ast` is picked for V8 and the snippet is run
- **THEN** the V8 output includes the AST dump

### Requirement: Flag catalog source

The catalog SHALL be read from the gateway's `GET /api/flags` when the server renders the page, waiting at most 2 seconds; a catalog once read MAY be reused for up to 3600 seconds. Engines the page does not know, and engines whose entry is empty or not a list, are ignored. When the gateway is unreachable, answers an error or answers something other than the catalog, the page MUST still render, without pickers.

#### Scenario: Gateway advertises two engines

- **WHEN** `JSLAB_BACKEND_URL` is `http://api:8080` and the gateway lists flags for `v8` and `hermes`
- **THEN** the catalog is read from `http://api:8080/api/flags` and pickers are available for V8 and Hermes

#### Scenario: Unknown engine

- **WHEN** the gateway also lists flags for `quickjs`
- **THEN** that entry is ignored

#### Scenario: Gateway is down

- **WHEN** the gateway answers 503 or cannot be reached
- **THEN** the page renders with no flag picker
- **AND** the initially selected V8 flags are still sent with a run

### Requirement: Engine version display

Engine versions SHALL be read from the gateway's `GET /api/engines` when the server renders the page, waiting at most 2 seconds; versions once read MAY be reused for up to 300 seconds. The pane footer shows `<engine> <version>` for the active tab's engine when the gateway reported a version for it and nothing in its place otherwise. A gateway failure MUST NOT keep the page from rendering.

#### Scenario: Version reported

- **WHEN** the gateway reports `14.9.0 (candidate)` for `v8`
- **THEN** the footer of the V8 tab reads `V8 14.9.0 (candidate)`

#### Scenario: Engine that cannot state its version

- **WHEN** the gateway reports `version: null` for `jsc`
- **THEN** the footer of the JSC tab shows no version

#### Scenario: Gateway is down

- **WHEN** the gateway answers 503 or cannot be reached
- **THEN** the page renders and no footer shows a version

### Requirement: Sample libraries

The `samples` button SHALL open the dialog `Select a sample` with eight default samples — Add, Closure, Loop, Try/catch, d8 native, Typed arrays, Async flow, Generator — and `v8 internals` the dialog `V8 internals` with twelve annotated V8 samples. Choosing a sample MUST replace the editor's code and close the dialog; it changes neither engines nor flags and runs nothing.

#### Scenario: Default sample

- **WHEN** `Generator` is chosen in `Select a sample`
- **THEN** the dialog closes and the editor holds the `fibonacci` generator snippet

#### Scenario: V8 internals sample

- **WHEN** a sample is chosen in `V8 internals`
- **THEN** the dialog closes and the editor holds that sample

### Requirement: Saving a custom sample

A `save` button SHALL be offered only while the editor is not blank and its code differs from the code last loaded from a sample or last saved — at page load, from the initial code. It opens the dialog `Save current snippet`, which asks for a name; confirming stores the editor's code under that name, trimmed.

#### Scenario: Untouched initial code

- **WHEN** the page is opened and nothing is edited
- **THEN** there is no `save` button

#### Scenario: Edited code is saved

- **WHEN** the code is changed to `const custom = 'sample';` and saved as `probe`
- **THEN** `probe` is listed under `Saved samples`
- **AND** the `save` button is gone until the code changes again

### Requirement: Custom sample names

A name SHALL be refused with `Please provide a name for the sample.` when it is blank, and with `A sample with this name already exists.` when, ignoring case and surrounding whitespace, it equals the name of another custom sample or of a default sample. The dialog MUST stay open on a refusal. A sample being renamed may keep its own name.

#### Scenario: Blank name

- **WHEN** the name is empty or only spaces
- **THEN** the dialog shows `Please provide a name for the sample.`

#### Scenario: Name of another custom sample

- **WHEN** a sample named `Mine` exists and the name entered is `mine`, `MINE` or `Mine` with spaces around it
- **THEN** the dialog shows `A sample with this name already exists.` and stays open

#### Scenario: Name of a default sample

- **WHEN** the name entered is `Add`
- **THEN** it is refused as already existing

#### Scenario: Rename keeping the name

- **WHEN** the sample `Mine` is renamed to `Mine`
- **THEN** the name is accepted

### Requirement: Custom sample storage

Custom samples SHALL be kept in `localStorage` under `js-bytecode-web.custom-samples` as a JSON array of `{ id, name, code, createdAt, description? }`, in the order they were saved and without a cap, so they outlast a reload. A stored value that is not such an array, and entries lacking a string `id`, `name` or `code` or carrying a non-string `description`, MUST be ignored. An entry without `createdAt` is accepted.

#### Scenario: Reload

- **WHEN** a sample is saved and the page is reloaded
- **THEN** it is still listed under `Saved samples`

#### Scenario: Malformed storage

- **WHEN** the stored value is `not json` or `{"not":"an array"}`
- **THEN** no custom samples are listed

#### Scenario: Mixed entries

- **WHEN** the stored array holds one complete sample, `{ "id": "b", "name": "No code" }`, `"nope"` and `null`
- **THEN** only the complete sample is listed

#### Scenario: Entry from before createdAt existed

- **WHEN** the stored entry is `{ "id": "a", "name": "Old", "code": "x" }`
- **THEN** it is listed

### Requirement: Managing custom samples

`Select a sample` SHALL list custom samples under `Saved samples`, above `Default samples`, each with its description — `Custom snippet` when it has none — and the actions `Rename` and `Delete`. `Rename` opens `Rename snippet`, where the name and an optional description can be changed; `Delete` opens `Delete snippet` and removes the sample once confirmed. With none saved, the dialog reads `Save your own snippets to access them here quickly.`

#### Scenario: Rename

- **WHEN** a saved sample is renamed in `Rename snippet`
- **THEN** the list shows it under the new name

#### Scenario: Delete

- **WHEN** `Delete` is chosen for a sample and confirmed in `Delete snippet`
- **THEN** the sample is no longer listed

### Requirement: Run history recording

A run in which at least one engine answered SHALL be recorded in `localStorage` under `jslab:run-history` as `{ id, ts, code, engines, flags }`, newest first, with `engines` as engine keys and `flags` as the per-engine flag lists. Only the 25 newest entries are kept. A run with the same code, engines and flags as the newest entry MUST NOT be recorded again. Outputs are not stored.

#### Scenario: Successful run

- **WHEN** a run is answered by its engine
- **THEN** an entry for it is at the top of the history, and still there after a reload

#### Scenario: Refused run

- **WHEN** the only engine's request is answered with 429
- **THEN** `jslab:run-history` is not written

#### Scenario: Same run repeated

- **WHEN** the same code is run twice in a row with the same engines and flags
- **THEN** the history has one entry for it

#### Scenario: Flags changed

- **WHEN** the same code is run with `--print-bytecode` and then with `--trace-opt`
- **THEN** the history has two entries

#### Scenario: Same run after another

- **WHEN** `x`, `y` and `x` are run in turn
- **THEN** the history lists `x`, `y`, `x`

#### Scenario: More than the cap

- **WHEN** 35 different snippets are run
- **THEN** the history holds the 25 newest

### Requirement: Run history panel

The `history` button SHALL open the `Run history` panel listing the stored runs newest first, each with its engine keys, ` · <n> flag` (`flags` for several) when it has flags, its age (`12s ago`, `5m ago`, `3h ago`, `2d ago`) and the first 160 characters of its code. With nothing stored it reads `No runs yet. Runs you execute in the playground are saved here.` `Clear`, shown only when there are entries, MUST remove the stored history.

#### Scenario: Nothing recorded

- **WHEN** the panel is opened before any run
- **THEN** it reads `No runs yet. Runs you execute in the playground are saved here.`

#### Scenario: Clear

- **WHEN** `Clear` is clicked
- **THEN** the panel shows the empty text and `jslab:run-history` is gone from storage

### Requirement: Restoring a run from history

Choosing an entry in the panel SHALL replace the editor's code, the engine selection and the per-engine flags with the entry's and close the panel. It MUST NOT run anything.

#### Scenario: Code is restored

- **WHEN** a snippet is run, the editor is changed and the snippet's entry is chosen
- **THEN** the editor holds the snippet again

#### Scenario: Engine selection is restored

- **WHEN** a run with Hermes selected is recorded, Hermes is switched off and the entry is chosen
- **THEN** the Hermes tab is back

### Requirement: Stored history compatibility

Reading the history MUST tolerate what is stored: a value that is not a JSON array reads as empty, entries lacking `id`, `ts`, `code`, `engines` or flags are skipped, and unknown engine keys and non-string flags are dropped. An entry in the older shape, carrying a flat `v8Flags` list in place of `flags`, SHALL be read with that list as V8's flags.

#### Scenario: Older entry

- **WHEN** the stored entry is `{ "id": "old", "ts": 1, "code": "x", "engines": ["v8"], "v8Flags": ["--print-bytecode"] }`
- **THEN** it is listed, and restoring it selects `--print-bytecode` for V8

#### Scenario: Corrupt storage

- **WHEN** the stored value is `{not json`
- **THEN** the history reads as empty

### Requirement: Share link

`share` → `Copy link` SHALL copy `<origin>/playground?s=<payload>` to the clipboard, the payload carrying the editor's code, the selected engines and the per-engine flags, and the button reads `link copied` for 1.5 seconds. Outputs are not part of the link. When the clipboard refuses the write, the page's own address MUST be replaced with the link instead.

#### Scenario: Link is copied

- **WHEN** the code is `const answer = 42;`, V8 and JSC are selected, V8 has `--print-bytecode` and `Copy link` is chosen
- **THEN** the clipboard holds a URL with an `s` parameter that reads back as that code, those engines and that flag
- **AND** the button reads `link copied`

#### Scenario: Clipboard unavailable

- **WHEN** the clipboard write is refused
- **THEN** the address bar shows the share link

### Requirement: Share payload format

The `s` payload SHALL be the JSON object `{ "c": <code>, "e": [<engine key>, …], "f": { <engine key>: [<flag>, …] } }` encoded as UTF-8 and then base64 with the URL-safe alphabet (`-` and `_`) and no `=` padding. The engine keys are `v8`, `sm`, `hermes` and `jsc`. Links already issued in this format MUST keep opening.

#### Scenario: Round trip

- **WHEN** a payload is built from code `const x = 1;`, engines `v8` and `hermes`, and flags `--print-bytecode` for `v8` and `-O` for `hermes`
- **THEN** reading it gives back exactly that state

#### Scenario: Code outside Latin-1

- **WHEN** the code is `const éè = '🚀'; // 你好`
- **THEN** the link reads back as the same code

#### Scenario: URL-safe

- **WHEN** a payload is built for any state
- **THEN** it contains none of `+`, `/` and `=`

### Requirement: Share payload reading

Reading a payload MUST be tolerant: unknown keys in `e` are dropped, V8 is always included and engines are taken in the order V8, SpiderMonkey, Hermes, JSC. In `f`, lists under unknown engine keys, non-string entries and empty lists are dropped, and a missing `f` means no flags. A payload that cannot be decoded, or whose `c` is not a string, SHALL be ignored as a whole.

#### Scenario: V8 left out

- **WHEN** `e` is `["hermes"]`
- **THEN** V8 and Hermes are selected

#### Scenario: Unknown engine

- **WHEN** `e` is `["v8", "quickjs"]` and `f` is `{ "quickjs": ["--fast"] }`
- **THEN** only V8 is selected and no flags are selected

#### Scenario: Garbage

- **WHEN** the parameter is `not-valid-base64!!!` or empty
- **THEN** the payload is ignored

### Requirement: Legacy flat flag list

A payload whose `f` is a bare array of flags, as issued while flags existed for V8 only, SHALL be read with that array as V8's flags.

#### Scenario: Link from before per-engine flags

- **WHEN** the payload is `{ "c": "const legacy = 1;", "e": ["v8"], "f": ["--print-bytecode"] }`
- **THEN** the editor holds `const legacy = 1;` and V8 has `--print-bytecode` selected

### Requirement: Opening a share link

Opening `/playground?s=<payload>` with a readable payload SHALL replace the initial code, engine selection and flags with the payload's and run nothing. The payload's flags replace the initial ones entirely, so a link carrying no flags opens with none selected. The `s` parameter stays in the address. With an unreadable payload the page MUST open in its initial state, without an error.

#### Scenario: Link with a second engine

- **WHEN** a link carrying `const x = 1;`, engines `v8` and `hermes` and `--print-bytecode` for `v8` is opened
- **THEN** the editor holds `const x = 1;`, the tabs are `V8` and `Hermes`, and V8 has only `--print-bytecode` selected

#### Scenario: Corrupt parameter

- **WHEN** `/playground?s=%%%not-base64%%%` is opened
- **THEN** the page shows its initial state

### Requirement: Embed code and article link

`share` SHALL also offer `Copy embed code`, which copies an `<iframe>` whose `src` is `<origin>/embed/playground?s=<payload>` with the share link's payload, and `Copy article link (output only)`, which copies `<origin>/embed/bytecode?b=<snapshot>` and is disabled until the active tab has output. The button then reads `embed copied` or `article link copied` for 1.5 seconds; when the clipboard refuses, nothing changes. The pages behind both links are specified in `embed`.

#### Scenario: Embed code

- **WHEN** `Copy embed code` is chosen on `https://jslab.su`
- **THEN** the clipboard holds `<iframe src="https://jslab.su/embed/playground?s=<payload>" width="100%" height="520" style="border:0;border-radius:8px" title="JSLab playground" loading="lazy"></iframe>`

#### Scenario: Article link before a run

- **WHEN** the share menu is opened before the active tab has any output
- **THEN** `Copy article link (output only)` is disabled

#### Scenario: Article link after a run

- **WHEN** it is chosen after a run
- **THEN** the clipboard holds a URL containing `/embed/bytecode?b=`
- **AND** the snapshot carries the active tab's engine and output, the flags selected for that engine and the code in the editor at that moment

### Requirement: Intrinsic completion

Typing `%` in the editor SHALL offer completions for V8 intrinsics, each labelled `%<Name>`. Accepting one inserts a call to it with its arguments as placeholders.

#### Scenario: Completing DebugPrint

- **WHEN** `%` is typed and `%DebugPrint` is accepted
- **THEN** the editor holds `%DebugPrint(value);` with `value` selected for replacement

### Requirement: V8 intrinsics reference

The `intrinsics` button SHALL open the dialog `V8 intrinsics`: a reference that says every intrinsic needs `--allow-natives-syntax`, links to V8's `runtime.h` and lists the intrinsics in one tab per category, each with its `%` name, what it does and an example invocation.

#### Scenario: Open and close

- **WHEN** `intrinsics` is clicked
- **THEN** the dialog `V8 intrinsics` shows `%` names and mentions `--allow-natives-syntax`
- **AND** its close control dismisses it
