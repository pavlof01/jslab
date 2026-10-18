# output-annotations Specification

## Purpose

Lets the author of a snippet explain parts of the engine output from inside the snippet itself, so the explanation travels with the code through share links, snapshots and embeds.

## Requirements

### Requirement: Directive comments

A comment in the snippet whose text starts with `@annotation` SHALL define one annotation rule. A block comment, a `/** … */` comment with leading `*` on its lines, and a run of consecutive `//` line comments all count. Text that only looks like a directive inside a string, template or regular expression literal MUST NOT. Directives read before a syntax error in the snippet still apply.

#### Scenario: Block comment

- **WHEN** the snippet contains `/* @annotation` / `match: ready` / `text: The run can continue.` / `*/`
- **THEN** output containing `ready` gets one annotation explaining `The run can continue.`

#### Scenario: Line comments

- **WHEN** the snippet contains the consecutive line comments `// @annotation`, `// match: ready` and `// text: The run can continue.`
- **THEN** the same annotation applies

#### Scenario: Directive inside a string

- **WHEN** the only `@annotation` in the snippet is inside a string literal
- **THEN** no annotation applies

### Requirement: Directive fields

A directive SHALL accept the fields `match` (required), `text` (required), `highlight`, `title` and `occurrence`, one per line as `name: value`. Values are literal text: quotes around a value are dropped, and Markdown or HTML is not interpreted. `text: |` takes the indented lines that follow, keeping line breaks and removing their common indent; no other field accepts a multiline value.

#### Scenario: Multiline text

- **WHEN** a directive has `text: |` followed by two lines indented by four spaces
- **THEN** the explanation shows both lines, without the indent

#### Scenario: Markup is literal

- **WHEN** `text` is `<b>bold</b>`
- **THEN** the explanation shows the characters `<b>bold</b>`

### Requirement: Literal matching

`match` SHALL be found in the output literally — case, whitespace and punctuation count, and it is never a pattern. stdout and stderr are matched separately. Every occurrence is annotated unless `occurrence` names one by number, counting from 1 within that output. A rule that matches nothing MUST NOT be reported: one snippet runs on engines that print different text.

#### Scenario: Every occurrence

- **WHEN** `match` is `Return` and the output has two lines ending in `Return`
- **THEN** both are annotated

#### Scenario: One occurrence

- **WHEN** the same rule sets `occurrence: 2`
- **THEN** only the second `Return` is annotated

#### Scenario: No match on another engine

- **WHEN** a rule's `match` is V8-specific and the snippet runs on JSC
- **THEN** the JSC output shows no annotation and no warning about that rule

### Requirement: Highlighted fragment and title

The annotated fragment SHALL be `highlight` when given, else the whole `match`; `highlight` must occur inside `match` exactly once. The explanation's heading SHALL be `title` when given, else the highlighted text.

#### Scenario: Highlight inside the match

- **WHEN** `match` is `elements kind: HOLEY_SMI_ELEMENTS` and `highlight` is `HOLEY_SMI_ELEMENTS`
- **THEN** only `HOLEY_SMI_ELEMENTS` is framed, and only where the full `match` text appears

### Requirement: Opening an explanation

An annotated fragment SHALL be shown framed in the listing and SHALL be a control named by its text. Activating it by pointer or keyboard opens a popover with the heading and the explanation; Escape, a click elsewhere or scrolling the page closes it. Hovering MUST NOT open it.

#### Scenario: Keyboard

- **WHEN** an annotated fragment is focused and Enter is pressed
- **THEN** its explanation opens
- **AND** Escape closes it

### Requirement: Raw output is unchanged

Annotations SHALL only change how a listing is drawn. The listing's text and the copy control MUST yield exactly what the engine printed.

#### Scenario: Copy

- **WHEN** the copy control of an annotated listing is used
- **THEN** the clipboard holds the engine's output byte for byte

### Requirement: Opcode reference around annotations

Outside annotated fragments the opcode reference SHALL behave as before. A token inside an annotated fragment opens the annotation, not the opcode reference.

#### Scenario: Token next to an annotation

- **WHEN** `HOLEY_SMI_ELEMENTS` is annotated and an opcode on another line is clicked
- **THEN** the opcode reference opens for it

### Requirement: Directive warnings

A directive with a mistake SHALL be ignored and reported next to the output as `Annotation at source line <n>: <message>`, n being the line the directive starts on. The messages are: `Expected a field in the form \`name: value\`.`, `Unknown annotation field \`<name>\`.`, `Field \`<name>\` is declared more than once.`, `A non-empty \`match\` is required.`, `A non-empty \`text\` is required.`, `\`highlight\` must be a non-empty part of \`match\`.`, `\`highlight\` occurs more than once inside \`match\`; use a more specific fragment.`, `\`<name>\` cannot hold a multiline value; only \`text\` can.`and`\`occurrence\` must be \`all\` or a positive integer (starting at 1).`.

#### Scenario: Missing match

- **WHEN** a directive starting on line 3 has `text` but no `match`
- **THEN** the warning `Annotation at source line 3: A non-empty \`match\` is required.` is shown

#### Scenario: Warnings shown once

- **WHEN** the snippet has a faulty directive and the engine prints both stdout and stderr
- **THEN** the warning appears with the stdout listing only

### Requirement: Overlaps and the annotation limit

Overlapping matches SHALL keep the one that starts first and skip the rest, warning `Overlapping annotation skipped; use a more specific match.` At most 200 annotations SHALL be drawn per listing; beyond that the warning `Only the first 200 annotations are shown; use a more specific match or \`occurrence\`.` is shown.

#### Scenario: Very common match

- **WHEN** `match` is `0` and the output contains it 5000 times
- **THEN** 200 fragments are framed and the limit warning is shown

### Requirement: Rules come from the code that ran

The rules applied to a listing SHALL come from the code that produced that output, not from the editor's current text. Editing a directive changes the listing only after the next run.

#### Scenario: Directive edited after a run

- **WHEN** a run's directive says `Original explanation.` and the editor is then changed to `Draft.`
- **THEN** the framed fragment still opens `Original explanation.`

### Requirement: Annotations in diff mode

In a diffed listing, rules SHALL apply to the current run's rows only; rows that exist only in the previous run MUST NOT be annotated.

#### Scenario: Deleted row

- **WHEN** the previous run printed `status: error` and the current one prints `status: ready`, with a rule matching `status`
- **THEN** only the `status: ready` row is annotated
