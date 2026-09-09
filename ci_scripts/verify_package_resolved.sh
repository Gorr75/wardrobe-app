#!/usr/bin/env bash
# Xcode Cloud disables automatic SPM resolution. The workspace Package.resolved
# must list every remote package CapApp-SPM / plugins pull in, or Archive fails
# with "an out-of-date resolved file was detected".

set -euo pipefail

RESOLVED="${1:-}"
if [[ -z "$RESOLVED" || ! -f "$RESOLVED" ]]; then
  echo "ERROR: Package.resolved missing: ${RESOLVED:-<missing path>}" >&2
  echo "Xcode Cloud Archive cannot resolve SPM packages without this file." >&2
  exit 1
fi

python3 - "$RESOLVED" <<'PY'
import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
try:
    data = json.loads(path.read_text())
except json.JSONDecodeError as exc:
    print(f"ERROR: Package.resolved is not valid JSON: {exc}", file=sys.stderr)
    raise SystemExit(1)

pins = data.get("pins") or []
identities = {pin.get("identity") for pin in pins if isinstance(pin, dict)}
required = ("capacitor-swift-pm", "ion-ios-filesystem")
missing = [name for name in required if name not in identities]
if missing:
    print(
        "ERROR: Package.resolved is incomplete (Xcode Cloud cannot auto-resolve). Missing: "
        + ", ".join(missing),
        file=sys.stderr,
    )
    print(f"Present pins: {', '.join(sorted(identities)) or '<none>'}", file=sys.stderr)
    raise SystemExit(1)

print(f"Package.resolved OK ({path}, {len(pins)} pins: {', '.join(sorted(identities))})")
PY
