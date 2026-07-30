# RC-3E Operational Runbooks

**Date:** 2026-07-29  
**Status:** Complete  

## Operator Procedure Inventory

### 1. Close an Attendance Period

```
Pre-check:  GET /timekeeping/period-locks/{period}/validate-close
Action:     POST /timekeeping/period-locks/close
              Body: { period, remarks }
Verify:     GET  /timekeeping/period-locks/{period}
              → status = "closed"
History:    GET  /timekeeping/period-locks/{period}/history
Recon:      GET  /timekeeping/reconcile (auto-triggered)
```

**Success signals:** status=closed, snapshot exists in `timesheetSnapshots`, history entry recorded, reconciliation run created.

**Failure recovery:** If close validation fails, address the validation reason and retry. If snapshot generation fails before transaction, period remains unclosed — retry safe.

### 2. Reopen a Closed Period

```
Action:     POST /timekeeping/period-locks/reopen
              Body: { period, remarks }
Verify:     GET  /timekeeping/period-locks/{period}
              → status = "open"
History:    GET  /timekeeping/period-locks/{period}/history
              → reopened=true metadata entry
```

**Known limitation (LCV-1):** After reopen → re-close, snapshot version stays at 1. The second close may fail on unique constraint. If this occurs, contact engineering to reset snapshot state or increment version manually.

### 3. Create and Process an Attendance Adjustment

```
Create:     POST /timekeeping/adjustments
              Body: { period, employeeId, reason, items: [...] }
Verify:     GET  /timekeeping/adjustments/{id}
Approve:    POST /timekeeping/adjustments/{id}/approve
Apply:      POST /timekeeping/adjustments/{id}/apply
Verify:     GET  /timekeeping/adjustments/{id}
              → status = "applied"
```

**Note:** Post-closure changes MUST use adjustments, not the override endpoint (`POST /timekeeping/summary-overrides`). The override endpoint does not check period lock status (E2E-1).

### 4. Run Payroll Reconciliation

```
Action:     POST /timekeeping/reconcile/run
              Body: { period }
Verify:     GET  /timekeeping/reconcile/{id}
              → status = "completed"
Mismatches: GET  /timekeeping/reconcile/{id}/mismatches
All items:  GET  /timekeeping/reconcile/{id}/items
```

Reconciliation is read-only. Mismatches require investigation but do not block operations.

### 5. Generate Payroll

```
Action:     POST /payroll-runs/{id}/generate
Verify:     GET  /payroll-runs/{id}
              → status = "processing" → "pending_approval"
              → calculationVersionId populated
              → calculationHash populated
```

Generation is transactional. If it fails, the run returns to draft — retry safe.

### 6. Approve/Reject Payroll

```
Request:    POST /payroll-runs/{id}/request-approval
Approve:    POST /payroll-runs/{id}/approve
Reject:     POST /payroll-runs/{id}/reject
              Body: { reason }
Verify:     GET  /payroll-runs/{id}
              → status = "approved" or "draft"
```

Rejection returns the run to draft for regeneration and resubmission.

### 7. Post Payroll (Financial Publication)

```
Action:     POST /payroll-runs/{id}/post
Verify:     GET  /payroll-runs/{id}
              → status = "posted"
              → postedByUserId, postedAt populated
              → publicationStatus = pending/completed
```

Posting is guarded: requires `calculationVersionId` and `calculationHash` (i.e., generation must have completed). Once posted, the run is immutable.

### 8. Health Check

```
Action:     GET /timekeeping/health
Response:   { totalOpenPeriods, totalClosedPeriods,
              totalPendingAdjustments, totalMismatches, periods: [...] }
```

## Operational Gaps

| Gap | Severity | Workaround |
|-----|----------|------------|
| No `GET /payroll-runs/:id/approval-history` endpoint (OPS-1) | LOW | Query `payroll_run_approval_history` table directly |
| No `GET /payroll-runs/:id/publication-status` endpoint (OPS-1) | LOW | Read from `payrollRuns.publicationStatus` column |
| No `GET /payroll-runs/:id/export-history` endpoint (OPS-1) | LOW | Query `payroll_export_history` table directly |
| Override endpoint bypasses period lock (E2E-1) | LOW | Use adjustment workflow for post-close corrections |
| Re-close after reopen may fail (LCV-1) | LOW | Contact engineering for snapshot version fix |

## RC-3E Status

| Requirement | Status |
|------------|--------|
| All operator procedures documented | ✅ Runbook compiled |
| Recovery procedures documented | ✅ Documented per operation |
| Known limitations documented | ✅ LCV-1, E2E-1, OPS-1 documented |
| Failure recovery paths documented | ✅ Per operation |
| Blocking findings | **None** |
