#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
js-bytecode.sh - run JS bytecode/disassembly across engines.

Usage:
  js-bytecode.sh [-e v8|sm|hermes|all] [-f FUNCTION] <input.js>

Options:
  -e, --engine     Engine(s) to run [default: all]
  -f, --function   Function name for V8/SM focus (default: f)
  -h, --help       Show help

Env overrides (paths):
  V8_D8        default: engines/v8/out.gn/arm64.release/d8
  SM_JS        default: engines/spidermonkey/obj-aarch64-apple-darwin24.6.0/dist/bin/js
  HERMESC      default: engines/hermes/build_release/bin/hermesc
  HERMES       default: engines/hermes/build_release/bin/hermes
  HBCDUMP      default: engines/hermes/build_release/bin/hbcdump
USAGE
}

ENGINE="all"
FUNC="f"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -e|--engine) ENGINE="${2:-}"; shift 2 ;;
    -f|--function) FUNC="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    --) shift; break ;;
    -*)
      echo "Unknown flag: $1" >&2; usage; exit 1 ;;
    *) break ;;
  esac
done

if [[ $# -lt 1 ]]; then
  usage; exit 1
fi

JS="$1"
if [[ ! -f "$JS" ]]; then
  echo "Input not found: $JS" >&2; exit 1
fi

BASENAME="$(basename "${JS%.*}")"
OUT_DIR="out/$BASENAME"
mkdir -p "$OUT_DIR"

# Resolve script dir to call sibling engine scripts
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

run_v8() {
  "$SCRIPT_DIR/v8.sh" -f "$FUNC" "$JS" "$OUT_DIR"
}

run_sm() {
  "$SCRIPT_DIR/spidermonkey.sh" -f "$FUNC" "$JS" "$OUT_DIR"
}

run_hermes() {
  "$SCRIPT_DIR/hermes.sh" "$JS" "$OUT_DIR"
}

case "$ENGINE" in
  v8) run_v8 ;;
  sm|spidermonkey) run_sm ;;
  hermes) run_hermes ;;
  all) run_v8; run_sm; run_hermes ;;
  *)
    echo "Unknown engine: $ENGINE" >&2; usage; exit 1 ;;
esac

echo "Done. See $OUT_DIR/"