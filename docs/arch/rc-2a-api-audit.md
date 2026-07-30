# RC-2A API Audit

**Date:** 2026-07-29  
**Status:** Complete  

## Summary

| Area | Result |
|------|--------|
| Attendance query APIs | ✅ PASS |
| Attendance command APIs | ✅ PASS |
| Timekeeping lifecycle APIs | ⚠️ PASS WITH WARNINGS |
| Payroll run APIs | ⚠️ PASS WITH WARNINGS |
| Controllers audited | 5 (attendance-command, attendance-query, timekeeping, payroll-runs, payroll) |

## Findings

### API-1 — Payroll approve/reject/post lack idempotency

**Location:** `payroll-runs.controller.ts`  
**Endpoints:** `POST :id/approve`, `POST :id/reject`, `POST :id/post`  
**Issue:** No `@Idempotent()` decorator. Duplicate POST requests could trigger duplicate state transitions.

**Risk:** LOW — state machine guard (`assertTransition`) rejects invalid transitions. Duplicate approve after already approved fails at the state machine level. However, duplicate event publication could occur (two `PayrollApprovedEvent` for the same approval).

**Recommendation:** Add `@Idempotent()` to lifecycle endpoints, or accept the state machine as sufficient guard. Risk is bounded because the state machine validates transitions.

### API-2 — Payroll lifecycle authorization uses single permission

**Location:** `payroll-runs.controller.ts`  
**Endpoints:** All lifecycle endpoints use `@CheckPolicy(PayrollPolicies.managePeriods)`  
**Issue:** No separation between approve, reject, post, and request-approval. A user with `managePeriods` can perform all lifecycle operations.

**Risk:** LOW — operational concern, not architectural invariant. Separation of duties is a deployment configuration issue.

**Recommendation:** Introduce granular permissions (`approve`, `post`, `reject`) if separation of duties is required. Acceptable for RC.

### API-3 — Attendance adjustment/reconciliation reuse coarse `report` permission

**Location:** `timekeeping.controller.ts`  
**Endpoints:** Adjustments (create/approve/reject/apply), reconciliation (run/list)  
**Issue:** All use `@CheckPolicy(AttendancePolicies.report)`. This was identified in Sprint 0 as a granularity gap.

**Risk:** LOW — documented accepted debt from Sprint 0.

**Recommendation:** Deferred — requires permission key addition (sprint item, not RC blocker).

### API-4 — Reject endpoint uses inline DTO type

**Location:** `payroll-runs.controller.ts:139`  
**Code:** `@Body() body: { reason: string }`  
**Issue:** Uses an inline anonymous type instead of a dedicated DTO class. No `@ApiProperty()` decorator means Swagger documentation is incomplete for this endpoint.

**Risk:** LOW — functionally correct, documentation gap only.

**Recommendation:** Extract to a dedicated `RejectPayrollRunDto` class.

### API-5 — Response envelope inconsistency

**Location:** Multiple controllers  
**Issue:** Some endpoints return `{ data: ... }` envelope, others return the use-case result directly (e.g., payroll runs return `PayrollRunEnvelopeDto` which wraps the data, but `toPeriodLockResponse` returns a plain DTO).

**Risk:** LOW — API consumers receive consistent response shapes per resource.

### API-6 — Idempotency coverage on clock events

**Location:** `attendance-command.controller.ts:39`, `timekeeping.controller.ts:70`  
**Endpoints:** `POST /check`, `POST /clock-events`  
**Issue:** `POST /attendances/check` has `@Idempotent("POST:/attendances/check")`. `POST /clock-events` has `@Idempotent("POST:/clock-events")`. But `POST /attendances/check-in` and `POST /attendances/check-out` (aliases) do NOT have idempotency.

**Risk:** LOW — these are convenience aliases for mobile clients.

## PASS Items

| Item | Status |
|------|--------|
| DTO validation decorators (`@IsUUID`, `@Matches`, `@IsIn`) | ✅ Consistent |
| Authorization on every non-public endpoint | ✅ Enforced |
| `@ApiBearerAuth()` on all controllers | ✅ Present |
| Swagger operation summaries on all endpoints | ✅ Present |
| Audit logging on mutation endpoints | ✅ Present |
| Pagination DTOs use shared `PagedQueryDto` | ✅ Consistent |
| Payroll generation inside transaction | ✅ Verified (RC-2B) |
| Period lifecycle use `UnlockPeriodDto` consistently | ✅ Consistent |

## RC-2A Summary

| Requirement | Status |
|------------|--------|
| Attendance API audit | ✅ PASS |
| Payroll API audit | ✅ PASS WITH WARNINGS |
| Authorization behavior documented | ✅ Documented (API-2, API-3) |
| DTO contracts validated | ✅ PASS (API-4 minor) |
| Lifecycle error contracts validated | ✅ State machine guards verified |
| Idempotency behavior documented | ✅ Documented (API-1, API-6) |
| Blocking API findings | **None** |
