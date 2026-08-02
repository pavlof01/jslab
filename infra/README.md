# infra

Kustomize manifests for the `jslab` namespace on k3s (Traefik ingress).

## Layout

- `k8s/base/` — full stack (deployments, services, configmap, ingress, middleware, networkpolicy).
- `k8s/prod/` — `../base` + image tag overrides. CI rewrites tags to the commit SHA.
  - `k8s/prod/services/<svc>/` — single-service slice; each per-service deploy
    workflow renders only its own slice (`--load-restrictor LoadRestrictionsNone`).
- `k8s/dev/` — Skaffold overlay. Intentionally excludes Traefik CRDs
  (Ingress / Middleware) and NetworkPolicies; use port-forward locally.
- `k8s/monitoring/` — Grafana Alloy. **Off by default**, referenced by no other
  kustomization; see [Monitoring](#monitoring-off-by-default).
- `node/` — host-level config applied over SSH, not by `kubectl`; see
  [Node disk management](#node-disk-management).
- `policy/ingress.rego` — Conftest/OPA check for ingress host/path collisions
  and dangling TLS secret references.

## Ingress routing model

Four Ingress objects share the same hosts and are disambiguated by explicit
Traefik router priorities (higher wins):

| Priority | Ingress | Paths | Backend | Middleware |
|---|---|---|---|---|
| 2000 | `jslab-frontend-api` | `/api/trace/functions`, `/api/spec` | frontend | `jslab-security-headers` |
| 1000 | `jslab-api` | `/api` | api | `jslab-security-headers` |
| 500 | `jslab-embed` | `/embed` | frontend | `jslab-embed-headers` |
| 10 | `jslab-frontend` | `/` | frontend | `jslab-security-headers` |

`/api/trace/execute/*` intentionally matches no rule at priority 2000, so it
falls through to `/api` and is served by the **api gateway**. That is the only
place trace runs are rate limited, charged to an API-key budget and counted in
`/metrics`; routing them to the frontend again silently un-meters them. The two
paths that remain on the frontend do so only because the gateway has no
equivalent route for them yet.

`jslab-embed` exists purely to swap the middleware. `jslab-security-headers`
sets `frameDeny`, i.e. `X-Frame-Options: DENY` on every response, which makes
the `<iframe>` snippet the playground's "Copy embed code" button produces
unrenderable everywhere. `jslab-embed-headers` keeps the rest of the headers and
replaces `frameDeny` with `Content-Security-Policy: frame-ancestors *`. Embeds
are pasted into arbitrary third-party pages, so the embedder cannot be
enumerated; that is only acceptable because `/embed/playground` is anonymous and
has no state-changing action beyond the same rate-limited `POST /api/run` any
visitor can call. **Do not put authenticated or destructive UI under `/embed`,
and do not widen the middleware's route scope.**

## Network policy model

`networkpolicy.yaml` is **default-deny ingress + egress** for the whole
namespace, with additive allowlists:

- DNS (port 53 → kube-system) is allowed for every pod.
- Ingress: traefik→frontend, {traefik,frontend}→api, {api,frontend}→trace-service,
  api→each engine, api→redis.
- Egress: api→engines+trace+redis, frontend→api+trace.
- **Engines and trace-service get no egress allow** (DNS only). They execute
  untrusted JS, so default-deny keeps a malicious snippet from making outbound
  calls. Do not add broad egress to these pods.

The frontend→trace-service hole is a known leftover. It cannot be closed yet:
`app/abstract-functions-visualizer/server-data.ts` (SSR initial trace) and the
`/api/spec/[functionName]` + `/api/trace/functions` route handlers still call
trace-service directly, and NetworkPolicy is L3/L4 so it cannot allow the
catalog paths while denying `/execute`. Once the gateway proxies `/functions`
and `/spec/:name`, drop the `app: frontend` selector from both
`trace-service-ingress` and `frontend-egress`.

## Secrets / certs (provisioned out-of-band, not in git)

These exist on the cluster and are **not** committed:

- `jslab-su-origin-tls`, `jslab-cc-origin-tls` — Cloudflare Origin certificates
  (CF set to Full (strict)). Referenced by `ingress.yaml` `tls:`. Recreate with
  `kubectl -n jslab create secret tls <name> --cert=... --key=...`.
- `alloy-grafana-cloud` — Grafana Cloud remote_write credentials. Does **not**
  exist yet; see [Monitoring](#monitoring-off-by-default).

`middleware.yaml` (`jslab-security-headers`) is now tracked in git. If a copy was
previously applied by hand, diff before letting CI apply so a tuned config is not
overwritten:

```
kubectl -n jslab get middleware jslab-security-headers -o yaml
```

## Deploy

- `deploy-infra.yml` — pushes to `infra/**` SSH to the VPS and
  `kubectl apply -k` the prod overlay (host/user/fingerprint via secrets).
- `reusable-deploy-service-vps.yml` — per-service build + push + single-slice apply.

> Note: deploys use `kubectl apply` without `--prune`; resources removed from
> manifests must be deleted from the cluster by hand.

## Node disk management

The node's image filesystem sat at 84% while kubelet logged `FreeDiskSpaceFailed
... freed 0 bytes` every couple of minutes: its default image-GC trigger is 85%,
so garbage collection never ran, and nothing else pruned anything.

Two pieces, both host-level (`infra/node/`), both applied over SSH — **not** by
`kubectl apply -k`, which never touches this directory.

### 1. kubelet image-GC thresholds

`node/k3s/config.yaml.d/10-image-gc.yaml` starts GC at 75% and drains to 65%.
It is a drop-in, so an existing `/etc/rancher/k3s/config.yaml` is left alone
(`kubelet-arg+:` appends rather than replaces).

```
scp infra/node/k3s/config.yaml.d/10-image-gc.yaml \
    root@<node>:/etc/rancher/k3s/config.yaml.d/10-image-gc.yaml
ssh root@<node> 'systemctl restart k3s'
ssh root@<node> 'journalctl -u k3s -n 50 | grep -i image-gc'
```

Restarting k3s restarts the server process only; containerd and the running
pods stay up.

### 2. Daily prune of unused images

`node/bin/jslab-image-prune.sh` runs `k3s crictl rmi --prune`, but only once the
image filesystem is above 70% — on a healthy node the timer is a no-op.

The unit orders itself `After=k3s.service` but does **not** require or want it,
and carries `ConditionPathExists=/run/k3s/containerd/containerd.sock`. Stopping
k3s for maintenance therefore makes the daily run a skipped no-op instead of
pulling the cluster (and the other tenant's production) back up under the
operator — `Persistent=true` on the timer would otherwise fire a catch-up run
that does exactly that.

```
scp infra/node/bin/jslab-image-prune.sh root@<node>:/usr/local/sbin/jslab-image-prune.sh
scp infra/node/systemd/jslab-image-prune.{service,timer} root@<node>:/etc/systemd/system/
ssh root@<node> '
  chmod 0755 /usr/local/sbin/jslab-image-prune.sh &&
  systemctl daemon-reload &&
  systemctl enable --now jslab-image-prune.timer &&
  systemctl list-timers jslab-image-prune.timer'
```

Dry run / force a pass now:

```
ssh root@<node> 'systemctl start jslab-image-prune.service && journalctl -u jslab-image-prune -n 30 --no-pager'
```

**Why a systemd timer and not a CronJob.** Pruning needs the containerd socket,
and a pod mounting `/run/k3s/containerd/containerd.sock` is effectively root on
the node. This node is shared with another tenant's production, so that socket
must stay unreachable from inside the cluster. Note that `crictl rmi --prune` is
still namespace-wide: it removes every image in containerd's `k8s.io` namespace
that no container references, including the other tenant's stale tags. Images
backing running containers are never removed.

## Monitoring (off by default)

`apps/api` exposes Prometheus metrics on `/metrics`, and nothing scrapes them —
which is why the disk filled up invisibly. `k8s/monitoring/` holds a ready-to-
apply Grafana Alloy agent that scrapes the api gateway plus kubelet/cAdvisor
(through the apiserver proxy, so no kubelet port egress is needed) and
`remote_write`s to Grafana Cloud.

It is **not** referenced by `k8s/prod` or any per-service overlay, on purpose:
the credentials Secret does not exist, and applying it without one leaves a
crash-looping pod on a node with ~600m CPU / ~1Gi memory of headroom.

Enable it in two steps:

```
kubectl -n jslab create secret generic alloy-grafana-cloud \
  --from-literal=GRAFANA_CLOUD_PROM_URL='https://prometheus-prod-XX-prod-YY.grafana.net/api/prom/push' \
  --from-literal=GRAFANA_CLOUD_PROM_USER='<stack numeric id>' \
  --from-literal=GRAFANA_CLOUD_PROM_PASSWORD='<grafana.com API token, MetricsPublisher role>'

kubectl apply -k infra/k8s/monitoring
kubectl -n jslab logs deploy/alloy --tail=50
```

Disable again with `kubectl delete -k infra/k8s/monitoring`.

Notes:

- CI's manifest job validates `base`, `prod`, `dev` and the per-service slices
  by name; `monitoring/` is not in that list. Validate it by hand when editing:
  `kustomize build infra/k8s/monitoring | kubeconform -strict -summary -ignore-missing-schemas`.
- Alerts to build first, both from these scrapes: node image filesystem above
  80% (`container_fs_usage_bytes{id="/"} / container_fs_limit_bytes{id="/"}`)
  and gateway 5xx / `rate_limited` rate.
- cAdvisor series are filtered down to a keep-list in the Alloy config to stay
  inside a Grafana Cloud free-tier active-series budget. Widen deliberately.
- The image tag is pinned (`grafana/alloy:v1.5.1`). The config uses the Alloy
  1.x `sys.env(...)` stdlib call; if you bump to a version that renames it, the
  agent fails to load its config at startup.
