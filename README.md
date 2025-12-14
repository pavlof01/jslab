# 🧩 JSLab — JavaScript Engine Bytecode Explorer

**JSLab.cc** is an experimental platform for visualizing and comparing  
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

| Engine             | Output Types                    | Notable Flags                                                            |
| ------------------ | ------------------------------- | ------------------------------------------------------------------------ |
| **V8**             | AST / Bytecode / TurboFan Graph | `--print-bytecode`, `--trace-opt`, `--allow-natives-syntax`, `--log-all` |
| **SpiderMonkey**   | Bytecode (`dis()`)              | `--baseline-eager`, `--ion-eager`                                        |
| **JavaScriptCore** | Bytecode / DFG Graph            | `--dumpBytecode`, `--dumpGraph`, `--useDollarVM=1`                       |
| **Hermes**         | IR / Bytecode                   | `-dump-ir`, `-dump-bytecode`, `-O`                                       |

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
  ├─ api             # Fastify API gateway (rate limit + cache + engine proxy)
  ├─ engine-v8       # d8 wrapper HTTP service
  ├─ engine-hermes   # hermesc/hermes wrapper HTTP service
  └─ frontend        # existing Next.js UI (code in apps/frontend/src, no UI changes)
/infra/k8s           # kustomize base for k3s/Traefik + NetworkPolicies/PDBs
```

### Docker images

- Frontend: `docker build -t pavlof01/jslab-frontend apps/frontend`
- API: `docker build -t pavlof01/jslab-api apps/api`
- Engine V8: `docker build --build-arg V8_BASE_IMAGE=pavlof01/v8-d8:latest -t pavlof01/jslab-engine-v8 apps/engine-v8`
- Engine Hermes: `docker build --build-arg HERMES_BASE_IMAGE=pavlof01/hermes:latest -t pavlof01/jslab-engine-hermes apps/engine-hermes`
- You can swap `pavlof01/v8-d8`/`pavlof01/hermes` with your own base layers that already contain `d8`/`hermes`/`hermesc`/`hbcdump`.

### k3s / Traefik deploy

- Apply base stack: `kubectl apply -k infra/k8s/base`
- Namespace: `jslab`
- Set real secrets in `infra/k8s/base/api-secret.example.yaml` (or replace with your own Secret/SealedSecret generator).
- Ingress (Traefik): host `jslab.local` → `/` → `frontend`, `/api` → `api` (with security headers middleware).
- NetworkPolicy: only API reachable from Traefik/namespace, engines reachable only from API, Redis reachable only from API.
- Pods run with `runAsNonRoot`, `allowPrivilegeEscalation: false`, `readOnlyRootFilesystem: true`, `seccompProfile: RuntimeDefault`; `/tmp` mounted from `emptyDir`.
- PodDisruptionBudgets for api/frontend/engines; `infra/k8s/hpa.todo.yaml` holds a ready-to-enable HPA for the API.

### Quickstart (Kubernetes)

1. Build images (from repo root):
   - `docker build -t pavlof01/jslab-api apps/api`
   - `docker build --build-arg V8_BASE_IMAGE=pavlof01/v8-d8:latest -t pavlof01/jslab-engine-v8 apps/engine-v8`
   - `docker build --build-arg HERMES_BASE_IMAGE=pavlof01/hermes:latest -t pavlof01/jslab-engine-hermes apps/engine-hermes`
   - `docker build -t pavlof01/jslab-frontend apps/frontend`
2. Create secrets (example):
   - `kubectl create namespace jslab`
   - `kubectl -n jslab create secret generic api-secrets --from-literal=API_KEY=api-secret --from-literal=ENGINE_SHARED_SECRET=engine-secret`
3. Apply manifests:
   - `kubectl apply -k infra/k8s/base`
4. Check readiness:
   - `kubectl -n jslab get pods,svc,ingress`
5. Local access (optional):
   - Add a host record: `/etc/hosts` → `127.0.0.1 jslab.local` (or your Ingress/LoadBalancer IP).
6. Test API:
   ```bash
   curl -k -H "x-api-key: api-secret" -H "content-type: application/json" \
     -d '{"engine":"v8","task":"run","sourceText":"1+1"}' \
     https://jslab.local/api/run
   ```

### Local development (Skaffold + hot-reload)

1. Start the dev loop (from repo root):
   - `skaffold dev --port-forward -n jslab`

2. Access UI and API locally:
   - UI: `http://127.0.0.1:3000/`
   - API health: `curl -sS http://127.0.0.1:8080/healthz`

3. Apple Silicon / arm64 note (V8/Hermes binaries are currently amd64):
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
  "engine": "v8 | hermes",
  "task": "bytecode | run",
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

- Rate limits: 60 req/min per IP + 20 heavy req/min (task=run|bytecode) stored in Redis (`Retry-After` headers on 429).
- Cache: Redis hash of engine+task+source+normalized flags+timeout bucket, TTL `CACHE_TTL_SECONDS` (default 600s).
- API key (optional): set `API_KEY` for gateway and `ENGINE_SHARED_SECRET` for engine services; header `x-api-key`/`x-engine-key` validated when set.

### Quick curl example

```bash
curl -X POST https://jslab.local/api/run \
  -H "content-type: application/json" \
  -d '{"engine":"v8","task":"bytecode","sourceText":"function f(){return 1+2};f();","options":{"flags":["--print-bytecode"],"timeoutMs":2000}}'
```

---

## 🗺 Roadmap Overview

### Phase 1 — Core MVP

- Engine selector and preset flags
- Sandbox API `/api/run`
- Execution history and “Share session” links

### Phase 2 — Advanced Analysis

- AST tree visualization (`--print-ast`)
- Bytecode diff viewer (Myers diff + Shiki)
- TurboFan / Ignition pipeline diagram
- Hermes IR viewer

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

## ⚙️ Importing the Roadmap into GitHub Issues

### 1️⃣ Requirements

- [GitHub CLI](https://cli.github.com/) (`gh`)
- [jq](https://stedolan.github.io/jq/)
- Authenticated with GitHub:
  ```bash
  gh auth login
  ```
