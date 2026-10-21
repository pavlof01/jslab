# Tasks

## 1. Move the content

- [x] 1.1 `git mv articles apps/frontend/src/content/articles` and verify `git status` shows renames, not deletions plus additions
- [x] 1.2 Update every reference to the old path (root `.gitignore`/`.prettierignore` entries if any, `CLAUDE.md`, the articles' own `README.md` and `EDITORIAL_REVIEW.md` commands) and verify `grep -rn "articles/tools\|articles/captures" --exclude-dir=node_modules .` finds only the new path
- [x] 1.3 Make the frontend ESLint accept `content/articles/tools/embeds.mjs` (Node globals, no Next rules) and verify `node apps/frontend/src/content/articles/tools/embeds.mjs --check` and `npm run lint` in `apps/frontend/src` both pass

## 2. Article loader

- [x] 2.1 Add `marked` to the frontend's dependencies and verify `npm ci` in `apps/frontend/src` succeeds with the lockfile updated
- [x] 2.2 Implement the loader (`lib/articles/`): read `en/` and `ru/`, parse front matter, derive slugs and series order, fail on a missing language twin; verify with Jest tests over the real content (22 slugs per language, `why-jslab-exists` first, both languages share slugs, front matter absent from bodies)
- [x] 2.3 Implement the indexing rule (draft → not indexed; a list is indexed only with a published article) as one function and verify Jest tests for an all-draft set and a set with one published article

## 3. Markdown rendering

- [x] 3.1 Implement the token-to-component renderer for headings, paragraphs, emphasis, inline code, links, ordered/unordered/task lists, tables, block quotes and code blocks, with server-side Shiki for `js`; verify Jest render tests for a table, a task list and a highlighted JavaScript block
- [x] 3.2 Recognise paragraphs that consist only of a `https://jslab.su/embed/bytecode?b=…` or `?s=…` URL as snapshot or editor nodes, falling back to a plain link when the state does not decode; verify Jest tests for each kind and for a corrupt value

## 4. Snapshots and the exercise editor

- [x] 4.1 Split `EmbedBytecodeView` into a reusable snapshot body and the full-viewport frame, keep `/embed/bytecode` unchanged, and verify the existing `EmbedBytecodeView` tests still pass
- [x] 4.2 Render the snapshot body inline in articles (panel, capped height, own scroll) and verify a Jest test that a decoded snapshot shows the engine label, caption and output with no `iframe`
- [x] 4.3 Build the `ArticleEditor` island from the embed playground's editor, run button and output pane, seeded from the decoded state and restoring the run store's previous state on unmount; verify Jest tests that it starts with the state's code, engines and flags and that the store returns to its prior state after unmount

## 5. Pages, header and metadata

- [x] 5.1 Add `/articles` and `/ru/articles` list pages and `/articles/[slug]`, `/ru/articles/[slug]` with `generateStaticParams` and `dynamicParams = false`, the language switch and `lang="ru"` on Russian text; verify Jest tests for list order, the language links and a 404 for an unknown slug
- [x] 5.2 Add `generateMetadata` for list and article pages (title, description, canonical, `hreflang` alternates, social card, `noindex` per the indexing rule) and verify Jest tests against the `articles` spec scenarios
- [x] 5.3 Add the top-level `Articles` link to `lib/tools.ts`, `Nav` and `MobileNav` with the active state for `/articles` and `/ru/articles`; verify the header tests cover the link and its active state
- [x] 5.4 Extend `app/sitemap.ts` with the list pages and published articles and verify the sitemap test for the all-draft case (exactly five URLs) and for one published article
- [x] 5.5 Update `CLAUDE.md` (frontend pages table, content location, how to publish an article) and the articles' `README.md` (articles are also served on jslab.su; `status: published` makes a page indexable) and verify both describe the paths that now exist

## 6. Verification

- [x] 6.1 Run `npm run build` in `apps/frontend/src` and verify 44 article pages and 2 list pages are prerendered and the build has no warnings about dynamic routes
- [x] 6.2 Run the production build locally, open `/articles`, an English and a Russian article, a snapshot's opcode reference and the exercise editor, then `/playground`, and verify the behaviour of every `articles` scenario in a browser
- [x] 6.3 Run `npm run ci` at the repo root and `npm run lint` and `npm test` in `apps/frontend/src`, and verify all pass
- [x] 6.4 Run `npm run specs:check` and verify the change validates
