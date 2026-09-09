#!/usr/bin/env bash
# Confirm Capacitor copied a real web bundle into ios/App/App/public.
# Empty or missing public/ is the usual iOS black-screen after Archive.

set -euo pipefail

ROOT="${1:-}"
if [[ -z "$ROOT" ]]; then
  echo "Usage: verify_ios_web_assets.sh <repo-root>" >&2
  exit 1
fi

PUBLIC="$ROOT/ios/App/App/public"
INDEX="$PUBLIC/index.html"

if [[ ! -f "$INDEX" ]]; then
  echo "ERROR: $INDEX missing — run cap copy after a Capacitor web build" >&2
  exit 1
fi

if [[ ! -s "$INDEX" ]]; then
  echo "ERROR: $INDEX is empty" >&2
  exit 1
fi

if ! grep -q 'id="app"' "$INDEX"; then
  echo "ERROR: $INDEX has no #app root — web bundle looks incomplete" >&2
  exit 1
fi

js_count="$(find "$PUBLIC" -type f \( -name '*.js' -o -name '*.mjs' \) | wc -l | tr -d ' ')"
if [[ "$js_count" -lt 1 ]]; then
  echo "ERROR: no JavaScript assets under $PUBLIC — Archive would launch a black WKWebView" >&2
  exit 1
fi

echo "Web assets OK: $INDEX ($(wc -c < "$INDEX" | tr -d ' ') bytes, ${js_count} js)"
