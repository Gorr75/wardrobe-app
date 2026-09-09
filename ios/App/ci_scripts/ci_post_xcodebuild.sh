#!/usr/bin/env bash
# Xcode Cloud post-xcodebuild for Boutique Journal.
# Log archive / workflow metadata only. Always exit 0 so a logging glitch
# cannot fail Distribution Preparation or TestFlight Internal.
#
# Version stamping happens in ci_post_clone BEFORE cap:sync — not here.

set +e

echo "=== Boutique Journal ci_post_xcodebuild ==="
echo "CI_WORKFLOW=${CI_WORKFLOW:-unset}"
echo "CI_BRANCH=${CI_BRANCH:-unset}"
echo "CI_BUILD_NUMBER=${CI_BUILD_NUMBER:-unset}"
echo "CI_BUNDLE_ID=${CI_BUNDLE_ID:-unset}"
echo "CI_PRODUCT=${CI_PRODUCT:-unset}"
echo "CI_XCODEBUILD_EXIT_CODE=${CI_XCODEBUILD_EXIT_CODE:-unset}"

if [[ -n "${CI_ARCHIVE_PATH:-}" && -f "${CI_ARCHIVE_PATH}/Info.plist" ]]; then
  echo "Archive: ${CI_ARCHIVE_PATH}"
  if [[ -x /usr/libexec/PlistBuddy ]]; then
    echo -n "Archive CFBundleShortVersionString="
    /usr/libexec/PlistBuddy -c "Print :ApplicationProperties:CFBundleShortVersionString" "${CI_ARCHIVE_PATH}/Info.plist"
    echo -n "Archive CFBundleVersion="
    /usr/libexec/PlistBuddy -c "Print :ApplicationProperties:CFBundleVersion" "${CI_ARCHIVE_PATH}/Info.plist"
  fi
fi

exit 0
