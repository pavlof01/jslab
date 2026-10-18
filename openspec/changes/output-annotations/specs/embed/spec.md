# Spec Delta

## ADDED Requirements

### Requirement: Playground embed annotations

The playground embed's output SHALL apply the annotations of the code of its last run, as the `output-annotations` capability specifies.

#### Scenario: Shared snippet with a directive

- **WHEN** a playground embed opened from a share link whose code annotates `ready` is run and prints `status: ready`
- **THEN** `ready` is framed and opens the directive's explanation

## MODIFIED Requirements

### Requirement: Bytecode embed content

For a readable snapshot the bytecode embed SHALL show the engine's label (`V8`, `SpiderMonkey`, `Hermes` or `JSC`), the caption when the snapshot has one, the captured output and, below it, the captured stderr when that is non-empty. Both apply the annotations of the snapshot's source text, as the `output-annotations` capability specifies. Until a capture is highlighted, and if it cannot be, it is shown as plain preformatted text; an empty output reads `(no output)`. The view is read-only: it MUST NOT run code or accept edits. The snapshot's source text and flags are not displayed.

#### Scenario: Snapshot with a caption

- **WHEN** the snapshot has engine `v8`, the caption `Adding two numbers` and the output `Ldar a0`, `Add a1`, `Return`
- **THEN** the embed shows `V8`, `Adding two numbers` and the three output lines

#### Scenario: Snapshot with stderr

- **WHEN** the snapshot carries the stderr `SyntaxError: unexpected token`
- **THEN** that text is shown below the output

#### Scenario: Snapshot with an annotation

- **WHEN** the snapshot's source annotates `ready` and its output is `status: ready`
- **THEN** `ready` is framed and opens the explanation, while the source itself is not shown
