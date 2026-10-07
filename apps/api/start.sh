#!/bin/bash
while true; do
  echo "[start.sh] Starting API at $(date)"
  node dist/main.js >> /tmp/api-loop.log 2>&1
  EXIT_CODE=$?
  echo "[start.sh] API exited with code $EXIT_CODE at $(date)"
  sleep 2
done
