#!/usr/bin/env bash
set -euo pipefail

V8_IMAGE="pavlof01/v8-d8:latest"
HERMES_IMAGE="pavlof01/hermes:latest"
SM_IMAGE="pavlof01/spidermonkey:debug"
JSC_IMAGE="pavlof01/jsc:debug"

run() {
  local name="$1"
  local image="$2"
  local cmd="$3"

  echo "===================="
  echo "== ${name} :: ${image}"
  echo "===================="

  # Feed the script via stdin to avoid host-shell quoting issues.
  # (Many engine commands contain lots of quotes.)
  printf '%s\n' "${cmd}" | docker run -i --rm --pull=always --entrypoint bash "${image}" -lc '
set -e
uname -m
bash -s
'

  echo
}

run "V8 (d8)" "${V8_IMAGE}" '
echo "--- version ---"
d8 -e "print(\"V8=\" + version())" 2>/dev/null || d8 -e "print(\"ok\")" || true

echo "--- eval ---"
d8 -e "print(\"1+1=\" + (1+1))"

echo "--- bytecode ---"
# Print Ignition bytecode for a small function.
# Works in d8 builds that include the flag.
d8 --print-bytecode -e "function f(x){ return x + 1; } f(41);" 2>/dev/null \
  || d8 -e "print(\"(bytecode) flag not available in this d8 build\")" || true
'

run "JavaScriptCore (jsc)" "${JSC_IMAGE}" '
echo "--- eval ---"
jsc -e "print(\"1+1=\" + (1+1))"

echo "--- bytecode ---"
# We only support `-d` for bytecode output.
SCRIPT="function f(x){ return x + 1; } print(\"f(41)=\" + f(41));"

# Print output only if the flag is accepted.
if jsc -d -e "$SCRIPT" >/dev/null 2>&1; then
  jsc -d -e "$SCRIPT" 2>&1 | head -n 200 || true
else
  echo "(bytecode) this jsc build doesn't support -d"
fi
'

run "SpiderMonkey (js shell)" "${SM_IMAGE}" '
echo "--- version ---"
js --version || true

echo "--- dis() ---"
js -e "const fn=new Function(\"let x=1; let y=2; x+y\"); dis(fn);"
'
