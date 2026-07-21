# Workflow Audit Trail

## Production readiness

### Current state
- In-memory event store (`store.ts`) — events lost on page refresh
- Events populated from BE activity APIs on page load
- Timeline UI renders from stored events

### Before production ship
1. **BE must persist transitions** — every `POST /{entity}/{id}/transitions` must return the created event with id + timestamp
2. **Event store hydration** — on page load, call BE activity API → `eventStore.setAll(events)`
3. **Logging** — all failed transitions logged via `appLogger.warn` with snapshot + actor context
4. **No persistence needed on FE** — in-memory store is correct for UI; BE is source of truth

### Monitoring (post-ship, week 1)
- Track: transition success rate, guard_denied frequency, invalid_action count
- If guard_denied > 5% → role config issue
- If invalid_action > 2% → stale client state (needs refetch after mutation)
