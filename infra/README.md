# infra

Kustomize manifests for the `jslab` namespace on k3s (Traefik ingress).

## Layout

- `k8s/base/` — full stack (deployments, services, configmap, ingress, middleware, networkpolicy).
- `k8s/prod/` — `../base` + image tag overrides. CI rewrites tags to the commit SHA.
  - `k8s/prod/services/<svc>/` — single-service slice; each per-service deploy
    workflow renders only its own slice (`--load-restrictor LoadRestrictionsNone`).
- `k8s/dev/` — Skaffold overlay. Intentionally excludes Traefik CRDs
  (Ingress / Middleware) and NetworkPolicies; use port-forward locally.
- `policy/ingress.rego` — Conftest/OPA check for ingress host/path collisions
  and dangling TLS secret references.

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

## Secrets / certs (provisioned out-of-band, not in git)

These exist on the cluster and are **not** committed:

- `jslab-su-origin-tls`, `jslab-cc-origin-tls` — Cloudflare Origin certificates
  (CF set to Full (strict)). Referenced by `ingress.yaml` `tls:`. Recreate with
  `kubectl -n jslab create secret tls <name> --cert=... --key=...`.

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
