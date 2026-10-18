# Design

## Context

Output listings are drawn token by token from Shiki's tokenization of the engine's text, row by row, with an optional diff against the previous run. The same listing component serves the playground panes, both embeds and the V8 pipeline's stages; the pipeline's Deopts stage draws its own event rows. A snippet's code reaches every one of these places already — through the run state, the share payload and the snapshot — so a rule stored in the code needs no new transport. See proposal.md for motivation; the behaviour is in the delta specs.

## Goals / Non-Goals

**Goals:**

- One parser and one matcher for every place that shows output.
- Rows without annotations render exactly as before, with no extra work.
- Nothing about annotations costs a page that does not use them.

**Non-Goals:**

- Live preview of directive edits before a run.
- Annotations that span several output rows.
- Any server or API change: rules are read and matched in the browser.

## Decisions

**Rules live in a comment, read with a JavaScript tokenizer.** A regex over the source would pick up `@annotation` inside strings, templates and regex literals. acorn's tokenizer reports comments with their line numbers and skips literals; when the snippet does not parse (engine-specific `%` syntax, an unterminated literal) the directives read before the error are kept. Alternative considered: Monaco's own tokenizer — rejected, it only exists once the editor has loaded and the embeds have no editor.

**Parsing and matching are separate steps.** `parse` turns the source into rules plus directive warnings; `match` applies rules to one output string. A listing parses once per run and matches stdout and stderr separately, and the Deopts stage matches the same rules against each event's raw line.

**Matching is literal and unanchored to lines, rendering is per row.** Matches are found in the whole output string, sorted, overlaps dropped, capped at 200, then handed to rows in one forward sweep; a row slices its tokens around each range. A multiline `match` is rejected at parse time because a trigger cannot cross rows.

**The parser is loaded on demand.** acorn is about 56 KB gzipped. It is imported dynamically the first time a listing's source contains `@annotation`; until it has loaded, that listing waits exactly as it waits for Shiki, so output and frames appear together. If the import fails, the listing renders without annotations instead of not rendering.

**Rules come from the code that ran.** Using the editor's current text would let a framed fragment point at output the text no longer describes. The same rule makes the snapshot link capture the run's code and flags.

**Device hint for the first render.** The split orientation used to come from a viewport media query, which only exists in the browser, so the server rendered the stacked layout and the browser switched after loading. The four pages with a split now read `Sec-CH-UA-Mobile`, falling back to the user agent, and pass the result as the media query's fallback. Alternative considered: CSS-only orientation — rejected, the splitter's drag direction and panel sizing are driven by its orientation prop. `/v8-pipeline` becomes a per-request page because of the header read; it fetches nothing, so the cost is a render.

**Samples carry their flags.** The V8 internals catalog stores the flags each sample needs next to it and the toolbar applies them on load. A test pins `--allow-natives-syntax` to exactly the samples that call an intrinsic, another checks every sample's directives parse cleanly, and a nightly job runs every sample on a real d8 and fails when an annotation stops matching.

## Risks / Trade-offs

- [An engine upgrade changes the text a sample's annotation matches; by design that is silent] → the nightly job fails on any sample annotation without a match.
- [A first-time annotated listing waits for an extra chunk] → it loads in parallel with Shiki, and only for code that has directives.
- [The device hint is wrong, e.g. a narrow desktop window or a phone without the hint] → after loading the media query takes over, so the cost is the old switch, only in that case.
- [A pathological rule (a single character on 2 MB of output) collects every match before the cap] → measured at about 60 ms per rule; accepted.
