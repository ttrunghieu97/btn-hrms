# Enterprise Threat Model & AppSec Hardening Audit (`btn-hrms`)

## 1. Executive Summary

This document records the Phase 5 Enterprise Security & Application Security (AppSec) audit across the `btn-hrms` monorepo (`apps/api`, `apps/web`, and `packages/permissions`). Every authentication, authorization, data protection, input validation, and operational boundary has been audited and verified with automated tests and static gates (`pnpm security:check-tracked-secrets`, `pnpm --filter @project/api arch:check`, and `pnpm --filter frontend authorization:check`).

---

## 2. STRIDE Threat Model & HRMS Attack Surface

| Threat Category | HRMS Asset / Boundary | Threat Scenario | Implemented Control & Code Evidence | Verification Status |
| :--- | :--- | :--- | :--- | :---: |
| **Spoofing** | Authentication (`apps/api/src/modules/iam/auth`) | Credential stuffing, token replay, or refresh token theft | Short-lived JWT access tokens + rotating refresh tokens, bcrypt (cost 12) password hashing, MFA enforcement support (`AUTH_MFA_REQUIRED`), account lock/deactivation on employee termination (`IdentityAdminPort.deactivateUser`). | `PASS` |
| **Tampering** | Mutating HRMS Workflows (`payroll`, `attendance`, `leave`, `approvals`, `workforce`) | Unauthorized state transition, double submission, or parameter tampering | Strict DTO validation (`ValidationPipe` with `whitelist: true`), workflow state machine guards, idempotency locks (`IDEMPOTENCY_CONFLICT`), and period lock enforcement (`attendance_period_locks`, `payroll_periods`). | `PASS` |
| **Repudiation** | Sensitive HR/Payroll Actions | Unattributed salary modification, role change, or termination | `@AuditLog()` interceptor + `audit_logs` table recording `actorUserId`, `action`, `entity`, `entityId`, `before`/`after` snapshots, `ipAddress`, and `traceId` via `RequestContextService`. | `PASS` |
| **Information Disclosure** | Employee PII & Compensation (`employees`, `payroll`, `performance`, `schedule-requests`, `analytics`) | Horizontal/Vertical IDOR (viewing another employee's payslip, schedule request, goals/reviews, or company analytics) | Centralized `@project/permissions` hierarchy + `QueryScopeService` (`all` / `department` / `self`), AES-256-GCM field encryption (`EncryptionService`) for `nationalId`, `taxCode`, `bankAccountNumber`, and masked response mappers (`••••••••`). | `PASS` |
| **Denial of Service** | Public & Authenticated APIs, BullMQ Workers | Unbounded queries, brute-force login, or stuck background jobs | Global rate limiting (`RATE_LIMITED`), bounded pagination (`page`, `limit`), and BullMQ retry/backoff + per-instance error isolation in scheduled jobs (`ExecuteScheduledTransfersUseCase`, `ExecuteScheduledTerminationsUseCase`). | `PASS` |
| **Elevation of Privilege** | RBAC / ABAC Policy Engine & Self-Approvals | Approving own leave/schedule request, or accessing admin routes without permission | Self-approval prohibition (`LEAVE_SELF_APPROVAL_FORBIDDEN`, `APPROVAL_SELF_APPROVAL_FORBIDDEN`), Next.js route authorization middleware (`85/85` pages covered), and controller-level `@RequirePermission` / `@CheckPolicy`. | `PASS` |

---

## 3. Phase 5 AppSec Remediations Landed in This Execution

1. **Platform Notifications Privilege Escalation & Broken Self-Service Fix (`VS-2`)**:
   - **Finding**: `PlatformNotificationsController` referenced non-existent permission strings `"manage:platform"` and `"notifications:preferences:*:self"`. Furthermore, `NotificationsPage` rendered the administrative `"templates"` (`Mẫu thông báo`) tab to all users regardless of permission.
   - **Remediation**: Bound template management endpoints to `Permissions.NOTIFICATIONS_MANAGE_PLATFORM` (`"notifications:manage:all"`), bound self-service notification preferences to `Permissions.NOTIFICATIONS_VIEW_SELF` (`"notifications:view:self"`), and gated the frontend `"templates"` tab behind `hasPermission(user, "notifications:manage:all")`.
   - **Verification**: `platform-notifications.controller.spec.ts` & `notifications-page.spec.tsx`.

2. **Schedule Requests Horizontal IDOR & Self-Approval Prevention (`VS-3`)**:
   - **Finding**: `ScheduleRequestsController.list` checked `req.user.permissions?.includes("schedule:manage")` (a non-existent permission code) and did not fail closed if a self-scoped user lacked an `employeeId`. `ScheduleRequestAuthorizationService.canReview` did not explicitly block self-approval.
   - **Remediation**: Replaced `"schedule:manage"` with `hasPermission(..., Permissions.SCHEDULE_VIEW_ALL) || hasPermission(..., Permissions.SCHEDULE_EDIT_ALL)`, enforced fail-closed `403 Forbidden` when a self-scoped caller lacks `employeeId`, and blocked self-approval (`APPROVAL_SELF_APPROVAL_FORBIDDEN`) in `ScheduleRequestAuthorizationService.canReview`.
   - **Verification**: `schedule-requests.controller.spec.ts`.

3. **Attendance Analytics Scope Enforcement (`VS-3`)**:
   - **Finding**: `DashboardController.getAttendanceStats` (`GET /dashboard/attendance-stats`) was guarded by `AttendancePolicies.view` (which permits `attendance:view:self` for list endpoints) and returned company-wide headcounts and department attendance rates without checking caller scope.
   - **Remediation**: Passed `@Req() req` into `GetAttendanceStatsUseCase.execute(month, req?.user)`, rejecting callers who only hold `attendance:view:self` with `403 Forbidden` and scoping `departmentRates` to `user.departmentId` when the caller only holds department-level attendance visibility.
   - **Verification**: `get-attendance-stats.usecase.spec.ts`.

4. **Performance Management Self-Scope Isolation & Seed Synchronization (`VS-4`)**:
   - **Finding**: `PerformanceController.listGoalsEndpoint` and `PerformanceController.reviewSummaryEndpoint` returned all cycle goals and cycle review counts to any user with `performance:view`. Additionally, `seed.ts` was missing newer permission codes from `@project/permissions`.
   - **Remediation**: Updated `ListGoalsUseCase` and `ListReviewsUseCase` to filter goals and review summaries to `user.employeeId` when the caller lacks `Permissions.PERFORMANCE_MANAGE` (failing closed with `403 Forbidden` if `user.employeeId` is missing), enforced `req.user.employeeId` on `submitGoalEndpoint` and `submitReviewEndpoint`, and synchronized `PERMISSIONS` and `SYSTEM_ROLES` in `seed.ts` with `@project/permissions`.
   - **Verification**: `performance.controller.spec.ts` & `seed.spec.ts`.

5. **Provisional Payroll Fail-Closed Financial Guardrails (`ADR-002` / `PD-04`)**:
   - **Control**: Until Vietnamese statutory Personal Income Tax (PIT) and compulsory Social Insurance (`BHXH`/`BHYT`/`BHTN`) tables are formally ratified by legal/finance, all calculated payroll runs carry `isProvisional: true` and `calculationStatus: "PROVISIONAL_POLICY_UNCONFIRMED"`. Downstream financial mutations (`approve`, `publish`, `close`, `exportBankFile`) fail closed with `409 Conflict`.

---

## 4. Automated Security Gate Verification

| Security Gate | Command | Result |
| :--- | :--- | :---: |
| Tracked Secrets Scan | `pnpm security:check-tracked-secrets` | `PASS` (0 secrets) |
| Deployment Environment Contract | `pnpm deployment:check-env --mode=example` | `PASS` |
| Frontend Route Authorization Coverage | `pnpm --filter frontend authorization:check` | `PASS` (85/85 pages covered) |
| Backend Architecture & Boundary Isolation | `pnpm --filter @project/api arch:check` | `PASS` (6/6 checks) |
| Error Contract Manifest Integrity | `pnpm error-contracts:verify` | `PASS` |
