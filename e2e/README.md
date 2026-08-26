# End-to-end tests

Browser tests (Playwright) against a **running stack**. This is the only layer
that traverses every seam at once — real browser → real Monaco → Next.js proxy →
API gateway → engine service → real engine binary → back — which no jsdom render
or `app.inject` test can reach.

**113 tests in 16 files.**

## What each file covers

| File                         | Flow                                                                                                                                                                                                                                                                                                                  |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `playground-run.spec.ts`     | Run a snippet → V8 bytecode; ⌘/Ctrl+Enter in the real editor; empty editor refused without a request; the aria-live announcement; the duration footer; a repeat run served from cache; a syntax error surfaced                                                                                                        |
| `playground-engines.spec.ts` | V8 pinned on; enabling/disabling an engine adds and removes its tab; all four engines answering through the full path; the ok/stderr tab marker; the active tab surviving a toggle                                                                                                                                    |
| `playground-flags.spec.ts`   | The V8 picker and its count; picking `--print-ast` changes the output; a separate picker per enabled engine; flags the allowlist refused reported as a notice                                                                                                                                                         |
| `playground-samples.spec.ts` | Loading a built-in sample and a V8-internals sample; save → rename → delete a custom snippet; duplicate names refused; custom snippets surviving a reload                                                                                                                                                             |
| `playground-history.spec.ts` | Empty state; a run recorded and restored into the editor; a refused run not recorded; clearing; the engine selection restored too; survival across a reload                                                                                                                                                           |
| `playground-share.spec.ts`   | Copy link → reopen in a fresh page → code, engines and flags restored; the embed snippet; the article link enabled only once there is output; the snapshot rendering in the bytecode embed; a legacy flat-array link still opening                                                                                    |
| `playground-view.spec.ts`    | The diff toggle against the previous run; opcode popovers; the V8 intrinsics reference; the pre-run empty state                                                                                                                                                                                                       |
| `spec-visualizer.spec.ts`    | Both visualizers: presets, the `+` operator, stepping by button and by arrow key, playback to the end, pause on manual select, unparseable input, the spec-panel highlight, the operation picker, every advertised operation, retracing                                                                               |
| `pipeline.spec.ts`           | Every stage listed; client-side tokenizing; bytecode and AST filled from real d8 runs; switching stages without re-running; per-stage status; the hint on a stage a cold function never reaches                                                                                                                       |
| `embed.spec.ts`              | The playground embed running without site chrome; the back-link; the undecodable-snapshot state; oEmbed discovery in the head; `noindex`; the oEmbed provider's document, refusals (foreign host, non-embeddable path, missing snapshot, unsupported format) and dimension clamping                                   |
| `api-proxy.spec.ts`          | The Next route handlers over real HTTP: run forwarding, dropped flags, unknown engine, malformed JSON, method refusal, the source cap, caching, every engine key; both trace categories, the `+` operator, the string-only `input` contract, unknown category, the function catalog, spec HTML and its name allowlist |
| `gateway.spec.ts`            | The gateway direct: health and Redis, the flag catalog, engine versions and their cache, Prometheus series, the OpenAPI document against its real routes, the reference page, minting/using/revoking an API key, an invalid key refused                                                                               |
| `navigation.spec.ts`         | The landing page; every tool route rendering; the header nav navigating; robots.txt and the sitemap; per-page titles and canonicals; a real 404                                                                                                                                                                       |
| `resilience.spec.ts`         | How the UI behaves when the layer below misbehaves: 429 with a readable wait, an unreachable gateway, an unreadable answer, a truncation warning, a downed trace service, a slow engine                                                                                                                               |
| `accessibility.spec.ts`      | Chips as real checkboxes; the polite live region; keyboard-operable dialogs; visible focus; the step counter's label; the main landmark                                                                                                                                                                               |
| `ratelimit.spec.ts`          | The heavy bucket refusing surplus runs with a Retry-After, over real Redis                                                                                                                                                                                                                                            |

## Run locally

```bash
# 1. Bring the whole stack up as CI sees it: production targets, no bind mounts
#    (needs the engine base images; see repo README).
docker compose -f docker-compose.yml -f docker-compose.e2e.yml up --build -d

# 2. Install Playwright and its browser, then run.
cd e2e
npm ci
npx playwright install --with-deps chromium
npm test
```

Point it at a deployed site instead:

```bash
E2E_BASE_URL=https://jslab.su npm test
```

`E2E_GATEWAY_URL` (default `http://localhost:8080`) is where `gateway.spec.ts`
looks for the API gateway; those tests skip themselves when it is not reachable,
so the suite still runs against a site that hides the gateway behind an ingress.

The suite assumes the stack is already healthy — it does not start it. The CI
workflow (`.github/workflows/e2e.yml`) waits on `/healthz` first. It runs on the
release PR, on any PR labelled `e2e`, nightly, and on demand — not on every PR.
The dev stack (`docker
compose up` without the override) is not a substitute: the gateway only caches
under `NODE_ENV=production`, so the cache tests fail against it.

## Calibrating selectors

The specs use role- and label-based selectors taken from the shipped markup:
engine chips are `role="checkbox"`, the run button is the lowercase word `run`,
the flag pickers read `<engine> flags`, the trace transport is `prev`/`play`/
`next` with a `Step N of M` label. When UI copy changes, `helpers/playground.ts`
and the affected spec are what to update — a failing e2e test is doing its job
when it catches that drift.
