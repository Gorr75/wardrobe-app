#!/usr/bin/env bash
# Xcode Cloud post-clone for Boutique Journal (Gorr75/wardrobe-app).
# Mirrors Tableside's proven loop: stamp CI_BUILD_NUMBER onto native + JS
# About strings, then npm ci and cap:sync, before xcodebuild.
#
# Do not hard-fail when Capacitor native pins differ from package-lock.
# Do not stamp versions from an Xcode Run Script.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -n "${CI_PRIMARY_REPOSITORY_PATH:-}" ]]; then
  ROOT="$CI_PRIMARY_REPOSITORY_PATH"
elif [[ -f "${SCRIPT_DIR}/../package.json" ]]; then
  ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
elif [[ -f "${SCRIPT_DIR}/../../../package.json" ]]; then
  # ios/App/ci_scripts — Xcode Cloud looks next to App.xcodeproj
  ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
else
  echo "ERROR: cannot locate Boutique Journal repo root from ${SCRIPT_DIR}" >&2
  exit 1
fi

cd "$ROOT"

echo "=== Boutique Journal ci_post_clone ==="
echo "ROOT=${ROOT}"
"${SCRIPT_DIR}/verify_info_plist.sh" "$ROOT/ios/App/App/Info.plist"
echo "CI_WORKFLOW=${CI_WORKFLOW:-unset}"
echo "CI_BRANCH=${CI_BRANCH:-unset}"
echo "CI_BUILD_NUMBER=${CI_BUILD_NUMBER:-unset}"
echo "CI_BUNDLE_ID=${CI_BUNDLE_ID:-unset}"

# ensure_node.sh exports PATH when it installs a runtime.
# shellcheck source=ensure_node.sh
source "${SCRIPT_DIR}/ensure_node.sh"

if [[ -n "${CI_BUILD_NUMBER:-}" ]]; then
  echo "Stamping versions from CI_BUILD_NUMBER=${CI_BUILD_NUMBER} before cap:sync"
  "${SCRIPT_DIR}/stamp_cloud_versions.sh" "$ROOT" "$CI_BUILD_NUMBER"
else
  echo "CI_BUILD_NUMBER unset — leaving repo APP_BUILD / CURRENT_PROJECT_VERSION as committed"
fi

echo "Installing npm dependencies"
npm config set maxsockets 3
npm ci

log_native_vs_lock() {
  local lock_ios=""
  local native_pin=""
  lock_ios="$(node -p "require('./package-lock.json').packages['node_modules/@capacitor/ios']?.version || ''" 2>/dev/null || true)"
  native_pin="$(python3 - <<'PY'
import re
from pathlib import Path
p = Path("ios/App/CapApp-SPM/Package.swift")
if not p.exists():
    print("")
    raise SystemExit
text = p.read_text()
m = re.search(r'capacitor-swift-pm\.git".*?"(\d+\.\d+\.\d+)"', text)
print(m.group(1) if m else "")
PY
)"
  echo "package-lock @capacitor/ios=${lock_ios:-unknown}"
  echo "CapApp-SPM capacitor-swift-pm=${native_pin:-unknown}"
  if [[ -n "$lock_ios" && -n "$native_pin" && "$lock_ios" != "$native_pin" ]]; then
    echo "WARN: native Capacitor pin (${native_pin}) differs from package-lock (${lock_ios}). Continuing — this must not fail the Cloud build."
  fi
}

echo "Capacitor native vs repo lock (informational)"
log_native_vs_lock

echo "Building web assets and syncing ios/ (required before xcodebuild)"
set +e
npm run cap:sync
SYNC_STATUS=$?
set -e

log_native_vs_lock

if [[ "$SYNC_STATUS" -ne 0 ]]; then
  echo "WARN: cap:sync exited ${SYNC_STATUS}"
  if [[ ! -f "$ROOT/ios/App/App/public/index.html" ]]; then
    echo "ERROR: ios/App/App/public/index.html missing after cap:sync" >&2
    exit 1
  fi
  echo "Web assets are present; continuing so a native≠lock mismatch cannot fail Xcode Cloud."
fi

echo "ci_post_clone complete"
exit 0
