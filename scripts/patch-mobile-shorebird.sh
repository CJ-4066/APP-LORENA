#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE_DIR="$ROOT_DIR/apps/mobile"
PLATFORM="${1:-}"
API_BASE_URL="${API_BASE_URL:-https://lorenaciente.com}"
IOS_EXPORT_METHOD="${IOS_EXPORT_METHOD:-app-store}"

if [[ "$PLATFORM" != "android" && "$PLATFORM" != "ios" ]]; then
  echo "Uso: $0 android|ios"
  exit 1
fi

cd "$MOBILE_DIR"

VERSION="$(sed -n 's/^version: //p' pubspec.yaml | head -n 1)"
BUILD_NAME="${VERSION%%+*}"
BUILD_NUMBER="${VERSION##*+}"

args=(
  patch
  --platforms "$PLATFORM"
  --release-version "$BUILD_NAME+$BUILD_NUMBER"
  --dart-define "API_BASE_URL=$API_BASE_URL"
)

if [[ "$PLATFORM" == "ios" ]]; then
  args+=(--export-method "$IOS_EXPORT_METHOD")
fi

shorebird "${args[@]}"
