#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Sentry Self-Hosted — Initial Setup
# Run ONCE after starting Sentry containers.
# ============================================================

echo "=== Sentry Initial Setup ==="

# 1. Run database migrations + create admin user
echo ">>> Running Sentry database upgrade..."
docker compose exec sentry sentry upgrade --noinput

# 2. Create admin user if not exists
echo ">>> Creating admin user..."
docker compose exec sentry sentry createuser \
  --email admin@btn-hrms.local \
  --password "${SENTRY_ADMIN_PASSWORD:-admin123}" \
  --superuser \
  --no-input 2>/dev/null || echo "Admin user already exists"

# 3. Create internal project via API
echo ">>> Creating Sentry project..."
SENTRY_HOST="http://localhost:9000"
CSRF_TOKEN=$(curl -s -c /tmp/sentry-cookies.txt "${SENTRY_HOST}/api/0/internal/health/" | head -1)

# Login
curl -s -b /tmp/sentry-cookies.txt -c /tmp/sentry-cookies.txt \
  -X POST "${SENTRY_HOST}/api/0/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@btn-hrms.local","password":"'"${SENTRY_ADMIN_PASSWORD:-admin123}"'"}' > /dev/null

# Create project "btn-hrms-web" for frontend errors
curl -s -b /tmp/sentry-cookies.txt \
  -X POST "${SENTRY_HOST}/api/0/projects/" \
  -H "Content-Type: application/json" \
  -d '{"name":"btn-hrms-web","organization":"internal","team":"sentry","platform":"javascript-react"}' > /dev/null

# Get DSN for the project
DSN=$(curl -s -b /tmp/sentry-cookies.txt \
  "${SENTRY_HOST}/api/0/projects/internal/btn-hrms-web/keys/" | \
  python3 -c "import sys,json; print(json.load(sys.stdin)[0]['dsn']['public'])")

echo ""
echo "=== SENTRY DSN ==="
echo "$DSN"
echo ""
echo "Set this as NEXT_PUBLIC_SENTRY_DSN in .env"
echo "And as SENTRY_DSN secret in GitHub Actions"
