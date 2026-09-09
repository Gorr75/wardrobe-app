#!/usr/bin/env bash
# Install Node.js on Xcode Cloud when the image does not ship a recent runtime.
# Boutique's GitHub Pages workflow uses Node 22; match that here.

set -euo pipefail

NODE_MAJOR_MIN=20
NODE_VERSION="${BOUTIQUE_NODE_VERSION:-v22.14.0}"

node_major() {
  node -p "process.versions.node.split('.')[0]"
}

if command -v node >/dev/null 2>&1; then
  if [[ "$(node_major)" -ge "$NODE_MAJOR_MIN" ]]; then
    echo "Using existing Node $(node -v) / npm $(npm -v)"
    return 0 2>/dev/null || exit 0
  fi
  echo "Existing Node $(node -v) is older than ${NODE_MAJOR_MIN}; installing ${NODE_VERSION}"
fi

export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_INSTALL_CLEANUP=1
export HOMEBREW_NO_INSTALLED_DEPENDENTS_CHECK=1

if command -v brew >/dev/null 2>&1; then
  echo "Installing node@22 via Homebrew"
  brew list node@22 >/dev/null 2>&1 || brew install node@22
  brew link --force --overwrite node@22 || true
  PREFIX="$(brew --prefix node@22 2>/dev/null || true)"
  if [[ -n "${PREFIX}" && -x "${PREFIX}/bin/node" ]]; then
    export PATH="${PREFIX}/bin:${PATH}"
  fi
fi

if command -v node >/dev/null 2>&1 && [[ "$(node_major)" -ge "$NODE_MAJOR_MIN" ]]; then
  echo "Using Node $(node -v) / npm $(npm -v)"
  return 0 2>/dev/null || exit 0
fi

echo "Homebrew Node unavailable; downloading official ${NODE_VERSION} tarball"
ARCH="arm64"
case "$(uname -m)" in
  x86_64) ARCH="x64" ;;
esac
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
DEST="${HOME}/.boutique-node/${NODE_VERSION}"
mkdir -p "$DEST"
curl -fsSL "https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-${OS}-${ARCH}.tar.gz" \
  | tar -xz -C "$DEST" --strip-components=1
export PATH="${DEST}/bin:${PATH}"

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: failed to install Node.js" >&2
  exit 1
fi
echo "Using Node $(node -v) / npm $(npm -v)"
