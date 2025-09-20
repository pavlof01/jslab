#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: hermes.sh <input.js>" >&2
  exit 1
fi

JS="$1"
BASENAME=$(basename "$JS" .js)
OUT_DIR="out/$BASENAME"
mkdir -p "$OUT_DIR"

HERMESC="${HERMESC:-engines/hermes/build_release/bin/hermesc}"
HERMES="${HERMES:-engines/hermes/build_release/bin/hermes}"
HBCDUMP="${HBCDUMP:-engines/hermes/build_release/bin/hbcdump}"

if [[ ! -x "$HERMESC" ]]; then
  echo "ERROR: hermesc not found at $HERMESC" >&2
  exit 2
fi
if [[ ! -x "$HBCDUMP" ]]; then
  echo "ERROR: hbcdump not found at $HBCDUMP" >&2
  exit 2
fi

HBC="$OUT_DIR/hermes.hbc"
DIS="$OUT_DIR/hermes.dis.txt"

echo "[Hermes] compiling -> $HBC"
"$HERMESC" -emit-binary -out "$HBC" "$JS"

echo "[Hermes] disassemble -> $DIS"
printf "disassemble\n" | "$HBCDUMP" "$HBC" > "$DIS"