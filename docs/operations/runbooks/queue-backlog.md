# Runbook: Outbox / Queue Backlog

## Detection
- Alert: `OutboxBacklogGrowing` or `OutboxOldEvents` fires
- Events not being processed within SLO (30s)

## Impact
- Cross-module side effects delayed
- Notifications not sent
- Integration events not delivered
- Eventually-consistent state drift

## Investigation
1. Check outbox dispatcher logs:
   ```bash
   grep "outbox" /var/log/api/error.log
   ```
2. Check pending count:
   ```sql
   SELECT count(*) FROM event_outbox WHERE status = 'pending';
   ```
3. Check oldest pending:
   ```sql
   SELECT min(created_at) FROM event_outbox WHERE status = 'pending';
   ```

## Mitigation
1. **Dispatcher crashed**: Restart dispatcher worker
2. **Kafka/Redis down**: Restore event bus connection
3. **Poison message**: Move stuck events to DLQ:
   - Identify event ID from logs
   - Query outbox for event details
   - Move to dead_letter table
   - Reprocess after fix
4. **Resource exhaustion**: Scale dispatcher concurrency

## Recovery
- Confirm pending count drops below threshold
- Confirm oldest unpublished age < 30s
- Re-process any dead-lettered events after root cause fixed

## Postmortem
- Add consumer idempotency if duplicate processing occurred
- Add retry with backoff if transient failure
