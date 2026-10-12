#!/usr/bin/env bash
# Optional Xcode Cloud secret GOOGLE_PLACES_API_KEY.
# When set, stamp it into src/config/places-key.js before Vite runs.
# When absent, leave the committed empty string so the app skips Google.
# Never print the key.

set -euo pipefail

ROOT="${1:-}"
if [[ -z "$ROOT" || ! -f "$ROOT/src/config/places-key.js" ]]; then
  echo "ERROR: stamp_places_key.sh needs the repo root (missing src/config/places-key.js)" >&2
  exit 1
fi

if [[ -z "${GOOGLE_PLACES_API_KEY:-}" ]]; then
  echo "GOOGLE_PLACES_API_KEY unset — Google Places photos disabled"
  exit 0
fi

python3 - "$ROOT/src/config/places-key.js" << 'PY'
import os
import pathlib
import re
import sys

path = pathlib.Path(sys.argv[1])
key = os.environ.get("GOOGLE_PLACES_API_KEY", "").strip()
if not key or any(ch in key for ch in "\"'\\`\n\r"):
    raise SystemExit("ERROR: GOOGLE_PLACES_API_KEY is empty or unsafe to embed")

text = path.read_text()
updated, count = re.subn(
    r"^export const GOOGLE_PLACES_API_KEY = '';$",
    "export const GOOGLE_PLACES_API_KEY = " + repr(key) + ";",
    text,
    count=1,
    flags=re.M,
)
if count != 1:
    raise SystemExit(f"ERROR: could not stamp GOOGLE_PLACES_API_KEY in {path}")
path.write_text(updated)
print("Stamped GOOGLE_PLACES_API_KEY into src/config/places-key.js (value not logged)")
PY
