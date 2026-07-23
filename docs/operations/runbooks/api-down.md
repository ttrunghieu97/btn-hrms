# Runbook: API Down

## Detection
- Alert: `HighErrorRate` or `DatabaseDown` fires
- Health check (`/ready/strict`) returns non-ready
- Users report 503/502 errors

## Impact
- All API consumers unable to use the system
- Dependent services (mobile, web) unavailable

## Investigation
1. Check `/health` and `/ready` endpoints
2. Check `/metrics` for database/storage/eventbus health
3. Check database connectivity:
   ```bash
   pnpm --filter @project/api db:push --dry-run
   ```
4. Check application logs for panic/startup errors
5. Check Redis connectivity if event bus affected
6. Check MinIO/S3 storage health

## Mitigation
1. **Database degraded**: Fail over to replica / restore from backup
2. **Application crash**: Restart the service:
   ```bash
   pnpm --filter @project/api dev
   # or for production:
   pm2 restart api
   ```
3. **Deployment rollback**: Revert to previous stable tag
4. **Resource exhaustion**: Scale horizontally (add API instances)

## Recovery
- Confirm `/ready/strict` returns `"status": "ready"`
- Confirm dependent services can reach API
- Monitor error rate for 5 min after recovery

## Postmortem
- File incident report in docs/incidents/
- Update runbook if mitigation steps were missing
