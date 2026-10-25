# Spec Delta

## Purpose

The JSLab article series on the site itself, as seen by a reader and a search engine: where the articles are linked from, the list and article pages, how an article's Markdown, output snapshots and runnable exercise are shown, and which pages are indexed.

## ADDED Requirements

### Requirement: Header link

The site header SHALL show an `Articles` link to `/articles`, in the desktop navigation and in the mobile navigation dialog. It is a plain link, not a section menu. It MUST read as active on `/articles` and every page below it.

#### Scenario: Desktop header

- **WHEN** any page with the site header is loaded at a desktop width
- **THEN** the header shows `Articles` next to the section menus
- **AND** activating it opens `/articles`

#### Scenario: Active on an article

- **WHEN** `/articles/why-jslab-exists` is loaded
- **THEN** the `Articles` link reads as active

### Requirement: Article routes

Each article SHALL be served in English at `/articles/<slug>`. The site has no other language version. The slug is the article's file name without its leading number and `.md`, so `01-why-jslab-exists.md` is `why-jslab-exists`. A slug that names no article MUST be answered by the site's not-found page.

#### Scenario: Article page

- **WHEN** `/articles/why-jslab-exists` is requested
- **THEN** it answers 200 with the English text

#### Scenario: No Russian pages

- **WHEN** `/ru/articles` or `/ru/articles/why-jslab-exists` is requested
- **THEN** the response is 404 with the site's not-found page

#### Scenario: Unknown slug

- **WHEN** `/articles/no-such-article` is requested
- **THEN** the response is 404 with the site's not-found page

### Requirement: Article list pages

`/articles` SHALL list every article in series order (by the file's leading number). Each entry shows the article's title, linked to its page, and its description.

#### Scenario: Series order

- **WHEN** `/articles` is loaded
- **THEN** the first entry is `Why I built JSLab: From JavaScript explanations to evidence`, linked to `/articles/why-jslab-exists`
- **AND** the entries follow the numbers 01, 02, 03 and onwards

### Requirement: Article page content

An article page SHALL show the article's front-matter title as its heading, its description below it, and the Markdown body rendered as formatted text: headings, paragraphs, emphasis, inline code, links, ordered, unordered and task lists, tables, block quotes and code blocks, JavaScript ones syntax-highlighted. The front matter itself MUST NOT appear in the text.

#### Scenario: Table and task list

- **WHEN** `/articles/how-to-investigate-javascript` is loaded
- **THEN** its three-level table is rendered as a table
- **AND** its publishing checklist is rendered as unchecked, read-only checkboxes

#### Scenario: No front matter in the body

- **WHEN** any article page is loaded
- **THEN** no line of the page reads `status: draft` or `format:`

### Requirement: Link back to the list

Every article page SHALL link to `/articles` with the label `Articles` above its heading.

#### Scenario: Back to the list

- **WHEN** `/articles/one-program-many-engines` is loaded
- **THEN** it links to `/articles` with the label `Articles`

### Requirement: Snapshots in articles

A paragraph that consists only of a bytecode-embed snapshot URL (`https://jslab.su/embed/bytecode?b=<snapshot>`) SHALL be shown in place as the snapshot itself, inside the page and not in a frame: the engine's label, the caption and the output, highlighted and annotated with the opcode reference exactly as the bytecode embed shows them (see `embed`), with the embed's link to open the snippet in the playground. A snapshot that cannot be read is shown as a plain link to its URL.

#### Scenario: V8 snapshot

- **WHEN** `/articles/stack-accumulator-registers` is loaded
- **THEN** below the sentence introducing V8's bytecode for `f` the page shows `V8`, the caption `14.9.0 · --print-bytecode --print-bytecode-filter=f · 2026-10-19` and the line `Ldar a1`
- **AND** the page contains no `iframe`

#### Scenario: Opcode reference

- **WHEN** the reader activates `Ldar` in that snapshot
- **THEN** the opcode's reference opens, as in the playground

### Requirement: Editors in articles

A paragraph that consists only of a playground-state embed URL (`https://jslab.su/embed/bytecode?s=<state>`) SHALL be shown in place as a runnable editor with the state's source, engines and flags: an editable editor, a `Run` control and one output tab per engine, behaving as the playground embed's controls do (see `embed`). Running it MUST NOT change what `/playground` shows when the reader opens it afterwards.

#### Scenario: Closing exercise

- **WHEN** the reader edits the editor under the exercise of `/articles/deoptimization` and presses `Run`
- **THEN** the edited source runs on V8 with `--allow-natives-syntax` and `--trace-deopt` and the output appears below the editor

#### Scenario: Playground after an article

- **WHEN** the reader runs the article's editor and then follows the header to `/playground`
- **THEN** the playground shows the state it would show without the article visit

### Requirement: Article page metadata

An article page SHALL have the title `<article title> | JSLab`, its front-matter description as the `description` and the social-card description, a canonical link to its own path on `SITE_ORIGIN`, no `hreflang` alternates, and a social card showing the title and description.

#### Scenario: English article

- **WHEN** `/articles/deoptimization` is loaded with `SITE_ORIGIN` at its default
- **THEN** its canonical link is `https://jslab.su/articles/deoptimization`
- **AND** it carries no `hreflang` alternates

### Requirement: List page metadata

`/articles` SHALL have the title `Articles | JSLab`, a description of the series and a canonical link to its own path on `SITE_ORIGIN`.

#### Scenario: List page

- **WHEN** `/articles` is loaded with `SITE_ORIGIN` at its default
- **THEN** its title is `Articles | JSLab` and its canonical link is `https://jslab.su/articles`

### Requirement: Draft articles are not indexed

An article whose front matter has `status: draft` SHALL be served normally but carry `<meta name="robots" content="noindex">`; an article with `status: published` carries no such tag. A list page MUST carry `noindex` while it lists no published article.

#### Scenario: Draft article

- **WHEN** an article page with `status: draft` is loaded
- **THEN** the response is 200 and its `robots` meta tag is `noindex`

#### Scenario: List with only drafts

- **WHEN** every article is a draft and `/articles` is loaded
- **THEN** its `robots` meta tag is `noindex`
