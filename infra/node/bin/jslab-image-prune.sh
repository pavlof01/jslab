#!/bin/sh
# Prune container images that no container references.
#
# Deliberately a host script driven by systemd rather than a Kubernetes
# CronJob: pruning needs the containerd socket, and a pod holding
# /run/k3s/containerd/containerd.sock is effectively root on the node. This
# node is shared with another tenant's production, so that socket must not be
# reachable from inside the cluster.
#
# `crictl rmi --prune` is namespace-wide: it removes every image in
# containerd's k8s.io namespace that no container references, including other
# workloads' stale tags. Images backing running containers are never touched.
# The threshold guard below keeps this a no-op on a healthy node so we only
# take that blast radius when disk is actually the problem.
set -eu

THRESHOLD="${JSLAB_PRUNE_THRESHOLD_PCT:-70}"
DATA_DIR="${JSLAB_K3S_DATA_DIR:-/var/lib/rancher/k3s}"
K3S="${JSLAB_K3S_BIN:-/usr/local/bin/k3s}"
SOCK="${JSLAB_CONTAINERD_SOCK:-/run/k3s/containerd/containerd.sock}"

die() {
  echo "jslab-image-prune: $*" >&2
  exit 1
}

# Everything below feeds unvalidated strings (env overrides, df output) into
# `[ ... -lt ... ]`, which under `set -eu` aborts the unit with a bare
# "integer expression expected" and no clue which value was bad. Check the
# inputs once, up front, with a message an operator can act on.
is_number() {
  case "${1:-}" in
    '' | *[!0-9]*) return 1 ;;
    *) return 0 ;;
  esac
}

is_number "$THRESHOLD" ||
  die "JSLAB_PRUNE_THRESHOLD_PCT must be a whole number of percent, got '${THRESHOLD}'"
[ -d "$DATA_DIR" ] ||
  die "JSLAB_K3S_DATA_DIR '${DATA_DIR}' is not a directory; nothing to measure"

usage_pct() {
  # df's percent column, digits only ("84%" -> "84"). -P forces the POSIX
  # one-line-per-filesystem format, so a long device name cannot wrap $5 onto
  # another line. The status of a pipeline is awk's, so df failing shows up as
  # empty output rather than a non-zero exit — hence the value check, not a
  # `|| die` on the assignment.
  pct="$(df -P "$DATA_DIR" 2>/dev/null | awk 'NR == 2 { gsub(/%/, "", $5); print $5 }')"
  is_number "$pct" ||
    die "could not read disk usage for ${DATA_DIR} (df gave '${pct}')"
  echo "$pct"
}

# `|| exit` is not redundant: die() runs inside the command substitution's
# subshell, so its exit only ends that subshell — the status has to be
# propagated here rather than left to `set -e`.
before="$(usage_pct)" || exit 1
echo "image filesystem ${DATA_DIR} at ${before}% (prune threshold ${THRESHOLD}%)"

if [ "$before" -lt "$THRESHOLD" ]; then
  echo "below threshold, nothing to do"
  exit 0
fi

# The unit has a ConditionPathExists on the socket, so systemd already skips a
# stopped-k3s node. This repeats it for manual runs, where the alternative is
# crictl's own connection-refused backoff.
[ -x "$K3S" ] || die "k3s binary '${K3S}' is missing or not executable"
[ -S "$SOCK" ] || die "containerd socket '${SOCK}' is missing; is k3s running?"

"$K3S" crictl rmi --prune || die "crictl rmi --prune failed"

after="$(usage_pct)" || exit 1
echo "image filesystem ${DATA_DIR} at ${after}% after prune"
