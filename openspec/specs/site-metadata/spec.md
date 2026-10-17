# site-metadata Specification

## Purpose

What crawlers, social networks and browsers are given besides the pages themselves: the generated social card at `/og`, each page's title, description, canonical link and Open Graph/Twitter tags, `robots.txt`, `sitemap.xml`, and the icon and manifest links. The embed pages' own tags are specified by the `embed` capability.

## Requirements

### Requirement: Site origin

Absolute URLs in canonical links, Open Graph tags, `robots.txt` and `sitemap.xml` SHALL be built on `SITE_ORIGIN` (default `https://jslab.su`), taken with surrounding whitespace and one trailing slash removed. A value that is not an absolute URL MUST make the frontend fail with an error naming `SITE_ORIGIN` rather than emit relative URLs.

#### Scenario: Default origin

- **WHEN** `SITE_ORIGIN` is not set
- **THEN** the playground's canonical link is `https://jslab.su/playground`

#### Scenario: Origin with padding and a trailing slash

- **WHEN** `SITE_ORIGIN` is `  https://staging.jslab.su/  `
- **THEN** URLs are built on `https://staging.jslab.su`

#### Scenario: Origin without a scheme

- **WHEN** `SITE_ORIGIN` is `jslab.su`
- **THEN** the frontend fails with an error containing `SITE_ORIGIN is not a valid absolute URL`

#### Scenario: Blank origin

- **WHEN** `SITE_ORIGIN` is three spaces
- **THEN** the frontend fails with the same error

### Requirement: Social card image

`GET /og` SHALL answer 200 with a 1200×630 PNG (`Content-Type: image/png`) and `Cache-Control: public, max-age=86400`. The card shows the wordmark `JSLAB`, a title, a subtitle when one is given, up to two badges and the host of `SITE_ORIGIN`. Its four query parameters — `title`, `subtitle`, `engine` and `lines` — are all optional, and a value the card cannot use MUST be ignored, never rejected.

#### Scenario: No parameters

- **WHEN** `/og` is requested without a query
- **THEN** the response is 200 with a 1200×630 PNG and `Cache-Control: public, max-age=86400`
- **AND** the card shows the title `Explore JS Engines`, no subtitle, no badge and the host `jslab.su`

#### Scenario: Every parameter

- **WHEN** `/og?title=Hello&subtitle=1%20%2B%201&engine=v8&lines=4` is requested
- **THEN** the card shows the title `Hello`, the subtitle `1 + 1` and the badges `V8` and `4 lines`

#### Scenario: Unusable values

- **WHEN** `/og?engine=quickjs&lines=abc` is requested
- **THEN** the response is the same image as for `/og` without a query

### Requirement: Card text clamping

`title` and `subtitle` SHALL each be reduced to one line: runs of whitespace become a single space and both ends are trimmed. Text longer than its limit — 72 characters for `title`, 168 for `subtitle` — MUST be cut to at most one character less than the limit, backed up to the last space when that space lies beyond half the limit, and finished with `…`. A missing or blank `title` becomes `Explore JS Engines`; a missing or blank `subtitle` is left out.

#### Scenario: Long title without spaces

- **WHEN** `title` is 100 `x` characters
- **THEN** the card shows 71 `x` characters followed by `…`

#### Scenario: Long title with spaces

- **WHEN** `title` is the word `word` twenty times, separated by spaces
- **THEN** the card shows the first fourteen words followed by `…`, 70 characters in all

#### Scenario: Title at the limit

- **WHEN** `title` is exactly 72 characters long
- **THEN** it is shown unchanged

#### Scenario: Line breaks and repeated spaces

- **WHEN** `title` is `a`, a line break, two spaces and `b`
- **THEN** the card shows `a b`

#### Scenario: Blank title

- **WHEN** `title` is two spaces
- **THEN** the card shows `Explore JS Engines`

#### Scenario: Long subtitle

- **WHEN** `subtitle` is 300 `y` characters
- **THEN** the card shows 167 `y` characters followed by `…`

### Requirement: Card badges

An `engine` parameter equal to `v8`, `sm`, `hermes` or `jsc` SHALL add a badge with the engine's label — `V8`, `SpiderMonkey`, `Hermes` or `JSC`; any other value, a different letter case included, adds none. A `lines` parameter that is a finite number greater than 0 SHALL add a badge reading `<n> lines`, with `n` rounded down; any other value adds none.

#### Scenario: Engine and line count

- **WHEN** `/og?engine=sm&lines=12` is requested
- **THEN** the card shows the badges `SpiderMonkey` and `12 lines`

#### Scenario: Unknown engine

- **WHEN** `engine` is `quickjs` or `V8`
- **THEN** the card has no engine badge

#### Scenario: Line count that is not a positive number

- **WHEN** `lines` is `abc`, `0` or `-3`
- **THEN** the card has no line-count badge

#### Scenario: Fractional line count

- **WHEN** `lines` is `3.7`
- **THEN** the badge reads `3 lines`

#### Scenario: Fraction below one

- **WHEN** `lines` is `0.5`
- **THEN** the badge reads `0 lines`

#### Scenario: Single line

- **WHEN** `lines` is `1`
- **THEN** the badge reads `1 lines`

### Requirement: Card references

Wherever the site refers to the card — a page's `og:image` and `twitter:image`, the oEmbed `thumbnail_url` — the reference SHALL be an absolute `/og` URL whose `title` and `subtitle` are already clamped as the card would clamp them. A parameter MUST be left out when its text is blank, when no engine is given, or when the line count is not greater than 0. `og:image` references declare the card as 1200 wide and 630 high.

#### Scenario: Site-wide card

- **WHEN** a page carries the site-wide Open Graph tags with `SITE_ORIGIN` at its default
- **THEN** `og:image` is `https://jslab.su/og?title=Explore+JS+Engines&subtitle=Dive+deep+into+JavaScript+engine+internals.+Visualize+bytecode%2C+optimization+stages%2C+and+performance+across+V8%2C+SpiderMonkey%2C+JavaScriptCore%2C+and+Hermes.`
- **AND** `og:image:width` is `1200` and `og:image:height` is `630`

#### Scenario: Text over the limit

- **WHEN** the oEmbed provider builds a thumbnail for a snapshot whose source text is 400 characters long
- **THEN** the `subtitle` in `thumbnail_url` is 167 characters followed by `…`

#### Scenario: Nothing but a title

- **WHEN** the oEmbed provider builds a thumbnail for a playground embed
- **THEN** `thumbnail_url` is `<origin>/og?title=JSLab+playground`, with no `subtitle`, `engine` or `lines`

### Requirement: Page titles

Each page SHALL have its own document title. The tool pages render theirs with the suffix ` | JSLab`: `JavaScript Playground`, `V8 Compilation Pipeline`, `Type Conversion Visualizer` and `Equality Operators Visualizer`. The landing page's title is `Interactive ECMAScript Explorer`, without the suffix.

#### Scenario: Tool pages

- **WHEN** `/playground`, `/v8-pipeline`, `/type-conversion` and `/equality` are loaded
- **THEN** their titles are `JavaScript Playground | JSLab`, `V8 Compilation Pipeline | JSLab`, `Type Conversion Visualizer | JSLab` and `Equality Operators Visualizer | JSLab`

#### Scenario: Landing page

- **WHEN** `/` is loaded
- **THEN** its title is `Interactive ECMAScript Explorer`

### Requirement: Page descriptions

`/`, `/playground`, `/v8-pipeline`, `/type-conversion` and `/equality` SHALL each carry a `description` meta tag written for that page. A page that declares none MUST fall back to the site-wide description, `Explore JavaScript engines interactively — view bytecode, analyze execution stages, and compare performance across V8, SpiderMonkey, JavaScriptCore, and Hermes.`

#### Scenario: V8 pipeline

- **WHEN** `/v8-pipeline` is loaded
- **THEN** its description is `Step through every V8 compilation stage: lexer tokens, AST, Ignition bytecode, Maglev, and TurboFan.`

#### Scenario: Page without a description of its own

- **WHEN** a path that matches no page is loaded
- **THEN** the page carries the site-wide description

### Requirement: Canonical links

Each tool page SHALL carry a canonical link to its own path on `SITE_ORIGIN` — `/playground`, `/v8-pipeline`, `/type-conversion`, `/equality` — and the landing page one to `SITE_ORIGIN` itself, without a trailing slash. A canonical link MUST NOT carry the request's query string. A page that declares no canonical of its own carries a canonical link to `SITE_ORIGIN` as well.

#### Scenario: Tool page

- **WHEN** `/v8-pipeline` is loaded with `SITE_ORIGIN` at its default
- **THEN** its canonical link is `https://jslab.su/v8-pipeline`

#### Scenario: Landing page

- **WHEN** `/` is loaded with `SITE_ORIGIN` at its default
- **THEN** its canonical link is `https://jslab.su`

#### Scenario: Playground share link

- **WHEN** `/playground?s=<state>` is loaded
- **THEN** its canonical link is `https://jslab.su/playground`

#### Scenario: Page without a canonical of its own

- **WHEN** a path that matches no page is loaded with `SITE_ORIGIN` at its default
- **THEN** its canonical link is `https://jslab.su`

### Requirement: Not-found page

A path that matches no page SHALL be answered 404 with `<meta name="robots" content="noindex">`. Its head holds two `<title>` elements, `404: This page could not be found.` followed by the site-wide `JSLab — Explore JS Engines`.

#### Scenario: Unknown route

- **WHEN** `/definitely-not-a-page` is requested
- **THEN** the response is 404
- **AND** the page's `robots` meta tag is `noindex`

### Requirement: Site-wide Open Graph tags

A page that declares no Open Graph data of its own — `/playground`, `/v8-pipeline`, `/type-conversion` and `/equality` — SHALL carry the site-wide set: `og:title` `JSLab — Explore JS Engines`, `og:url` equal to `SITE_ORIGIN`, `og:site_name` `JSLab`, `og:locale` `en_US`, `og:type` `website`, the site's Open Graph description and the site-wide card as `og:image`, with the title as its alt text. These tags name the site, not the page, and MUST be identical on all four pages.

#### Scenario: V8 pipeline

- **WHEN** `/v8-pipeline` is loaded with `SITE_ORIGIN` at its default
- **THEN** `og:title` is `JSLab — Explore JS Engines`, `og:url` is `https://jslab.su` and `og:type` is `website`
- **AND** `og:description` is `Dive deep into JavaScript engine internals. Visualize bytecode, optimization stages, and performance across V8, SpiderMonkey, JavaScriptCore, and Hermes.`

### Requirement: Twitter tags

A page that declares no Twitter tags of its own SHALL get them from its Open Graph tags: `twitter:card` `summary_large_image`, with `twitter:title`, `twitter:description` and `twitter:image` copied from `og:title`, `og:description` and `og:image`.

#### Scenario: V8 pipeline

- **WHEN** `/v8-pipeline` is loaded
- **THEN** `twitter:card` is `summary_large_image` and `twitter:title` is `JSLab — Explore JS Engines`
- **AND** `twitter:image` equals `og:image`

### Requirement: Landing page social tags

`/` SHALL carry social tags of its own: `og:title` and `twitter:title` `JSLab | Interactive ECMAScript Explorer`, `og:description` and `twitter:description` `Explore ECMAScript internals with interactive traces, spec visualizers, and JavaScript engine tooling.`, `og:url` equal to `SITE_ORIGIN`, `og:type` `website`, `twitter:card` `summary_large_image`, and as `og:image` and `twitter:image` a card of its own.

#### Scenario: Landing page card

- **WHEN** `/` is loaded with `SITE_ORIGIN` at its default
- **THEN** `og:image` and `twitter:image` are `https://jslab.su/og?title=Interactive+ECMAScript+Explorer&subtitle=Interactive+traces%2C+spec+visualizers%2C+and+per-engine+bytecode.`

### Requirement: Site-wide head tags

Every page SHALL declare `<html lang="en">`, a viewport of `width=device-width, initial-scale=1` with no maximum scale, `theme-color` `#0C0D0E`, `color-scheme` `dark`, the author, creator and publisher `Pavlov Alexey` with the author link `https://github.com/pavlof01`, the category `developer tools`, a `google-site-verification` tag and a `keywords` tag. The landing page has a keyword list of its own; every other page MUST carry the site-wide list.

#### Scenario: Tool page

- **WHEN** `/v8-pipeline` is loaded
- **THEN** its viewport is `width=device-width, initial-scale=1`
- **AND** its `keywords` start with `Alexey Pavlov,JavaScript,V8,bytecode`

#### Scenario: Landing page

- **WHEN** `/` is loaded
- **THEN** its `keywords` start with `ECMAScript explorer,JavaScript engine internals`

### Requirement: Robots file

`GET /robots.txt` SHALL answer 200 with a plain-text file that allows every user agent to crawl every path and names the sitemap at `<SITE_ORIGIN>/sitemap.xml`. It MUST NOT disallow any path; the embed pages are kept out of indexes by their own `robots` meta tag (see `embed`).

#### Scenario: Default origin

- **WHEN** `/robots.txt` is requested with `SITE_ORIGIN` at its default
- **THEN** the body is `User-Agent: *`, `Allow: /` and `Sitemap: https://jslab.su/sitemap.xml`

### Requirement: Sitemap

`GET /sitemap.xml` SHALL answer 200 with an XML sitemap of exactly five URLs on `SITE_ORIGIN`, each with `changefreq` `weekly`: `/` at priority 1, `/playground` and `/v8-pipeline` at 0.9, `/type-conversion` and `/equality` at 0.8. No `lastmod` is given. The embed pages and `/og` MUST NOT be listed.

#### Scenario: Default origin

- **WHEN** `/sitemap.xml` is requested with `SITE_ORIGIN` at its default
- **THEN** it lists `https://jslab.su/`, `https://jslab.su/playground`, `https://jslab.su/v8-pipeline`, `https://jslab.su/type-conversion` and `https://jslab.su/equality`
- **AND** no entry is under `/embed`

### Requirement: Icon and manifest links

Every page SHALL link `/favicon.ico` (as icon and as shortcut icon), PNG icons of 16, 32, 48 and 96 pixels, `/icon.svg`, Apple touch icons of 180, 167 and 152 pixels, the mask icon `/safari-pinned-tab.svg` and the web manifest `/site.webmanifest`, and name `/mstile-150x150.png` as `msapplication-TileImage`. Each linked file MUST be served from the site root.

#### Scenario: Page head

- **WHEN** `/v8-pipeline` is loaded
- **THEN** its head has `<link rel="manifest" href="/site.webmanifest">`
- **AND** `<link rel="icon" href="/favicon-32x32.png" sizes="32x32" type="image/png">`
- **AND** `<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" type="image/png">`

### Requirement: Web manifest

`/site.webmanifest` SHALL describe the site as an installable app: `name` `JSLab — Explore JS Engines`, `short_name` `JSLab`, `start_url` `/`, `display` `standalone` and three icons — `/android-chrome-192x192.png` and `/android-chrome-512x512.png` with purpose `any`, and `/maskable-icon-512x512.png` with purpose `maskable`.

#### Scenario: Manifest is fetched

- **WHEN** `/site.webmanifest` is requested
- **THEN** its `start_url` is `/` and its `display` is `standalone`
- **AND** its icons are 192×192, 512×512 and a maskable 512×512
