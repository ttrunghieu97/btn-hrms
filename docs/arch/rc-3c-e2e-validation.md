# RC-3C End-to-End Attendance → Payroll Validation

**Date:** 2026-07-29  
**Status:** Complete  

## Workflow Trace

```
Attendance:
  Period Close → Snapshot → TimesheetPeriodClosedEvent
       ↓
Payroll:
  Generate → ReadAttendancePort + AdjustmentDeltas → InputSnapshot
       ↓
  Request Approval → Approve → Post → Publication Metadata
```

## Integration Points

| Step | Source | Consumer | Mechanism | Status |
|------|--------|----------|-----------|--------|
| Period close | `PeriodLockService.close()` | `timesheetSnapshots` table | `createSnapshotForPeriod()` | ✅ |
| Closed event | `PeriodLockService.close()` | `PayrollTimesheetPeriodClosedSubscriber` | Outbox → EventBus | ✅ (idempotent) |
| Attendance input | `AttendanceReadPort` | `GeneratePayrollRunUseCase` | Contract port | ✅ |
| Adjustment input | `IAttendanceAdjustmentReader` | `GeneratePayrollRunUseCase` | Contract port | ✅ |
| Input snapshot | `GeneratePayrollRunUseCase` | `payrollInputSnapshots` table | Direct insert in transaction | ✅ |
| Calculation version | `PayrollRunStateMachine` | `payrollRuns.calculationVersionId` | Resolved before transaction | ✅ |
| Calculation hash | `simpleHash()` | `payrollRuns.calculationHash` | Computed after input snapshot | ✅ |
| Approval | `ApprovePayrollRunUseCase` | `payrollRunApprovalHistory` | Transactional | ✅ |
| Posting | `PostPayrollRunUseCase` | `payrollRuns.publicationStatus` | Transactional with guards | ✅ |

## Findings

### E2E-1 — OverrideAttendanceSummaryUseCase does not guard against closed periods

**Location:** `OverrideAttendanceSummaryUseCase.execute()`  
**File:** `override-attendance-summary.usecase.ts`  

**Issue:** The override use-case validates employee existence and field presence but does NOT check whether the target period is closed. An HR user can directly override attendance summaries after period close, bypassing the adjustment workflow (Sprint 2-C).

**Impact:** 
- Snapshot at close time does NOT include post-close overrides (correct — snapshot is immutable)
- Payroll generation reads LIVE data via `AttendanceReadPort.getEffectiveDailySummaries()` which DOES include post-close overrides
- Result: Payroll sees different data than the snapshot for the same closed period

**Risk:** MEDIUM — if HR uses `POST /summary-overrides` instead of the adjustment workflow `POST /adjustments` for post-close corrections, payroll input diverges from snapshot.

**Recommendation:** Add period lock check to `OverrideAttendanceSummaryUseCase`. If period is CLOSED, reject with a message directing HR to use the adjustment workflow.

### E2E-2 — Payroll generation reads live data, not snapshot data

**Location:** `GeneratePayrollRunUseCase.execute()`, line 162  
**File:** `payroll-runs.usecases.ts`

**Issue:** Payroll generation reads from `AttendanceReadPort.getEffectiveDailySummaries()` (live resolved summaries) rather than from `timesheetSnapshots` (the immutable snapshot created at close time).

**Current behavior is correct for single-cycle workflows:** For the standard case where a period is closed, then payroll is generated without any intervening changes, live data = snapshot data. The `getEffectiveDailySummaries()` includes overrides via `mergeOverride()`.

**Risks in edge cases:**
- E2E-1 scenario: post-close override = divergence between snapshot and payroll input
- If period is reopened, live data changes but snapshot doesn't

## Correctness Assertions

| Assertion | Status | Detail |
|-----------|--------|--------|
| Payroll generation uses resolved truth | ✅ | `AttendanceReadPort.getEffectiveDailySummaries()` |
| Adjustments are included in payroll | ✅ | `IAttendanceAdjustmentReader.getAdjustmentDeltas()` |
| Payroll input is frozen | ✅ | Input snapshot in `payrollInputSnapshots` table |
| Calculation version is recorded | ✅ | `calculationVersionId` on payroll run |
| Approval is required before posting | ✅ | State machine `assertTransition` guard |
| Posting guards validated | ✅ | `calculationVersionId` + `calculationHash` checked |
| Financial publication metadata recorded | ✅ | `postedByUserId`, `postedAt`, `publicationStatus` |
| Event subscriber is idempotent | ✅ | `EventIdempotencyRepository` used |

## Findings Summary

| ID | Finding | Severity | Recommendation |
|----|---------|----------|---------------|
| E2E-1 | Override use-case allows post-close modifications that bypass adjustment workflow | MEDIUM | Add period lock check to `OverrideAttendanceSummaryUseCase` |
| E2E-2 | Payroll reads live data, not snapshot | LOW | Documented behavior — acceptable for RC |

## RC-3C Status

| Requirement | Status |
|------------|--------|
| Attendance truth correctly published | ✅ PASS |
| Payroll consumes attendance truth via contracts | ✅ PASS |
| Adjustment deltas consumed by payroll | ✅ PASS |
| Payroll input is frozen and auditable | ✅ PASS |
| Approval workflow prevents unauthorized posting | ✅ PASS |
| Posting guards prevent incomplete publication | ✅ PASS |
| Event subscribers are idempotent | ✅ PASS |
| Post-close overrides use adjustment workflow | ⚠️ E2E-1 |
| Blocking findings | **None** |
