#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LANDING_DIR="$ROOT_DIR/webprincipal"
DIST_DIR="$LANDING_DIR/dist"

echo "Building landing from: $LANDING_DIR"
npm run build --prefix "$LANDING_DIR"

DEPLOY_USER="${DEPLOY_USER:-}"
DEPLOY_HOST="${DEPLOY_HOST:-}"
DEPLOY_PATH="${DEPLOY_PATH:-}"

if [[ -z "$DEPLOY_USER" || -z "$DEPLOY_HOST" || -z "$DEPLOY_PATH" ]]; then
  echo "Build complete: $DIST_DIR"
  echo "Set DEPLOY_USER, DEPLOY_HOST and DEPLOY_PATH to sync the build to the VPS."
  exit 0
fi

echo "Syncing to $DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH"
rsync -az --delete "$DIST_DIR"/ "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH"/
echo "Sync complete"
