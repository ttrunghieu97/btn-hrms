#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo ":: Killing any process on :8080"
lsof -ti:8080 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 1

echo ":: Starting Next.js with BONEYARD_BUILD=1"
BONEYARD_BUILD=1 node --max-old-space-size=4096 node_modules/next/dist/bin/next dev --hostname 0.0.0.0 --port 8080 &
NEXT_PID=$!

echo ":: Waiting for dev server (max 60s)"
for i in $(seq 1 30); do
  sleep 2
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 2>/dev/null || true)
  if [ "$STATUS" = "200" ] || [ "$STATUS" = "500" ]; then
    echo "   Server responded HTTP $STATUS"
    sleep 3
    break
  fi
  echo "   Waiting... ($((i * 2))s)"
done

echo ":: Running boneyard build"
npx boneyard-js build http://localhost:8080 \
  --out ./src/bones \
  --breakpoints 375,768,1280 \
  --wait 3000 \
  --force \
  --no-scan

BONEYARD_EXIT=$?

echo ":: Stopping dev server (PID $NEXT_PID)"
kill $NEXT_PID 2>/dev/null || true

exit $BONEYARD_EXIT
