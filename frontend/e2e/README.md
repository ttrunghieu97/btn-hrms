# E2E Test Suite — v1.0.0

## Setup
```bash
# Start servers (one-time)
cd /home/hieutt/btn-hrms/apps/api && npx nest build && setsid node dist/main.js < /dev/null > /tmp/api.log 2>&1 &
cd /home/hieutt/btn-hrms/apps/web && setsid npx next dev --hostname 0.0.0.0 --port 8080 < /dev/null > /tmp/web.log 2>&1 &

# Run tests
cd /home/hieutt/btn-hrms/apps/web && npx playwright test
```

## Test Files

- **employee-crud.spec.ts**: 5 tests
- **golden-path.spec.ts**: 7 tests
- **leave-flow.spec.ts**: 3 tests
- **payroll-flow.spec.ts**: 6 tests
- **smoke.spec.ts**: 1 tests

## CI
See `.github/workflows/e2e.yml`
