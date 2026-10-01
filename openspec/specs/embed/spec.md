# embed Specification

## Purpose

The embeddable widgets `/embed/playground` and `/embed/bytecode` and the oEmbed provider `/embed/oembed`, as seen by a site framing a widget, an oEmbed consumer or a link unfurler: what state an embed URL carries, what each widget shows and lets its viewer do, and what the provider answers.

## Requirements

### Requirement: Widget-only pages

`/embed/playground` and `/embed/bytecode` SHALL render the widget alone, without the site header and navigation that the rest of the site carries.

#### Scenario: Playground embed is opened

- **WHEN** `/embed/playground` is loaded
- **THEN** the widget's `JSLab` label is visible
- **AND** the page contains no navigation landmark

### Requirement: Playground embed state

`/embed/playground` SHALL take its initial source text, enabled engines and per-engine flags from the `s` query parameter, which uses the playground's share-link encoding (see the `playground` capability). When `s` is absent or cannot be decoded, the widget MUST open in the playground's default state — the default snippet with V8 as the only engine — without reporting an error.

#### Scenario: URL carries state

- **WHEN** `s` encodes the source `const x = 1;`, the engines `v8` and `hermes` and the v8 flag `--print-bytecode`
- **THEN** the editor holds `const x = 1;`
- **AND** V8 and Hermes are enabled, JSC is not, and V8 runs with `--print-bytecode`

#### Scenario: No state

- **WHEN** `/embed/playground` is loaded without `s`
- **THEN** the editor holds the default snippet and a run produces V8 output

#### Scenario: Corrupt state

- **WHEN** `s` is `%%%not-base64%%%`
- **THEN** the widget opens in its default state and no error is shown

### Requirement: Playground embed controls

The playground embed SHALL show an editable source editor, a `Run` control and one output tab per enabled engine. `Run`, or Ctrl/Cmd+Enter in the editor, MUST run the current source on the enabled engines with the flags the URL carried, through `POST /api/run` exactly as the full playground does (see `playground`); the control reads `Running` until the run ends. The embed offers no control for changing engines or flags.

#### Scenario: Viewer runs the default snippet

- **WHEN** the viewer presses `Run` in an embed opened without `s`
- **THEN** V8 bytecode for the snippet appears in the output

#### Scenario: Engines come from the URL only

- **WHEN** the embed URL enables V8 and Hermes
- **THEN** the output offers a V8 tab and a Hermes tab
- **AND** the widget has no control that enables another engine

### Requirement: Playground embed link to the full playground

The playground embed SHALL offer an `Open in JSLab` link that opens in a new browsing context and points at `/playground?s=<state>` on the embed's own origin, where the state is the widget's current source text, enabled engines and flags in the playground's share-link encoding. Edits made in the embed MUST be reflected in the link.

#### Scenario: Link target

- **WHEN** `/embed/playground` is loaded
- **THEN** the `Open in JSLab` link has an `href` under `/playground` and `target="_blank"`

#### Scenario: Viewer edits the source

- **WHEN** the viewer changes the source text in the embed
- **THEN** the `s` value of the link decodes to the changed source

### Requirement: Bytecode snapshot parameter

`/embed/bytecode` SHALL take its content from the `b` query parameter: one version character followed by unpadded base64url text. Version `1` wraps gzip-compressed UTF-8 JSON, version `0` the same JSON uncompressed. The JSON object holds `c` (source text), `n` (engine key: `v8`, `sm`, `hermes` or `jsc`), `f` (array of flags), `o` (captured output) and, optionally, `r` (captured stderr) and `t` (caption). When `b` is repeated, the first value MUST be used.

#### Scenario: Snapshot round trip

- **WHEN** a snapshot of the source `function add(a, b) { return a + b; }`, engine `v8`, flag `--print-bytecode` and its bytecode dump is encoded into `b`
- **THEN** the embed reads back the same source, engine, flags and output

#### Scenario: Stderr and caption

- **WHEN** the snapshot also carries the stderr `warning: something` and the caption `Adding two smis`
- **THEN** both are read back unchanged

#### Scenario: Text outside Latin-1

- **WHEN** the source is `const переменная = '🚀'` and the output is `λ → ∀`
- **THEN** both are read back unchanged

#### Scenario: Payload is URL-safe

- **WHEN** a snapshot is encoded
- **THEN** the `b` value matches `^[01][A-Za-z0-9_-]*$` and percent-encoding leaves it unchanged

#### Scenario: Large dump

- **WHEN** the captured output is 18000 lines long
- **THEN** it is read back unchanged

#### Scenario: Parameter given twice

- **WHEN** the URL is `/embed/bytecode?b=9abc&b=<readable snapshot>`
- **THEN** only `9abc` is considered and the embed has no readable snapshot

### Requirement: Snapshot link minting

A snapshot link SHALL have the form `<origin>/embed/bytecode?b=<payload>`. The payload MUST be written as version `1` when the minting browser supports gzip compression streams and as version `0` otherwise, and it omits `r` and `t` when the stderr or the caption is empty.

#### Scenario: Browser with gzip streams

- **WHEN** a snapshot link is minted in a browser that supports gzip compression streams
- **THEN** its `b` value starts with `1`

### Requirement: Snapshot validation

A `b` value SHALL be treated as unreadable when it is empty, when its version character is neither `0` nor `1`, when its payload does not decode (and, for version `1`, decompress) to JSON, when `c` or `o` is not a string, or when `n` is not a known engine key. In a readable snapshot, an `f` that is not an array MUST be read as no flags, non-string entries of `f` are dropped, and a non-string `r` or `t` is ignored.

#### Scenario: Unknown version character

- **WHEN** `b` is `9abc`
- **THEN** the snapshot is unreadable

#### Scenario: Truncated payload

- **WHEN** the last 12 characters of a valid `b` value are removed
- **THEN** the snapshot is unreadable and no error is raised

#### Scenario: Unknown engine

- **WHEN** a version `0` payload decodes to `{ "c": "x", "n": "brainfuck", "o": "y" }`
- **THEN** the snapshot is unreadable

#### Scenario: Missing output

- **WHEN** a version `0` payload decodes to `{ "c": "x", "n": "v8" }`
- **THEN** the snapshot is unreadable

### Requirement: Unreadable snapshot state

When `b` is absent or unreadable, `/embed/bytecode` SHALL still render, showing the message `This embed has no readable snapshot.` and an `Open JSLab` link to `/playground` that opens in a new browsing context.

#### Scenario: Snapshot missing

- **WHEN** `/embed/bytecode` is loaded without `b`
- **THEN** the message `This embed has no readable snapshot.` is visible
- **AND** the `Open JSLab` link has the `href` `/playground`

### Requirement: Bytecode embed content

For a readable snapshot the bytecode embed SHALL show the engine's label (`V8`, `SpiderMonkey`, `Hermes` or `JSC`), the caption when the snapshot has one, the captured output and, below it, the captured stderr when that is non-empty. The view is read-only: it MUST NOT run code or accept edits. The snapshot's source text and flags are not displayed.

#### Scenario: Snapshot with a caption

- **WHEN** the snapshot has engine `v8`, the caption `Adding two numbers` and the output `Ldar a0`, `Add a1`, `Return`
- **THEN** the embed shows `V8`, `Adding two numbers` and the three output lines

#### Scenario: Snapshot with stderr

- **WHEN** the snapshot carries the stderr `SyntaxError: unexpected token`
- **THEN** that text is shown below the output

### Requirement: Bytecode embed link to the playground

The bytecode embed SHALL offer a link named `Open this snippet in JSLab` that opens in a new browsing context and points at `/playground?s=<state>`, where the state carries the snapshot's source text, its engine as the only listed engine and its flags under that engine, in the playground's share-link encoding.

#### Scenario: V8 snapshot

- **WHEN** the snapshot has the source `1 + 1`, engine `v8` and flag `--print-bytecode`
- **THEN** the link's `href` starts with `/playground?s=`
- **AND** its `s` value decodes to that source, the engine `v8` and the v8 flag `--print-bytecode`

### Requirement: Embeds are not indexed

Both embed pages SHALL carry `<meta name="robots" content="noindex, nofollow">`.

#### Scenario: Crawler fetches an embed

- **WHEN** `/embed/playground` or `/embed/bytecode` is loaded
- **THEN** the page's `robots` meta tag contains `noindex`

### Requirement: Playground embed link preview

`/embed/playground` SHALL describe itself identically for every snippet: document title `JSLab Embed | JSLab`, `og:title` `JSLab playground`, `og:type` `article`, `og:site_name` `JSLab`, `og:url` `<SITE_ORIGIN>/embed/playground` without the `s` value, and as `og:image` the social card `<SITE_ORIGIN>/og` (see `site-metadata`) titled `JSLab playground`, declared 1200×630.

#### Scenario: Unfurling a playground embed

- **WHEN** `/embed/playground?s=<state>` is fetched with `SITE_ORIGIN` at its default
- **THEN** `og:url` is `https://jslab.su/embed/playground`
- **AND** `og:image` is `https://jslab.su/og?title=JSLab+playground&subtitle=Run+a+snippet+across+V8%2C+SpiderMonkey%2C+Hermes+and+JSC.`

### Requirement: Bytecode embed link preview

`/embed/bytecode` SHALL be titled by its snapshot: the caption, trimmed, or `JSLab bytecode` without a caption or a readable snapshot. The document title is that text plus ` | JSLab`; `og:title` is the text alone. `og:type` is `article`, `og:url` is the embed's own URL with its `b` value, and `og:image` is the social card `/og` (see `site-metadata`) with that title and, for a readable snapshot, the source text as `subtitle`, the engine as `engine` and the output's line count as `lines`.

#### Scenario: Snapshot with a caption

- **WHEN** the snapshot has the caption `Adding two smis`, the source `1 + 1`, engine `v8` and a three-line output ending in a newline
- **THEN** the document title is `Adding two smis | JSLab` and `og:title` is `Adding two smis`
- **AND** `og:image` is `<origin>/og?title=Adding+two+smis&subtitle=1+%2B+1&engine=v8&lines=4`

#### Scenario: No readable snapshot

- **WHEN** `/embed/bytecode` is fetched without `b`
- **THEN** the document title is `JSLab bytecode | JSLab`
- **AND** `og:image` is `<origin>/og?title=JSLab+bytecode`

### Requirement: Embed canonical links

Neither embed page declares a canonical link of its own, so both SHALL carry the site-wide one (see `site-metadata`): a link to `SITE_ORIGIN`, not to the embed.

#### Scenario: Playground embed

- **WHEN** `/embed/playground?s=<state>` is fetched with `SITE_ORIGIN` at its default
- **THEN** the canonical link is `https://jslab.su`

#### Scenario: Bytecode embed

- **WHEN** `/embed/bytecode?b=<payload>` is fetched with `SITE_ORIGIN` at its default
- **THEN** the canonical link is `https://jslab.su`

### Requirement: Bytecode embed origin

The absolute URLs `/embed/bytecode` emits about itself — `og:url`, `og:image` and the oEmbed discovery link — SHALL be built on the origin the request arrived at, not on `SITE_ORIGIN`. The host MUST be taken from `X-Forwarded-Host`, else `Host`, else `jslab.su`; the scheme from `X-Forwarded-Proto`, else `http` when the host starts with `localhost`, else `https`.

#### Scenario: Behind the ingress

- **WHEN** the request carries `Host: frontend:3000`, `X-Forwarded-Host: jslab.su` and `X-Forwarded-Proto: https`
- **THEN** `og:url` starts with `https://jslab.su/embed/bytecode`

#### Scenario: Local development

- **WHEN** the request carries `Host: localhost:3000` and no forwarding headers
- **THEN** `og:url` starts with `http://localhost:3000/embed/bytecode`

### Requirement: oEmbed discovery

`/embed/bytecode` SHALL carry a `<link rel="alternate" type="application/json+oembed" title="JSLab bytecode">` whose `href` is `<origin>/embed/oembed?format=json&url=<the embed's own URL, percent-encoded>`. The link MUST be present even when the snapshot is absent or unreadable. `/embed/playground` carries no discovery link.

#### Scenario: Embed with a snapshot

- **WHEN** `/embed/bytecode?b=<payload>` is loaded
- **THEN** the discovery link's `url` value decodes to `<origin>/embed/bytecode?b=<payload>`

#### Scenario: Embed without a snapshot

- **WHEN** `/embed/bytecode` is loaded without `b`
- **THEN** the page still carries a discovery link whose `href` contains `/embed/oembed?format=json&url=`

### Requirement: oEmbed response format

`GET /embed/oembed` SHALL answer in JSON only. A `format` parameter that is present, non-empty and not `json` MUST be answered with status 501 and `{ error }` before any other parameter is examined.

#### Scenario: XML is requested

- **WHEN** the request is `?format=xml&url=https://jslab.su/embed/playground`
- **THEN** the response is 501 with `error` equal to `format "xml" is not supported`

#### Scenario: Unsupported format without a URL

- **WHEN** the request is `?format=xml` with no `url`
- **THEN** the response is 501, not 400

#### Scenario: JSON or no format

- **WHEN** `format` is `json` or is omitted
- **THEN** the request is served

### Requirement: oEmbed target validation

The `url` parameter SHALL be an absolute URL of an embed on the host the request was addressed to — the `X-Forwarded-Host` header when present, otherwise the request URL's host, port included. A missing or empty `url`, or one that is not an absolute URL, MUST be answered 400; a `url` on another host, or whose path is not exactly `/embed/playground` or `/embed/bytecode`, MUST be answered 404. Error bodies are `{ error: <message> }`. The scheme of `url` is not compared.

#### Scenario: URL missing

- **WHEN** the request has no `url`
- **THEN** the response is 400 with `error` equal to `url parameter is required`

#### Scenario: URL is not absolute

- **WHEN** `url` is `/embed/playground`
- **THEN** the response is 400 with `error` equal to `url is not a valid absolute URL`

#### Scenario: Foreign host

- **WHEN** `url` is `https://evil.example/embed/playground`
- **THEN** the response is 404 with `error` equal to `url does not belong to this site`

#### Scenario: Path that is not an embed

- **WHEN** `url` is `https://jslab.su/playground` or `https://jslab.su/embed/playground/`
- **THEN** the response is 404 with `error` equal to `url is not an embeddable JSLab view`

#### Scenario: Request arrives through a proxy

- **WHEN** the request carries `X-Forwarded-Host: jslab.su` and `url` is `https://jslab.su/embed/playground`
- **THEN** the response is 200

### Requirement: oEmbed snapshot presence

A `/embed/bytecode` URL without a `b` value SHALL be refused with 404 and `{ error: "bytecode embed is missing its snapshot" }`. A `b` value that is present but unreadable MUST NOT be refused: it is answered 200 as a bytecode embed without snapshot details.

#### Scenario: Snapshot missing

- **WHEN** `url` is `https://jslab.su/embed/bytecode`
- **THEN** the response is 404 with `error` equal to `bytecode embed is missing its snapshot`

#### Scenario: Snapshot unreadable

- **WHEN** `url` is `https://jslab.su/embed/bytecode?b=9abc`
- **THEN** the response is 200 with `title` `JSLab bytecode` and `height` 420
- **AND** `thumbnail_url` is `https://jslab.su/og?title=JSLab+bytecode`

### Requirement: oEmbed document

A valid request SHALL be answered 200 with a JSON object holding `version: "1.0"`, `type: "rich"`, `provider_name: "JSLab"`, `provider_url` (the request URL's scheme plus the host the request was addressed to), `title`, `thumbnail_url`, `thumbnail_width: 1200`, `thumbnail_height: 630`, `width`, `height` and `html`. `title` MUST be `JSLab playground` for a playground embed and `JSLab bytecode` for a bytecode embed, whatever caption the snapshot carries.

#### Scenario: Playground embed

- **WHEN** `url` is `https://jslab.su/embed/playground?s=abc`
- **THEN** the response is 200 with `version` `1.0`, `type` `rich`, `provider_name` `JSLab` and `provider_url` `https://jslab.su`
- **AND** `title` is `JSLab playground`

#### Scenario: Bytecode embed with a caption

- **WHEN** `url` is a bytecode embed whose snapshot carries the caption `My caption`
- **THEN** `title` is `JSLab bytecode`

### Requirement: oEmbed frame markup

`html` SHALL be one `<iframe>` whose `src` is the requested `url` with an empty `referrer` query parameter appended and every other parameter kept, whose `width` and `height` attributes equal the document's `width` and `height`, and which carries the document's `title`, `loading="lazy"` and `allow="clipboard-write"`. The `referrer` slot is left for the consumer to fill; the widgets do not read it.

#### Scenario: Playground embed

- **WHEN** `url` is `https://jslab.su/embed/playground?s=abc`
- **THEN** `html` contains `<iframe src="https://jslab.su/embed/playground?s=abc&referrer="`

#### Scenario: Bytecode embed

- **WHEN** `url` is a bytecode embed with a snapshot
- **THEN** the frame's `src` keeps the `b` value and carries `referrer` with an empty value

### Requirement: oEmbed dimensions

`width` SHALL be `maxwidth` rounded down and clamped to 240–1200, or 680 when `maxwidth` is absent, blank or not a number. `height` SHALL be `maxheight` rounded down and clamped to 160–900, or the embed's natural height when `maxheight` is absent, blank or not a number. A requested maximum is thus used as the size itself, and a maximum below the lower bound is exceeded.

#### Scenario: Oversized request

- **WHEN** `maxwidth` and `maxheight` are both `9000`
- **THEN** `width` is 1200 and `height` is 900

#### Scenario: Undersized request

- **WHEN** `maxwidth` and `maxheight` are both `100`
- **THEN** `width` is 240 and `height` is 160

#### Scenario: Fractional request

- **WHEN** `maxwidth` is `300.9` and `maxheight` is `250`
- **THEN** `width` is 300 and `height` is 250

#### Scenario: No usable request

- **WHEN** `maxwidth` is `abc` and `maxheight` is empty for a playground embed
- **THEN** `width` is 680 and `height` is 520

### Requirement: Natural embed height

The natural height SHALL be 520 for a playground embed and 420 for a bytecode embed whose snapshot is unreadable. For a readable snapshot it MUST be 19 per line of captured output plus 84, kept within 220–520; lines are the newline-separated segments of the output, so a trailing newline adds one, and an empty output counts as none.

#### Scenario: Short dump

- **WHEN** the captured output is three lines ending in a newline
- **THEN** `height` is 220

#### Scenario: Long dump

- **WHEN** the captured output is 400 lines long
- **THEN** `height` is 520

#### Scenario: Empty dump

- **WHEN** the captured output is empty
- **THEN** `height` is 220

### Requirement: oEmbed thumbnail

`thumbnail_url` SHALL be the social card `/og` (see `site-metadata`) on the same origin as `provider_url`, with `title` set to the document's `title`. For a readable bytecode snapshot it MUST also carry `subtitle` (the snapshot's source text, clamped to the card's subtitle limit), `engine` (the snapshot's engine key) and `lines` (the number of newline-separated segments of the captured output).

#### Scenario: Playground embed

- **WHEN** `url` is `https://jslab.su/embed/playground`
- **THEN** `thumbnail_url` is `https://jslab.su/og?title=JSLab+playground`

#### Scenario: Bytecode embed

- **WHEN** the snapshot has the source `1 + 1`, engine `v8` and a three-line output ending in a newline
- **THEN** `thumbnail_url` carries `subtitle` `1 + 1`, `engine` `v8` and `lines` `4`

#### Scenario: Empty dump

- **WHEN** the snapshot's captured output is empty
- **THEN** `thumbnail_url` carries `lines` `1`

### Requirement: oEmbed response headers

A 200 response SHALL carry `Cache-Control: public, max-age=3600` and `Access-Control-Allow-Origin: *`. The provider gives its error responses neither of the two.

#### Scenario: Successful lookup

- **WHEN** a valid playground embed URL is looked up
- **THEN** the response carries `Access-Control-Allow-Origin: *` and a `Cache-Control` containing `max-age=3600`

#### Scenario: Refused lookup

- **WHEN** a lookup is answered 400, 404 or 501
- **THEN** the response has no `Access-Control-Allow-Origin` header and is not marked `public, max-age=3600`

### Requirement: Framing by third-party sites

On the production ingress, every response under the `/embed` path prefix SHALL carry `Content-Security-Policy: frame-ancestors *` and MUST NOT carry `X-Frame-Options`, so that any site can frame the widgets. Every other path of the site is answered with `X-Frame-Options: DENY`. The frontend itself sets no framing header.

#### Scenario: Widget requested through the ingress

- **WHEN** `/embed/playground` is requested through the ingress
- **THEN** the response carries `Content-Security-Policy: frame-ancestors *` and no `X-Frame-Options`

#### Scenario: Full playground requested through the ingress

- **WHEN** `/playground` is requested through the ingress
- **THEN** the response carries `X-Frame-Options: DENY`
