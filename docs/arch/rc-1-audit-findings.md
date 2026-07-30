# RC-1 Architecture Freeze — Audit Findings

**Date:** 2026-07-29  
**Status:** Open  
**Next:** RC-2 Production Readiness Audit  

## RC-1 Exit Checklist

| Requirement | Status |
|------------|--------|
| A. Contract Audit | ✅ Complete — no duplicate contracts |
| B. Dependency Audit | ✅ Complete — V1 documented, V2 fixed |
| C. Freeze Policy | ✅ Complete — `docs/arch/rc-freeze-policy.md` |
| D. Documentation Sync | ⏸️ Not started |
| E. Regression Validation | ⏸️ Not started |

## Violations Found

### V1 — Attendance reads `payrollItems` table directly

**File:** `attendance-timekeeping.repository.ts:130-141`  
**Method:** `findPayrollItemsForEmployees()`  
**Used by:** `PayrollReconciliationService.computeComparison()`  
**Domain:** Attendance → Payroll (direct `schema.payrollItems` access)  

**Violates:** Rule #6 (cross-domain via published contracts only)  
**Severity:** MEDIUM — reconciliation is read-only, but bypasses contract boundary  

**Fix:** Move to a contract port (`IPayrollResultReader`). Current: direct DB query in attendance repo. Target: Payroll exposes port, attendance consumes it.

### V2 — Payroll queries `attendanceDailySummaries` table directly (dead code)

**File:** `payroll-runs.repository.ts:65-87`  
**Method:** `getAttendanceSummariesByEmployee()`  
**Domain:** Payroll → Attendance (direct `schema.attendanceDailySummaries` access)  

**Violates:** Rule #6  
**Severity:** LOW — method is dead (defined but not called; `GeneratePayrollRunUseCase` uses `AttendanceReadPort` instead)  

**Fix:** Delete dead method.

## RC-1 Freeze Compliance

| Invariant | Status |
|-----------|--------|
| One attendance truth | ✅ PASS — `EffectiveAttendanceSummary` is single authority |
| One payroll publication path | ✅ PASS — snapshot + version only |
| Financial history immutable | ✅ PASS — posted runs are terminal |
| Approval boundary preserved | ✅ PASS — approve ≠ post |
| Cross-domain ports preserved | ⚠️ **2 violations found** (V1, V2) |
| Facts-only events | ✅ PASS — no command events |
| No duplicate calculation paths | ✅ PASS — Path-B killed in Sprint 1 |

## Remediation Plan

1. Delete `getAttendanceSummariesByEmployee()` from `payroll-runs.repository.ts` (V2 — dead code, safe delete)
2. Move `findPayrollItemsForEmployees()` to a contract port — requires: new port interface, payroll adapter, wire in ContractsModule (V1 — effort ~1 day)

Both are RC-1 actionable without breaking architectural invariants.
