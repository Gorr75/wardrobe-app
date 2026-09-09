#!/usr/bin/env bash
# Xcode Cloud pre-xcodebuild for Boutique Journal.
# Confirm Archive inputs that Build 1 was missing: Info.plist usage strings,
# the workspace Package.resolved Cloud requires, and synced web assets.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -n "${CI_PRIMARY_REPOSITORY_PATH:-}" ]]; then
  ROOT="$CI_PRIMARY_REPOSITORY_PATH"
elif [[ -f "${SCRIPT_DIR}/../package.json" ]]; then
  ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
elif [[ -f "${SCRIPT_DIR}/../../../package.json" ]]; then
  ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
else
  echo "ERROR: cannot locate Boutique Journal repo root from ${SCRIPT_DIR}" >&2
  exit 1
fi

echo "=== Boutique Journal ci_pre_xcodebuild ==="
echo "ROOT=${ROOT}"

"${SCRIPT_DIR}/verify_info_plist.sh" "$ROOT/ios/App/App/Info.plist"

RESOLVED="$ROOT/ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved"
"${SCRIPT_DIR}/verify_package_resolved.sh" "$RESOLVED"

"${SCRIPT_DIR}/verify_ios_web_assets.sh" "$ROOT"

echo "ci_pre_xcodebuild complete"
exit 0
