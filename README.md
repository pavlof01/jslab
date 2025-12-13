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
| Engine | Output Types | Notable Flags |
|--------|---------------|----------------|
| **V8** | AST / Bytecode / TurboFan Graph | `--print-bytecode`, `--trace-opt`, `--allow-natives-syntax`, `--log-all` |
| **SpiderMonkey** | Bytecode (`dis()`) | `--baseline-eager`, `--ion-eager` |
| **JavaScriptCore** | Bytecode / DFG Graph | `--dumpBytecode`, `--dumpGraph`, `--useDollarVM=1` |
| **Hermes** | IR / Bytecode | `-dump-ir`, `-dump-bytecode`, `-O` |

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
  └─ frontend        # uses existing Next.js UI in js-bytecode-web (no UI changes)
/infra/k8s           # kustomize base for k3s/Traefik + NetworkPolicies/PDBs
/js-bytecode-web     # existing Next.js UI (untouched)
```

### Docker images
- Frontend: `docker build -f apps/frontend/Dockerfile -t jslab-frontend .`
- API: `docker build -f apps/api/Dockerfile -t jslab-api .`
- Engine V8: `docker build -f apps/engine-v8/Dockerfile --build-arg V8_BASE_IMAGE=my-v8-image:latest -t jslab-engine-v8 .`
- Engine Hermes: `docker build -f apps/engine-hermes/Dockerfile --build-arg HERMES_BASE_IMAGE=my-hermes-image:latest -t jslab-engine-hermes .`
- You can swap `my-v8-image`/`my-hermes-image` with your own base layers that already contain `d8`/`hermes`/`hermesc`/`hbcdump` (or extend `Dockerfile.v8`/`Dockerfile.hermes` to bake binaries).

### k3s / Traefik deploy
- Apply base stack: `kubectl apply -k infra/k8s/base`
- Namespace: `jslab`
- Set real secrets in `infra/k8s/base/api-secret.example.yaml` (or replace with your own Secret/SealedSecret generator).
- Ingress (Traefik): host `jslab.local` → `/` → `frontend`, `/api` → `api` (with security headers middleware).
- NetworkPolicy: only API reachable from Traefik/namespace, engines reachable only from API, Redis reachable only from API.
- Pods run with `runAsNonRoot`, `allowPrivilegeEscalation: false`, `readOnlyRootFilesystem: true`, `seccompProfile: RuntimeDefault`; `/tmp` mounted from `emptyDir`.
- PodDisruptionBudgets for api/frontend/engines; `infra/k8s/hpa.todo.yaml` holds a ready-to-enable HPA for the API.

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
