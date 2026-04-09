#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: v8.sh <input.js>" >&2
  exit 1
fi

JS="$1"
BASENAME="$(basename "${JS%.*}")"
OUT_DIR="out/$BASENAME"
mkdir -p "$OUT_DIR"

# Detect the architecture: x64 or arm64
uname_m="$(uname -m || true)"
case "$uname_m" in
  x86_64)   V8_ARCH="x64"   ;;
  aarch64|arm64) V8_ARCH="arm64" ;;
  *)        V8_ARCH="x64"   ;;
esac

# If V8_D8 is set, use it. Otherwise, look for debug, then release.
if [[ -n "${V8_D8:-}" ]]; then
  D8_BIN="$V8_D8"
else
  cand1="engines/v8/out.gn/${V8_ARCH}.debug/d8"
  cand2="engines/v8/out.gn/${V8_ARCH}.release/d8"
  if [[ -x "$cand1" ]]; then
    D8_BIN="$cand1"
  elif [[ -x "$cand2" ]]; then
    D8_BIN="$cand2"
  else
    echo "ERROR: V8 d8 not found.
Tried:
  $cand1
  $cand2
Or set V8_D8 to a custom path." >&2
    exit 2
  fi
fi

DIS="$OUT_DIR/v8.bytecode.txt"

# Base flags: native syntax + bytecode
V8_FLAGS=( --allow-natives-syntax )

# Can be extended via an environment variable, for example:
# V8_EXTRA_FLAGS="--trace-ic" ./scripts/v8.sh file.js
if [[ -n "${V8_EXTRA_FLAGS:-}" ]]; then
  # shellcheck disable=SC2206
  V8_FLAGS+=( ${V8_EXTRA_FLAGS} )
fi

"$D8_BIN" "${V8_FLAGS[@]}" "$JS" > "$DIS" 2>&1
cat "$DIS"
