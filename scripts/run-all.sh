#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: run-all.sh <input.js>" >&2
  exit 1
fi

JS="$1"
BASENAME=$(basename "$JS" .js)
OUT_DIR="out/$BASENAME"
mkdir -p "$OUT_DIR"

echo "========== Running all engines for $JS =========="

# V8
if ./scripts/v8.sh "$JS"; then
  echo "✅ V8 done"
else
  echo "❌ V8 failed"
fi

# SpiderMonkey
if ./scripts/spidermonkey.sh "$JS"; then
  echo "✅ SpiderMonkey done"
else
  echo "❌ SpiderMonkey failed"
fi

# Hermes
if ./scripts/hermes.sh "$JS"; then
  echo "✅ Hermes done"
else
  echo "❌ Hermes failed"
fi

echo "Results saved in $OUT_DIR/"