#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE_DIR="$ROOT_DIR/apps/mobile"

if ! command -v flutter >/dev/null 2>&1; then
  echo "No encontre 'flutter' en PATH."
  exit 1
fi

cd "$MOBILE_DIR"

if [[ -z "${API_BASE_URL:-}" ]]; then
  echo "Falta API_BASE_URL."
  echo "Ejemplo: API_BASE_URL=https://lorenaciente.com npm run mobile:ios:public"
  exit 1
fi

echo "Construyendo iOS publico contra: $API_BASE_URL"
echo "Nota: para distribuir a contactos necesitas firma valida, TestFlight o un IPA ad hoc."
flutter build ipa --release --dart-define="API_BASE_URL=$API_BASE_URL"

echo "IPA generado en:"
echo "$MOBILE_DIR/build/ios/ipa"
