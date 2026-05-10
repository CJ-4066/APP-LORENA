#!/bin/zsh

set -euo pipefail

TAILSCALE_BIN="/opt/homebrew/opt/tailscale/bin"
TAILSCALED_BIN="$TAILSCALE_BIN/tailscaled"
TAILSCALE_BIN_CLI="$TAILSCALE_BIN/tailscale"
STATE_DIR="$HOME/Library/Application Support/LoRenaciente/tailscale"
SOCKET_PATH="$STATE_DIR/tailscaled.sock"
STATE_PATH="$STATE_DIR/tailscaled.state"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_PATH="$LAUNCH_AGENTS_DIR/com.lo.renaciente.tailscaled-userspace.plist"
LOG_PATH="$STATE_DIR/tailscaled.log"
LABEL="com.lo.renaciente.tailscaled-userspace"

if [[ ! -x "$TAILSCALED_BIN" || ! -x "$TAILSCALE_BIN_CLI" ]]; then
  echo "No encuentro Tailscale en /opt/homebrew/opt/tailscale/bin."
  echo "Instala primero con: brew install tailscale"
  exit 1
fi

mkdir -p "$STATE_DIR" "$LAUNCH_AGENTS_DIR"

cat >"$PLIST_PATH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$TAILSCALED_BIN</string>
    <string>--tun=userspace-networking</string>
    <string>--socket=$SOCKET_PATH</string>
    <string>--state=$STATE_PATH</string>
    <string>--statedir=$STATE_DIR</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$LOG_PATH</string>
  <key>StandardErrorPath</key>
  <string>$LOG_PATH</string>
</dict>
</plist>
PLIST

launchctl bootout "gui/$(id -u)" "$PLIST_PATH" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$PLIST_PATH"
launchctl enable "gui/$(id -u)/$LABEL"
launchctl kickstart -k "gui/$(id -u)/$LABEL"

echo "Tailscale userspace daemon configurado."
echo "Socket: $SOCKET_PATH"
echo "Plist:  $PLIST_PATH"
echo
echo "Si todavía no has hecho login, ejecuta:"
echo "  /opt/homebrew/opt/tailscale/bin/tailscale --socket=\"$SOCKET_PATH\" up"
