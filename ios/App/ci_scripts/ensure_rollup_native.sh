#!/usr/bin/env bash
# Make sure Vite/rollup 4 can load its platform native binding.
#
# npm ci from a lockfile produced on Linux often omits
# @rollup/rollup-darwin-arm64 on Xcode Cloud (npm optional-deps bug:
# https://github.com/npm/cli/issues/4828). `npm i` after deleting
# node_modules is not enough — the lock still has no darwin package entry.
#
# Do not delete package-lock.json. Do not write ~/.npmrc.

# When sourced, only define helpers. When executed, run the ensure step.
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  set -euo pipefail
fi

# Maps process.platform / process.arch to rollup's @rollup/rollup-<base> id.
# Override with BOUTIQUE_ROLLUP_PLATFORM / BOUTIQUE_ROLLUP_ARCH for tests.
rollup_native_package_id() {
  node --input-type=commonjs -e '
const platform = process.env.BOUTIQUE_ROLLUP_PLATFORM || process.platform;
const arch = process.env.BOUTIQUE_ROLLUP_ARCH || process.arch;
const bindings = {
  android: { arm: "android-arm-eabi", arm64: "android-arm64" },
  darwin: { arm64: "darwin-arm64", x64: "darwin-x64" },
  freebsd: { arm64: "freebsd-arm64", x64: "freebsd-x64" },
  linux: {
    arm: ["linux-arm-gnueabihf", "linux-arm-musleabihf"],
    arm64: ["linux-arm64-gnu", "linux-arm64-musl"],
    loong64: ["linux-loong64-gnu", "linux-loong64-musl"],
    ppc64: ["linux-ppc64-gnu", "linux-ppc64-musl"],
    riscv64: ["linux-riscv64-gnu", "linux-riscv64-musl"],
    s390x: ["linux-s390x-gnu", null],
    x64: ["linux-x64-gnu", "linux-x64-musl"],
  },
  openbsd: { x64: "openbsd-x64" },
  openharmony: { arm64: "openharmony-arm64" },
  win32: { arm64: "win32-arm64-msvc", ia32: "win32-ia32-msvc", x64: "win32-x64-msvc" },
};
function isMusl() {
  if (process.env.BOUTIQUE_ROLLUP_MUSL === "1") return true;
  if (process.env.BOUTIQUE_ROLLUP_MUSL === "0") return false;
  try {
    return require("fs").readFileSync("/usr/bin/ldd", "utf8").includes("musl");
  } catch {
    return false;
  }
}
const imported = bindings[platform]?.[arch];
if (!imported) {
  console.error("ERROR: unsupported platform for rollup native: " + platform + "-" + arch);
  process.exit(2);
}
const base = Array.isArray(imported) ? (isMusl() ? imported[1] : imported[0]) : imported;
if (!base) {
  console.error("ERROR: unsupported musl variant for " + platform + "-" + arch);
  process.exit(2);
}
process.stdout.write("@rollup/rollup-" + base);
'
}

# Classify why require("rollup/dist/native.js") failed.
# Prints one of: ok | missing-binding | rollup-not-installed | other-error
# Details go to stderr. Exit 0 only for "ok".
rollup_native_status() {
  local pkg_id="${1:-}"
  if [[ -z "$pkg_id" ]]; then
    pkg_id="$(rollup_native_package_id)"
  fi
  ROLLUP_NATIVE_PKG="$pkg_id" node --input-type=commonjs -e '
const fs = require("fs");
const path = require("path");
const pkgId = process.env.ROLLUP_NATIVE_PKG;
const root = process.cwd();
const nativeJs = path.join(root, "node_modules", "rollup", "dist", "native.js");
const pkgDir = path.join(root, "node_modules", ...pkgId.split("/"));
const localNode = path.join(root, "node_modules", "rollup", "rollup." + pkgId.replace("@rollup/rollup-", "") + ".node");

if (!fs.existsSync(nativeJs)) {
  console.log("rollup-not-installed");
  console.error("rollup is not installed (missing node_modules/rollup/dist/native.js)");
  process.exit(1);
}

const bindingOnDisk = fs.existsSync(pkgDir) || fs.existsSync(localNode);
if (!bindingOnDisk) {
  console.log("missing-binding");
  console.error("rollup native package is not on disk: " + pkgId);
  process.exit(1);
}

try {
  require(nativeJs);
  console.log("ok");
} catch (error) {
  const msg = [error && error.message, error && error.cause && error.cause.message]
    .filter(Boolean)
    .join("\n");
  console.log("other-error");
  console.error(msg || String(error));
  process.exit(1);
}
'
}

rollup_native_ok() {
  local status
  status="$(rollup_native_status "$@" 2>/dev/null || true)"
  [[ "$status" == "ok" ]]
}

rollup_installed_version() {
  node --input-type=commonjs -e '
const fs = require("fs");
const path = require("path");
const pkgPath = path.join(process.cwd(), "node_modules", "rollup", "package.json");
if (fs.existsSync(pkgPath)) {
  process.stdout.write(JSON.parse(fs.readFileSync(pkgPath, "utf8")).version || "");
  process.exit(0);
}
try {
  const lock = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package-lock.json"), "utf8"));
  process.stdout.write((lock.packages && lock.packages["node_modules/rollup"] && lock.packages["node_modules/rollup"].version) || "");
} catch {
  process.stdout.write("");
}
'
}

_restore_npm_manifests() {
  local lock_backup="$1"
  local json_backup="$2"
  if [[ -f "$lock_backup" ]] && ! cmp -s package-lock.json "$lock_backup"; then
    echo "WARN: restoring package-lock.json after rollup native install (do not keep Cloud lock edits)"
    cp "$lock_backup" package-lock.json
  fi
  if [[ -f "$json_backup" ]] && ! cmp -s package.json "$json_backup"; then
    echo "WARN: restoring package.json after rollup native install"
    cp "$json_backup" package.json
  fi
}

_npm_install_platform_binding() {
  local spec="$1"
  local extra="${2:-}"
  echo "Installing ${spec} explicitly (${extra:-no-save, keep lock})"
  # --no-save / --no-package-lock: do not rewrite manifests. Env vars avoid ~/.npmrc.
  # shellcheck disable=SC2086
  npm_config_save=false npm_config_package_lock=false \
    npm install "$spec" --no-save --no-package-lock --no-audit --no-fund ${extra}
}

ensure_rollup_native() {
  local pkg_id version spec status detail
  local lock_backup json_backup
  local npm_status=0

  pkg_id="$(rollup_native_package_id)"
  echo "rollup native package for this host: ${pkg_id}"

  detail="$(mktemp)"
  status="$(rollup_native_status "$pkg_id" 2>"$detail" || true)"
  if [[ "$status" == "ok" ]]; then
    echo "rollup native binding present (${pkg_id})"
    rm -f "$detail"
    return 0
  fi

  if [[ "$status" == "rollup-not-installed" ]]; then
    echo "ERROR: $(cat "$detail")" >&2
    echo "ERROR: refusing to treat this as the rollup optional-deps bug — npm did not install rollup" >&2
    rm -f "$detail"
    return 1
  fi

  if [[ "$status" == "other-error" ]]; then
    echo "ERROR: rollup native probe failed for a reason other than a missing optional package:" >&2
    cat "$detail" >&2
    rm -f "$detail"
    return 1
  fi

  if [[ "$status" != "missing-binding" ]]; then
    echo "ERROR: unexpected rollup native status '${status}'" >&2
    cat "$detail" >&2
    rm -f "$detail"
    return 1
  fi

  echo "WARN: npm ci succeeded but ${pkg_id} is missing (optional-deps bug)"
  cat "$detail"
  rm -f "$detail"

  version="$(rollup_installed_version)"
  if [[ -z "$version" ]]; then
    echo "ERROR: cannot determine rollup version for ${pkg_id}" >&2
    return 1
  fi
  spec="${pkg_id}@${version}"

  lock_backup="$(mktemp)"
  json_backup="$(mktemp)"
  cp package-lock.json "$lock_backup"
  cp package.json "$json_backup"

  set +e
  _npm_install_platform_binding "$spec"
  npm_status=$?
  set -e
  _restore_npm_manifests "$lock_backup" "$json_backup"
  if [[ "$npm_status" -ne 0 ]]; then
    echo "ERROR: npm install ${spec} --no-save failed (exit ${npm_status}) — surfacing the install error, not a rollup-detection miss" >&2
    rm -f "$lock_backup" "$json_backup"
    return 1
  fi

  if rollup_native_ok "$pkg_id"; then
    echo "rollup native binding present after explicit ${spec} --no-save"
    rm -f "$lock_backup" "$json_backup"
    return 0
  fi

  echo "WARN: ${spec} --no-save did not produce a loadable binding; retrying with --force"
  set +e
  _npm_install_platform_binding "$spec" "--force"
  npm_status=$?
  set -e
  _restore_npm_manifests "$lock_backup" "$json_backup"
  if [[ "$npm_status" -ne 0 ]]; then
    echo "ERROR: npm install ${spec} --no-save --force failed (exit ${npm_status})" >&2
    rm -f "$lock_backup" "$json_backup"
    return 1
  fi
  if rollup_native_ok "$pkg_id"; then
    echo "rollup native binding present after explicit ${spec} --no-save --force"
    rm -f "$lock_backup" "$json_backup"
    return 0
  fi

  echo "WARN: trying npm install --include=optional (still keeping the lockfile)"
  set +e
  npm_config_save=false npm_config_package_lock=false \
    npm install --include=optional --no-save --no-package-lock --no-audit --no-fund
  npm_status=$?
  set -e
  _restore_npm_manifests "$lock_backup" "$json_backup"
  if [[ "$npm_status" -ne 0 ]]; then
    echo "ERROR: npm install --include=optional failed (exit ${npm_status})" >&2
    rm -f "$lock_backup" "$json_backup"
    return 1
  fi
  if rollup_native_ok "$pkg_id"; then
    echo "rollup native binding present after npm install --include=optional"
    rm -f "$lock_backup" "$json_backup"
    return 0
  fi

  echo "WARN: trying npm rebuild"
  set +e
  npm rebuild
  npm_status=$?
  set -e
  if [[ "$npm_status" -ne 0 ]]; then
    echo "ERROR: npm rebuild failed (exit ${npm_status})" >&2
    rm -f "$lock_backup" "$json_backup"
    return 1
  fi
  if rollup_native_ok "$pkg_id"; then
    echo "rollup native binding present after npm rebuild"
    rm -f "$lock_backup" "$json_backup"
    return 0
  fi

  echo "ERROR: ${pkg_id} is still missing after explicit install --no-save / --force / --include=optional / rebuild" >&2
  echo "node_modules/@rollup:" >&2
  ls -la node_modules/@rollup >&2 || echo "(no node_modules/@rollup)" >&2
  rm -f "$lock_backup" "$json_backup"
  return 1
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  ensure_rollup_native
fi
