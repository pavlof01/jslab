#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${JSLAB_BASE_URL:-https://jslab.su}"
CURL_FLAGS="${CURL_FLAGS:-}"

BASE_URL="${BASE_URL%/}"

# The site sits behind Cloudflare, which answers a default curl User-Agent from a
# datacenter IP with 403 before the request ever reaches Traefik. Presenting a
# browser UA is what makes this script usable from CI as well as from a laptop.
UA="${JSLAB_SMOKE_UA:-Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36}"

# If Cloudflare still challenges the runner on IP reputation alone, add a WAF
# skip rule keyed on this header and set JSLAB_SMOKE_TOKEN as a repo secret.
TOKEN_HEADER=()
if [[ -n "${JSLAB_SMOKE_TOKEN:-}" ]]; then
  TOKEN_HEADER=(-H "x-smoke-token: ${JSLAB_SMOKE_TOKEN}")
fi

fetch() {
  curl -sS $CURL_FLAGS -A "$UA" ${TOKEN_HEADER[@]+"${TOKEN_HEADER[@]}"} "$@"
}

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

# A blocked request looks nothing like a broken deploy, so say which one it was.
# Everything here writes to files rather than through a command substitution:
# under `set -euo pipefail` a `$(... | head -3)` aborts the whole script when the
# body is empty (grep exits 1) or larger than the pipe buffer (head closes the
# pipe, curl dies of SIGPIPE) — which is precisely a Cloudflare challenge page.
diagnose() {
  local url="$1"
  local hdr="$tmp_dir/diag.headers"
  local body="$tmp_dir/diag.body"
  echo "--- response detail for $url" >&2
  : >"$hdr"
  : >"$body"
  fetch -D "$hdr" -o "$body" "$url" >/dev/null 2>&1 || true
  grep -iE "^(HTTP/|server:|cf-ray:|cf-mitigated:|retry-after:)" "$hdr" >&2 || true
  if [[ -s "$body" ]]; then
    echo "--- first lines of body:" >&2
    { tr -d '\r' <"$body" | grep -vE "^[[:space:]]*\$" | head -5 >&2; } || true
  fi
  # The whole body, not its first lines: Cloudflare's block and challenge pages
  # carry their marker in <title>, several lines below <!DOCTYPE html>.
  if grep -qiE "cloudflare|attention required|just a moment|sorry, you have been blocked" "$hdr" "$body" 2>/dev/null; then
    echo "--- This is a Cloudflare block, not a failing deploy." >&2
    echo "--- Add a WAF skip rule for the x-smoke-token header and set JSLAB_SMOKE_TOKEN" >&2
    echo "--- (infra/README.md, \"Smoke checks through Cloudflare\")." >&2
  fi
}

# Every check diagnoses, not just the first: the JSON POSTs are the requests a
# WAF is most likely to challenge, and they used to fail with a bare status line.
expect_status() {
  local actual="$1"
  local expected="$2"
  local label="$3"
  local url="$4"
  if [[ "$actual" != "$expected" ]]; then
    echo "Expected $label status $expected, got $actual." >&2
    diagnose "$url"
    exit 1
  fi
}

echo "Checking frontend route..."
root_status="$(fetch -o /dev/null -w "%{http_code}" "$BASE_URL/")"
case "$root_status" in
  200|301|302|307|308) ;;
  *)
    echo "Unexpected status for /: $root_status" >&2
    diagnose "$BASE_URL/"
    exit 1
    ;;
esac

echo "Checking /api/run..."
run_headers="$tmp_dir/run.headers"
run_body="$tmp_dir/run.body"
run_status="$(fetch -D "$run_headers" -o "$run_body" -w "%{http_code}" \
  -H "content-type: application/json" \
  -d '{"engine":"v8","task":"run","sourceText":"1+1"}' \
  "$BASE_URL/api/run")"
expect_status "$run_status" "200" "/api/run" "$BASE_URL/api/run"

if grep -Eiq "^content-type:.*text/html" "$run_headers"; then
  echo "/api/run returned HTML content-type." >&2
  exit 1
fi

if grep -Eiq "<!doctype html|<html" "$run_body"; then
  echo "/api/run returned HTML body (likely routed to frontend)." >&2
  exit 1
fi

if ! grep -Eq "\"ok\"[[:space:]]*:[[:space:]]*true" "$run_body"; then
  echo "/api/run response did not include ok:true." >&2
  exit 1
fi

if grep -Eiq "^x-powered-by:.*next\.js" "$run_headers"; then
  echo "/api/run returned Next.js headers." >&2
  exit 1
fi

if grep -Eiq "^x-nextjs-" "$run_headers"; then
  echo "/api/run returned Next.js headers." >&2
  exit 1
fi

if grep -Eiq "^server:.*next" "$run_headers"; then
  echo "/api/run returned Next.js server header." >&2
  exit 1
fi

echo "Checking /api/trace/execute/type-conversion..."
trace_headers="$tmp_dir/trace.headers"
trace_body="$tmp_dir/trace.body"
trace_status="$(fetch -D "$trace_headers" -o "$trace_body" -w "%{http_code}" \
  -H "content-type: application/json" \
  -d '{"functionName":"ToNumber","input":"42"}' \
  "$BASE_URL/api/trace/execute/type-conversion")"
expect_status "$trace_status" "200" "/api/trace/execute/type-conversion" \
  "$BASE_URL/api/trace/execute/type-conversion"

if grep -Eiq "^content-type:.*text/html" "$trace_headers"; then
  echo "/api/trace/execute/type-conversion returned HTML content-type." >&2
  exit 1
fi

if grep -Eiq "<!doctype html|<html" "$trace_body"; then
  echo "/api/trace/execute/type-conversion returned HTML body (likely routed to frontend)." >&2
  exit 1
fi

if ! grep -Eq "\"success\"[[:space:]]*:[[:space:]]*true" "$trace_body"; then
  echo "/api/trace/execute/type-conversion response did not include success:true." >&2
  exit 1
fi

if grep -Eiq "^x-powered-by:.*next\.js" "$trace_headers"; then
  echo "/api/trace/execute/type-conversion returned Next.js headers." >&2
  exit 1
fi

if grep -Eiq "^x-nextjs-" "$trace_headers"; then
  echo "/api/trace/execute/type-conversion returned Next.js headers." >&2
  exit 1
fi

if grep -Eiq "^server:.*next" "$trace_headers"; then
  echo "/api/trace/execute/type-conversion returned Next.js server header." >&2
  exit 1
fi

echo "Checking /api/trace/functions..."
functions_status="$(fetch -o /dev/null -w "%{http_code}" "$BASE_URL/api/trace/functions")"
expect_status "$functions_status" "200" "/api/trace/functions" "$BASE_URL/api/trace/functions"

echo "Smoke tests passed."
