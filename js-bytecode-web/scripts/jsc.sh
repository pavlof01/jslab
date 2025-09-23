#!/usr/bin/env bash
set -euo pipefail
WEBKIT_BUILD="${WEBKIT_BUILD:-$HOME/js-engines/engines/WebKit/WebKitBuild/Debug}"
export DYLD_FRAMEWORK_PATH="$WEBKIT_BUILD"
export DYLD_LIBRARY_PATH="$WEBKIT_BUILD"
exec "$WEBKIT_BUILD/jsc" "-d" "$@"