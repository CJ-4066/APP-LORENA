#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$ROOT_DIR/apps/api"
API_DIST_DIR="$API_DIR/dist"
API_MIGRATIONS_DIR="$API_DIR/migrations"
API_UPLOADS_DIR="$API_DIR/uploads"

DEPLOY_USER="${DEPLOY_USER:-}"
DEPLOY_HOST="${DEPLOY_HOST:-}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/lo-renaciente/api}"
PM2_PROCESS_NAME="${PM2_PROCESS_NAME:-lo-renaciente-api}"
SYNC_UPLOADS="${SYNC_UPLOADS:-1}"

if [[ -z "$DEPLOY_USER" || -z "$DEPLOY_HOST" ]]; then
  echo "Uso:"
  echo "  DEPLOY_USER=root DEPLOY_HOST=1.2.3.4 ./scripts/deploy-api-production.sh"
  echo "Opcionales:"
  echo "  DEPLOY_PATH=/var/www/lo-renaciente/api"
  echo "  PM2_PROCESS_NAME=lo-renaciente-api"
  echo "  SYNC_UPLOADS=1"
  exit 1
fi

echo "Building API from: $API_DIR"
npm run build --workspace @lo-renaciente/api

echo "Preparing remote directories"
ssh "$DEPLOY_USER@$DEPLOY_HOST" "mkdir -p '$DEPLOY_PATH' '$DEPLOY_PATH/uploads' '$DEPLOY_PATH/migrations' '$DEPLOY_PATH/dist'"

echo "Syncing API build to $DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH"
rsync -az --delete "$API_DIST_DIR"/ "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/dist/"

echo "Syncing migrations to $DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/migrations"
rsync -az --delete "$API_MIGRATIONS_DIR"/ "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/migrations/"

if [[ "$SYNC_UPLOADS" == "1" ]]; then
  if [[ -d "$API_UPLOADS_DIR" ]]; then
    echo "Syncing uploads to $DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/uploads"
    rsync -az "$API_UPLOADS_DIR"/ "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/uploads/"
  else
    echo "No local uploads directory found at $API_UPLOADS_DIR"
  fi
else
  echo "Skipping uploads sync because SYNC_UPLOADS=$SYNC_UPLOADS"
fi

echo "Restarting remote PM2 process: $PM2_PROCESS_NAME"
ssh "$DEPLOY_USER@$DEPLOY_HOST" "cd '$DEPLOY_PATH' && pm2 restart '$PM2_PROCESS_NAME' --update-env || pm2 start dist/index.js --name '$PM2_PROCESS_NAME' --update-env"

echo "API deployment complete"
