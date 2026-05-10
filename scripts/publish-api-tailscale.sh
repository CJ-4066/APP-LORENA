#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TAILSCALE_BIN="/opt/homebrew/opt/tailscale/bin/tailscale"
SOCKET_PATH="$HOME/Library/Application Support/LoRenaciente/tailscale/tailscaled.sock"
URL_CACHE_FILE="$ROOT_DIR/.tailnet-api-url"

if [[ ! -x "$TAILSCALE_BIN" ]]; then
  echo "No encuentro el CLI de Tailscale."
  echo "Instala primero con: brew install tailscale"
  exit 1
fi

if [[ ! -S "$SOCKET_PATH" ]]; then
  echo "No encuentro el socket de Tailscale en:"
  echo "  $SOCKET_PATH"
  echo "Instala el LaunchAgent primero con:"
  echo "  ./scripts/install-tailscale-userspace-launchagent.sh"
  exit 1
fi

if ! lsof -nP -iTCP:4000 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "La API no está escuchando en el puerto 4000."
  echo "Levántala primero con: npm run dev:api"
  exit 1
fi

STATUS_JSON="$("$TAILSCALE_BIN" --socket="$SOCKET_PATH" status --json)"
BACKEND_STATE="$(printf '%s' "$STATUS_JSON" | node -e 'const data=JSON.parse(require("fs").readFileSync(0,"utf8")); process.stdout.write(String(data.BackendState||""));')"

if [[ "$BACKEND_STATE" == "NeedsLogin" ]]; then
  AUTH_URL="$(printf '%s' "$STATUS_JSON" | node -e 'const data=JSON.parse(require("fs").readFileSync(0,"utf8")); process.stdout.write(String(data.AuthURL||""));')"
  echo "Esta Mac aún no está autenticada en Tailscale."
  echo
  echo "Abre este enlace y completa el login:"
  echo "  $AUTH_URL"
  exit 1
fi

"$TAILSCALE_BIN" --socket="$SOCKET_PATH" serve --bg --yes 4000 >/dev/null

STATUS_JSON="$("$TAILSCALE_BIN" --socket="$SOCKET_PATH" status --json)"
DNS_NAME="$(printf '%s' "$STATUS_JSON" | node -e 'const data=JSON.parse(require("fs").readFileSync(0,"utf8")); process.stdout.write(String(data.Self?.DNSName||"").replace(/\.$/, ""));')"
TAILSCALE_IP="$(printf '%s' "$STATUS_JSON" | node -e 'const data=JSON.parse(require("fs").readFileSync(0,"utf8")); const ips=data.TailscaleIPs||[]; process.stdout.write(String(ips[0]||""));')"

if [[ -z "$DNS_NAME" ]]; then
  echo "No pude obtener el DNSName de esta Mac en Tailscale."
  exit 1
fi

TAILNET_URL="https://$DNS_NAME"
printf '%s\n' "$TAILNET_URL" >"$URL_CACHE_FILE"

echo "API publicada dentro de tu tailnet."
echo "URL HTTPS:"
echo "  $TAILNET_URL"
if [[ -n "$TAILSCALE_IP" ]]; then
  echo "IP Tailscale:"
  echo "  $TAILSCALE_IP"
fi
echo
echo "Guardé la URL en:"
echo "  $URL_CACHE_FILE"
echo
echo "Para reinstalar la app apuntando a esta API:"
echo "  API_BASE_URL=$TAILNET_URL npm run mobile:ios:device"
echo "  API_BASE_URL=$TAILNET_URL npm run mobile:android:wifi"
