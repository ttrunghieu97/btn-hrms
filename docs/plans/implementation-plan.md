# Implementation Plan: Enterprise HRMS Vertical Slice Hardening & Verification (`btn-hrms`)

## Overview
This plan decomposes the remaining functional, RBAC/security, UX completeness, and unit test gaps identified during Phase 0 reconnaissance into six ordered, independently verifiable vertical slices (`VS-1` through `VS-6`).

## Architecture Decisions
- **ADR-001**: Enforce canonical `@project/permissions` constants, hierarchical `hasPermission()` resolution, and fail-closed self-scope isolation across all backend controllers and use-cases.
- **ADR-002**: Preserve fail-closed provisional payroll guards (`PD-04`) and align `DataTable` unit tests with the container-query responsive table contract introduced in `6df1b76`.

---

## Vertical Slice Breakdown

### Task VS-1: Frontend UI & Test Alignment (`DataTable` Spec & `/workspace/hr` Live Dashboard)
**Description:** Remediate the `Selector / Contract Drift` in `data-table.spec.tsx` to verify both `[data-slot="table-container"]` (`w-max min-w-full`), default `<table role="table">` (`w-full min-w-full`), and active column-sizing (`table-fixed`), and replace the hardcoded placeholder screen in `/workspace/hr/page.tsx` with live HRMS data queries (`useDashboardStats`, `useEmployees`, `useContracts`, `useOnboardingWorkflows`, `useOffboardingProcesses`) covering loading, empty, error, permission-denied, and happy-path interactive states.
- **Acceptance Criteria:**
  - [ ] `apps/web/src/components/ui/table/data-table.spec.tsx` verifies container intrinsic width (`w-max`), default table width (`w-full`), column resizing (`table-fixed`), and keyboard row activation.
  - [ ] `apps/web/src/app/(protected)/workspace/hr/page.tsx` fetches real backend data with zero hardcoded fake metrics, and supports interactive navigation to `/employees`, `/contracts`, `/onboarding`, `/offboarding`, and `/approvals`.
  - [ ] Component test `apps/web/src/app/(protected)/workspace/hr/page.spec.tsx` verifies loading, error, empty, and populated states.
- **Verification:** `pnpm --filter frontend test && pnpm check`
- **Dependencies:** None
- **Estimated Scope:** Medium (3–4 files)

### Task VS-2: Platform Notifications RBAC Contract & Frontend Tab Gating
**Description:** Align `PlatformNotificationsController` permission decorators with `@project/permissions` (`Permissions.NOTIFICATIONS_MANAGE_ALL` and `Permissions.NOTIFICATIONS_VIEW_SELF`), gate the Templates management tab in `NotificationsPage` by `notifications:manage:all`, and add unit tests.
- **Acceptance Criteria:**
  - [ ] `PlatformNotificationsController` uses `Permissions.NOTIFICATIONS_MANAGE_ALL` (`"notifications:manage:all"`) for template/send endpoints and `Permissions.NOTIFICATIONS_VIEW_SELF` (`"notifications:view:self"`) for user preference endpoints.
  - [ ] `NotificationsPage` only renders the `"templates"` tab and content when the user has `notifications:manage:all` (or `sys:all`).
  - [ ] Unit tests verify both backend controller permissions and frontend tab visibility.
- **Verification:** `pnpm --filter @project/api test platform-notifications && pnpm --filter frontend test notifications && pnpm check`
- **Dependencies:** VS-1
- **Estimated Scope:** Small (3–4 files)

### Task VS-3: Schedule Requests & Attendance Analytics RBAC / Scope Enforcement
**Description:** Fix `ScheduleRequestsController` and `ScheduleRequestAuthorizationService` to replace the invalid `"schedule:manage"` check with canonical `@project/permissions` (`schedule:view:all`, `schedule:edit:all`, `schedule:view:department`, `schedule:view:self`) and fail closed when a self-scoped user has no `employeeId`. Update `DashboardController.getAttendanceStats` / `GetAttendanceStatsUseCase` to prevent `attendance:view:self` from leaking company-wide metrics, and add unit tests for `ScheduleRequestsController`, `GetAttendanceStatsUseCase`, and `ExplainAttendanceExceptionUseCase`.
- **Acceptance Criteria:**
  - [ ] HR/Admin (`sys:all`, `schedule:view:all`, `schedule:edit:all`) can list and filter all schedule requests; self-scoped users (`schedule:view:self`) are restricted to `req.user.employeeId` and receive `403 Forbidden` if `employeeId` is missing.
  - [ ] `GET /dashboard/attendance-stats` requires `attendance:report`, `attendance:view:all`, or `attendance:view:department` (with department scoping when only `attendance:view:department` is held), rejecting `attendance:view:self` with `403 Forbidden`.
  - [ ] Unit tests cover `ScheduleRequestsController`, `GetAttendanceStatsUseCase`, and `ExplainAttendanceExceptionUseCase`.
- **Verification:** `pnpm --filter @project/api test schedule-requests|get-attendance-stats|explain-attendance-exception && pnpm check`
- **Dependencies:** VS-2
- **Estimated Scope:** Medium (4–6 files)

### Task VS-4: Performance Module Scope Isolation & Permission Seed Synchronization
**Description:** Harden `PerformanceController` and performance use-cases (`ListGoalsUseCase`, `ListReviewsUseCase`, `CreateGoalUseCase`, `UpdateGoalProgressUseCase`) so non-managers (`!hasPermission(user, Permissions.PERFORMANCE_MANAGE)`) are strictly isolated to their own `employeeId`. Update `apps/api/src/infrastructure/database/seed.ts` to derive its permission catalog from `@project/permissions` (`ALL_PERMISSIONS`) so all 27 domain modules are seeded.
- **Acceptance Criteria:**
  - [ ] Non-managers calling performance goal/review endpoints cannot view or mutate another employee's goals or reviews (`403 Forbidden` or forced self-scope).
  - [ ] `seed.ts` includes all permissions from `@project/permissions` without duplicates or missing modules.
  - [ ] Unit tests verify performance scope isolation and seed permission completeness.
- **Verification:** `pnpm --filter @project/api test performance|seed && pnpm check`
- **Dependencies:** VS-3
- **Estimated Scope:** Medium (4–5 files)

### Task VS-5: Workforce Lifecycle & Task Templates Unit Test Suite
**Description:** Write comprehensive Jest unit test suites for recently added workforce lifecycle and task-template use-cases and jobs (`EvaluateProbationUseCase`, `ExecuteScheduledTransfersUseCase`, `TransferSchedulerJob`, `SubmitResignationRequestUseCase`, `UpdateMyProfileUseCase`, `ScheduleTerminationUseCase`, `CancelScheduledTerminationUseCase`, `ExecuteScheduledTerminationsUseCase`, employee education use-cases, and `task-templates` use-cases).
- **Acceptance Criteria:**
  - [ ] All target use-cases and cron jobs have deterministic `.spec.ts` unit tests covering happy paths, validation errors, conflict/state-machine guards, and permission/scope boundaries.
  - [ ] All backend tests (`pnpm test:api`) pass.
- **Verification:** `pnpm test:api && pnpm check`
- **Dependencies:** VS-4
- **Estimated Scope:** Medium (6–7 test files)

### Task VS-6: Phase 5 AppSec Audit, Phase 6 Completeness Review, Phase 7 Runbooks & Full Milestone Gate (`pnpm check:all`)
**Description:** Execute the 4-step Enterprise AppSec & Quality Audit (`docs/security/threat-model-and-appsec-audit.md`), compile the verification & coverage report (`docs/testing/verification-and-coverage-report.md`), write operational deployment/migration/backup runbooks (`docs/runbooks/deployment-migration-and-recovery.md`), and pass `pnpm check:all`.
- **Acceptance Criteria:**
  - [ ] Governance artifacts in `docs/security/`, `docs/testing/`, and `docs/runbooks/` are complete and accurate.
  - [ ] `pnpm check:all` exits with `0` (lint, arch:check, typecheck, depcruise, authorization:check, client:verify, security:check-tracked-secrets, deployment:check-env, test:api, test:web, build).
- **Verification:** `pnpm check:all`
- **Dependencies:** VS-1..VS-5
- **Estimated Scope:** Medium (4–5 doc files + full verification)

---

## Checkpoints
- **Checkpoint 1 (After VS-1 & VS-2)**: Frontend test suite (`pnpm test:web`) is 100% green and notification RBAC is verified end-to-end.
- **Checkpoint 2 (After VS-3 & VS-4)**: All RBAC, IDOR, and scope isolation findings across Scheduling, Dashboard, Performance, and DB Seed are remediated and tested.
- **Checkpoint 3 (After VS-5 & VS-6)**: All unit/integration suites and `pnpm check:all` pass with zero errors.
