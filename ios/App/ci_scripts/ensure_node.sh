#!/usr/bin/env bash
# Install Node.js on Xcode Cloud when the image does not ship a recent runtime.
# Boutique's GitHub Pages workflow uses Node 22; match that here.
#
# Prefer the official tarball over Homebrew. `brew install node@22` is slow on
# Cloud and a brew failure used to abort this script (set -e) before the
# tarball fallback could run.

set -euo pipefail

NODE_MAJOR_MIN=20
NODE_VERSION="${BOUTIQUE_NODE_VERSION:-v22.14.0}"

node_major() {
  node -p "process.versions.node.split('.')[0]"
}

node_is_new_enough() {
  command -v node >/dev/null 2>&1 && [[ "$(node_major)" -ge "$NODE_MAJOR_MIN" ]]
}

if node_is_new_enough; then
  echo "Using existing Node $(node -v) / npm $(npm -v)"
  return 0 2>/dev/null || exit 0
fi

if command -v node >/dev/null 2>&1; then
  echo "Existing Node $(node -v) is older than ${NODE_MAJOR_MIN}; installing ${NODE_VERSION}"
fi

install_official_tarball() {
  local arch="arm64"
  case "$(uname -m)" in
    x86_64) arch="x64" ;;
  esac
  local os
  os="$(uname -s | tr '[:upper:]' '[:lower:]')"
  local dest="${TMPDIR:-/tmp}/boutique-node/${NODE_VERSION}"
  if [[ -n "${HOME:-}" && -w "${HOME}" ]]; then
    dest="${HOME}/.boutique-node/${NODE_VERSION}"
  fi
  mkdir -p "$dest"
  echo "Downloading official ${NODE_VERSION} (${os}-${arch}) tarball to ${dest}"
  curl -fsSL "https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-${os}-${arch}.tar.gz" \
    | tar -xz -C "$dest" --strip-components=1 || return 1
  if [[ ! -x "${dest}/bin/node" ]]; then
    echo "WARN: tarball extracted but ${dest}/bin/node is missing"
    return 1
  fi
  export PATH="${dest}/bin:${PATH}"
}

# Tarball first so a brew failure cannot skip the reliable installer.
if install_official_tarball && node_is_new_enough; then
  echo "Using Node $(node -v) / npm $(npm -v)"
  return 0 2>/dev/null || exit 0
fi
echo "WARN: official Node tarball install failed; trying Homebrew"

export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_INSTALL_CLEANUP=1
export HOMEBREW_NO_INSTALLED_DEPENDENTS_CHECK=1

if command -v brew >/dev/null 2>&1; then
  echo "Installing node@22 via Homebrew"
  brew list node@22 >/dev/null 2>&1 || brew install node@22 || true
  brew link --force --overwrite node@22 || true
  PREFIX="$(brew --prefix node@22 2>/dev/null || true)"
  if [[ -n "${PREFIX}" && -x "${PREFIX}/bin/node" ]]; then
    export PATH="${PREFIX}/bin:${PATH}"
  fi
fi

if node_is_new_enough; then
  echo "Using Node $(node -v) / npm $(npm -v)"
  return 0 2>/dev/null || exit 0
fi

echo "ERROR: failed to install Node.js ${NODE_VERSION} (need major >= ${NODE_MAJOR_MIN})" >&2
exit 1
