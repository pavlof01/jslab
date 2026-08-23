# 🧩 JSLab — JavaScript Engine Bytecode Explorer

**JSLab.su** is an experimental platform for visualizing  
how different JavaScript engines (V8, SpiderMonkey, JavaScriptCore, Hermes)  
parse, compile, and optimize your code under the hood.

The site lets you:

- Run one snippet on V8, SpiderMonkey, JavaScriptCore and Hermes, and read each
  engine's **bytecode** in its own tab; **AST** and **IR** are V8 flags.
- Diff a run against the **previous run of the same engine** — the outputs of two
  different engines are never diffed against each other.
- Walk the **V8 compilation pipeline** stage by stage, including **deoptimization traces**.
- Step through **ECMAScript abstract operations** (type conversion, equality, and
  the `+` operator) against the spec text.
- Share reproducible code snippets — as links or as embeddable widgets — for educational or research purposes.

Uploading and visualizing engine logs (`v8.log`) is on the roadmap, not shipped
yet; see [Roadmap](#-roadmap-overview).

---

## 🚀 Features

### 🔸 Supported Engines

| Engine             | Binary | Output types                                            | Notable flags                                                              |
| ------------------ | ------ | ------------------------------------------------------- | -------------------------------------------------------------------------- |
| **V8**             | `d8`   | AST, Ignition bytecode, Maglev/TurboFan code, IC & deopt traces | `--print-bytecode`, `--print-ast`, `--trace-opt`, `--allow-natives-syntax` |
| **SpiderMonkey**   | `js`   | Bytecode (`dis()`)                                       | `--baseline-eager`, `--ion-eager`                                          |
| **JavaScriptCore** | `jsc`  | Bytecode (`-d`)                                          | — (`-d` is applied server-side)                                            |
| **Hermes**         | `hermes` | Bytecode (`-dump-bytecode`)                            | `-O`, `-strict`, `-gc-sanitize-handles`                                    |

Flags are validated against a per-engine allowlist — the full catalog lives in
[`packages/engine-runtime/src/flags.ts`](packages/engine-runtime/src/flags.ts)
and is served over HTTP at `GET /api/flags`; anything outside it is rejected and
echoed back in `meta.droppedFlags`.

The bytecode-dumping switches are applied server-side on every run, so you never
pass them yourself: Hermes always runs with `-dump-bytecode`, JSC always with
`-d`, and SpiderMonkey always through a `dis()` wrapper. V8 is the exception —
`d8` prints nothing extra unless you ask, so every V8 view is driven by flags.

---

## 🐳 Quick Start (Docker Compose)

The fastest way to run the full stack locally — no Kubernetes required.

**Prerequisites**

- [Docker](https://docs.docker.com/get-docker/) with the Compose plugin
- [Node.js](https://nodejs.org/) 22 (see `.nvmrc`) — only needed for development outside the containers

**Run**

```bash
# --recurse-submodules is required: trace-service does not build
# without the engine262 submodule (apps/trace-service/engine262).
git clone --recurse-submodules https://github.com/pavlof01/jslab.git
cd jslab
docker compose up --build
```

Already cloned without submodules? Fetch them first:

```bash
git submodule update --init --recursive
```

Once the containers are healthy, open the frontend at <http://localhost:3000>.
The API gateway listens on <http://localhost:8080>, and every service (`redis`,
`engine-v8`, `engine-hermes`, `engine-spidermonkey`, `engine-jsc`,
`trace-service`, `api`, `frontend`) runs in its own container with hot-reload
enabled.

---

## 💡 Project Vision

JSLab aims to be a **compiler explorer** for JavaScript engines —  
a place to experiment, learn, and visualize the internals of modern JIT compilers.

Goals:

1. Provide a visual way to understand how JavaScript is executed.
2. Show the bytecode each engine emits, and V8's optimization stages.
3. Serve as an educational and research platform for JS internals.

---

## 🧱 Repository Structure

```
/apps
  ├─ api                  # Fastify API gateway (rate limit + cache + engine proxy)
  ├─ engine-v8            # d8 wrapper HTTP service
  ├─ engine-hermes        # hermes -dump-bytecode wrapper HTTP service
  ├─ engine-jsc           # JavaScriptCore (jsc) wrapper HTTP service
  ├─ engine-spidermonkey  # SpiderMonkey (js shell) wrapper HTTP service
  ├─ trace-service        # ECMAScript abstract operations tracer (engine262-based)
  └─ frontend             # Next.js UI (playground, V8 pipeline, abstract ops visualizer)
/packages/engine-runtime # Shared engine HTTP wrapper + the flag catalog
/engines/dockerfiles     # Dockerfiles for the engine base images (d8, hermes, jsc, js shell)
/infra/k8s               # kustomize base/dev/prod for k3s/Traefik + NetworkPolicies/PDBs
/infra/node              # Host-level k3s config applied over SSH, not by kubectl
/docs                    # Infra map and point-in-time reviews
/scripts                 # Smoke test + manifest validation helpers
```

The four `engine-*` services are thin wrappers around one implementation,
[`packages/engine-runtime`](packages/engine-runtime/), consumed as a `file:`
dependency by both them and the api gateway — which is why the flag catalog
cannot drift between the two layers.

The spec-level tracing behind `/type-conversion` and `/equality` is powered by a
[fork of engine262](https://github.com/pavlof01/engine262) (branch
`jslab/trace-instrumentation`) with trace instrumentation, vendored as a git
submodule at `apps/trace-service/engine262`.

For a one-page infra diagram (Docker + Kubernetes), see [`docs/infra.md`](docs/infra.md).

### Docker images

The api and the four engine services bake in `packages/engine-runtime`, so they
build **from the repo root** (`-f <path>/Dockerfile .`). The frontend and the
trace service are self-contained and build from their own directory. All
commands below are run from the repo root:

- Frontend: `docker build -t pavlof01/jslab-frontend apps/frontend`
- Trace service: `docker build -t pavlof01/jslab-trace-service apps/trace-service` (requires the engine262 submodule to be initialized)
- API: `docker build -f apps/api/Dockerfile -t pavlof01/jslab-api .`
- Engine V8: `docker build -f apps/engine-v8/Dockerfile --build-arg V8_BASE_IMAGE=pavlof01/v8-d8:latest -t pavlof01/jslab-engine-v8 .`
- Engine Hermes: `docker build -f apps/engine-hermes/Dockerfile --build-arg HERMES_BASE_IMAGE=pavlof01/hermes:latest -t pavlof01/jslab-engine-hermes .`
- Engine JSC: `docker build -f apps/engine-jsc/Dockerfile --build-arg JSC_BASE_IMAGE=pavlof01/jsc:debug -t pavlof01/jslab-engine-jsc .`
- Engine SpiderMonkey: `docker build -f apps/engine-spidermonkey/Dockerfile --build-arg SPIDERMONKEY_BASE_IMAGE=pavlof01/spidermonkey:debug -t pavlof01/jslab-engine-spidermonkey .`
- You can swap `pavlof01/v8-d8`/`pavlof01/hermes`/`pavlof01/jsc`/`pavlof01/spidermonkey` with your own base layers that already contain `d8`/`hermes`/`jsc`/`js`.

Each Dockerfile has a `dev` and a `prod` target; `docker compose` and Skaffold
build `--target dev`, CI builds the default (production) target.

### Engine base images

The engine binaries themselves are built by the Dockerfiles in
[`engines/dockerfiles/`](engines/dockerfiles/): `Dockerfile.v8` (`d8`),
`Dockerfile.hermes` (`hermes`/`hermesc`/`hbcdump`), `Dockerfile.jsc` (`jsc`) and
`Dockerfile.spidermonkey` (`js` shell). Prebuilt images are published under the
[`pavlof01/*` Docker Hub namespace](https://hub.docker.com/u/pavlof01)
(`pavlof01/v8-d8`, `pavlof01/hermes`, `pavlof01/jsc`,
`pavlof01/spidermonkey`), so you only need these Dockerfiles when rebuilding an
engine from source.

### k3s / Traefik deploy

- Apply base stack: `kubectl apply -k infra/k8s/base`
- Namespace: `jslab`
- Ingress (Traefik): routes `/api` to the `api` service and `/` to `frontend` (Next.js) with explicit router priorities.
- NetworkPolicy: only API reachable from Traefik/namespace, engines reachable only from API, Redis reachable only from API.
- Pods run with `runAsNonRoot`, `allowPrivilegeEscalation: false`, `readOnlyRootFilesystem: true`, `seccompProfile: RuntimeDefault`; `/tmp` mounted from `emptyDir`.
- PodDisruptionBudgets for api and frontend; `infra/k8s/hpa.todo.yaml` holds a ready-to-enable HPA for the API.

For the ingress routing model, the network-policy model and the client-IP trust
settings, see [`infra/README.md`](infra/README.md).

### Quickstart (Kubernetes)

1. Build images — see [Docker images](#docker-images) above for the exact
   commands (note the repo-root build context for the api and the engines).
2. Apply manifests:
   - `kubectl apply -k infra/k8s/base`
3. Check readiness:
   - `kubectl -n jslab get pods,svc,ingress`
4. Local access (optional):
   - Add a host record: `/etc/hosts` → `127.0.0.1 jslab.local` (or your Ingress/LoadBalancer IP).
5. Test API:
   ```bash
   # Browser/client calls Next.js at /api/run (no auth required).
   curl -k -H "content-type: application/json" \
     -d '{"engine":"v8","sourceText":"1+1"}' \
     https://jslab.local/api/run
   ```

### Debugging NetworkPolicy Races (k3s + flannel)

Short-lived debug pods can hit a brief window where NetworkPolicy rules have not been applied yet, causing transient connection failures (e.g., "Could not connect") for the first few seconds.

Recommended approaches:

- Use a long-lived debug pod and `kubectl exec` into it.
- Or add a short `sleep` before curling services.

Example debug pod (long-lived):

```bash
kubectl -n jslab run debug-shell \
  --rm -it --restart=Never \
  --image=curlimages/curl:8.5.0 \
  --command -- sleep 3600
```

Verify engine connectivity:

```bash
kubectl -n jslab exec -it debug-shell -- \
  curl -sS http://engine-v8:8080/healthz
```

Verify API run request:

```bash
kubectl -n jslab exec -it debug-shell -- \
  curl -sS -H "content-type: application/json" \
  -d '{"engine":"v8","sourceText":"1+1"}' \
  http://api:8080/api/run
```

### Local development (Skaffold + hot-reload)

1. Start the dev loop (from repo root):
   - `skaffold dev --port-forward -n jslab`

2. Access UI and API locally:
   - UI: `http://127.0.0.1:3000/`
   - API health: `curl -sS http://127.0.0.1:8080/healthz`

3. Apple Silicon / arm64 note:
   - If you see `rosetta error: failed to open elf at /lib64/ld-linux-x86-64.so.2`, the engine is trying to run an `amd64` binary inside an `arm64` container.
   - Quick dev fix (build engine images as `linux/amd64` under emulation):
     - Stop `skaffold dev` (Ctrl+C)
     - Run: `skaffold dev --port-forward -n jslab --check-cluster-node-platforms=false --cache-artifacts=false`
   - If you still see the old error with `cacheHit: true`, flush Redis cache or wait for TTL:
     - `kubectl -n jslab run tmp-redis --rm -it --image=redis:7-alpine --restart=Never -- redis-cli -h redis FLUSHALL`

### API contract

The gateway's own OpenAPI document is served at `GET /api/openapi.json`, with a
browsable rendering at `/api/docs`.

| Endpoint | Purpose |
| --- | --- |
| `POST /api/run` | Run a snippet on one engine (see below) |
| `GET /api/flags` | The per-engine flag catalog, with descriptions and categories |
| `GET /api/engines` | Each engine key with the version string its binary reports (`null` when the shell cannot say) |
| `POST /api/trace/execute/type-conversion` | `{ functionName, input, preferredType? }` → spec trace |
| `POST /api/trace/execute/equality` | `{ input }` (a binary expression such as `{} == ![]`) → spec trace |
| `POST /api/keys` | Mint a self-service API key (raises the general and trace quotas) |
| `DELETE /api/keys` | Revoke the key presented in `x-api-key` / `Authorization: Bearer` |
| `GET /api/openapi.json`, `/api/docs` | OpenAPI document and API reference UI |
| `GET /healthz`, `GET /metrics` | Liveness probe and Prometheus metrics |

- Endpoint: `POST /api/run`
- Request:

```json
{
  "engine": "v8 | hermes | sm | jsc",
  "sourceText": "string",
  "options": { "flags": ["..."], "timeoutMs": 2000 }
}
```

- Response:

```json
{
  "ok": true,
  "stdout": "...",
  "stderr": "...",
  "artifacts": [],
  "meta": { "durationMs": 0, "engine": "v8", "cacheHit": false }
}
```

- `artifacts` is part of the contract but the engine services currently return
  it empty — every engine's output arrives as text on `stdout`/`stderr`.
- `meta` also carries `droppedFlags` when the allowlist rejected something, and
  `outputTruncated` + `outputLimitBytes` when the combined output hit the
  2 MB (`MAX_OUTPUT_BYTES`) cap.
- Normalization: `sourceText` is capped at `MAX_SOURCE_LENGTH` (20 000 chars),
  `timeoutMs` is clamped into `[MIN_TIMEOUT_MS, MAX_TIMEOUT_MS]` = `[250, 5000]`
  (default 2000), and at most `MAX_FLAGS` (10) flags are considered.
- Rate limits: Redis counters per client IP, layered per bucket — `general`
  60/min, `heavy` (engine-spawning) 20/min, `trace` 30/min. A self-service API
  key raises general and trace to its own quota (240/min), while the heavy
  bucket stays separately capped (60/min). 429 responses carry `Retry-After`
  and `meta.retryAfter`.
- Cache: Redis hash of engine+source+normalized flags+timeout bucket, TTL `CACHE_TTL_SECONDS` (default 600s); deterministic failures get the shorter `NEGATIVE_CACHE_TTL_SECONDS` (default 30s).

### Quick curl example

```bash
curl -X POST https://jslab.local/api/run \
  -H "content-type: application/json" \
  -d '{"engine":"v8","sourceText":"function f(){return 1+2};f();","options":{"flags":["--print-bytecode"],"timeoutMs":2000}}'
```

### Smoke test (bytecode via API)

```bash
curl -sS https://jslab.su/api/run \
  -H "content-type: application/json" \
  -d '{"engine":"v8","sourceText":"1+2","options":{"flags":["--print-bytecode"]}}'
```

---

## 🗺 Roadmap Overview

### Phase 1 — Core MVP ✅ (shipped)

- Engine selector and preset flags ✅
- Sandbox API `/api/run` ✅
- Execution history and “Share session” links ✅

### Phase 2 — Advanced Analysis ✅ (shipped)

- AST tree visualization (`--print-ast`) ✅
- Bytecode diff viewer (Myers diff + Shiki) ✅
- V8 compilation pipeline diagram (Tokens → AST → Ignition → Sparkplug → Maglev → TurboFan → Deopt) ✅
- ECMAScript abstract operations step-through visualizer ✅
- Hermes IR viewer ✅

### Phase 3 — Community & Docs

- Multi-engine playground ✅
- Embeddable playground / bytecode widgets (`/embed/*`, with oEmbed) ✅
- Inline opcode descriptions in the output panel ✅
- Standalone opcode documentation pages (`/docs/{engine}/{opcode}`)
- Snippet sharing & voting

### Phase 4 — Research Lab

- V8 heap and log visualizer (`v8.log`)
- Flamegraph integration
- WebAssembly comparison layer
- AI Explain Mode for bytecode and optimization traces

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — © 2026 Alexey Pavlov.

## 🙏 Acknowledgements

JSLab wraps and builds upon several open-source JavaScript engines and tools,
each distributed under its own license:

- [V8](https://v8.dev/) — BSD-3-Clause
- [JavaScriptCore](https://developer.apple.com/documentation/javascriptcore) (part of [WebKit](https://webkit.org/)) — LGPL-2.1 and BSD-2-Clause
- [SpiderMonkey](https://spidermonkey.dev/) — MPL-2.0
- [Hermes](https://hermesengine.dev/) — MIT
- [engine262](https://github.com/engine262/engine262) — MIT

Trace output from the abstract-operations visualizer reproduces algorithm text
from the [ECMA-262 specification](https://tc39.es/ecma262/), © Ecma International.
