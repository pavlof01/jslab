#!/usr/bin/env bash
set -euo pipefail

KUSTOMIZE_PATH="${KUSTOMIZE_PATH:-infra/k8s/base}"
KUSTOMIZE_FLAGS="${KUSTOMIZE_FLAGS:-}"
POLICY_DIR="${POLICY_DIR:-infra/policy}"
KUBE_VERSION="${KUBE_VERSION:-1.27.0}"

if ! command -v kubectl >/dev/null 2>&1; then
  echo "kubectl is required to render manifests." >&2
  exit 1
fi

if ! command -v kubeconform >/dev/null 2>&1; then
  echo "kubeconform is required for schema validation." >&2
  exit 1
fi

if ! command -v conftest >/dev/null 2>&1; then
  echo "conftest is required for policy validation." >&2
  exit 1
fi

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

kubectl kustomize $KUSTOMIZE_FLAGS "$KUSTOMIZE_PATH" > "$tmp"

kubeconform -strict -summary -ignore-missing-schemas -kubernetes-version "$KUBE_VERSION" "$tmp"
conftest test --combine -p "$POLICY_DIR" "$tmp"
