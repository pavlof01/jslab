#!/usr/bin/env bash
set -euo pipefail

tests=(01_add 02_closure 03_loop 04_trycatch 05_class)
pass=0; fail=0

for t in "${tests[@]}"; do
  JS="tests/${t}.js"
  echo "========== $t =========="
  # собрать дизасм/байткод
  make -s v8               JS="$JS"
  make -s spidermonkey-dis JS="$JS"
  make -s hermes-dis       JS="$JS"

  V8_FILE="out/v8.bytecode.txt"
  SM_FILE="out/sm.bytecode.txt"
  HERMES_DIS="out/hermes.dis.txt"

  # sanity: файлы существуют и не пустые
  [[ -s "$V8_FILE" ]]    || { echo "✗ missing $V8_FILE"; exit 1; }
  [[ -s "$SM_FILE" ]]    || { echo "✗ missing $SM_FILE"; exit 1; }
  [[ -s "$HERMES_DIS" ]] || { echo "✗ missing $HERMES_DIS"; exit 1; }

  v8_ok=1; sm_ok=1; h_ok=1

  case "$t" in
    01_add)
      grep -qE 'AddSmi|(^|[^A-Za-z0-9_])Add([^A-Za-z0-9_]|$)' "$V8_FILE" || v8_ok=0
      grep -qE '(^|[^A-Za-z0-9_])Add([^A-Za-z0-9_]|$)'        "$SM_FILE"  || sm_ok=0
      grep -qE '(^|[^A-Za-z0-9_])Add([^A-Za-z0-9_]|$)'        "$HERMES_DIS" || h_ok=0
      ;;
    02_closure)
      grep -q 'CreateClosure' "$V8_FILE"    || v8_ok=0
      grep -qE '(^|[^A-Za-z0-9_])Add([^A-Za-z0-9_]|$)' "$V8_FILE" || v8_ok=0
      grep -qE '(Add|Lambda|Function)' "$SM_FILE" || sm_ok=0
      grep -q 'CreateClosure' "$HERMES_DIS" || h_ok=0
      grep -qE '(^|[^A-Za-z0-9_])Add([^A-Za-z0-9_]|$)' "$HERMES_DIS" || h_ok=0
      ;;
    03_loop)
      grep -qE 'AddSmi|(^|[^A-Za-z0-9_])Add([^A-Za-z0-9_]|$)' "$V8_FILE" || v8_ok=0
      grep -qE '(^|[^A-Za-z0-9_])Add([^A-Za-z0-9_]|$)'        "$SM_FILE"  || sm_ok=0
      grep -qE '(^|[^A-Za-z0-9_])Add([^A-Za-z0-9_]|$)'        "$HERMES_DIS" || h_ok=0
      ;;
    04_trycatch)
      grep -q 'Throw' "$V8_FILE"    || v8_ok=0
      grep -q 'Throw' "$SM_FILE"    || sm_ok=0
      grep -q 'Throw' "$HERMES_DIS" || h_ok=0
      ;;
    05_class)
      grep -q 'Mul' "$V8_FILE"    || v8_ok=0
      grep -q 'Mul' "$HERMES_DIS" || h_ok=0
      ;;
  esac

  if [[ $v8_ok -eq 1 && $sm_ok -eq 1 && $h_ok -eq 1 ]]; then
    echo "✅ $t OK"
    ((pass++))
  else
    echo "❌ $t FAIL  (v8=$v8_ok sm=$sm_ok hermes=$h_ok)"
    ((fail++))
  fi
done

echo "======== summary ========"
echo "passed: $pass  failed: $fail"
[[ $fail -eq 0 ]]