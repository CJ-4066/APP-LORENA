#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE_DIR="$ROOT_DIR/apps/mobile"
IOS_DIR="$MOBILE_DIR/ios"
WORKSPACE_PATH="$IOS_DIR/Runner.xcworkspace"
PROJECT_PATH="$IOS_DIR/Runner.xcodeproj/project.pbxproj"
PUBSPEC_PATH="$MOBILE_DIR/pubspec.yaml"

if ! command -v flutter >/dev/null 2>&1; then
  echo "No encontre 'flutter' en PATH."
  exit 1
fi

if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "No encontre 'xcodebuild'. Este script requiere Xcode instalado."
  exit 1
fi

if [[ ! -d "$WORKSPACE_PATH" ]]; then
  echo "No encontre el workspace iOS en:"
  echo "  $WORKSPACE_PATH"
  exit 1
fi

if [[ -z "${API_BASE_URL:-}" ]]; then
  echo "Falta API_BASE_URL."
  echo "Ejemplo:"
  echo "  API_BASE_URL=https://lorenaciente.com npm run mobile:ios:testflight"
  exit 1
fi

BUNDLE_ID="$(rg -o 'PRODUCT_BUNDLE_IDENTIFIER = [^;]+' "$PROJECT_PATH" | head -n 1 | sed 's/PRODUCT_BUNDLE_IDENTIFIER = //')"
TEAM_ID="$(rg -o 'DEVELOPMENT_TEAM = [^;]+' "$PROJECT_PATH" | head -n 1 | sed 's/DEVELOPMENT_TEAM = //')"
APP_VERSION="$(sed -n 's/^version: //p' "$PUBSPEC_PATH" | head -n 1)"
BUILD_NAME="${IOS_BUILD_NAME:-${APP_VERSION%%+*}}"
BUILD_NUMBER="${IOS_BUILD_NUMBER:-${APP_VERSION##*+}}"

echo "Preparando build iOS para TestFlight"
echo "Bundle ID:    $BUNDLE_ID"
echo "Team ID:      $TEAM_ID"
echo "Version:      $BUILD_NAME"
echo "Build number: $BUILD_NUMBER"
echo "API base:     $API_BASE_URL"
echo
echo "Requisitos previos:"
echo "1. Inicia sesion en Xcode con la cuenta Apple Developer correcta."
echo "2. Verifica que App Store Connect tenga creada la app con este Bundle ID."
echo "3. En Xcode > Runner > Signing & Capabilities deja firma automatica."
echo

cd "$MOBILE_DIR"

flutter pub get

echo "Construyendo IPA firmado para App Store Connect / TestFlight..."
flutter build ipa \
  --release \
  --export-method app-store \
  --build-name="$BUILD_NAME" \
  --build-number="$BUILD_NUMBER" \
  --dart-define="API_BASE_URL=$API_BASE_URL"

echo
echo "IPA generado en:"
echo "  $MOBILE_DIR/build/ios/ipa"
echo
echo "Siguiente paso:"
echo "  1. Abre Xcode Organizer o Transporter."
echo "  2. Sube el archivo .ipa a App Store Connect."
echo "  3. Habilita la build en TestFlight."
