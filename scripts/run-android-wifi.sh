#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE_DIR="$ROOT_DIR/apps/mobile"
ADB_PORT="${ANDROID_ADB_PORT:-5555}"

detect_lan_ip() {
  local candidate=""
  local fallback=""

  is_private_lan_ip() {
    local ip="$1"
    [[ "$ip" == 10.* || "$ip" == 192.168.* ]] && return 0

    if [[ "$ip" =~ ^172\.([1][6-9]|2[0-9]|3[0-1])\. ]]; then
      return 0
    fi

    return 1
  }

  for iface in en0 en1 en2 en3 en4 en5; do
    candidate="$(ipconfig getifaddr "$iface" 2>/dev/null || true)"
    if [[ -n "$candidate" ]]; then
      if is_private_lan_ip "$candidate"; then
        echo "$candidate"
        return 0
      fi

      if [[ -z "$fallback" && "$candidate" != 169.254.* && "$candidate" != 127.* ]]; then
        fallback="$candidate"
      fi
    fi
  done

  candidate="$(
    ifconfig 2>/dev/null | awk '
      /^[a-z0-9]+: flags=/ { iface=$1 }
      $1 == "inet" && $2 ~ /^(10|172|192)\./ { print $2; exit }
    '
  )"

  if [[ -n "$candidate" ]]; then
    echo "$candidate"
    return 0
  fi

  if [[ -n "$fallback" ]]; then
    echo "$fallback"
    return 0
  fi

  return 1
}

detect_android_ip() {
  local device_id="$1"
  local ip=""

  ip="$(
    adb -s "$device_id" shell ip route 2>/dev/null \
      | tr -d '\r' \
      | awk '{ for (i = 1; i <= NF; i++) if ($i == "src") { print $(i + 1); exit } }'
  )"

  if [[ -n "$ip" ]]; then
    echo "$ip"
    return 0
  fi

  ip="$(
    adb -s "$device_id" shell ip -f inet addr show wlan0 2>/dev/null \
      | tr -d '\r' \
      | awk '/inet / { sub(/\/.*/, "", $2); print $2; exit }'
  )"

  if [[ -n "$ip" ]]; then
    echo "$ip"
    return 0
  fi

  return 1
}

first_adb_device() {
  adb devices 2>/dev/null \
    | awk 'NR > 1 && $2 == "device" && $1 !~ /^emulator-/ { print $1; exit }'
}

first_wireless_adb_device() {
  adb devices 2>/dev/null \
    | awk 'NR > 1 && $2 == "device" && $1 ~ /:[0-9]+$/ { print $1; exit }'
}

require_command() {
  local name="$1"
  if ! command -v "$name" >/dev/null 2>&1; then
    echo "No encontre '$name' en PATH."
    exit 1
  fi
}

require_command adb
require_command flutter

if [[ -n "${API_BASE_URL:-}" ]]; then
  BASE_URL="$API_BASE_URL"
else
  LAN_IP="$(detect_lan_ip || true)"
  if [[ -z "$LAN_IP" ]]; then
    echo "No pude detectar la IP LAN de esta Mac. Exporta API_BASE_URL manualmente."
    echo "Ejemplo: API_BASE_URL=http://192.168.1.245:4000 npm run mobile:android:wifi"
    exit 1
  fi

  BASE_URL="http://$LAN_IP:4000"
fi

if ! lsof -nP -iTCP:4000 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "La API no esta escuchando en el puerto 4000."
  echo "Levanta primero el backend con: npm run dev:api"
  exit 1
fi

if [[ -n "${ANDROID_WIFI_DEVICE_ID:-}" ]]; then
  DEVICE_ID="$ANDROID_WIFI_DEVICE_ID"
else
  DEVICE_ID="$(first_wireless_adb_device || true)"
fi

if [[ -z "${DEVICE_ID:-}" ]]; then
  if [[ -n "${ANDROID_DEVICE_ID:-}" ]]; then
    USB_DEVICE_ID="$ANDROID_DEVICE_ID"
  else
    USB_DEVICE_ID="$(first_adb_device || true)"
  fi

  if [[ -z "$USB_DEVICE_ID" ]]; then
    echo "No encontre un Android conectado por USB ni por Wi-Fi ADB."
    echo "Conecta el Moto por cable con Depuracion USB activa o emparejalo desde Depuracion inalambrica."
    exit 1
  fi

  ANDROID_IP="$(detect_android_ip "$USB_DEVICE_ID" || true)"
  if [[ -z "$ANDROID_IP" ]]; then
    echo "No pude detectar la IP Wi-Fi del Android '$USB_DEVICE_ID'."
    echo "Verifica que el telefono este conectado a la misma red Wi-Fi que la Mac."
    exit 1
  fi

  echo "Activando ADB por Wi-Fi en $USB_DEVICE_ID..."
  adb -s "$USB_DEVICE_ID" tcpip "$ADB_PORT" >/dev/null
  sleep 2

  DEVICE_ID="$ANDROID_IP:$ADB_PORT"
  echo "Conectando ADB a $DEVICE_ID..."
  adb connect "$DEVICE_ID" >/dev/null
fi

if [[ "$(adb -s "$DEVICE_ID" get-state 2>/dev/null || true)" != "device" ]]; then
  echo "El Android Wi-Fi '$DEVICE_ID' no esta listo para ADB."
  echo "Si usas Depuracion inalambrica moderna, ejecuta primero: adb pair IP:PUERTO"
  exit 1
fi

echo "Usando dispositivo Android: $DEVICE_ID"
echo "Usando API: $BASE_URL"

cd "$MOBILE_DIR"
flutter run --release -d "$DEVICE_ID" --dart-define="API_BASE_URL=$BASE_URL"
