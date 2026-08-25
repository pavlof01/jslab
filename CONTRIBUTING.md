# Contributing to JSLab

Thanks for your interest in improving JSLab! This page covers everything you
need to get a working dev environment and land a change.

## Prerequisites

- **Node.js 22** (all Dockerfiles and CI use `node:22`)
- **Docker** with Compose (recommended path — the engine services need real
  engine binaries such as `d8`, `hermes`, `jsc`, and the SpiderMonkey `js`
  shell, which the Docker images provide)
- Optional, for full-stack Kubernetes work: a k3s cluster and
  [skaffold](https://skaffold.dev/) — see the README and
  [`docs/infra.md`](docs/infra.md)

## Getting the source

The trace service vendors [engine262](https://github.com/pavlof01/engine262)
as a git submodule at `apps/trace-service/engine262` and imports it directly,
so clone with submodules:

```bash
git clone --recurse-submodules https://github.com/pavlof01/jslab.git
```

Already cloned without it? Run `git submodule update --init --recursive`.

### If you change the submodule

A commit here can point at an engine262 commit that only exists on your machine.
Pushing that lands a gitlink nobody else can fetch, and every workflow then dies
in `actions/checkout` with `upload-pack: not our ref <sha>`. Run this once per
clone so git pushes the submodule for you:

```bash
git config push.recurseSubmodules on-demand
```

That makes `git push` push `apps/trace-service/engine262` first. On top of it,
`npm install` at the repo root points `core.hooksPath` at the tracked
`.githooks/` directory (that is all its `prepare` script does, so
`git config core.hooksPath .githooks` by hand works just as well):
`.githooks/pre-push` blocks a push outright when a gitlink is missing from the
submodule's remote (and prints the command to fix it), and
`.githooks/commit-msg` validates the commit subject against
`commitlint.config.mjs`. The directory is tracked on purpose — hooks kept in an
install-generated directory silently do nothing in a `git worktree` checkout
that has not been installed. CI checks both again — the `submodule-gitlinks`
and `history` jobs — so a skipped hook costs a clear red check, not a broken
main.

## Quick start

```bash
docker compose up --build
```

This brings up Redis, all four engine services, the trace service, the API
gateway (http://localhost:8080), and the frontend (http://localhost:3000).
Source directories are volume-mounted, so services hot-reload as you edit.

## Working on a single service

Each workspace installs its own dependencies, so run `npm install` (or
`npm ci`) inside the service directory first. Note that the frontend's
`package.json` lives in `apps/frontend/src/`, not `apps/frontend/`.

The root `package.json` is _not_ a workspace root — it installs nothing but
the shared tooling (Prettier, ESLint, commitlint and the git hooks) and does not affect how any service
builds. Run `npm install` there once so formatting and the pre-commit hook
work:

```bash
npm install                                   # at the repo root, once
git config blame.ignoreRevsFile .git-blame-ignore-revs   # optional, see below
```

| Service            | Directory                                                                                 | Dev command   | Port                                |
| ------------------ | ----------------------------------------------------------------------------------------- | ------------- | ----------------------------------- |
| API gateway        | `apps/api/`                                                                               | `npm run dev` | 8080                                |
| Frontend (Next.js) | `apps/frontend/src/`                                                                      | `npm run dev` | 3000                                |
| Trace service      | `apps/trace-service/`                                                                     | `npm run dev` | 8080 (Compose publishes it on 8085) |
| Engines            | `apps/engine-v8/`, `apps/engine-hermes/`, `apps/engine-jsc/`, `apps/engine-spidermonkey/` | `npm run dev` | 8080                                |

The API, trace service, and engines all default to port 8080 — set `PORT` when
running more than one outside Docker. Three gotchas:

- **The API gateway and the engine services** consume `@jslab/engine-runtime` as
  a `file:` dependency, so build it before installing either:
  `cd packages/engine-runtime && npm ci && npm run build`.
- **Engine services** also expect the engine binary on disk (e.g. `D8_PATH`,
  default `/opt/v8/d8`) — without it, prefer `docker compose up`.
- **The frontend** generates its Chakra recipe types from `style/theme.ts`.
  `postinstall`, `prelint` and `prebuild` run `npm run typegen` for you; run it
  by hand after changing a recipe or a style if your editor disagrees.

Docker images for the API and the engines bake in `packages/engine-runtime`, so
they build from the repo root (`docker build -f apps/api/Dockerfile -t jslab-api .`);
the frontend and trace service build from their own directory.

## Formatting and linting

[Prettier](https://prettier.io) formats the whole tree and
[ESLint](https://eslint.org) lints it. `npm install` at the repo root installs
both; `.prettierrc` and `eslint.config.mjs` there are the configs.

```bash
npm run check      # formatting + lint, read-only
npm run ci         # what CI runs: the same two checks
npm run check:fix  # writes the fixes both tools can apply safely
npm run format     # formatting only (prettier --write .)
npm run lint       # linting only (eslint .)
```

The pre-commit hook runs Prettier and `eslint --fix` over your _staged_ files
and re-stages them, so ordinary commits stay formatted without you thinking
about it. A file you staged only in part (`git add -p`) is checked but never
rewritten — formatting it would mean re-staging the hunk you deliberately left
out. `git commit --no-verify` skips the hook; CI still checks everything.

Two conventions worth knowing:

- **Suppress at the site, with a reason.** If a rule is wrong for one specific
  line, write `// eslint-disable-next-line <rule> -- why` directly above it (or
  `{/* ... */}` between JSX children). `reportUnusedDisableDirectives` is set to
  `error`, so a suppression that stops being needed fails CI rather than
  lingering. Turn a rule off in a config only when it is wrong for the whole
  repo, and say why in a comment next to it.
- **There are two ESLint installs, and they do not overlap.**
  `apps/frontend/src` has its own, because it needs `eslint-config-next`; the
  root one covers every other workspace and explicitly ignores
  `apps/frontend/**`. Formatting rules live in neither — `eslint-config-prettier`
  is last in both configs and switches off anything that would fight the
  formatter.

`@typescript-eslint/no-explicit-any` is a warning rather than an error — `any` at
a framework boundary is sometimes the honest type. Warnings do not fail CI. They
are meant to be visible, so please don't add new ones without cause.

Formatting the whole tree at once made one commit that touches almost every
file. It is listed in `.git-blame-ignore-revs`; run
`git config blame.ignoreRevsFile .git-blame-ignore-revs` once and `git blame`
will skip past it. (GitHub's blame view does this automatically.)

That file only works if the SHAs in it survive the merge, and a squash merge
mints new ones. A pure-formatting commit therefore has to reach `main` either
through a merge commit or as a squash of its own, with the resulting SHA
recorded afterwards. CI's `history` job fails when a listed SHA is not an
ancestor of the branch, because both git and GitHub skip an unknown SHA without
saying a word.

### Frontend components

Three conventions hold across `apps/frontend/src`. The first two are lint
rules — `react/function-component-definition` and
`@typescript-eslint/consistent-type-definitions` (scoped to `.tsx`) — so CI
fails on a violation; the third is checked in review.

- **A component is `const Name: React.FC<Props> = () => {}`, default-exported.**
  The file's own component ends with `export default Name;`; a second component
  living in the same file keeps a named `export const`. Two exceptions, both
  forced: an async server component (`app/**/page.tsx`) cannot be typed
  `React.FC` (it returns a promise), so it is `const Page = async () => {}` with
  the props type inline; and a `memo(...)` component keeps its named function
  inside the wrapper, because `React.FC` does not describe what `memo` returns.
- **Props are a `type`, not an `interface`.** `type Props = { ... }` for the
  file's one component; `<Name>Props` when the type is exported or the file
  holds several components. `interface` stays in the services, where the
  `.d.ts` augmentations need declaration merging.
- **An inline props literal has to fit on one line.**
  `const Hint: React.FC<{ children: ReactNode }> = ({ children })` is fine as it
  is; once the formatter has to wrap the signature, name the type instead.

## Tests and checks

CI (`.github/workflows/ci.yml`) runs the following on every PR, plus
kustomize/kubeconform validation of the Kubernetes manifests:

| Workspace                 | Typecheck / lint                                                                                                  | Tests                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| _(repo root)_             | `npm run ci` (Prettier + ESLint, whole tree bar the frontend) + commit subjects, blame-ignore entries (`history`) | —                                                                          |
| `apps/frontend/src`       | `npx tsc --noEmit -p tsconfig.json` and `npm run lint` (ESLint)                                                   | `npm run test` (Jest, jsdom; `npm run test:watch` for watch mode)          |
| `apps/api`                | `npm run lint` (`tsc --noEmit`)                                                                                   | `npm test` (Vitest)                                                        |
| `apps/trace-service`      | `npm run typecheck`                                                                                               | `npm test` (Vitest — watch mode locally; requires the engine262 submodule) |
| `apps/engine-*`           | `npm run lint` (`tsc --noEmit`)                                                                                   | —                                                                          |
| `packages/engine-runtime` | `npm run lint`                                                                                                    | `npm test` (Vitest)                                                        |

Every leg checks out submodules recursively (trace-service's tests need
engine262), and the api and engine legs build `packages/engine-runtime` before
installing.

Every one of those jobs feeds a single aggregate job named **quality-gate**,
which fails if any of them did. That is the one check to require in branch
protection — it keeps working when the matrix gains a service.

## Full stack on Kubernetes

For changes that span services or touch `infra/`, you can run the whole stack
on a local cluster:

```bash
skaffold dev --port-forward -n jslab   # rebuild + redeploy on change
kubectl apply -k infra/k8s/base        # one-off deploy (namespace: jslab)
```

See the README's Kubernetes quickstart and [`docs/infra.md`](docs/infra.md)
for the topology, NetworkPolicies, and Apple Silicon notes.

## Releases

Releases are automated — see [docs/releasing.md](docs/releasing.md). Commit
subjects are the changelog: `feat`/`fix` land in it verbatim, so write them for
a reader of the release notes, not just for `git log`.

## Pull requests

- Keep PRs small and focused — one change per PR.
- Run `npm run check` at the repo root, plus the typecheck and tests for the
  workspaces you touched (see the table above); CI runs the same commands.
- Use conventional-commit style subjects with the service as scope, as in the
  existing history: `feat(frontend): ...`, `fix(api): ...`, `chore(ci): ...`.
- Update docs (README, `docs/infra.md`, `CLAUDE.md`) when behavior changes.

## Security issues

Do **not** open a public issue for vulnerabilities. Follow the private
reporting process in [`SECURITY.md`](SECURITY.md) — it also explains what is
and isn't in scope for a platform that runs untrusted JavaScript on purpose.

## Code of conduct

By participating you agree to our
[Code of Conduct](CODE_OF_CONDUCT.md).
