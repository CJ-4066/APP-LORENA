#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
LOG_DIR="$HOME/Library/Logs/LoRenaciente"
PLIST_PATH="$LAUNCH_AGENTS_DIR/com.lo.renaciente.api.plist"
LABEL="com.lo.renaciente.api"
START_SCRIPT="$ROOT_DIR/scripts/start-api-service.sh"
STDOUT_LOG="$LOG_DIR/api-service.log"
STDERR_LOG="$LOG_DIR/api-service.error.log"

if [[ ! -x "$START_SCRIPT" ]]; then
  echo "No encuentro el script de arranque de la API:"
  echo "  $START_SCRIPT"
  exit 1
fi

mkdir -p "$LAUNCH_AGENTS_DIR" "$LOG_DIR"

cat >"$PLIST_PATH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>-lc</string>
    <string>exec "$START_SCRIPT"</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$ROOT_DIR</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$STDOUT_LOG</string>
  <key>StandardErrorPath</key>
  <string>$STDERR_LOG</string>
</dict>
</plist>
PLIST

launchctl bootout "gui/$(id -u)" "$PLIST_PATH" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$PLIST_PATH"
launchctl enable "gui/$(id -u)/$LABEL"
launchctl kickstart -k "gui/$(id -u)/$LABEL"

echo "LaunchAgent de la API configurado."
echo "Plist: $PLIST_PATH"
echo "Logs:"
echo "  $STDOUT_LOG"
echo "  $STDERR_LOG"
