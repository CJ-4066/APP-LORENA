#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LANDING_DIR="$ROOT_DIR/webprincipal"
DIST_DIR="$LANDING_DIR/dist"
ADMIN_DIR="$ROOT_DIR/apps/admin"
ADMIN_DIST_DIR="$ADMIN_DIR/dist"
ANDROID_APK_PATH="$ROOT_DIR/apps/mobile/build/app/outputs/flutter-apk/app-release.apk"
ANDROID_APK_NAME="lorenaciente-android.apk"

echo "Building landing from: $LANDING_DIR"
npm run build --prefix "$LANDING_DIR"
echo "Building admin from: $ADMIN_DIR"
(cd "$ROOT_DIR" && npm run build --workspace @lo-renaciente/admin)

DEPLOY_USER="${DEPLOY_USER:-}"
DEPLOY_HOST="${DEPLOY_HOST:-}"
DEPLOY_PATH="${DEPLOY_PATH:-}"
DEPLOY_ROOT="${DEPLOY_ROOT:-}"
ADMIN_DEPLOY_PATH="${ADMIN_DEPLOY_PATH:-}"

if [[ -z "$DEPLOY_USER" || -z "$DEPLOY_HOST" || -z "$DEPLOY_PATH" ]]; then
  echo "Build complete: $DIST_DIR"
  echo "Set DEPLOY_USER, DEPLOY_HOST and DEPLOY_PATH to sync the build to the VPS."
  echo "Use DEPLOY_PATH=/var/www/lo-renaciente"
  echo "Optionally set ADMIN_DEPLOY_PATH=/var/www/lorenaciente/admin"
  exit 0
fi

if [[ -z "$DEPLOY_ROOT" ]]; then
  DEPLOY_ROOT="$(dirname "$(dirname "$DEPLOY_PATH")")"
fi

if [[ -z "$ADMIN_DEPLOY_PATH" ]]; then
  ADMIN_DEPLOY_PATH="$DEPLOY_ROOT/admin"
fi

echo "Ensuring remote directories exist"
ssh "$DEPLOY_USER@$DEPLOY_HOST" "mkdir -p '$DEPLOY_PATH' '$ADMIN_DEPLOY_PATH'"

echo "Syncing landing to $DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH"
# The landing shares this root with /api and /admin, so never delete the target.
rsync -az "$DIST_DIR"/ "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH"/

echo "Syncing admin to $DEPLOY_USER@$DEPLOY_HOST:$ADMIN_DEPLOY_PATH"
rsync -az --delete "$ADMIN_DIST_DIR"/ "$DEPLOY_USER@$DEPLOY_HOST:$ADMIN_DEPLOY_PATH"/

if [[ -f "$ANDROID_APK_PATH" ]]; then
  rsync -az "$ANDROID_APK_PATH" "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/$ANDROID_APK_NAME"
else
  echo "APK no encontrado en:"
  echo "  $ANDROID_APK_PATH"
  echo "Si quieres publicar la descarga de Android, construye primero el APK con:"
  echo "  API_BASE_URL=https://tu-api-real npm run mobile:android:public"
fi

echo "Sync complete"
