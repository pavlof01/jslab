package ingress

ingresses := [ing | ing := input[_]; ing.kind == "Ingress"]

routes := [route |
  ing := ingresses[_]
  ns := object.get(ing.metadata, "namespace", "default")
  name := object.get(ing.metadata, "name", "")
  priority := ingress_priority(ing)
  rule := ing.spec.rules[_]
  host := object.get(rule, "host", "*")
  path := rule.http.paths[_]
  path_value := object.get(path, "path", "/")
  path_type := object.get(path, "pathType", "ImplementationSpecific")
  route := {
    "namespace": ns,
    "name": name,
    "host": host,
    "path": path_value,
    "pathType": path_type,
    "priority": priority,
  }
]

secrets := {secret_id |
  secret := input[_]
  secret.kind == "Secret"
  ns := object.get(secret.metadata, "namespace", "default")
  name := secret.metadata.name
  secret_id := sprintf("%s/%s", [ns, name])
}

certs := {cert_id |
  cert := input[_]
  cert.kind == "Certificate"
  ns := object.get(cert.metadata, "namespace", "default")
  name := cert.spec.secretName
  name != ""
  cert_id := sprintf("%s/%s", [ns, name])
}

deny[msg] {
  some i, j
  i < j
  r1 := routes[i]
  r2 := routes[j]
  r1.namespace != r2.namespace
  host_overlaps(r1.host, r2.host)
  r1.path == r2.path
  msg := sprintf("Ingress host+path collision across namespaces: %s/%s and %s/%s both define host %q path %q", [r1.namespace, r1.name, r2.namespace, r2.name, r1.host, r1.path])
}

deny[msg] {
  some i, j
  i < j
  r1 := routes[i]
  r2 := routes[j]
  r1.namespace != r2.namespace
  host_overlaps(r1.host, r2.host)
  paths_overlap(r1, r2)
  not explicit_priority_strategy(r1.priority, r2.priority)
  msg := sprintf("Ingress host/path overlap across namespaces without explicit priority: %s/%s (%s) vs %s/%s (%s)", [r1.namespace, r1.name, r1.path, r2.namespace, r2.name, r2.path])
}

deny[msg] {
  ing := ingresses[_]
  ns := object.get(ing.metadata, "namespace", "default")
  tls := ing.spec.tls[_]
  secret_name := tls.secretName
  secret_name != ""
  not secret_or_cert_exists(ns, secret_name)
  msg := sprintf("Ingress %s/%s references tls secret %q but no Secret/Certificate exists in the same namespace", [ns, ing.metadata.name, secret_name])
}

secret_or_cert_exists(ns, name) {
  id := sprintf("%s/%s", [ns, name])
  secrets[id]
}

secret_or_cert_exists(ns, name) {
  id := sprintf("%s/%s", [ns, name])
  certs[id]
}

host_overlaps(h1, h2) {
  h1 == h2
}

host_overlaps(h1, h2) {
  h1 == "*"
}

host_overlaps(h1, h2) {
  h2 == "*"
}

paths_overlap(r1, r2) {
  is_prefix_path(r1.pathType)
  is_prefix_path(r2.pathType)
  startswith(r1.path, r2.path) or startswith(r2.path, r1.path)
}

paths_overlap(r1, r2) {
  is_exact_path(r1.pathType)
  is_exact_path(r2.pathType)
  r1.path == r2.path
}

paths_overlap(r1, r2) {
  is_exact_path(r1.pathType)
  is_prefix_path(r2.pathType)
  startswith(r1.path, r2.path)
}

paths_overlap(r1, r2) {
  is_prefix_path(r1.pathType)
  is_exact_path(r2.pathType)
  startswith(r2.path, r1.path)
}

explicit_priority_strategy(p1, p2) {
  p1 != null
  p2 != null
  p1 != p2
}

is_prefix_path(path_type) {
  pt := lower(path_type)
  pt == "prefix" or pt == "implementationspecific" or pt == ""
}

is_exact_path(path_type) {
  lower(path_type) == "exact"
}

ingress_priority(ing) = p {
  ann := object.get(ing.metadata, "annotations", {})
  raw := ann["traefik.ingress.kubernetes.io/router.priority"]
  raw != ""
  re_match("^-?[0-9]+$", raw)
  p := to_number(raw)
}

ingress_priority(ing) = null {
  true
}
