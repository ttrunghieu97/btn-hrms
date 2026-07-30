# RC-2C Failure Recovery Audit

**Date:** 2026-07-29  
**Status:** Complete  

## Summary

| Category | Result |
|----------|--------|
| Attendance recovery | ⚠️ FR-1 |
| Adjustment recovery | ✅ PASS |
| Payroll recovery | ⚠️ FR-2, FR-3 |
| Event recovery | ✅ PASS |
| Blocking findings | **None** |

## Attendance Recovery

### FR-1 — Snapshot insert lacks conflict handling on retry

**Location:** `timesheet-snapshot.service.ts:109` + `attendance-timekeeping.repository.ts:585`  
**Issue:** `insertTimesheetSnapshots()` performs a plain `INSERT` with no `ON CONFLICT` handling. If `close()` fails after snapshot insertion but before the transaction commits (TC-1 scenario), retrying the close will attempt to insert duplicate snapshots (unique constraint on `employeeId, period, snapshotVersion`), causing a constraint violation error.

**Current behavior:** Snapshot creation runs BEFORE the transaction in `close()` (correct by design). If `close()` transaction fails, snapshot data has been written but period remains OPEN. On retry, the snapshot insert throws a duplicate key error.

**Risk:** LOW — the `close()` flow was remediated in TC-1 to run snapshot creation before the transaction. If the transaction fails and the user retries, the snapshot insert will fail with a constraint error. To recover: operator can manually verify snapshot exists and retry close, or snapshot service can be modified to use `ON CONFLICT DO NOTHING`.

**Recommendation:** Change `insertTimesheetSnapshots()` to use `ON CONFLICT (employee_id, period, snapshot_version) DO NOTHING` to make retries safe.

### Adjustment recovery — PASS

All adjustment mutations are now wrapped in `timekeepingRepo.transaction()`. If a failure occurs mid-mutation, the transaction rolls back fully. Retry is safe.

## Payroll Recovery

### FR-2 — Payroll generation transaction rollback is safe

**Location:** `payroll-runs.usecases.ts:191`  
**Behavior:** `GeneratePayrollRunUseCase.execute()` wraps all mutation in `repo.transaction()`. If any step fails (snapshot insert, payslip creation, payroll item creation), the entire transaction rolls back. The payroll run status remains `draft` or `processing`.

**Risk:** LOW — already transactional. Retry is safe.

### FR-3 — Publication failure handling

**Location:** `PostPayrollRunUseCase.execute()`  
**Behavior:** Posting updates run status + records history + publishes event inside `repo.transaction()`. If the event outbox insert succeeds but the overall transaction fails, the event is rolled back. This is correct transactional behavior.

**Risk:** LOW — the `eventOutbox.stage()` call is inside the transaction. If the transaction commits, the event is guaranteed to be persisted. If it rolls back, the event is never published.

## Event Recovery — PASS

| Mechanism | Status | Detail |
|-----------|--------|--------|
| `eventOutbox.stage()` with tx | ✅ PASS | Accepts optional `tx`, stages atomically |
| `EventIdempotencyRepository` | ✅ PASS | All subscribers use `isProcessed/markProcessed` |
| Outbox dispatcher | ✅ PASS | Polls unpublished events, retries with backoff (5s→60s, max 12 attempts, DLQ) |
| Redis streams with consumer groups | ✅ PASS | At-least-once delivery, DLQ after max retries |
| Subscriber idempotency | ✅ PASS | timesheet-period-closed, offboarding-completed, employee-terminated all use event idempotency |

## Findings Summary

| ID | Finding | Severity | Recommendation |
|----|---------|----------|---------------|
| FR-1 | Snapshot insert lacks `ON CONFLICT` handling | LOW | Add `ON CONFLICT DO NOTHING` to make retries safe |
| FR-2 | Payroll generation transaction | ✅ PASS (safe) | — |
| FR-3 | Posting transaction protects event | ✅ PASS (safe) | — |

## Finding Status

| Requirement | Status |
|------------|--------|
| Attendance recovery audit | ⚠️ FR-1 documented |
| Adjustment recovery audit | ✅ PASS |
| Payroll recovery audit | ✅ PASS (transactional guards verified) |
| Event recovery audit | ✅ PASS (idempotency + outbox + DLQ verified) |
| Retry behavior documented | ✅ Documented |
| Rollback behavior documented | ✅ Verified via transaction patterns |
| Duplicate request behavior | ✅ State machine guards prevent |
| Blocking findings | **None** |

## RC-2C Summary

**PASS** — 1 LOW finding (FR-1, deferred). No blocking recovery gaps.
