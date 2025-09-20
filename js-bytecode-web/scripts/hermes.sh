#!/usr/bin/env bash
set -euo pipefail
if [[ $# -lt 1 ]]; then echo "Usage: hermes.sh <input.js>" >&2; exit 1; fi
JS="$1"
BASENAME=$(basename "$JS" .js)
OUT_DIR="out/$BASENAME"; mkdir -p "$OUT_DIR"
HERMESC="${HERMESC:-engines/hermes/build_release/bin/hermesc}"
HBCDUMP="${HBCDUMP:-engines/hermes/build_release/bin/hbcdump}"
[[ -x "$HERMESC" ]] || { echo "ERROR: hermesc not found at $HERMESC" >&2; exit 2; }
[[ -x "$HBCDUMP" ]] || { echo "ERROR: hbcdump not found at $HBCDUMP" >&2; exit 2; }
HBC="$OUT_DIR/hermes.hbc"; DIS="$OUT_DIR/hermes.dis.txt"
"$HERMESC" -emit-binary -out "$HBC" "$JS"
printf "disassemble\n" | "$HBCDUMP" "$HBC" > "$DIS"
cat "$DIS"