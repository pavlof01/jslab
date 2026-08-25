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
git config core.hooksPath .githooks
```

The first line makes `git push` push `apps/trace-service/engine262` first. The
second installs `.githooks/pre-push`, which blocks the push outright if a gitlink
is missing from the submodule's remote and prints the command to fix it. CI
checks the same thing in the `submodule-gitlinks` job, so a slip is one clear
red check rather than eight cryptic ones.

## Quick start

```bash
docker compose up --build
```

This brings up Redis, all four engine services, the trace service, the API
gateway (http://localhost:8080), and the frontend (http://localhost:3000).
Source directories are volume-mounted, so services hot-reload as you edit.

## Working on a single service

There is no root `package.json` — each workspace installs its own
dependencies, so run `npm install` (or `npm ci`) inside the service directory
first. Note that the frontend's `package.json` lives in `apps/frontend/src/`,
not `apps/frontend/`.

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

## Tests and checks

CI (`.github/workflows/ci.yml`) runs the following per workspace on every PR,
plus kustomize/kubeconform validation of the Kubernetes manifests:

| Workspace                 | Typecheck / lint                                                | Tests                                                                      |
| ------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `apps/frontend/src`       | `npx tsc --noEmit -p tsconfig.json` and `npm run lint` (ESLint) | `npm run test` (Jest, jsdom; `npm run test:watch` for watch mode)          |
| `apps/api`                | `npm run lint` (`tsc --noEmit`)                                 | `npm test` (Vitest)                                                        |
| `apps/trace-service`      | `npm run typecheck`                                             | `npm test` (Vitest — watch mode locally; requires the engine262 submodule) |
| `apps/engine-*`           | `npm run lint` (`tsc --noEmit`)                                 | —                                                                          |
| `packages/engine-runtime` | `npm run lint`                                                  | `npm test` (Vitest)                                                        |

Every leg checks out submodules recursively (trace-service's tests need
engine262), and the api and engine legs build `packages/engine-runtime` before
installing.

## Full stack on Kubernetes

For changes that span services or touch `infra/`, you can run the whole stack
on a local cluster:

```bash
skaffold dev --port-forward -n jslab   # rebuild + redeploy on change
kubectl apply -k infra/k8s/base        # one-off deploy (namespace: jslab)
```

See the README's Kubernetes quickstart and [`docs/infra.md`](docs/infra.md)
for the topology, NetworkPolicies, and Apple Silicon notes.

## Pull requests

- Keep PRs small and focused — one change per PR.
- Make sure the typecheck/lint and tests for the workspaces you touched pass
  locally (see the table above); CI runs the same commands.
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
