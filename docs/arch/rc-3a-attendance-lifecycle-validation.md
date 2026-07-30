# RC-3A Attendance Lifecycle Validation

**Date:** 2026-07-29  
**Status:** Complete  

## Summary

| Scenario | Result |
|----------|--------|
| A: OPEN → CLOSE → REOPEN → CLOSE → REOPEN → CLOSE | ⚠️ LCV-1 |
| B: OPEN → CLOSE → ADJUST → REOPEN → CLOSE | ⚠️ LCV-1 (same issue) |
| C: OPEN → VALIDATION FAILS → CLOSE REJECTED | ✅ PASS |
| Snapshot invariants | ⚠️ LCV-1 |
| Adjustment preservation across reopen | ✅ PASS |
| Audit trail across multiple cycles | ✅ PASS |
| Blocking findings | **None** |

## Scenario A — Multiple close/reopen cycles

**Path:** `OPEN → close() → CLOSED → reopen() → OPEN → close() → CLOSED`

**State machine:** ✅ Allowed. `closed → open` is registered. `open → closed` requires `payroll_posted` intermediate state which `close()` enforces via `canClose()`.

**Wait — finding.** Looking at the state machine: `closed → open` is allowed (reopen). But `close()` checks `canClose()` which only returns `true` for `payroll_posted`. After reopen, the period is `open`. From `open`, `canClose()` returns `false`.

This means: **Scenario A cannot happen as stated.** After reopening to `open`, you cannot directly close again. The period must go through `open → in_review → locked → payroll_processing → payroll_posted → closed`.

Let me re-scope: `OPEN → LOCK → REVIEW → LOCK → PAYROLL_PROCESSING → PAYROLL_POSTED → CLOSE → REOPEN → OPEN → LOCK → ... → CLOSE`

This is correct — the full path is guarded at every step.

### LCV-1 — Snapshot version not incremented on re-close

**Location:** `timesheet-snapshot.service.ts:99`  
**Issue:** `snapshotVersion: 1` is hardcoded. If a period is reopened and closed again, the snapshot insert uses `snapshotVersion: 1` again. The unique constraint `uq_timesheet_snapshots_employee_period_version` on `(employeeId, period, snapshotVersion)` will reject the second insert with a duplicate key violation.

**Impact:** Reopen → re-close fails at the snapshot step. Period status remains `open` (snapshot is created BEFORE the transaction), but close fails.

**Risk:** MEDIUM — blocks legitimate reopen→reclose workflows.

## Scenario B — Adjustment preservation across reopen

**Path:** `OPEN → close() → CLOSED → adjustment {create, approve, apply} → reopen() → OPEN → ... → close()`

**Adjustment preservation:** ✅ Adjustments are stored in `attendance_adjustments` table, keyed by employee + period. They are independent of period status. Reopening the period does not affect existing adjustments.

**Effective delta:** ✅ `AttendanceAdjustmentService.getEffectiveDelta()` reads by `period + employeeId + "applied"` status. Works regardless of period status.

**Issue:** LCV-1 applies — second close would fail due to snapshot version conflict.

## Scenario C — Failed close leaves no state

**Path:** `OPEN → validateClose() → FAIL → no mutation`

**Validation:** ✅ Validations run before any mutation. `validateClose()` iterates registered validators. If any returns a reason, `throwBadRequest` stops execution before `upsert()`, before `recordTransition()`, before `createSnapshotForPeriod()`, before `eventOutbox.stage()`.

**Invariant holds:** FAILED CLOSE → NOT CLOSED → NO SNAPSHOT → NO HISTORY → NO EVENT.

## Snapshot Invariants

| Invariant | Status |
|-----------|--------|
| CLOSED implies snapshot exists | ✅ Snapshot created before transaction in `close()` |
| CLOSED implies history exists | ✅ `recordTransition()` inside transaction |
| CLOSED implies validation succeeded | ✅ `validateClose()` runs before any mutation |
| CLOSED implies payroll boundary | ✅ `TimesheetPeriodClosedEvent` staged inside transaction |
| Snapshot is immutable | ✅ Plain INSERT, no UPDATE path exists |
| Re-close with version increment | ❌ LCV-1 — version always 1 |

## Audit Trail Validation

| Property | Status |
|----------|--------|
| `attendance_period_history` records every transition | ✅ |
| `attendance_adjustments` preserves all corrections | ✅ |
| `attendance_payroll_reconciliations` preserves all runs | ✅ |
| `attendance_summary_overrides` preserves all HR overrides | ✅ |
| No audit data is deleted on reopen | ✅ |

## Findings

| ID | Finding | Severity | Recommendation |
|----|---------|----------|---------------|
| LCV-1 | Snapshot version hardcoded to 1 — re-close after reopen fails with constraint violation | MEDIUM | Use existing snapshot count or query max version + 1 instead of hardcoded `1` |

## RC-3A Status

| Requirement | Status |
|------------|--------|
| Lifecycle transitions validated | ✅ PASS |
| Multiple close cycles validated | ⚠️ LCV-1 blocks re-close after reopen |
| Snapshot invariants preserved | ⚠️ LCV-1 |
| Reopen semantics validated | ✅ PASS (state machine guards correct) |
| Adjustment preservation validated | ✅ PASS |
| Failed close behavior validated | ✅ PASS (no partial state) |
| Temporal scenarios validated | ⚠️ LCV-1 affects time-separated cycles |
| Blocking findings | **None** (LCV-1 is MEDIUM, documented) |
