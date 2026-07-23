# Runbook: Database Degraded

## Detection
- Alert: `DatabaseSlow` fires
- Queries timing out in application logs
- Database health check latency exceeds 500ms

## Impact
- Increased API latency
- Potential timeouts on write-heavy operations
- Payroll/attendance batch jobs may stall

## Investigation
1. Check DB connection pool:
   ```sql
   SELECT count(*) FROM pg_stat_activity;
   ```
2. Identify slow queries:
   ```sql
   SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 20;
   ```
3. Check for locks:
   ```sql
   SELECT * FROM pg_locks WHERE NOT granted;
   ```

## Mitigation
1. **Slow queries**: Add missing index / optimize query via EXPLAIN ANALYZE
2. **Lock contention**: Kill blocking session if safe
3. **Connection pool exhaustion**: Increase pool size in config
4. **Disk space**: Clean old data / extend volume
5. **Read replica**: Route read-only queries to replica

## Recovery
- Verify query times return to normal
- Confirm `/ready` returns database OK
- Remove any temporary mitigations

## Postmortem
- Add missing index if N+1 or seq scan found
- Update threshold if alert was noise
