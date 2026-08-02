#!/bin/zsh

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STATE_DIR="$HOME/Library/Application Support/LoRenaciente/api-daemon"
PID_FILE="$STATE_DIR/runner.pid"
STDOUT_LOG="$STATE_DIR/stdout.log"
STDERR_LOG="$STATE_DIR/stderr.log"

mkdir -p "$STATE_DIR"
printf '%s\n' "$$" >"$PID_FILE"

while true; do
  if "$ROOT_DIR/scripts/start-api-service.sh" >>"$STDOUT_LOG" 2>>"$STDERR_LOG"; then
    EXIT_CODE="0"
  else
    EXIT_CODE="$?"
  fi
  printf '%s API caída. Reiniciando en 2s. Exit=%s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$EXIT_CODE" >>"$STDERR_LOG"
  sleep 2
done
