# Design

## Context

The series is 22 EN/RU Markdown pairs in `articles/` at the repo root, each with front matter (`title`, `description`, `tags`, `status`), a body written for Medium, and embed lines that `articles/tools/embeds.mjs` keeps in sync: `?b=` snapshots built from `articles/captures/` and one `?s=` editor under the closing exercise. The frontend image builds from `apps/frontend` only (`COPY src ./`), runs with `output: "standalone"`, and ships `.next`, `public` and production `node_modules` — no source files. The header's navigation is three section menus built from `NAV_GROUPS` in `lib/tools.ts`. The snapshot view (`EmbedBytecodeView`) and the playground embed (`EmbedPlaygroundShell`, fed by `useSharedStateRestore` from the page URL) already exist, but both are full-viewport pages. The run store (`useEngineOutputs`) is one module-level Zustand store with no persistence.

## Goals / Non-Goals

**Goals:**

- One source of truth: the Markdown files that go to Medium are the files the site renders; no second copy, no conversion step.
- Article pages are static HTML generated at build time, with client JavaScript only for the snapshot views' highlighting and the exercise editor.
- Reuse the existing snapshot and embed-playground components rather than parallel versions.

**Non-Goals:**

- No CMS, no runtime fetching of articles, no comments, search or RSS.
- No change to the Medium workflow, to `/embed/*`, or to the oEmbed provider.
- No Russian on the site: the Russian texts in `content/articles/ru/` stay for Medium, the site serves English only.

## Decisions

### Content moves to `apps/frontend/src/content/articles/`

The whole `articles/` tree (`en/`, `ru/`, `captures/`, `tools/`, `linkedin/`, the two READMEs) moves with `git mv`, so history follows. `embeds.mjs` resolves paths relative to itself and keeps working; the npm script or command line that calls it changes path only. Alternative considered: keep `articles/` at the root and copy it into the image in the Dockerfile — rejected because the frontend build context is `apps/frontend`, and widening it to the repo root for one folder would change every frontend build.

The root ESLint ignores `apps/frontend/**`, so `embeds.mjs` becomes the frontend ESLint's responsibility; the frontend config gets an override (or an ignore) for `content/**/tools/*.mjs` so Next's rules do not apply to a Node script.

### Static generation, no runtime file access

`app/articles/[slug]/page.tsx` exports `generateStaticParams` over the loaded articles with `dynamicParams = false`; the list pages and `sitemap.ts` are `force-static`. Everything that reads the Markdown runs at build time, so the standalone image never touches `content/`. Alternative: read files at request time — rejected, the runner image does not contain them.

A loader module (`lib/articles/`) reads `content/articles/en/` once, parses front matter (a small parser for the flat `key: value` / `- item` YAML the files use, rather than a YAML dependency) and derives the slug from the file name.

### Markdown: `marked` lexer, rendered to React by our own components

`marked`'s lexer turns the body into tokens; a server component maps each token type to a component styled through the theme (`textStyle`, `layerStyle`, the `link` recipe) — no `dangerouslySetInnerHTML`, no raw HTML pass-through. GFM is enabled for tables and task lists. Alternatives: `react-markdown` + remark plugins (more dependencies, plugin layer for two custom node kinds), MDX (would make the Medium files non-portable). The lexer approach also makes the two embed kinds trivial: a paragraph whose only token is a link to `https://jslab.su/embed/bytecode?b=…` or `?s=…` becomes a custom node.

Code blocks are highlighted on the server with the existing Shiki setup (`lib/shiki.ts`, theme `ayu-dark`) into React elements, so JavaScript blocks ship as static coloured HTML; `text`/`sh` blocks render plain.

### Snapshots: the embed's view, made inline

`EmbedBytecodeView` is split into the view body (header with engine label, caption and the playground link, plus `HighlightedCode` with the snapshot's source for annotations) and its full-viewport frame. `/embed/bytecode` keeps the frame; the article renders the body inside a bordered `layerStyle="panel"` box with a capped height and its own scroll. The snapshot is decoded on the server with the existing `decodeSnapshot`; an undecodable one renders as a plain link (spec: Snapshots in articles). The opcode reference comes with `HighlightedCode`, so it behaves as in the playground.

### The exercise editor: the embed playground, seeded from props

`EmbedPlaygroundShell`'s editor, run button and output pane are reused inside an `ArticleEditor` client island with a fixed height. Instead of `useSharedStateRestore` (which reads `window.location`), the island receives the decoded share state as a prop and seeds the store on mount.

Because the run store is a single module-level store, the island takes a snapshot of the store's state when it mounts and restores it on unmount. That keeps the spec's promise that `/playground` after an article shows what it would have shown without the visit, both on a fresh load (the snapshot is the initial state) and when the reader came from an edited playground. Alternative: give the island its own store instance — rejected for now; it would mean threading a store context through every selector the shared components use.

The embed playground needs no flag catalog (it shows no flag pickers), so article pages make no build-time call to the API gateway.

### Routes, header and metadata

- Header: `lib/tools.ts` gains a top-level link entry (`/articles`, label `Articles`) beside `NAV_GROUPS`; `Nav` renders it as a plain link after the menus and `MobileNav` as a single row. Activity uses the same prefix test as the menus.
- Metadata per page via `generateMetadata`: title, description, canonical, `ogCardUrl(origin, { title, subtitle: description })`, and `robots: { index: false }` for drafts and for a list page without a published article.
- Sitemap: `app/sitemap.ts` appends the list pages and published articles from the same loader, so the indexing rule lives in one function used by both metadata and sitemap.

## Risks / Trade-offs

- [Medium-oriented text reads oddly on the site: “Try it in JSLab”, “paste the link into Medium”] → the article bodies already say “in the editor below” and “Open in JSLab”; the remaining JSLab self-references are links to the site and still make sense. Editorial notes (`README.md`, `EDITORIAL_REVIEW.md`) are not rendered.
- [A snapshot or editor URL that does not decode] → rendered as a plain link, and `embeds.mjs --check` already guards the files.
- [Build-time Shiki and `marked` add build time] → 44 pages of a few hundred lines each; measured during implementation, acceptable if the frontend build stays within its current order of magnitude.
- [Store snapshot/restore races with an in-flight run] → the island aborts nothing it does not own; a run started in the article that finishes after unmount writes into the restored state. Mitigation: the island ignores results whose run id it started after it has unmounted (the store already tracks overlapping runs per the playground spec).
- [Moving `articles/` breaks links in commit messages, the wiki or memory notes that point at `articles/…`] → acceptable; `git log --follow` keeps history, and README links inside the folder are relative.

## Migration Plan

Ship as one release: move the content, add the routes, header link and sitemap entries. Rollback is a revert; no data or infrastructure changes. All articles start as `status: draft`, so nothing new is indexed until an article's front matter is switched to `status: published`.
