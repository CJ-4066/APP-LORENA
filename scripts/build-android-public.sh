#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE_DIR="$ROOT_DIR/apps/mobile"

if ! command -v flutter >/dev/null 2>&1; then
  echo "No encontre 'flutter' en PATH."
  exit 1
fi

cd "$MOBILE_DIR"

echo "Construyendo APK publico contra la API de produccion..."
flutter build apk --release --dart-define=FORCE_PRODUCTION_API=true

echo "APK generado en:"
echo "$MOBILE_DIR/build/app/outputs/flutter-apk/app-release.apk"
