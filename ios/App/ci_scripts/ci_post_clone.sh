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

if [[ ! -f "$ROOT/package.json" ]]; then
  echo "ERROR: package.json not found at ROOT=${ROOT}" >&2
  exit 1
fi

echo "=== Boutique Journal ci_post_clone ==="
echo "ROOT=${ROOT}"
"${SCRIPT_DIR}/verify_info_plist.sh" "$ROOT/ios/App/App/Info.plist"

RESOLVED="$ROOT/ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved"
"${SCRIPT_DIR}/verify_package_resolved.sh" "$RESOLVED"

echo "CI_WORKFLOW=${CI_WORKFLOW:-unset}"
echo "CI_BRANCH=${CI_BRANCH:-unset}"
echo "CI_BUILD_NUMBER=${CI_BUILD_NUMBER:-unset}"
echo "CI_BUNDLE_ID=${CI_BUNDLE_ID:-unset}"

# ensure_node.sh exports PATH when it installs a runtime.
# shellcheck source=ensure_node.sh
source "${SCRIPT_DIR}/ensure_node.sh"

# Do not `npm config set` (writes ~/.npmrc). Cloud's home is often not writable.
export npm_config_maxsockets=3
export npm_config_cache="${TMPDIR:-/tmp}/boutique-npm-cache"
if [[ -n "${ROOT}" && -w "$ROOT" ]]; then
  export npm_config_cache="$ROOT/.npm-cloud-cache"
fi
mkdir -p "$npm_config_cache"
echo "npm cache=${npm_config_cache}"

if [[ -n "${CI_BUILD_NUMBER:-}" ]]; then
  echo "Stamping versions from CI_BUILD_NUMBER=${CI_BUILD_NUMBER} before cap:sync"
  "${SCRIPT_DIR}/stamp_cloud_versions.sh" "$ROOT" "$CI_BUILD_NUMBER"
else
  echo "CI_BUILD_NUMBER unset — leaving repo APP_BUILD / CURRENT_PROJECT_VERSION as committed"
fi

# Vite/rollup 4 loads a platform optional native binding. npm ci from a
# Linux-generated lockfile can omit @rollup/rollup-darwin-arm64 on Xcode Cloud
# (npm optional-deps bug). Do not delete package-lock.json.
rollup_native_ok() {
  node --input-type=commonjs -e "require('rollup/dist/native.js')" >/dev/null 2>&1
}

npm_install_for_cloud() {
  local attempt=1
  local max=3
  while true; do
    echo "Installing npm dependencies (attempt ${attempt}/${max})"
    rm -rf node_modules
    if npm ci; then
      if rollup_native_ok; then
        echo "npm ci OK; rollup native binding present"
        return 0
      fi
      echo "WARN: npm ci succeeded but rollup native binding is missing (optional-deps bug)"
    else
      echo "WARN: npm ci failed (attempt ${attempt}/${max})"
    fi

    echo "Retrying with rm -rf node_modules && npm i (keeping package-lock.json)"
    rm -rf node_modules
    if npm i --no-audit --no-fund && rollup_native_ok; then
      echo "npm i OK; rollup native binding present"
      return 0
    fi

    if [[ "$attempt" -ge "$max" ]]; then
      echo "ERROR: npm install failed after ${max} attempts (rollup native still missing or install error)" >&2
      return 1
    fi
    echo "WARN: npm install attempt ${attempt}/${max} failed; retrying in 5s"
    attempt=$((attempt + 1))
    sleep 5
  done
}

npm_install_for_cloud

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

# cap sync can delete the workspace Package.resolved; keep a copy to restore.
RESOLVED_BACKUP="$(mktemp)"
cp "$RESOLVED" "$RESOLVED_BACKUP"
restore_package_resolved() {
  if [[ ! -f "$RESOLVED" ]] || ! "${SCRIPT_DIR}/verify_package_resolved.sh" "$RESOLVED" >/dev/null 2>&1; then
    echo "WARN: Package.resolved missing or incomplete after cap sync; restoring committed pin file"
    mkdir -p "$(dirname "$RESOLVED")"
    cp "$RESOLVED_BACKUP" "$RESOLVED"
  fi
}

echo "Building web assets (required before xcodebuild)"
export CAPACITOR=1
npm run build

# Capacitor 8.5.1 has no --no-build on `cap sync`. Split copy/update so a
# plugin-list rewrite cannot hide a missing web bundle, and so we can restore
# Package.resolved if update rewrites the workspace.
echo "Copying web assets into ios/"
set +e
npx cap copy ios
COPY_STATUS=$?
set -e
if [[ "$COPY_STATUS" -ne 0 || ! -f "$ROOT/ios/App/App/public/index.html" ]]; then
  echo "ERROR: cap copy ios failed (exit ${COPY_STATUS}); ios/App/App/public/index.html missing" >&2
  exit 1
fi

echo "Updating iOS native plugins (Package.swift / SPM list)"
set +e
npx cap update ios
SYNC_STATUS=$?
set -e

restore_package_resolved
log_native_vs_lock

if [[ "$SYNC_STATUS" -ne 0 ]]; then
  echo "WARN: cap update ios exited ${SYNC_STATUS}"
  if [[ ! -f "$ROOT/ios/App/App/public/index.html" ]]; then
    echo "ERROR: ios/App/App/public/index.html missing after cap copy/update" >&2
    exit 1
  fi
  echo "Web assets are present; continuing so a native≠lock mismatch cannot fail Xcode Cloud."
fi

"${SCRIPT_DIR}/verify_package_resolved.sh" "$RESOLVED"

echo "ci_post_clone complete"
exit 0
