# Spec Delta

## ADDED Requirements

### Requirement: Annotated output

The output pane's listings SHALL apply the annotations of the code of the last run, as the `output-annotations` capability specifies, to both stdout and stderr and on every engine.

#### Scenario: Annotated V8 sample

- **WHEN** the `Length → Holey` sample is run
- **THEN** `PACKED_SMI_ELEMENTS` and `HOLEY_SMI_ELEMENTS` are framed in the V8 listing and open their explanations

### Requirement: Pane layout

At and above the `md` breakpoint (48em) the editor and the output SHALL sit side by side with a draggable divider; below it they are stacked, editor first. The page MUST arrive from the server in the orientation it keeps after loading: a request whose `Sec-CH-UA-Mobile` header is `?1`, or that has no such header and a phone's user agent, is rendered stacked, any other request side by side.

#### Scenario: Desktop browser

- **WHEN** `/playground` is opened in a 1440 px wide desktop browser
- **THEN** the editor and the output are side by side in the server's HTML and stay so after loading

#### Scenario: Phone

- **WHEN** `/playground` is opened on a phone
- **THEN** the editor and the output are stacked in the server's HTML and stay so after loading

## MODIFIED Requirements

### Requirement: Initial state

Opening `/playground` without a share link SHALL start with the two-line snippet `function f(x){ return x + 1 }`, `f(41);` in the editor, V8 as the only selected engine, the V8 flags `--print-bytecode` and `--allow-natives-syntax` selected and diffing on. The code, the selection, the flags and the outputs MUST NOT be kept in browser storage, so a reload returns to this state.

#### Scenario: First visit

- **WHEN** `/playground` is opened
- **THEN** there is one output tab, `V8`, and its pane reads `⌘↵ to run`
- **AND** the pane footer ends with `1 engine · click any opcode for its reference`

#### Scenario: Reload after editing

- **WHEN** the code is edited, Hermes is selected and the page is reloaded
- **THEN** the editor, the selection and the flags are back in the initial state

### Requirement: Run timing

After a run the pane footer's last item SHALL read `Duration: <n> ms`, where n is the largest `meta.durationMs` among the engines' answers, followed by ` · cached` only when every answer had `meta.cacheHit` true. When no answer carried a duration it reads `<n> engine · click any opcode for its reference` (`engines` for more than one), counting the selected engines, as it does before the first run.

#### Scenario: Slowest engine

- **WHEN** V8 reports 40 ms and JSC 120 ms
- **THEN** the pane footer reads `Duration: 120 ms`

#### Scenario: Every engine served from cache

- **WHEN** the only engine reports 7 ms with `cacheHit: true`
- **THEN** the pane footer reads `Duration: 7 ms · cached`

#### Scenario: One engine not cached

- **WHEN** V8's answer is a cache hit and JSC's is not
- **THEN** the pane footer does not say `cached`

### Requirement: Pane footer

Below the output the page SHALL show, for the active tab's engine: its version when one is known, its own `meta.durationMs` as `<n> ms` or `—` when it has none, and the number of flags currently selected for it as `<n> flag` or `<n> flags`, left out at zero; and, last, the run summary that Run timing specifies. There is no other status line below the panes.

#### Scenario: Before the first run

- **WHEN** the page is opened and V8's version is known as `14.9.0 (candidate)`
- **THEN** the footer reads `V8 14.9.0 (candidate)`, `—`, `2 flags` and `1 engine · click any opcode for its reference`

#### Scenario: After a run

- **WHEN** V8 answers with `meta.durationMs` of 12
- **THEN** the footer of the V8 tab reads `12 ms`

### Requirement: Sample libraries

The `samples` button SHALL open the dialog `Select a sample` with eight default samples — Add, Closure, Loop, Try/catch, d8 native, Typed arrays, Async flow, Generator — and `v8 internals` the dialog `V8 internals` with twelve annotated V8 samples. Choosing a sample MUST replace the editor's code and close the dialog, and runs nothing. It also sets V8's flags: a V8 internals sample selects exactly the flags it needs, a default sample selects `--print-bytecode` and `--allow-natives-syntax`. Other engines' flags and the engine selection stay as they were; loading a saved custom sample changes no flags.

#### Scenario: Default sample

- **WHEN** `Generator` is chosen in `Select a sample`
- **THEN** the dialog closes and the editor holds the `fibonacci` generator snippet
- **AND** V8's flags are `--print-bytecode` and `--allow-natives-syntax`

#### Scenario: V8 internals sample

- **WHEN** a sample is chosen in `V8 internals`
- **THEN** the dialog closes and the editor holds that sample

#### Scenario: Sample that needs no bytecode

- **WHEN** `Length → Holey` is chosen in `V8 internals`
- **THEN** V8's only flag is `--allow-natives-syntax`

#### Scenario: Sample that traces deoptimization

- **WHEN** `Deoptimization` is chosen in `V8 internals`
- **THEN** V8's flags are `--allow-natives-syntax` and `--trace-deopt`

### Requirement: Embed code and article link

`share` SHALL also offer `Copy embed code`, which copies an `<iframe>` whose `src` is `<origin>/embed/playground?s=<payload>` with the share link's payload, and `Copy output snapshot link`, which copies `<origin>/embed/bytecode?b=<snapshot>` and is disabled until the active tab's engine took part in the last run and has output from it. The button then reads `embed copied` or `snapshot link copied` for 1.5 seconds; when the clipboard refuses, nothing changes. The pages behind both links are specified in `embed`.

#### Scenario: Embed code

- **WHEN** `Copy embed code` is chosen on `https://jslab.su`
- **THEN** the clipboard holds `<iframe src="https://jslab.su/embed/playground?s=<payload>" width="100%" height="520" style="border:0;border-radius:8px" title="JSLab playground" loading="lazy"></iframe>`

#### Scenario: Article link before a run

- **WHEN** the share menu is opened before the active tab has any output
- **THEN** `Copy output snapshot link` is disabled

#### Scenario: Article link after a run

- **WHEN** it is chosen after a run
- **THEN** the clipboard holds a URL containing `/embed/bytecode?b=`
- **AND** the snapshot carries the active tab's engine and output, and the code and that engine's flags of the run that produced the output

#### Scenario: Editor changed after the run

- **WHEN** the code or the flags are edited after a run and the snapshot link is then copied
- **THEN** the snapshot carries the code and flags that ran, not the edited ones
