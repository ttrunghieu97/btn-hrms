# Deployment, Database Migration, Backup/Restore & Incident Recovery Runbook (`btn-hrms`)

## 1. Environment & Preflight Verification

Before deploying or running migrations in staging/production, verify that the environment configuration and repository build artifacts pass all preflight checks:

```bash
# 1. Verify environment variable contract against schema
pnpm deployment:check-env --mode=example

# 2. Verify zero tracked secrets in repository
pnpm security:check-tracked-secrets

# 3. Verify OpenAPI client & backend error contract catalog synchronization
pnpm client:verify

# 4. Run full monorepo build (shared packages -> @project/api -> frontend)
pnpm build
```

Required production environment variables (validated by `scripts/deployment/check-env.mjs` and `apps/api/src/infrastructure/database/env.ts`):
- `DATABASE_URL` & `DATABASE_DIRECT_URL` (PostgreSQL 16+ connection strings)
- `REDIS_URL` (Redis 7+ for BullMQ queues, rate limiting, and session/cache state)
- `JWT_SECRET` & `JWT_REFRESH_SECRET` (minimum 32-byte high-entropy secrets)
- `FIELD_ENCRYPTION_KEY` (32-byte hex/base64 key for AES-256-GCM employee PII encryption)
- `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET` (MinIO / S3-compatible document & avatar storage)

---

## 2. Database Migration & Seed Runbook

### 2.1 Pre-Migration Backup
Always capture a logical snapshot before applying schema migrations:

```bash
pg_dump --format=custom --no-owner --no-acl "$DATABASE_DIRECT_URL" \
  --file="backup_btn_hrms_$(date +%Y%m%d_%H%M%S).dump"
```

### 2.2 Applying Drizzle Migrations & Synchronizing Permissions
```bash
# Apply pending SQL migrations in apps/api/drizzle
pnpm --filter @project/api db:migrate

# Idempotently synchronize @project/permissions, system roles (system_admin, employee_base), and baseline org structure
pnpm --filter @project/api db:seed
```
- **Idempotency Guarantee**: `seed.ts` uses `onConflictDoNothing()` on `permissions`, `companies`, `branches`, `locations`, and `user_roles`, and synchronizes `PERMISSIONS` directly from `@project/permissions` (`PermissionRegistry` + `Permissions`).

---

## 3. Rollback & Restore Procedure

1. **Application Rollback**:
   - Redeploy the previous immutable container image tag for `@project/api` and `frontend`.
   - Verify `/api/health` (liveness and readiness probes checking PostgreSQL and Redis connectivity).
2. **Database Restore (If Schema/Data Rollback Is Required)**:
   ```bash
   pg_restore --clean --if-exists --no-owner --no-acl \
     --dbname="$DATABASE_DIRECT_URL" "backup_btn_hrms_<timestamp>.dump"
   ```
3. **BullMQ Queue Drain / Retry Recovery**:
   - Scheduled workforce jobs (`TransferSchedulerJob`, `ExecuteScheduledTerminationsUseCase`) and outbox processors (`EventOutboxService`) are idempotent and state-guarded (`currentState === "approved" && status === "active"`). Re-running a worker batch safely skips already-applied transitions.

---

## 4. Operational Guardrails & Incident Playbooks

- **Provisional Payroll Lock (`PD-04`)**:
  - If an operator attempts to approve, publish, close, or export a bank file for a payroll run while `calculationStatus === "PROVISIONAL_POLICY_UNCONFIRMED"`, the API returns `409 Conflict`. Do **not** bypass this check in the database; follow `docs/adr/ADR-002-provisional-payroll-fail-closed-guardrails.md` once statutory PIT/insurance rates are signed off.
- **PII Encryption Key Rotation**:
  - `FIELD_ENCRYPTION_KEY` encrypts `nationalId`, `taxCode`, and `bankAccountNumber` in `employees`. Never delete or overwrite `FIELD_ENCRYPTION_KEY` without re-encrypting existing rows inside an explicit database transaction.
