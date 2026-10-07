#!/usr/bin/env bash
set -eo pipefail

PROJECT_DIR="/home/hieutt/btn-hrms"
STATE_FILE="/tmp/btn_hrms_idle_since"
IDLE_LIMIT_SEC=1800 # 30 minutes

# 1. Check if Docker container is running
IS_RUNNING=$(docker inspect --format '{{.State.Status}}' btn-hrms-postgres 2>/dev/null || echo "stopped")
if [ "$IS_RUNNING" != "running" ]; then
  # Containers are already stopped, nothing to do
  rm -f "$STATE_FILE"
  exit 0
fi

# 2. Check if App is actively running (listening on 3001 or 8080)
APP_ACTIVE=$(ss -tln "( sport = :3001 or sport = :8080 )" 2>/dev/null | grep -v State || true)

NOW=$(date +%s)

if [ -n "$APP_ACTIVE" ]; then
  # App is actively running -> Reset idle timer
  rm -f "$STATE_FILE"
  exit 0
fi

# 3. App is NOT running, but Docker containers ARE running
if [ ! -f "$STATE_FILE" ]; then
  # First detection of idle: record current timestamp
  echo "$NOW" > "$STATE_FILE"
  exit 0
fi

IDLE_SINCE=$(cat "$STATE_FILE" 2>/dev/null || echo "$NOW")
ELAPSED=$(( NOW - IDLE_SINCE ))

if [ "$ELAPSED" -ge "$IDLE_LIMIT_SEC" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] 💤 App idle for $(( ELAPSED / 60 ))m. Tự động dừng Docker Infra để tiết kiệm tài nguyên..."
  docker compose -f "$PROJECT_DIR/docker-compose.infra.yml" stop
  rm -f "$STATE_FILE"
fi
