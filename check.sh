#!/usr/bin/env bash
set -euo pipefail

OUT="out"
V8_FILE="$OUT/v8.bytecode.txt"
SM_FILE="$OUT/sm.bytecode.txt"
HBC="$OUT/hermes.hbc"
HERMES_DIS="$OUT/hermes.dis.txt"

echo "== build =="
make -s all

fail=0
function req() {
  local file="$1" desc="$2"
  if [[ ! -s "$file" ]]; then
    echo "✗ missing/empty: $file ($desc)"
    fail=1
  else
    echo "✓ $file ($desc)"
  fi
}

echo "== files exist =="
req "$V8_FILE"     "V8 bytecode"
req "$SM_FILE"     "SpiderMonkey dis()"
req "$HBC"         "Hermes .hbc"
req "$HERMES_DIS"  "Hermes disassemble"

echo "== content sanity =="
# V8: должен быть байткод функции f и опкод AddSmi
if grep -q "function: f" "$V8_FILE" && grep -q "AddSmi" "$V8_FILE"; then
  echo "✓ V8: found function f and AddSmi"
else
  echo "✗ V8: expected 'function: f' and 'AddSmi' not found"; fail=1
fi

# SpiderMonkey: ожидаем GetArg/One/Add/Return (для f(x){return x+1})
if grep -q "GetArg" "$SM_FILE" && grep -q "Add" "$SM_FILE" && grep -q "Return" "$SM_FILE"; then
  echo "✓ SpiderMonkey: found GetArg/Add/Return"
else
  echo "✗ SpiderMonkey: expected instructions not found"; fail=1
fi

# Hermes: ожидаем Function<f> и Add/LoadParam
if grep -q "Function<f>" "$HERMES_DIS" && grep -q "Add" "$HERMES_DIS" && grep -q "LoadParam" "$HERMES_DIS"; then
  echo "✓ Hermes: found Function<f>/LoadParam/Add"
else
  echo "✗ Hermes: expected Function<f>/LoadParam/Add not found"; fail=1
fi

echo "== sizes =="
wc -c "$V8_FILE" "$SM_FILE" "$HBC" "$HERMES_DIS" | awk '{printf "  %8s  %s\n",$1,$2}'

if [[ $fail -eq 0 ]]; then
  echo "✅ All checks passed."
  exit 0
else
  echo "❌ Some checks failed."
  exit 1
fi