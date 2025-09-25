#!/usr/bin/env bash
set -euo pipefail

# Configuration: adjust these paths or export variables before running.
resolve_binary() {
  local label="$1"; shift
  local candidate
  for candidate in "$@"; do
    [[ -z "$candidate" ]] && continue
    if [[ -x "$candidate" ]]; then
      printf '%s' "$candidate"
      return 0
    fi
  done
  return 1
}

join_candidates() {
  local candidate
  for candidate in "$@"; do
    [[ -z "$candidate" ]] && continue
    printf '  - %s\n' "$candidate"
  done
}

V8_CANDIDATES=(
  "${V8_D8:-}"
  ../engines/v8/out.gn/arm64.release/d8
  ../engines/v8/out.gn/arm64.debug/d8
  ../engines/v8/out.gn/x64.release/d8
  ../engines/v8/out.gn/x64.debug/d8
)
SM_CANDIDATES=(
  "${SM_JS:-}"
  ../engines/spidermonkey/bin/js
  ../engines/spidermonkey/obj-*/dist/bin/js
  ../engines/sm/obj-*/dist/bin/js
  ../engines/sm/dist/bin/js
)
HERMESC_CANDIDATES=(
  "${HERMESC:-}"
  ../engines/hermes/build_release/bin/hermesc
  ../engines/hermes/build_Debug/bin/hermesc
)
HBCDUMP_CANDIDATES=(
  "${HBCDUMP:-}"
  ../engines/hermes/build_release/bin/hbcdump
  ../engines/hermes/build_Debug/bin/hbcdump
)
JSC_CANDIDATES=(
  "${JSC:-}"
  ../engines/WebKit/WebKitBuild/Debug/jsc
  ../engines/jsc/bin/jsc
  jsc
)

V8_D8=$(resolve_binary "V8 d8" "${V8_CANDIDATES[@]}") || {
  echo "V8 d8 binary not found. Set V8_D8 or build V8. Tried:" >&2
  join_candidates "${V8_CANDIDATES[@]}" >&2
  exit 1
}

SM_JS=$(resolve_binary "SpiderMonkey js" "${SM_CANDIDATES[@]}") || {
  echo "SpiderMonkey js binary not found. Set SM_JS or build SpiderMonkey. Tried:" >&2
  join_candidates "${SM_CANDIDATES[@]}" >&2
  exit 1
}

HERMESC=$(resolve_binary "hermesc" "${HERMESC_CANDIDATES[@]}") || {
  echo "hermesc compiler not found. Set HERMESC or build Hermes. Tried:" >&2
  join_candidates "${HERMESC_CANDIDATES[@]}" >&2
  exit 1
}

HBCDUMP=$(resolve_binary "hbcdump" "${HBCDUMP_CANDIDATES[@]}") || {
  echo "hbcdump tool not found. Set HBCDUMP or build Hermes tools. Tried:" >&2
  join_candidates "${HBCDUMP_CANDIDATES[@]}" >&2
  exit 1
}

JSC_BIN=$(resolve_binary "JavaScriptCore" "${JSC_CANDIDATES[@]}") || {
  echo "JavaScriptCore binary not found. Set JSC or provide runnable jsc. Tried:" >&2
  join_candidates "${JSC_CANDIDATES[@]}" >&2
  echo "Note: WebKit debug builds require DYLD_FRAMEWORK_PATH pointing to WebKitBuild/Debug" >&2
  exit 1
}

TMP_DIR=$(mktemp -d -t js-bytecode-check-XXXX)
SNIPPET="$TMP_DIR/snippet.js"
cat >"$SNIPPET" <<'EOF'
function hot(x) { return x + 1; }
print(hot(41));
EOF

run_v8() {
  echo "=== V8 (d8) ==="
  "$V8_D8" --allow-natives-syntax --print-bytecode "$SNIPPET" || echo "V8 failed"
}

run_sm() {
  echo "=== SpiderMonkey ==="
  local scriptEsc
  scriptEsc=$(printf "%s" "$SNIPPET" | sed "s/'/\\'/g")
  local wrapper="load('$scriptEsc');
"
  wrapper+="try {
"
  wrapper+="  if (typeof hot === 'function') {
"
  wrapper+="    print(dis(hot));
"
  wrapper+="  } else {
"
  wrapper+="    let dumped = false;
"
  wrapper+="    for (let k in this) {
"
  wrapper+="      if (typeof this[k] === 'function') {
"
  wrapper+="        print('// disassembly of global function ' + k);
"
  wrapper+="        print(dis(this[k]));
"
  wrapper+="        dumped = true;
"
  wrapper+="        break;
"
  wrapper+="      }
"
  wrapper+="    }
"
  wrapper+="    if (!dumped) print('SpiderMonkey: no function to disassemble');
"
  wrapper+="  }
"
  wrapper+="} catch (e) {
"
  wrapper+="  print('SpiderMonkey disassembly error: ' + e);
"
  wrapper+="}"
  "$SM_JS" -e "$wrapper" || echo "SpiderMonkey failed"
}

run_hermes() {
  echo "=== Hermes ==="
  local hbc="$TMP_DIR/out.hbc"
  if "$HERMESC" -emit-binary -out "$hbc" "$SNIPPET"; then
    echo "-- hbcdump --"
    printf 'disassemble
' | "$HBCDUMP" "$hbc" || echo "hbcdump failed"
  else
    echo "Hermes compilation failed"
  fi
}

run_jsc() {
  echo "=== JavaScriptCore ==="
  # Allow callers to specify custom DYLD_FRAMEWORK_PATH, DYLD_LIBRARY_PATH
  local env_cmd=("$JSC_BIN" -d "$SNIPPET")
  if ! "${env_cmd[@]}"; then
    echo "JSC failed (maybe this build lacks -d support)"
  fi
}

run_v8
run_sm
run_hermes
run_jsc

rm -rf "$TMP_DIR"
