#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${JSLAB_BASE_URL:-https://jslab.su}"
CURL_FLAGS="${CURL_FLAGS:-}"

BASE_URL="${BASE_URL%/}"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

expect_status() {
  local actual="$1"
  local expected="$2"
  local label="$3"
  if [[ "$actual" != "$expected" ]]; then
    echo "Expected $label status $expected, got $actual." >&2
    return 1
  fi
}

echo "Checking frontend route..."
root_status="$(curl -sS $CURL_FLAGS -o /dev/null -w "%{http_code}" -I "$BASE_URL/")"
case "$root_status" in
  200|301|302|307|308) ;;
  *)
    echo "Unexpected status for /: $root_status" >&2
    exit 1
    ;;
esac

echo "Checking /api/run..."
run_headers="$tmp_dir/run.headers"
run_body="$tmp_dir/run.body"
run_status="$(curl -sS $CURL_FLAGS -D "$run_headers" -o "$run_body" -w "%{http_code}" \
  -H "content-type: application/json" \
  -d '{"engine":"v8","task":"run","sourceText":"1+1"}' \
  "$BASE_URL/api/run")"
expect_status "$run_status" "200" "/api/run"

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
trace_status="$(curl -sS $CURL_FLAGS -D "$trace_headers" -o "$trace_body" -w "%{http_code}" \
  -H "content-type: application/json" \
  -d '{"functionName":"ToNumber","input":"42"}' \
  "$BASE_URL/api/trace/execute/type-conversion")"
expect_status "$trace_status" "200" "/api/trace/execute/type-conversion"

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
functions_status="$(curl -sS $CURL_FLAGS -o /dev/null -w "%{http_code}" "$BASE_URL/api/trace/functions")"
expect_status "$functions_status" "200" "/api/trace/functions"

echo "Smoke tests passed."
