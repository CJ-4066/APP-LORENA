#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NPM_BIN="/opt/homebrew/bin/npm"

if [[ ! -x "$NPM_BIN" ]]; then
  echo "No encuentro npm en $NPM_BIN."
  exit 1
fi

cd "$ROOT_DIR"

"$NPM_BIN" run build --workspace @lo-renaciente/api
exec "$NPM_BIN" run start --workspace @lo-renaciente/api
