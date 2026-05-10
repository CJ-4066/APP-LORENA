#!/bin/zsh

set -euo pipefail

STATE_DIR="$HOME/Library/Application Support/LoRenaciente/api-daemon"
PID_FILE="$STATE_DIR/runner.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "No hay PID guardado para la API daemon."
  exit 0
fi

RUNNER_PID="$(<"$PID_FILE")"

if kill -0 "$RUNNER_PID" >/dev/null 2>&1; then
  pkill -P "$RUNNER_PID" >/dev/null 2>&1 || true
  kill "$RUNNER_PID" >/dev/null 2>&1 || true
  sleep 1
fi

rm -f "$PID_FILE"
echo "API daemon detenida."
