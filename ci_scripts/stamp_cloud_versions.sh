#!/usr/bin/env bash
# Stamp Boutique Journal build numbers for Xcode Cloud.
#
# Marketing version (CFBundleShortVersionString / APP_VERSION) stays 1.0.
# CI_BUILD_NUMBER becomes CFBundleVersion (CURRENT_PROJECT_VERSION) and
# the JS About build (APP_BUILD in src/backup.js).
#
# Usage: stamp_cloud_versions.sh <repo-root> <build-number>
# Do not add an Xcode "Stamp CFBundleVersion" Run Script — Cloud mutable-output
# checks reject that pattern. This file is rewritten in ci_post_clone only.

set -euo pipefail

ROOT="${1:-}"
BUILD="${2:-}"

if [[ -z "$ROOT" || -z "$BUILD" ]]; then
  echo "Usage: stamp_cloud_versions.sh <repo-root> <build-number>" >&2
  exit 1
fi

if [[ ! "$BUILD" =~ ^[0-9]+$ ]]; then
  echo "ERROR: build number must be an integer, got: $BUILD" >&2
  exit 1
fi

BACKUP_JS="$ROOT/src/backup.js"
PBXPROJ="$ROOT/ios/App/App.xcodeproj/project.pbxproj"

if [[ ! -f "$BACKUP_JS" ]]; then
  echo "ERROR: missing $BACKUP_JS" >&2
  exit 1
fi
if [[ ! -f "$PBXPROJ" ]]; then
  echo "ERROR: missing $PBXPROJ" >&2
  exit 1
fi

python3 - "$BACKUP_JS" "$PBXPROJ" "$BUILD" <<'PY'
import re
import sys
from pathlib import Path

backup_path = Path(sys.argv[1])
pbx_path = Path(sys.argv[2])
build = sys.argv[3]

backup = backup_path.read_text()
backup2, n_build = re.subn(
    r"export const APP_BUILD = \d+;",
    f"export const APP_BUILD = {build};",
    backup,
    count=1,
)
if n_build != 1:
    raise SystemExit(f"Failed to stamp APP_BUILD in {backup_path}")

version_match = re.search(r"export const APP_VERSION = '([^']+)';", backup2)
if not version_match:
    raise SystemExit(f"Failed to find APP_VERSION in {backup_path}")
print(f"About string will read: Version {version_match.group(1)} build {build}")
backup_path.write_text(backup2)

pbx = pbx_path.read_text()
pbx2, n_ver = re.subn(
    r"CURRENT_PROJECT_VERSION = \d+;",
    f"CURRENT_PROJECT_VERSION = {build};",
    pbx,
)
if n_ver < 1:
    raise SystemExit(f"Failed to stamp CURRENT_PROJECT_VERSION in {pbx_path}")
pbx_path.write_text(pbx2)
print(f"Stamped CURRENT_PROJECT_VERSION={build} ({n_ver} occurrences) in {pbx_path}")
print(f"Stamped APP_BUILD={build} in {backup_path}")
PY
