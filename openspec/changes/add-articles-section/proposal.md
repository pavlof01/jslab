# Proposal

## Why

The 22 bilingual JSLab articles live only in the repository's `articles/` folder and reach readers through Medium, where every engine output is an Embedly iframe. They belong on jslab.su itself, next to the tools they use: a reader should be able to go from the header to an article, read it with the output rendered by the site's own components, and run the closing exercise without leaving the page.

## What Changes

- A top-level **Articles** link in the site header (desktop and mobile navigation) opens `/articles`, the list of all articles in series order.
- Each article gets a page in both languages: English at `/articles/<slug>`, Russian at `/ru/articles/<slug>`, with a link to the other language on every article page and on the list pages (`/articles`, `/ru/articles`).
- An article page renders the article's Markdown: headings, paragraphs, lists, task lists, tables, block quotes and highlighted code blocks.
- A snapshot line (`https://jslab.su/embed/bytecode?b=…`) in an article is rendered in place as a native snapshot view: the same output view, highlighting and opcode reference as the bytecode embed, with the version, flags and capture date in its header and an **Open in JSLab** link. An editor line (`…/embed/bytecode?s=…`) is rendered as a runnable editor with the article's code, engines and flags, under the closing exercise.
- Every article page and list page carries its own title, description, canonical link, a `hreflang` alternate to the other language and a social card. An article whose front matter says `status: draft` is served with `noindex` and stays out of the sitemap; a list page is indexed only while it lists at least one published article.
- The article sources move from the repository root (`articles/`) into the frontend application, so the frontend image, which builds from `apps/frontend`, can render them. The Medium workflow (`embeds.mjs`, `captures/`, the Medium-ready Markdown) moves with them unchanged.

## Capabilities

### New Capabilities

- `articles`: the article list and article pages on the site — routes and languages, the header link, Markdown rendering, in-article snapshots and editors, and per-page metadata and indexing rules.

### Modified Capabilities

- `site-metadata`: the sitemap is no longer a fixed list of five URLs; it adds the article list pages and the published article pages under the indexing rules of `articles`.

## Impact

- Frontend (`apps/frontend/src`): new routes `app/articles/` and `app/ru/articles/`, an article loader and Markdown renderer, a header change (`components/Header`, `lib/tools.ts`), `app/sitemap.ts`, and reuse of the snapshot view and the embed playground's editor, output pane and run button.
- Content: `articles/` moves to `apps/frontend/src/content/articles/`; `articles/tools/embeds.mjs` keeps working from its new location, and the root ESLint no longer covers it (the frontend's does).
- Dependencies: a Markdown parser for the frontend (`marked`).
- Build: article pages are generated at build time, so the production image needs no access to the Markdown files at run time. No change to the API gateway, engine services, infrastructure or the existing embed pages.
