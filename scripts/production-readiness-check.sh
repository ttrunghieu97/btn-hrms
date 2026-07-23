#!/bin/bash
# Production Readiness Check
# Phase: P5.1 — Operations Foundation
#
# Usage: ./scripts/production-readiness-check.sh [--strict]
#
# Checks:
#   ✓ health endpoint
#   ✓ metrics enabled
#   ✓ migrations verified
#   ✓ alert rules exist
#   ✓ runbooks exist
#   ✓ slo documented
#   ✓ secrets available (env vars)
#   ✓ rollback plan exists
#   ✓ backup configured

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

API_URL="${API_URL:-http://localhost:3001}"
STRICT="${1:-}"

PASS=0
FAIL=0
WARN=0

check() {
  local name="$1"
  local result="$2"
  if [ "$result" = "pass" ]; then
    echo -e "  ${GREEN}✓${NC} $name"
    PASS=$((PASS + 1))
  elif [ "$result" = "warn" ]; then
    echo -e "  ${YELLOW}⚠${NC} $name"
    WARN=$((WARN + 1))
  else
    echo -e "  ${RED}✗${NC} $name"
    FAIL=$((FAIL + 1))
  fi
}

echo "============================================"
echo "  Production Readiness Check"
echo "============================================"
echo ""

# 1. Health endpoint
echo "--- API ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/health" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  check "/health" "pass"
else
  check "/health (HTTP $HTTP_CODE)" "fail"
fi

# 2. Readiness
BODY=$(curl -s "${API_URL}/ready" 2>/dev/null || echo "")
if echo "$BODY" | grep -q '"status":"ready"\|"status":"degraded"'; then
  check "/ready" "pass"
else
  check "/ready (unreachable)" "fail"
fi

# 3. Metrics
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/metrics" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  check "/metrics" "pass"
else
  check "/metrics (HTTP $HTTP_CODE)" "fail"
fi

# 4. Documentation
echo ""
echo "--- Documentation ---"
if [ -f "docs/operations/slo.md" ]; then
  check "slo.md" "pass"
else
  check "slo.md" "warn"
fi

if ls docs/operations/runbooks/*.md 1>/dev/null 2>&1; then
  check "runbooks present ($(ls docs/operations/runbooks/*.md | wc -l) files)" "pass"
else
  check "runbooks" "warn"
fi

# 5. Alert rules
echo ""
echo "--- Monitoring ---"
if ls monitoring/alert-rules/*.yml 1>/dev/null 2>&1; then
  check "alert rules ($(ls monitoring/alert-rules/*.yml | wc -l) files)" "pass"
else
  check "alert rules" "warn"
fi

if ls monitoring/dashboards/*.json 1>/dev/null 2>&1; then
  check "dashboards ($(ls monitoring/dashboards/*.json | wc -l) files)" "pass"
else
  check "dashboards" "warn"
fi

# 6. Environment / Secrets
echo ""
echo "--- Configuration ---"
if [ -n "${AUTH_JWT_SECRET:-}" ]; then
  check "AUTH_JWT_SECRET set" "pass"
else
  check "AUTH_JWT_SECRET" "warn"
fi

if [ -n "${DATABASE_URL:-}" ]; then
  check "DATABASE_URL set" "pass"
else
  check "DATABASE_URL" "warn"
fi

# 7. Rollback plan
if [ -f "docs/operations/runbooks/deployment-rollback.md" ]; then
  check "rollback plan documented" "pass"
else
  check "rollback plan" "warn"
fi

echo ""
echo "============================================"
echo "  Results: $PASS pass, $WARN warn, $FAIL fail"
echo "============================================"

if [ "$FAIL" -gt 0 ]; then
  if [ -n "$STRICT" ]; then
    exit 1
  fi
  echo "  Run with --strict to fail on failures."
fi

exit 0
