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
if [[ ! -f "$RESOLVED" ]]; then
  echo "ERROR: Package.resolved missing at ${RESOLVED}" >&2
  echo "Xcode Cloud Archive cannot resolve capacitor-swift-pm without this file." >&2
  exit 1
fi
echo "Package.resolved OK at ${RESOLVED}"

if [[ ! -f "$ROOT/ios/App/App/public/index.html" ]]; then
  echo "ERROR: ios/App/App/public/index.html missing — ci_post_clone cap sync did not produce web assets" >&2
  exit 1
fi
echo "Web assets OK at ios/App/App/public/index.html"

echo "ci_pre_xcodebuild complete"
exit 0
