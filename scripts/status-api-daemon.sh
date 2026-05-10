#!/bin/zsh

set -euo pipefail

STATE_DIR="$HOME/Library/Application Support/LoRenaciente/api-daemon"
PID_FILE="$STATE_DIR/runner.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "API daemon: detenida"
  exit 0
fi

RUNNER_PID="$(<"$PID_FILE")"

if ps -p "$RUNNER_PID" >/dev/null 2>&1; then
  echo "API daemon: activa"
  echo "PID: $RUNNER_PID"
  echo "Logs: $STATE_DIR"
  exit 0
fi

echo "API daemon: caída"
exit 1
