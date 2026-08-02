#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STATE_DIR="$HOME/Library/Application Support/LoRenaciente/api-daemon"
PID_FILE="$STATE_DIR/runner.pid"
RUNNER="$ROOT_DIR/scripts/run-api-daemon.sh"

mkdir -p "$STATE_DIR"

if [[ -f "$PID_FILE" ]]; then
  EXISTING_PID="$(<"$PID_FILE")"
  if kill -0 "$EXISTING_PID" >/dev/null 2>&1; then
    echo "La API daemon ya está corriendo con PID $EXISTING_PID."
    exit 0
  fi
  rm -f "$PID_FILE"
fi

nohup "$RUNNER" >/dev/null 2>&1 &
DAEMON_PID="$!"
disown "$DAEMON_PID" 2>/dev/null || true

sleep 3

if kill -0 "$DAEMON_PID" >/dev/null 2>&1; then
  echo "API daemon iniciada."
  echo "PID: $DAEMON_PID"
  echo "Logs: $STATE_DIR"
  exit 0
fi

echo "No pude dejar la API daemon corriendo."
exit 1
