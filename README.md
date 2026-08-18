# 🧩 JSLab — JavaScript Engine Bytecode Explorer

**JSLab.su** is an experimental platform for visualizing and comparing  
how different JavaScript engines (V8, SpiderMonkey, JavaScriptCore, Hermes)  
parse, compile, and optimize your code under the hood.

The site lets you:

- View **AST**, **bytecode**, and **IR** for multiple engines.
- Compare **optimization pipelines** and **deoptimization traces**.
- Upload and visualize **engine logs** (like `v8.log`).
- Share reproducible code snippets for educational or research purposes.

---

## 🚀 Features

### 🔸 Supported Engines

| Engine             | Output Types                    | Notable Flags                                                              |
| ------------------ | ------------------------------- | -------------------------------------------------------------------------- |
| **V8**             | AST / Bytecode / TurboFan Graph | `--print-bytecode`, `--print-ast`, `--trace-opt`, `--allow-natives-syntax` |
| **SpiderMonkey**   | Bytecode (`dis()`)              | `--baseline-eager`, `--ion-eager`                                          |
| **JavaScriptCore** | Bytecode / DFG Graph            | `-d`                                                                       |
| **Hermes**         | Bytecode                        | `-O`, `-strict`, `-gc-sanitize-handles`                                    |

Flags are validated against a per-engine allowlist — the full catalog lives in
[`packages/engine-runtime/src/flags.ts`](packages/engine-runtime/src/flags.ts),
and anything outside it is rejected.
Hermes bytecode dumping (`-dump-bytecode`) is applied server-side on every run,
so you never pass it yourself.

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
git submodule update --init
```

Once the containers are healthy, open the frontend at <http://localhost:3000>.
The API gateway listens on <http://localhost:8080>, and every service (`redis`,
`engine-v8`, `engine-hermes`, `engine-spidermonkey`, `engine-jsc`,
`trace-service`, `api`, `frontend`) runs in its own container with hot-reload
enabled.

---

## ⌨️ Terminal client (`jslab`)

Prefer a terminal to a browser? [`apps/cli`](apps/cli) is a small Node client
that runs one snippet through all four engines and prints what each of them
produced:

```bash
cd apps/cli && npm ci && npm run build && npm link   # `jslab` on PATH

jslab --code "const add = (a, b) => a + b; add(1, 2)" --bytecode
echo "1 + '1'" | jslab -e v8,jsc
jslab snippet.js -e v8 -f --print-bytecode -f --trace-opt --api http://localhost:8080
jslab snippet.js --json > run.json
jslab flags v8 --category bytecode
```

It talks to the api gateway over `POST /api/run` (defaulting to `jslab.su`, so
no engine binaries are needed locally) and validates flags against the same
shared catalog the server enforces. See [`apps/cli/README.md`](apps/cli/README.md).

---

## 💡 Project Vision

JSLab aims to be a **compiler explorer** for JavaScript engines —  
a place to experiment, learn, and visualize the internals of modern JIT compilers.

Goals:

1. Provide a visual way to understand how JavaScript is executed.
2. Compare bytecode and optimization stages across engines.
3. Serve as an educational and research platform for JS internals.

---

## 🧱 Repository Structure

```
/apps
  ├─ api                  # Fastify API gateway (rate limit + cache + engine proxy)
  ├─ engine-v8            # d8 wrapper HTTP service
  ├─ engine-hermes        # hermesc/hermes wrapper HTTP service
  ├─ engine-jsc           # JavaScriptCore (jsc) wrapper HTTP service
  ├─ engine-spidermonkey  # SpiderMonkey (js shell) wrapper HTTP service
  ├─ trace-service        # ECMAScript abstract operations tracer (engine262-based)
  ├─ frontend             # Next.js UI (playground, V8 pipeline, abstract ops visualizer)
  └─ cli                  # `jslab` terminal client for POST /api/run
/engines/dockerfiles     # Dockerfiles for the engine base images (d8, hermes, jsc, js shell)
/infra/k8s               # kustomize base for k3s/Traefik + NetworkPolicies/PDBs
```

The spec-level tracing behind `/type-conversion` and `/equality` is powered by a
fork of [engine262](https://github.com/engine262/engine262) with trace
instrumentation, vendored as a git submodule at `apps/trace-service/engine262`.

For a one-page infra diagram (Docker + Kubernetes), see [`docs/infra.md`](docs/infra.md).

### Docker images

- Frontend: `docker build -t pavlof01/jslab-frontend apps/frontend`
- API: `docker build -t pavlof01/jslab-api apps/api`
- Engine V8: `docker build --build-arg V8_BASE_IMAGE=pavlof01/v8-d8:latest -t pavlof01/jslab-engine-v8 apps/engine-v8`
- Engine Hermes: `docker build --build-arg HERMES_BASE_IMAGE=pavlof01/hermes:latest -t pavlof01/jslab-engine-hermes apps/engine-hermes`
- Engine JSC: `docker build --build-arg JSC_BASE_IMAGE=pavlof01/jsc:debug -t pavlof01/jslab-engine-jsc apps/engine-jsc`
- Engine SpiderMonkey: `docker build --build-arg SPIDERMONKEY_BASE_IMAGE=pavlof01/spidermonkey:debug -t pavlof01/jslab-engine-spidermonkey apps/engine-spidermonkey`
- Trace service: `docker build -t pavlof01/jslab-trace-service apps/trace-service` (requires the engine262 submodule to be initialized)
- You can swap `pavlof01/v8-d8`/`pavlof01/hermes`/`pavlof01/jsc`/`pavlof01/spidermonkey` with your own base layers that already contain `d8`/`hermes`/`hermesc`/`hbcdump`/`jsc`/`js`.

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
- PodDisruptionBudgets for api/frontend/engines; `infra/k8s/hpa.todo.yaml` holds a ready-to-enable HPA for the API.

### Quickstart (Kubernetes)

1. Build images (from repo root):
   - `docker build -t pavlof01/jslab-api apps/api`
   - `docker build --build-arg V8_BASE_IMAGE=pavlof01/v8-d8:latest -t pavlof01/jslab-engine-v8 apps/engine-v8`
   - `docker build --build-arg HERMES_BASE_IMAGE=pavlof01/hermes:latest -t pavlof01/jslab-engine-hermes apps/engine-hermes`
   - `docker build --build-arg JSC_BASE_IMAGE=pavlof01/jsc:debug -t pavlof01/jslab-engine-jsc apps/engine-jsc`
   - `docker build --build-arg SPIDERMONKEY_BASE_IMAGE=pavlof01/spidermonkey:debug -t pavlof01/jslab-engine-spidermonkey apps/engine-spidermonkey`
   - `docker build -t pavlof01/jslab-trace-service apps/trace-service`
   - `docker build -t pavlof01/jslab-frontend apps/frontend`
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
  "artifacts": [{ "kind": "bytecode", "mime": "text/plain", "dataBase64": "..." }],
  "meta": { "durationMs": 0, "engine": "v8", "cacheHit": false }
}
```

- Rate limits: 60 req/min per IP stored in Redis (`Retry-After` headers on 429).
- Cache: Redis hash of engine+source+normalized flags+timeout bucket, TTL `CACHE_TTL_SECONDS` (default 600s).

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

### Phase 1 — Core MVP

- Engine selector and preset flags
- Sandbox API `/api/run`
- Execution history and “Share session” links

### Phase 2 — Advanced Analysis ✅ (shipped)

- AST tree visualization (`--print-ast`) ✅
- Bytecode diff viewer (Myers diff + Shiki) ✅
- V8 compilation pipeline diagram (Tokens → AST → Ignition → Sparkplug → Maglev → TurboFan) ✅
- ECMAScript abstract operations step-through visualizer ✅
- Hermes IR viewer ✅

### Phase 3 — Community & Docs

- Opcode documentation (`/docs/{engine}/{opcode}`)
- Multi-engine playground
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
