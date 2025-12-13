#!/usr/bin/env bash
set -euo pipefail
if [[ $# -lt 1 ]]; then echo "Usage: spidermonkey.sh <input.js>" >&2; exit 1; fi
JS="$1"
BASENAME=$(basename "$JS" .js)
OUT_DIR="out/$BASENAME"; mkdir -p "$OUT_DIR"
SM_JS="${SM_JS:-engines/spidermonkey/obj-aarch64-apple-darwin24.6.0/dist/bin/js}"
[[ -x "$SM_JS" ]] || { echo "ERROR: SpiderMonkey js shell not found at $SM_JS" >&2; exit 2; }
DIS="$OUT_DIR/spidermonkey.bytecode.txt"
"$SM_JS" -e "load('$JS'); try { print(dis(f)); } catch(e) { print(dis(this)); }" > "$DIS" 2>&1
cat "$DIS"