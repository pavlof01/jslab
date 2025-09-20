#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: v8.sh <input.js>" >&2
  exit 1
fi

JS="$1"
BASENAME=$(basename "$JS" .js)
OUT_DIR="out/$BASENAME"
mkdir -p "$OUT_DIR"

V8_D8="${V8_D8:-engines/v8/out.gn/arm64.release/d8}"
if [[ ! -x "$V8_D8" ]]; then
  echo "ERROR: V8 d8 not found at $V8_D8" >&2
  exit 2
fi

DIS="$OUT_DIR/v8.bytecode.txt"

echo "[V8] bytecode -> $DIS"
"$V8_D8" --allow-natives-syntax --print-bytecode "$JS" > "$DIS" 2>&1