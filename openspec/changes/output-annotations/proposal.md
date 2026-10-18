# Proposal

## Why

Bytecode and `%DebugPrint` dumps are the point of jslab, and they are unreadable to the people most likely to learn from them. The opcode reference explains what `LdaSmi` does in general, but nothing could say why _this_ line matters in _this_ snippet, and an explanation written next to the code was lost as soon as the link was shared onward (issue #72).

## What Changes

- An `@annotation` comment in a snippet attaches an explanation to matching text in the engine output. The matched fragment is framed; activating it opens the explanation. Mistakes in a directive are reported next to the output with their source line.
- Annotations apply wherever a snippet's output is shown: the playground panes, both embeds and the V8 pipeline's listings and deopt events. The rules always come from the code that produced the output, so a snapshot link and an embed carry them.
- The playground's snapshot link (`Copy output snapshot link`) captures the code and flags of the run that produced the output instead of whatever the editor holds when the menu is opened.
- The run summary (`Duration: <n> ms`, or the engine count before a run) moves from its own status line into the output pane footer.
- Choosing a sample sets V8's flags: each V8 internals sample switches on the flags it needs, a default sample restores `--print-bytecode` and `--allow-natives-syntax`. The V8 internals samples are rewritten so every one runs on d8 and every annotation matches its real output.
- Split layouts (playground, V8 pipeline, spec visualizer) arrive from the server in the orientation they keep after loading, instead of rendering stacked and switching to side by side once the page has loaded.

## Capabilities

### New Capabilities

- `output-annotations`: the `@annotation` directive format, how directives are read from a snippet and matched against output, how matches are shown and opened, and how directive mistakes are reported.

### Modified Capabilities

- `playground`: output panes apply annotations; the run summary moves into the pane footer; choosing a sample sets V8's flags; the snapshot link captures the run's code and flags; the editor/output split renders in its final orientation.
- `embed`: the bytecode embed and the playground embed apply annotations from the snapshot's or the run's source.
- `v8-pipeline`: stage listings and deopt events apply annotations; the editor/stages split renders in its final orientation.
- `spec-visualizer`: the spec/tree split renders in its final orientation.

## Impact

- Frontend only (`apps/frontend/src`): `lib/annotations.ts`, the output listing components, the playground toolbar and footer, the sample catalog, the pipeline stages, a device hint read from request headers on four pages. `/v8-pipeline` becomes a per-request page because it reads that hint.
- New client dependency `acorn`, loaded on demand only for snippets that contain `@annotation`.
- `nightly-engines` gains a step that runs every sample on a real d8 and fails when an annotation no longer matches.
- No API, engine or share-link format changes; existing share links and snapshots keep opening.
