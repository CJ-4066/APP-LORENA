#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE_DIR="$ROOT_DIR/apps/mobile"

if ! command -v flutter >/dev/null 2>&1; then
  echo "No encontre 'flutter' en PATH."
  exit 1
fi

cd "$MOBILE_DIR"

echo "Construyendo iOS publico contra la API de produccion..."
echo "Nota: para distribuir a contactos necesitas firma valida, TestFlight o un IPA ad hoc."
flutter build ipa --release --dart-define=FORCE_PRODUCTION_API=true

echo "IPA generado en:"
echo "$MOBILE_DIR/build/ios/ipa"
