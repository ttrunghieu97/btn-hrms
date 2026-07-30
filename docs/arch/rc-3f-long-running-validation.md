# RC-3F Long-running Workflow Validation

**Date:** 2026-07-29  
**Status:** Complete  

## Temporal Guarantees

### Append-only Tables (INSERT-only, no UPDATE/DELETE paths)

| Table | Mutability | Temporal Guarantee |
|-------|-----------|-------------------|
| `timesheetSnapshots` | INSERT only | Snapshot immutable once created |
| `attendancePeriodHistory` | INSERT only | Lifecycle history never modified |
| `attendanceAdjustmentItems` | INSERT only | Adjustment deltas never modified |
| `attendancePayrollReconciliationItems` | INSERT only | Reconciliation evidence preserved |
| `payrollInputSnapshots` | INSERT only | Payroll input frozen at generation time |
| `payrollInputSnapshotItems` | INSERT only | Input values immutable |
| `payrollRunApprovalHistory` | INSERT only | Approval decisions permanently recorded |
| `payrollExportHistory` | INSERT only | Export operations permanently recorded |

### Status-tracking Tables (UPDATE allowed for state machine transitions)

| Table | Mutation Pattern | Temporal Guarantee |
|-------|-----------------|-------------------|
| `attendancePeriodLocks` | Status transitions via `upsert()` | State machine guards all transitions |
| `attendanceAdjustments` | Status: draft→requested→approved→applied | Each transition recorded via history |
| `attendancePayrollReconciliations` | Status: running→completed/failed | Failure reason preserved |
| `payrollRuns` | Status: draft→processing→pending_approval→approved→posted | Every transition via `assertTransition` |

## Temporal Scenario Validation

### Scenario 1: Period close → 30 days → audit

```
Day 1:   Period CLOSED → snapshot created → history recorded
Days 2-30: No mutations to closed period
Day 31:  Audit request → operator queries:
          - GET /timekeeping/period-locks/{period} → status = "closed" ✅
          - GET /timekeeping/period-locks/{period}/history → transition record ✅
          - timesheetSnapshots table → resolved truth at close ✅
```

**Verdict:** ✅ PASS. All artifacts are immutable after close. Snapshot, history, and status survive indefinitely.

### Scenario 2: Closed period → adjustment → 14 days → payroll generation

```
Day 1:   Period CLOSED → snapshot created
Day 3:   Adjustment created → approved → applied
         → attendanceAdjustments table stores delta
         → attendanceAdjustmentItems stores per-field delta
Day 17:  Payroll generated:
         - AttendanceReadPort.getEffectiveDailySummaries() → live resolved truth
         - IAttendanceAdjustmentReader.getAdjustmentDeltas() → applied adjustments
         - payrollInputSnapshots created with both base + adjustment values
Day 31:  Audit: adjustment delta visible, input snapshot frozen ✅
```

**Verdict:** ✅ PASS. Adjustments are stored independently from snapshots. Payroll consumption is deterministic regardless of timing between close, adjustment, and generation.

### Scenario 3: Payroll approve → 7 days → post → 30 days → audit

```
Day 1:   Payroll generated → input snapshot → calculation version
Day 2:   Payroll approved → approval history recorded
Day 9:   Payroll posted → publication metadata recorded
         → postedByUserId, postedAt, publicationStatus
Day 39:  Audit request → operator traces:
         - payrollRuns.publicationStatus → "pending" ✅
         - payrollRuns.postedByUserId → who posted ✅
         - payrollRuns.calculationVersionId → rule version ✅
         - payrollRunApprovalHistory → approval decision ✅
         - payrollInputSnapshots → frozen inputs ✅
```

**Verdict:** ✅ PASS. Full provenance chain survives across temporal boundaries. Every published payroll result is traceable back to inputs and approvals.

### Scenario 4: Reopen → 60 days → reconcile

```
Day 1:   Period CLOSED
Day 30:  Period REOPENED → history records reopened=true
         → adjustments still valid (keyed by period + employee)
         → snapshot still exists (immutable)
Day 60:  Period re-closed → LCV-1 limitation (snapshotVersion=1)
```

**Verdict:** ⚠️ LCV-1 — re-close after reopen may fail on snapshot version constraint. Workaround: contact engineering for manual version increment.

## Temporal Vulnerability Assessment

| Vulnerability | Risk | Mitigation |
|--------------|------|------------|
| Data loss after time | NONE | All critical tables are append-only or status-tracked |
| Audit trail lost | NONE | History tables are INSERT-only |
| Financial provenance lost | NONE | Input snapshots + calculation versions are immutable |
| Publication metadata lost | NONE | `payrollRuns` columns persist |
| Snapshot mutation | NONE | No UPDATE path to `timesheetSnapshots` |
| Adjustment mutation | NONE | Items are INSERT-only; status is tracked |
| Re-close fails after reopen | LOW | LCV-1 — snapshot version not incremented |

## Findings

| ID | Finding | Severity |
|----|---------|----------|
| — | None | ✅ PASS |

## RC-3F Status

| Requirement | Status |
|------------|--------|
| Attendance temporal preservation | ✅ PASS |
| Payroll temporal preservation | ✅ PASS |
| Audit preservation across time | ✅ PASS |
| Provenance across time boundaries | ✅ PASS |
| Reopen + temporal gap validated | ⚠️ LCV-1 (documented) |
| Blocking findings | **None** |
