# Deployment Operations Scripts

Executable helpers for production readiness checks. These scripts do not print secret values.

## Environment validation

```bash
pnpm deployment:check-env -- --mode=example
```

Validates `.env.example`, `apps/api/.env.example`, and `apps/web/.env.example` contain required deployment keys.

For a real deployment shell:

```bash
pnpm deployment:check-env
```

## Smoke checks

```bash
SMOKE_API_BASE_URL=https://api.example.com/api/v1 \
SMOKE_WEB_URL=https://hrms.example.com \
pnpm deployment:smoke
```

Checks API `/health`, API `/ready/strict`, and Web root URL.

## PostgreSQL backup

Requires `pg_dump` on PATH.

```bash
DATABASE_BACKUP_URL=postgresql://user:password@host:5432/hrms \
BACKUP_DIR=backups/postgres \
pnpm deployment:backup:postgres
```

Output is a custom-format dump file suitable for `pg_restore`.

## PostgreSQL restore

Requires `pg_restore` on PATH. Restore is intentionally guarded.

```bash
RESTORE_CONFIRM=I_UNDERSTAND_THIS_OVERWRITES_DATABASE_STATE \
DATABASE_RESTORE_URL=postgresql://user:password@host:5432/hrms_restore \
pnpm deployment:restore:postgres -- backups/postgres/btn-hrms-example.dump
```

Restore first into an isolated database for drills. Production restore requires incident commander and business approval.

## MinIO/S3 backup

Requires MinIO Client `mc` on PATH.

```bash
MINIO_SOURCE_ENDPOINT=http://minio:9000 \
MINIO_SOURCE_ACCESS_KEY=source-access-key \
MINIO_SOURCE_SECRET_KEY=source-secret-key \
MINIO_BACKUP_ENDPOINT=https://backup-s3.example.com \
MINIO_BACKUP_ACCESS_KEY=backup-access-key \
MINIO_BACKUP_SECRET_KEY=backup-secret-key \
MINIO_BUCKET=btn-hrms \
MINIO_BACKUP_BUCKET=btn-hrms-prod-backup \
pnpm deployment:backup:minio
```

Run restore drills by mirroring a backup bucket into a temporary bucket and verifying sample employee documents.
