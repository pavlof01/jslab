#!/usr/bin/env bash
set -euo pipefail

# =============== Config & CLI ===============
D8_BIN="${D8_BIN:-d8}"
OUT_DIR="${OUT_DIR:-./v8-flag-logs}"
RUN_ONLY="${RUN_ONLY:-}" # comma-separated flags to run only a subset
HELP=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --d8) D8_BIN="$2"; shift 2;;
    --out) OUT_DIR="$2"; shift 2;;
    --only) RUN_ONLY="$2"; shift 2;;
    -h|--help) HELP=true; shift;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

if $HELP; then
  cat <<EOF
Usage:
  ./v8_flag_explorer.sh [--d8 /path/to/d8] [--out ./v8-flag-logs] [--only flag1,flag2]

Examples:
  ./v8_flag_explorer.sh --d8 ~/v8/out.gn/x64.release/d8
  ./v8_flag_explorer.sh --d8 ~/v8/out.gn/arm64.debug/d8 --only print-bytecode,trace-opt
EOF
  exit 0
fi

if ! command -v "$D8_BIN" >/dev/null 2>&1; then
  echo "Error: d8 not found at '$D8_BIN'"; exit 1
fi

mkdir -p "$OUT_DIR"

# =============== Samples ===============
SAMPLES_DIR="$(mktemp -d -t v8samples.XXXXXX)"

cat > "$SAMPLES_DIR/core.js" <<'JS'
function hotAdd(a, b) { return a + b; }

function polyAccess(obj) { return obj.prop + 1; }

function useRegex(s) {
  const r = /(\w+)\s+(\d+)|^$/.exec(s);
  return r ? r[1] : null;
}

function manyCalls() {
  let sum = 0;
  for (let i = 0; i < 30_000; i++) {
    sum += hotAdd(i, 1);
    if ((i & 7) === 0) useRegex("name " + i);
  }
  for (let i = 0; i < 5_000; i++) {
    polyAccess({prop: i});
    polyAccess({prop: i, extra: true});
  }
  return sum;
}

print("RESULT:", manyCalls());
JS

cat > "$SAMPLES_DIR/ast_only.js" <<'JS'
function greet(name) {
  if (!name) return "hi";
  return `hello, ${name}`;
}
greet("v8");
JS

cat > "$SAMPLES_DIR/natives.js" <<'JS'
function add(a, b) { return a + b; }
try { %PrepareFunctionForOptimization(add); } catch (e) {}
add(1,2); add(3,4); add(5,6);
try { %OptimizeFunctionOnNextCall(add); } catch (e) {}
add(7,8);
print("NATIVES_DONE");
JS

# =============== Flag matrix ===============
FLAGS=(
"allow-natives-syntax|--allow-natives-syntax|natives.js|Разрешает %внутренние функции.|В логе NATIVES_DONE; без флага будет SyntaxError."
"print-bytecode|--print-bytecode|core.js|Печать байткода Ignition.|Секции 'Bytecode for function ...'."
"print-code|--print-code|core.js|Печать машинного кода.|Дизассемблер с комментариями."
"print-opt-code|--print-opt-code|core.js|Оптимизированный код.|TurboFan/Maglev код."
"print-ast|--print-ast|ast_only.js|AST после парсинга.|Дерево узлов."
"trace-ast|--trace-ast|ast_only.js|Трассировка AST.|Ход построения AST."
"trace-ic|--trace-ic|core.js|Inline Caches.|Сообщения о смене IC."
"trace-opt|--trace-opt|core.js|Оптимизации.|'marking ... for optimization'."
"trace-opt-verbose|--trace-opt-verbose|core.js|Подробные опт./деопт.|Глубокие причины."
"trace-deopt|--trace-deopt|core.js|Деоптимизации.|Сообщения 'deoptimizing ...'."
"print-regexp-bytecode|--print-regexp-bytecode|core.js|Байткод regexp.|Инструкции regexp VM."
"print-regexp-code|--print-regexp-code|core.js|Машинный код regexp.|Дизассемблер regexp."
"trace-ignition-codegen|--trace-ignition-codegen|core.js|Генерация байткода.|Линии эмиссии."
"trace-ignition-dispatches|--trace-ignition-dispatches|core.js|Диспетчер байткода.|Очень шумный лог."
)

should_run() {
  local name="$1"
  if [[ -z "$RUN_ONLY" ]]; then return 0; fi
  IFS=',' read -ra arr <<< "$RUN_ONLY"
  for f in "${arr[@]}"; do
    if [[ "$f" == "$name" ]]; then return 0; fi
  done
  return 1
}

# =============== Runner ===============
echo "Using d8: $D8_BIN"
echo "Logs dir: $OUT_DIR"
echo "Samples : $SAMPLES_DIR"
echo

summary_file="$OUT_DIR/README.txt"
: > "$summary_file"
printf "V8 Flag Explorer\nGenerated: %s\n\n" "$(date)" >> "$summary_file"

for entry in "${FLAGS[@]}"; do
  IFS="|" read -r name flag sample desc hint <<< "$entry"
  if ! should_run "$name"; then continue; fi
  echo ">>> Running $name ($flag)"
  out_file="$OUT_DIR/${name}.log"
  if "$D8_BIN" $flag "$SAMPLES_DIR/$sample" >"$out_file" 2>&1; then
    echo "  OK -> $out_file"
  else
    echo "  ERR (exit code $?) -> $out_file"
  fi
  {
    echo "### $name"
    echo "Flag: $flag"
    echo "Sample: $sample"
    echo "Desc: $desc"
    echo "Hint: $hint"
    echo "Log: ${name}.log"
    echo
  } >> "$summary_file"
done

echo
echo "Done! Logs in $OUT_DIR, summary in $summary_file"