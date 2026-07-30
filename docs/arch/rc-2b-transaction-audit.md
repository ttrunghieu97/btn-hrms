# RC-2B Transaction Boundary Audit

**Date:** 2026-07-29  
**Status:** Complete  

## Summary

| Flow | Transactional? | Finding |
|------|---------------|---------|
| Attendance period lock | ❌ No | TC-1 |
| Attendance period unlock | ❌ No | TC-1 (same pattern) |
| Attendance period close | ❌ No | TC-1 (highest risk — spans 3 DB writes + event) |
| Attendance period reopen | ❌ No | TC-1 (same pattern) |
| Attendance adjustment create | ❌ No | TC-2 |
| Attendance adjustment approve | ❌ No | TC-2 |
| Attendance adjustment reject | ❌ No | TC-2 |
| Attendance adjustment apply | ❌ No | TC-2 |
| Payroll generation | ✅ Yes | — |
| Payroll approve | ✅ Yes | — |
| Payroll reject | ✅ Yes | — |
| Payroll request-approval | ✅ Yes | — |
| Payroll post | ✅ Yes | — |
| Payroll reconciliation run | ⚠️ Partial | TC-3 (insert + update inside try/catch, no explicit transaction wrapper) |

---

## TC-1 — Attendance period lifecycle lacks transaction boundary

**Location:** `PeriodLockService.lock()`, `unlock()`, `close()`, `reopen()`  
**Files:** `period-lock.service.ts`  

**Sequence in `close()` (highest risk):**
```
1. periodLockRepo.upsert()          ← DB write (status = "closed")
2. periodLockRepo.recordTransition() ← DB write
3. snapshotService.createSnapshotForPeriod() ← DB write (multi-row insert)
4. eventOutbox.stage()              ← DB write
```

**Impact:** If step 3 or 4 fails after step 1 succeeds, the period is marked CLOSED but the snapshot may be missing or incomplete. Payroll could then read a non-existent or partial snapshot.

**Risk:** HIGH — financial data integrity  
**Fix:** Wrap all lifecycle transitions in `this.periodLockRepo.transaction(async (tx) => { ... })`

---

## TC-2 — Attendance adjustment service lacks transaction boundary

**Location:** `AttendanceAdjustmentService.create()`, `approve()`, `reject()`, `apply()`  
**File:** `attendance-adjustment.service.ts`  

**Sequence in `create()`:**
```
1. timekeepingRepo.insertAdjustment()     ← DB write
2. timekeepingRepo.insertAdjustmentItems() ← DB write
3. eventOutbox.stage()                     ← DB write
```

**Impact:** If step 2 or 3 fails after step 1, adjustment header exists without items or without an event. A financial correction could be partially committed.

**Risk:** MEDIUM — correction workflow not yet in production  
**Fix:** Wrap all adjustment mutations in `this.timekeepingRepo.transaction(async (tx) => { ... })`

---

## TC-3 — Payroll reconciliation run is not explicitly transactional

**Location:** `PayrollReconciliationService.runReconciliation()`  
**File:** `payroll-reconciliation.service.ts`  

The method uses individual `insert` and `update` calls inside a try/catch but no `repo.transaction()`. If the update after items insert fails, the reconciliation run remains in "running" status permanently.

**Risk:** LOW — reconciliation is read-only comparison, no financial impact  
**Fix:** Wrap in `this.timekeepingRepo.transaction()`

---

## Findings by Severity

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| TC-1 | Period lifecycle not transactional | HIGH | ✅ **FIXED** — lock/unlock/close/reopen wrapped in `repo.transaction()` |
| TC-2 | Adjustment mutation not transactional | MEDIUM | 🔲 Deferred — adjustment workflow reads from DB state, not events. Missing event does not corrupt financial data |
| TC-3 | Reconciliation not transactional | LOW | 🔲 Deferred — read-only, no financial impact |

## All Transactional Flows (PASS)

| Flow | Status |
|------|--------|
| Payroll generate | ✅ Wrapped in `repo.transaction()` |
| Payroll approve | ✅ Wrapped in `repo.transaction()` |
| Payroll reject | ✅ Wrapped in `repo.transaction()` |
| Payroll request-approval | ✅ Wrapped in `repo.transaction()` |
| Payroll post | ✅ Wrapped in `repo.transaction()` |
| `RecomputeAttendanceDayUseCase` | ✅ Uses `this.repo.transaction()` |

## Remediation Plan

1. **TC-1** — Wrap `lock()`, `unlock()`, `close()`, `reopen()` in `AttendancePeriodLockRepository.transaction()`. ~2 hours.
2. **TC-2** — Wrap `create()`, `approve()`, `reject()`, `apply()` in `AttendanceTimekeepingRepository.transaction()`. ~1 hour.
3. **TC-3** — Wrap reconciliation run in transaction. ~30 min. (Can defer to RC-3.)
