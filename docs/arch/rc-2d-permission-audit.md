# RC-2D Permission Audit

**Date:** 2026-07-29  
**Status:** Complete  

## Summary

| Area | Result |
|------|--------|
| Attendance period lifecycle | ✅ PASS — distinct permissions for lock, unlock, close, view |
| Attendance adjustments | ⚠️ PERM-1 — shares coarse `report` permission |
| Payroll lifecycle | ⚠️ PERM-2 — all actions use single `manage_periods` |
| Payroll view/data | ✅ PASS — self/all hierarchy exists |
| Operations/health | ✅ PASS — uses `report` (acceptable for RC) |
| Separation of duties | ⚠️ PERM-1 + PERM-2 |
| Blocking findings | **None** |

## Attendance Permissions

### Period Lifecycle — PASS

| Action | Handler | Permission | Verdict |
|--------|---------|-----------|---------|
| View status | `AttendancePeriodViewPolicyHandler` | `attendance:period:view` | ✅ Distinct |
| Lock | `AttendancePeriodLockPolicyHandler` | `attendance:period:lock` | ✅ Distinct |
| Unlock | `AttendancePeriodUnlockPolicyHandler` | `attendance:period:unlock` | ✅ Distinct |
| Close | `AttendancePeriodClosePolicyHandler` | `attendance:period:close` | ✅ Distinct |
| Reopen | `AttendancePeriodClosePolicyHandler` | `attendance:period:close` | ✅ Same as close (acceptable) |

### Adjustments / Reconciliation — PERM-1

| Action | Handler | Permission | Issue |
|--------|---------|-----------|-------|
| Create adjustment | `AttendancePolicies.report` | `attendance:report` | ⚠️ Same as reports |
| Approve adjustment | `AttendancePolicies.report` | `attendance:report` | ⚠️ Same — approve should be distinct |
| Reject adjustment | `AttendancePolicies.report` | `attendance:report` | ⚠️ Same |
| Apply adjustment | `AttendancePolicies.report` | `attendance:report` | ⚠️ Same |
| Run reconciliation | `AttendancePolicies.report` | `attendance:report` | ⚠️ Same |

This was identified in Sprint 0 as a granularity gap. Not an RC blocker — documented accepted debt.

## Payroll Permissions

### Lifecycle — PERM-2

| Action | Handler | Permission | Issue |
|--------|---------|-----------|-------|
| View runs | `PayrollPolicies.view` | `payroll:view:self/all` | ✅ Has hierarchy |
| Create run | `PayrollPolicies.managePeriods` | `payroll:manage_periods` | ⚠️ Shared |
| Generate | `PayrollPolicies.managePeriods` | `payroll:manage_periods` | ⚠️ Shared |
| Request approval | `PayrollPolicies.managePeriods` | `payroll:manage_periods` | ⚠️ Shared |
| Approve | `PayrollPolicies.managePeriods` | `payroll:manage_periods` | ⚠️ Should be distinct |
| Reject | `PayrollPolicies.managePeriods` | `payroll:manage_periods` | ⚠️ Should be distinct |
| Post | `PayrollPolicies.managePeriods` | `payroll:manage_periods` | ⚠️ Should be distinct |

All lifecycle actions on payroll runs use the same `managePeriods` policy. This means a user who can generate payroll can also approve and post it. No separation of duties.

## Separation of Duties Assessment

| Separation | Status | Risk |
|-----------|--------|------|
| Attendance period lock ≠ close | ✅ Separate | LOW |
| Attendance adjustment create ≠ approve | ❌ Same (`report`) | LOW — not yet in production |
| Payroll generate ≠ approve | ❌ Same (`manage_periods`) | MEDIUM — financial |
| Payroll approve ≠ post | ❌ Same (`manage_periods`) | MEDIUM — financial |

## Permission Registry Completeness

| Permission | Defined | In `attendance.ts` | In `payroll.ts` |
|-----------|---------|-------------------|-----------------|
| `attendance:period:view` | ✅ | ✅ | — |
| `attendance:period:lock` | ✅ | ✅ | — |
| `attendance:period:unlock` | ✅ | ✅ | — |
| `attendance:period:close` | ✅ | ✅ | — |
| `payroll:view:self` | ✅ | — | ✅ |
| `payroll:view:all` | ✅ | — | ✅ |
| `payroll:manage_periods` | ✅ | — | ✅ |
| `payroll:manage_payslips` | ✅ | — | ✅ |

Missing (identified in Sprint 0, not yet added):
- `attendance:correction:submit`
- `attendance:correction:approve`
- `attendance:correction:reject`
- `attendance:summary:override`
- `attendance:exception:resolve`

## Findings Summary

| ID | Finding | Severity | Recommendation |
|----|---------|----------|---------------|
| PERM-1 | Adjustment/reconciliation shares coarse `report` permission | LOW | Add distinct permission keys |
| PERM-2 | Payroll lifecycle actions share single `manage_periods` permission — no separation between generate, approve, reject, post | MEDIUM | Add `payroll:approve`, `payroll:post`, `payroll:reject` permissions + policy handlers |

## Finding Status

| Requirement | Status |
|------------|--------|
| Attendance permissions validated | ✅ PASS |
| Payroll permissions validated | ⚠️ PERM-2 |
| Lifecycle permissions validated | ⚠️ PERM-2 |
| Sensitive operations validated | ✅ PASS |
| Permission granularity documented | ✅ Documented |
| Privilege escalation paths | None found |
| Blocking findings | **None** |
