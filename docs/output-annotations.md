# Output annotations

A snippet can explain its own engine output. Put an `@annotation` block comment
in the source, name a piece of the output it should point at, and the playground
turns that text into a button which opens the explanation on click.

Annotations travel with the snippet, so a share link or an embed carries them —
that is the point: a bytecode dump becomes a figure with captions instead of a
wall of text that needs prose around it.

## Syntax

```js
/* @annotation
match: elements kind: PACKED_SMI_ELEMENTS
highlight: PACKED_SMI_ELEMENTS
title: Packed elements
text: Every array index is filled with a small integer.
*/
```

Only block comments count, and only those whose first word is `@annotation`.
Directive-shaped text inside a string, a template literal or a regex is ignored
— the source is tokenized, not scanned.

| Field        | Required | Meaning                                                                    |
| ------------ | -------- | -------------------------------------------------------------------------- |
| `match`      | yes      | The output text to find. Matched **literally** — no regex, no wildcards.   |
| `text`       | yes      | The explanation shown in the popover.                                      |
| `highlight`  | no       | The part of `match` to turn into the button. Defaults to all of `match`.   |
| `title`      | no       | Popover heading. Defaults to `highlight`.                                  |
| `occurrence` | no       | `all` (default) or a 1-based index, to annotate one occurrence of `match`. |

Values may be quoted (`match: " ready "`) when leading or trailing spaces
matter. `text` — and only `text` — can span lines with a block scalar:

```js
/* @annotation
match: Return
text: |
  Returns the accumulator.

  The interpreter pops the frame right after.
*/
```

`match` exists so the `highlight` can be pinned unambiguously: match on enough
surrounding text to be unique, then highlight the short fragment that matters.
`highlight` must occur exactly once inside `match`.

## Matching rules

- Literal and exact: case, runs of spaces and punctuation all count.
- `match` cannot span output lines, because a highlight cannot either.
- Rules are matched against every channel of the run — a rule that hits only
  stderr is still a matched rule.
- Where two annotations would cover the same text, the earlier rule wins and the
  later one is reported.

## Diagnostics

Mistakes surface above the output rather than failing silently, in two kinds:

- **Warning** — the directive itself is wrong (unknown field, missing `match`,
  `highlight` not part of `match`, a duplicate or overlapping rule). The
  annotation is dropped. The reported line is the offending field's line.
- **Info** — the directive parsed but matched nothing, either because `match`
  does not occur in the output or because `occurrence` points past the last
  match. This is the common case of a typo in `match`, and it is worth saying
  out loud: otherwise a missing highlight looks the same as a rule that was
  never meant to fire.

## Where the code lives

- `apps/frontend/src/lib/annotations.ts` — parse, match, compile. Pure; no React.
- `apps/frontend/src/lib/annotationDirective.ts` — just the `@annotation`
  sentinel, kept separate so a caller can test for it without pulling in acorn.
- `apps/frontend/src/components/OutputsPanel/useOutputAnnotations.ts` — compiles
  a run's directives once for all channels and loads the parser on demand.
- `apps/frontend/src/components/OutputsPanel/components/AnnotationAlerts.tsx` —
  renders the diagnostics.
- `apps/frontend/src/components/OutputsPanel/components/CodeRow.tsx` — splits a
  row's tokens around each annotation and wraps the highlight in a trigger.

Try it from the playground's **Output annotations** sample.
