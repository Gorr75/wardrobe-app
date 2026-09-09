#!/usr/bin/env bash
# Fail the Cloud clone if Info.plist is missing keys that already rejected
# TestFlight 1.0 (3) — ITC Error 90683 (NSContactsUsageDescription).

set -euo pipefail

PLIST="${1:-}"
if [[ -z "$PLIST" || ! -f "$PLIST" ]]; then
  echo "ERROR: Info.plist not found: ${PLIST:-<missing path>}" >&2
  exit 1
fi

python3 - "$PLIST" <<'PY'
import plistlib
import sys
from pathlib import Path

path = Path(sys.argv[1])
with path.open("rb") as fh:
    data = plistlib.load(fh)

required = [
    "NSContactsUsageDescription",
    "NSCameraUsageDescription",
    "NSPhotoLibraryUsageDescription",
    "NSPhotoLibraryAddUsageDescription",
    "ITSAppUsesNonExemptEncryption",
    "UIFileSharingEnabled",
]
missing = []
empty = []
for key in required:
    if key not in data:
        missing.append(key)
        continue
    value = data[key]
    if isinstance(value, str) and not value.strip():
        empty.append(key)

if missing or empty:
    if missing:
        print("ERROR: Info.plist missing keys (ITC 90683 / usage strings): " + ", ".join(missing), file=sys.stderr)
    if empty:
        print("ERROR: Info.plist has empty usage strings: " + ", ".join(empty), file=sys.stderr)
    raise SystemExit(1)

print(f"Info.plist usage/encryption keys OK in {path}")
PY
