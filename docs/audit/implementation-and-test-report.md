# HRMS Implementation, Standardization & Verification Report

## 1. Executive Summary

This report documents the end-to-end **Backend Domain Readiness Verification, Employee Lifecycle Standardization, and Backend-Driven Frontend Alignment** executed across the `@project/api`, `@project/permissions`, and `frontend` (`apps/web`) workspaces.

Every conclusion and code change is grounded in source code, Drizzle schemas, API contracts, and automated test execution, adhering to the architectural boundaries enforced by `AGENTS.md` and `pnpm --filter @project/api arch:check`.

---

## 2. Deliverable Matrix (All 10 Required Audit, Architecture & Release Artifacts)

| # | Deliverable Path | Purpose & Status |
|---|---|---|
| 1 | `docs/audit/repository-architecture.md` | Monorepo topology, NestJS 11 + Drizzle ORM + Next.js 16 architecture, RBAC/ABAC security pipeline, and quality gates (**Verified**). |
| 2 | `docs/audit/backend-domain-audit.md` | Evidence-based audit across all 22 backend domain modules with classification (`CONFIRMED_BUG`, `AUTHORIZATION_RISK`, `DATA_INTEGRITY_RISK`, `CONTRACT_MISMATCH`, `INCOMPLETE_IMPLEMENTATION`, `PRODUCT_DECISION_REQUIRED`, `TEST_GAP`) and P0–P3 severity (**Verified**). |
| 3 | `docs/audit/employee-lifecycle-audit.md` | Deep-dive audit of the 6 independent state dimensions of Employee Core & Lifecycle (`Candidate -> Offer -> Hire -> Onboarding -> Probation -> Confirmation -> Transfer -> Leave/Suspension -> Termination -> Offboarding -> Archive -> Restore/Rehire -> Purge`) and `ELC-01..ELC-16` remediations (**Verified**). |
| 4 | `docs/audit/employee-lifecycle-state-transitions.md` | Formal state transition tables, guards, actors, side effects, and domain events for every lifecycle dimension (**Verified**). |
| 5 | `docs/audit/backend-readiness-matrix.md` | Domain-by-domain readiness matrix (`VERIFIED`, `PARTIAL`, `BLOCKED`) and detailed analysis of open Product Owner decisions `PD-01` through `PD-04` (**Verified**). |
| 6 | `docs/architecture/hrms-domain-map.md` | Bounded contexts, aggregate roots, cross-module ports/adapters (`CONTRACTS_TOKENS`), and Outbox event flows (**Verified**). |
| 7 | `docs/architecture/backend-frontend-contracts.md` | Canonical API envelope, pagination contract, RBAC permission alignment, and DTO/OpenAPI contract mappings between `@project/api` and `apps/web` (**Verified**). |
| 8 | `docs/audit/frontend-completion-matrix.md` | Domain-by-domain Frontend completion matrix, permission/scope verification, and 10-journey test classification across unit, component, API integration, and real Chromium browser E2E suites (**Verified**). |
| 9 | `docs/audit/production-release-checklist.md` | Production release operations runbook, `PD-01`..`PD-04` sign-off gates, pre-migration backup/restore procedures, secret/env checks, and post-deploy smoke tests (**Verified**). |
| 10 | `docs/audit/implementation-and-test-report.md` | This implementation, verification, and quality-gate closure report (**Verified**). |

---

## 3. Independently Verified Backend & Shared Package Remediations (`ELC-01` to `ELC-14`)

### 3.1. RBAC & ABAC Authorization (`@project/permissions` & `apps/api/src/core/security`)

1. **`ELC-01` (P1 `AUTHORIZATION_RISK` / `CONTRACT_MISMATCH`) — Shared & Backend Permission Hierarchy Alignment**
   - **Root Cause**: `packages/permissions/src/hierarchy/hierarchy.ts` and `apps/api/src/core/security/permissions/permissions.registry.ts` lacked complete `employee:*` and `offboarding:edit` upward hierarchy edges.
   - **Fix**: Added `employee:manage -> [employee:view:all, employee:view, employee:create, employee:edit, employee:delete, employee:reset-password]`, `employee:edit -> [employee:view, employee:create]`, `employee:delete -> [employee:view]`, `employee:view:all -> employee:view:department -> employee:view:self`, `employee:manage:sensitive -> [employee:view:sensitive]`, and `offboarding:edit -> [offboarding:view, offboarding:clearance:*, offboarding:exit-interview, offboarding:complete]`.

2. **`ELC-02` (P0 `AUTHORIZATION_RISK` / `CONFIRMED_BUG`) — Department Scope Resolution in ABAC Guards**
   - **Root Cause**: `SecurityRepository` (`apps/api/src/infrastructure/security/security.repository.ts`) and `ResourceLoaderRepository` (`apps/api/src/infrastructure/security/resource-loader.repository.ts`) read `employees.departmentId`, while `CreateEmployeeUseCase` and `ApplyTransferUseCase` only wrote `departmentId` to `org_assignments`.
   - **Fix**:
     - Added `LEFT JOIN org_assignments (is_current = true, assignment_type = 'primary')` fallback (`row.departmentId ?? row.orgDepartmentId ?? null`) in both `SecurityRepository` and `ResourceLoaderRepository`.
     - Updated `CreateEmployeeUseCase`, `UpdateEmployeeUseCase`, `ApplyTransferUseCase`, and `EmployeeLifecycleService.rehire` to keep `employees.departmentId`, `currentEmploymentRecordId`, and `currentOrgAssignmentId` synchronized within the same database transaction.

3. **`ELC-13` (P0 `AUTHORIZATION_RISK` / `CONTRACT_MISMATCH`) — Singular `employee:*` vs Plural `employees:*` Permission Normalization**
   - **Root Cause**: `EmployeePolicies` checked singular `employee:*` (`PermissionRegistry.employee.*`), whereas `QueryScopeService.resolveScope(req.user, "employees")` checked plural `employees:view:*`, and `seed.ts` / `seed-roles.ts` / `PermissionCatalogProvider.tsx` used plural `employees:*`. Non-superadmin users with only one form failed either `EmployeePolicies.view` or `QueryScopeService.resolveScope`.
   - **Fix**: Added bidirectional `employee:* <-> employees:*` alias expansion in `PermissionHierarchyResolver.expand()` (`apps/api/src/core/security/permissions/permission-hierarchy.resolver.ts`), `EmployeePolicies` (`apps/api/src/core/security/policies/employee.policy.ts`), `PresignedUploadUseCase` (`apps/api/src/modules/storage/use-cases/presigned-upload.usecase.ts`), and `PermissionCatalogProvider.tsx` (`apps/web/src/features/permissions/PermissionCatalogProvider.tsx`).

### 3.2. Employee Core & Lifecycle Invariants (`apps/api/src/modules/workforce/employees`)

4. **`ELC-03` (P0 `CONFIRMED_BUG`) — Foreign Key Violation on Employee Purge & Creation Rollback**
   - **Root Cause**: `employee_contracts.employee_id` and `employees.user_id` use `ON DELETE RESTRICT`. `IdentityAdminAdapter.deleteUser` deleted `users` before `employees`/`employee_contracts`, and `EmployeeWriteRepository.hardDeleteEmployee` deleted `employees` before `employee_contracts`.
   - **Fix**: Updated `IdentityAdminAdapter.deleteUser` (`apps/api/src/contracts/adapters/identity-admin.adapter.ts`) and `EmployeeWriteRepository.hardDeleteEmployee` (`apps/api/src/modules/workforce/employees/repositories/employee-write.repository.ts`) to delete `employee_contracts` -> `employees` -> `users` in a transaction.

5. **`ELC-04` (P1 `DATA_INTEGRITY_RISK`) — Unvalidated Status Mutation via `PUT /api/v1/employees/:id`**
   - **Root Cause**: `UpdateEmployeeUseCase` allowed arbitrary `status` updates on `employees` without checking `EMPLOYEE_STATUS_TRANSITIONS` (`assertStatusTransition`).
   - **Fix**: Extended `EmployeeReadRepository.findEmployeeUserContextByIdentifier` to load `status` and `deletedAt`, and enforced `assertStatusTransition(currentStatus, status)` inside `UpdateEmployeeUseCase` (`apps/api/src/modules/workforce/employees/use-cases/update-employee.usecase.ts`).

6. **`ELC-05` (P0 `CONFIRMED_BUG`) — Future-Dated Transfer HR Approval Always Failed with 400**
   - **Root Cause**: `ApproveTransferUseCase` (`stage === "hr"`) marked the workflow instance `status = "completed"` and unconditionally called `ApplyTransferUseCase.execute(instanceId)` with `skipFutureCheck = false`, which threw `400 Bad Request` whenever `effectiveDate > today`.
   - **Fix**: Updated `ApproveTransferUseCase` (`apps/api/src/modules/workforce/employees/use-cases/approve-transfer.usecase.ts`) so that when `effectiveDate > today`, the workflow transitions to `currentState = "approved"` with `status = "active"`, and only auto-applies immediately when `effectiveDate <= today`.

7. **`ELC-06` (P1 `CONFIRMED_BUG` / `DATA_INTEGRITY_RISK`) — `ApplyTransferUseCase` State Guard, Employee Binding & Denormalized Sync**
   - **Root Cause**: `if (instance.currentState !== "approved" && instance.status !== "active")` used `&&` instead of `||`; `ApplyTransferUseCase` did not verify `:id === instance.subjectId`; hardcoded `"working"` status in `employee_status_history`; did not update `employees.departmentId` or `currentOrgAssignmentId`.
   - **Fix**: Fixed the state guard in `ApplyTransferUseCase` (`apps/api/src/modules/workforce/employees/use-cases/apply-transfer.usecase.ts`), enforced `expectedEmployeeId === instance.subjectId`, updated `employees.departmentId` and `currentOrgAssignmentId`, and recorded the employee's actual status in `employee_status_history`.

8. **`ELC-07` & `ELC-08` (P1 `DATA_INTEGRITY_RISK`) — Transfer Request Validation & Cancel Event Outbox**
   - **Root Cause**: `RequestTransferUseCase` did not pass `managerEmployeeId` to `assertOrgRefsAreValid` and allowed duplicate active transfer workflows; `CancelTransferUseCase` did not check `instance.status === "active"` or stage `EmployeeTransferCancelledEvent`.
   - **Fix**: Updated `RequestTransferUseCase` (`apps/api/src/modules/workforce/employees/use-cases/request-transfer.usecase.ts`) to validate `managerEmployeeId` and throw `409 Conflict` if an active transfer workflow already exists; updated `CancelTransferUseCase` (`apps/api/src/modules/workforce/employees/use-cases/cancel-transfer.usecase.ts`) to guard `instance.status === "active"` and stage `EmployeeTransferCancelledEvent`.

9. **`ELC-09` & `ELC-10` (P1 `CONFIRMED_BUG` / `DATA_INTEGRITY_RISK`) — Termination Slice Closure & Contract Version Monotonicity on Rehire**
   - **Root Cause**: `EmployeeLifecycleService.executeImmediateTermination` left `employment_records.isCurrent = true` and `org_assignments.isCurrent = true`; `EmployeeLifecycleService.rehire` and `EmployeeContractsRepository.create`/`amend` defaulted to `version: 1` when no `isCurrent = true` contract existed, violating `uq_employee_contracts_employee_version (employee_id, version)`.
   - **Fix**: Updated `EmployeeLifecycleService.executeImmediateTermination` (`apps/api/src/modules/workforce/employees/services/employee-lifecycle.service.ts`) to close active `employment_records` and `org_assignments` and clear pointer IDs; updated `EmployeeLifecycleService.rehire` and `EmployeeContractsRepository` (`apps/api/src/modules/workforce/employee-contracts/repositories/employee-contracts.repository.ts`) to compute `MAX(version) + 1` per employee.

10. **`ELC-11`, `ELC-12`, `ELC-14`, `ELC-15` & `ELC-16` — Typed DTOs, Workflow Scope Isolation, Out-of-Scope Protection & Archive File Restoration**
    - Added `@IsOptional()` to `TerminateEmployeeDto.lastWorkingDate`, replaced all `@Body() dto: any` with typed DTOs in `EmployeeAdminController`, removed unused `RestoreEmployeeUseCase` injection and dead `HireEmployeeUseCase`.
    - Added `storage.restoreOwnerFiles("employee", emp.id)` in `RestoreArchivedEmployeeUseCase` and `RehireEmployeeUseCase` (when unarchiving a deleted terminated employee).
    - **`ELC-15` (`WorkflowInstanceController` Scope & `subjectType` Isolation)**: Enforced `WorkflowPolicies.viewInstances.handle(user)` (requiring `workflow-instances:view`, `employee:edit`, `employee:update:all`, `employee:manage`, `employee:manage:sensitive`, or `approval:requests:decide`; denying read-only `employee:view*`) plus employee visibility scope (`EmployeePolicies.view.handle(user, empContext)`) and restricted `subjectType` to `["employee", "employee_transfer"]` in `ListWorkflowInstancesUseCase` and `GetWorkflowInstanceUseCase`.
    - **`ELC-16` (Out-of-Scope Employee Protection Across Controllers & QueryScopeService)**:
      - Added `EmployeePolicies.viewAll` and applied it to `LaborReportController` (`GET /api/v1/reports/labor-usage`, `GET /api/v1/reports/labor-usage/docx`) and `EmployeeAdminController` (`check-code`, `check-username`).
      - Added `EmployeePolicies.approveTransfer` and `@Resource(Employee, "id")` across all transfer endpoints (`manager-approve`, `hr-approve`, `reject`, `apply`, `cancel`).
      - Enforced 4-tier scope resolution (`all` -> `department` -> `self` -> unscoped fallback) in `QueryScopeService.resolveScope`, `EmployeePolicies.view`, `EmployeePolicies.edit`, and `EmployeePolicies.approveTransfer` so department-scoped (`employee:view:department`) and self-scoped (`employee:view:self`) users holding `employee:edit` cannot escape their authorized boundaries.
      - Enforced `DataScope` in `DepartmentEmployeesController`, `ContractsController` (`ListContractsUseCase`, `GetContractUseCase`, `GetContractHistoryUseCase`, `ContractQueryRepository`), and `DocumentsController` (`ListDocumentsUseCase`, `GetDocumentUseCase`, `DocumentQueryRepository`).

### 3.3. Final Security, Permission-Semantics, Status-Contract & Payroll-Safety Acceptance Fixes

11. **`SEC-01` (P0 `AUTHORIZATION_RISK`) — Prevent `employee:edit` from Implying `employee:update:all`**
    - **Root Cause**: `packages/permissions/src/hierarchy/hierarchy.ts` had `'employee:update:all': ['employee:update:all', 'employee:edit', 'employee:manage']`, causing any user with `employee:edit` (e.g., a department editor) to inherit `employee:update:all`.
    - **Fix**: Removed `'employee:edit'` from `'employee:update:all'` (`'employee:update:all': ['employee:update:all', 'employee:manage']`) while preserving `'employee:edit'` in `'employee:update:self'`, `'employee:view'`, and `'employee:create'`. Added explicit directional edges `EMPLOYEES_MANAGE -> EMPLOYEES_UPDATE_ALL -> EMPLOYEES_EDIT -> EMPLOYEES_UPDATE_SELF_LIMITED` in `apps/api/src/core/security/permissions/permissions.registry.ts`.
12. **`SEC-02` (P0 `AUTHORIZATION_RISK`) — Enforce Manager Decision Authority & Stage Boundaries on Transfer Approval & Rejection**
    - **Root Cause**: `ApproveTransferEmployeePolicyHandler` (`EmployeePolicies.approveTransfer`) and Frontend `canApproveManagerTransfer` previously allowed users who merely had employee visibility (`employee:view*`) to pass the policy check; furthermore, `RejectTransferUseCase` allowed rejecting transfers in `"approved"` state and did not require `employee:manage` when rejecting at the `"hr_approval"` stage.
    - **Fix**:
      - Updated `ApproveTransferEmployeePolicyHandler` (`apps/api/src/core/security/policies/employee.policy.ts`) and Frontend `canApproveManagerTransfer` (`apps/web/src/features/employees/components/workflow/employee-lifecycle-workflow-hero.tsx`) to require explicit decision/edit authority (`employee:edit`, `employee:update:all`, `employee:manage`, or `approval:requests:decide`) plus non-self and 4-tier organizational scope checks.
      - Updated `RejectTransferUseCase` (`apps/api/src/modules/workforce/employees/use-cases/reject-transfer.usecase.ts`) to require `instance.currentState in ["manager_approval", "hr_approval"]` (blocking `reject` on `"approved"` transfers with `400 Bad Request`) and require `employee:manage` / `employees:manage` / `sys:all` / `isSuperAdmin` when `instance.currentState === "hr_approval"` (`403 Forbidden` for non-HR managers).
13. **`SEC-03` (P1 `AUTHORIZATION_RISK`) — Unify Sensitive Employee Field Access & Workflow Instance Visibility**
    - **Fix**:
      - Updated `EmployeesController.hasSensitiveAccess` and `GetEmployeeUseCase.hasSensitiveAccess` to delegate to `EmployeePolicies.viewSensitive.handle(user)` and accept both singular `employee:{view,manage}:sensitive` and plural `employees:{view,manage}:sensitive`.
      - Removed read-only `EMPLOYEES_VIEW*` from `ViewWorkflowInstancesPolicyHandler` (`apps/api/src/modules/platform-workflow-engine/policies/workflow.policy.ts`) and invoked `WorkflowPolicies.viewInstances.handle(user)` directly inside `ListWorkflowInstancesUseCase` and `GetWorkflowInstanceUseCase`.
14. **`CON-01` (P1 `CONTRACT_MISMATCH`) — Canonical 6-Value Employee Status Contract Across DTOs & Repositories**
    - **Root Cause**: `UpdateEmployeeDto`, `BulkStatusDto`, `EmployeeQueryDto`, and `EmployeeReadRepository.findPaginated` omitted `"retired"` from their status union/validator lists.
    - **Fix**: Exported `EMPLOYEE_STATUS_VALUES = ["working", "probation", "terminated", "leave", "suspended", "retired"] as const` from `create-employee.dto.ts` and aligned `UpdateEmployeeDto`, `BulkStatusDto`, `EmployeeQueryDto`, and `EmployeeReadRepository.findPaginated` with the database `employee_status_enum`, `ChangeEmployeeStatusDto`, `EMPLOYEE_STATUS_TRANSITIONS`, and Frontend `employeeStatusSchema`.
15. **`PAY-01` & `PAY-02` (P0 `DATA_INTEGRITY_RISK` / `PRODUCT_DECISION_REQUIRED`) — Fail-Closed Payroll Calculation Status & Release-Path Hardening**
    - **Fix**:
      - Standardized typed calculation status (`PAYROLL_CALCULATION_STATUS = { PROVISIONAL_POLICY_UNCONFIRMED: "PROVISIONAL_POLICY_UNCONFIRMED", CONFIRMED: "CONFIRMED" }`) across `PayrollRunResponseDto`, `PayrollResponseDto`, and `PayslipResponseDto`.
      - Hardened `PayrollRunMapper.toDto`, `PayrollMapper.toResponseDto`, `PayslipMapper.toResponseDto`, and Frontend `toPayrollRun` / `toPayslip` so that any record lacking an explicit `calculationStatus === "CONFIRMED"` and `isProvisional === false` is treated as provisional (`isProvisional: true`, `calculationStatus: "PROVISIONAL_POLICY_UNCONFIRMED"`), even if mutable `notes` or `metadata` are cleared.
      - Enforced hard runtime `409 Conflict` (`INVALID_STATUS_TRANSITION`) blocks across all release paths: `ApprovePayrollRunUseCase`, `PostPayrollRunUseCase`, `PayrollDecisionHandler` (approval inbox callback), `PublishPayslipUseCase`, `UpdatePayrollPeriodUseCase` (closing a period containing provisional runs), `EventOutboxService` (`PayrollRunApprovedEvent`, `PayrollRunPostedEvent`, `PayslipPublishedEvent`), and `assertPayrollRunReadyForExportOrPayment`.
      - Enforced published-only employee access guards in `GetPayslipUseCase` and `ListPayslipsUseCase` so provisional payslips cannot be exposed to self-service employees even if DB status is `'published'`.

### 3.4. Onboarding, Offboarding, Attendance & Identity Remediations

16. **Onboarding & Offboarding Filtering and Manual Creation (`apps/api/src/modules/onboarding` & `offboarding`)**
    - Added optional `filters?: { employeeId?: string; status?: string }` to `IBoardingProcessReader.findByType`, `OnboardingProcessRepository.findByType`, `ListOnboardingProcessesUseCase`, and `ListOffboardingsUseCase`.
    - Exposed `@Query("employeeId")` and `@Query("status")` on `GET /api/v1/onboarding/processes` and `GET /api/v1/offboarding`, and exposed `POST /api/v1/onboarding/processes` in `BoardingProcessController`.
17. **Attendance Payroll Reconciliation Mismatches Bug (`apps/api/src/modules/attendance/timekeeping/timekeeping.controller.ts`)**
    - Fixed `getReconciliationMismatches` (`GET /api/v1/attendance/reconcile/:id/mismatches`), which previously passed `"MATCH"` to `getReconciliationItems(id, "MATCH")` before filtering `i.diffType !== "MATCH"`.
18. **Identity Password Change Flag Reset (`apps/api/src/modules/identity/auth/repositories/auth.repository.ts`)**
    - Updated `AuthRepository.updateUserPasswordHash` to set `mustChangePassword: false, updatedAt: new Date()`.

---

## 4. Frontend Alignment, Contract-First Completion & Browser E2E Bug Fixes (`apps/web`)

1. **`apps/web/src/lib/permissions.ts`, `packages/permissions/src/hierarchy/hierarchy.ts` & `apps/web/src/features/permissions/PermissionCatalogProvider.tsx`**
   - Added `viewSensitive`, `update`, `updateSelf`, `updateAll`, `manageSensitive`, `delete`, and `manage` to `permissions.employees` in `apps/web/src/lib/permissions.ts`.
   - Enforced directional hierarchy (`employee:manage -> employee:update:all -> employee:edit -> employee:update:self`) in `packages/permissions/src/hierarchy/hierarchy.ts` so singular/plural permissions resolve identically across `@project/api` and `apps/web` without broadening `employee:edit` to `employee:update:all`.
2. **`apps/web/src/features/employees/components/workflow/employee-lifecycle-workflow-hero.tsx` & `dialogs/lifecycle/terminate-employee-dialog.tsx`**
   - Aligned lifecycle action visibility strictly with `EmployeeAdminController` + `EmployeePolicies`:
     - `Rehire`, `Request Transfer`, `HR Approve`, `HR Reject`, `Apply Transfer`, and `Cancel Transfer` require `canManage` (`employee:manage`).
     - `Manager Approve` and `Manager Reject` (at `manager_approval`) require `canApproveManagerTransfer` (`canManage || ((canEdit || hasPermission('approval:requests:decide')) && !isSelfEmployee)`).
     - `canViewWorkflowInstances` requires `canApproveManagerTransfer || canScheduleTerminate || hasPermission('workflow-instances:view')`.
     - `Cancel Scheduled Termination` and the `'scheduled'` mode option in `TerminateEmployeeDialog` require `canScheduleTerminate` (`employee:manage` or `employee:manage:sensitive`).
3. **`apps/web/src/features/onboarding/api/{processes,queries,mutations}.ts` & `components/{processes-view,process-detail-view}.tsx` & `offboarding/api/offboarding-client.ts`**
   - Extended `listOnboardingProcesses` and `onboardingProcessesQueryOptions` to forward `status` and `employeeId` query parameters; added `createOnboardingProcess` and `useCreateOnboardingProcess`.
   - Added status faceted filtering (`DataTableFacetedFilter`), employee name resolution, and the **"Khởi tạo Onboarding"** dialog (`canEdit`) to `OnboardingProcessesView`.
   - Gated checklist item `Hoàn thành` / `Bỏ qua` / `Mở lại` buttons on `canEdit && !isTerminalCancelled` in `OnboardingProcessDetailView`.
   - Updated `fetchOffboardingDetail` and `fetchOffboardingList` in `apps/web/src/features/offboarding/api/offboarding-client.ts` to use `unwrapData` and `extractList` from `@/lib/api-extract` so the nested `{ data: { data: ... } }` envelope from `customFetch` is unwrapped consistently.
4. **`apps/api/src/modules/{benefits,expenses}` & `apps/web/src/features/{benefits,expenses}`**
   - Updated `GetClaimUseCase` and `ListClaimsUseCase` (`ClaimResponseDto`) to return `description`, `createdAt`, and line `items` (`this.repo.findItems(id)`).
   - Updated `ListEnrollmentsUseCase` (`EnrollmentResponseDto`) to return `effectiveFrom` and `enrolledAt`.
   - Updated `BenefitEnrollmentsView` with status filtering, employee/plan name resolution, an **"Đăng ký phúc lợi"** dialog (`useEnrollEmployee`), and `canManage` (`benefits:manage`) guards on `Approve` / `Cancel`.
   - Updated `ExpenseClaimsView` and `ExpenseClaimDetailDialog` with status filtering, `unwrapData` on claim detail, `canManageExpenses && !isSelfClaim` guards on `Approve` / `Reject`, and `canManageExpenses` guards on `Reimburse`.
5. **Employee Offer Prefill Hydration, Leave Balance Extraction, and Payroll Fail-Closed UI Controls (`PD-04`)**
   - Updated `EmployeeCreatePage` (`apps/web/src/features/employees/components/employee-create-page.tsx`) and `useEmployeeForm` (`apps/web/src/features/employees/hooks/use-employee-form.ts`) to support `initialValues` derived from accepted offer query parameters (`fromOfferId`, `fullName`, `email`, `phone`, `startDate`) and survive React StrictMode double-effect invocation.
   - Updated `LeaveBalanceView` (`apps/web/src/features/leave/components/leave-balance-view.tsx`) to use `extractList<LeaveBalanceRow>(data)` and updated `LeaveRequestsTable` & `LeaveRequestDetailDialog` to block self-approval (`!isSelfRequest`).
   - Updated `PayrollRunWorkflowHero` (`apps/web/src/features/payroll/components/payroll-run-workflow-hero.tsx`) and `payslip-columns.tsx` (`apps/web/src/features/payroll/components/payslips-table/payslip-columns.tsx`) to support `'generated'` run status, display `Tạm tính (PD-04)` badges/warnings, and disable **Phê duyệt bảng lương**, **Chốt & Xuất lương (Post)**, and **Công bố phiếu lương** buttons whenever `isProvisional === true`.

---

## 5. Verification, Live-DB Closure, Real Browser E2E & Quality Gates Execution

### 5.1. All 10 Required Quality Gates + Browser E2E & Release Operations Summary

| # | Quality Gate | Command | Exit Code | Result | Details |
|---|---|---|---|---|---|
| 1 | Shared Permissions Build | `pnpm --filter @project/permissions build` | `0` | **PASS** | `tsc` compiled cleanly |
| 2 | Shared Permissions Test | `pnpm --filter @project/permissions test` | `0` | **PASS** | **1 suite passed, 17 tests passed** (`resolver.test.ts`) |
| 3 | Full Backend Test Suite | `pnpm --filter @project/api test` | `0` | **PASS** | **338 test suites passed / 338 total (1,373 tests passed / 1,373 total)**, including live-PostgreSQL `phase6a`, `phase6c`, `phase6e`, `phase6g`, `employee-write.repository.spec.ts` PII encryption checks, and real multi-use-case integration suites (`recruit-to-hire.e2e.spec.ts`, `hire-integration.e2e.spec.ts`, `benefits.e2e.spec.ts`, `expenses.e2e.spec.ts`, `performance-cycle.e2e.spec.ts`) |
| 4 | Backend Architecture Check | `pnpm --filter @project/api arch:check` | `0` | **PASS** | Context Registry, Context Boundaries, DB Access, Module Cycles, Adapter DIP: **5 PASS, 0 WARN, 0 FAIL** |
| 5 | Backend Build | `pnpm --filter @project/api build` | `0` | **PASS** | `nest build` compiled cleanly |
| 6 | Frontend Error Contracts & Typecheck | `pnpm --filter frontend typecheck` | `0` | **PASS** | `error-contracts:verify` + `tsc --noEmit`: **0 errors** |
| 7 | Frontend Dependency Cruiser | `pnpm --filter frontend depcruise` | `0` | **PASS** | **1,662 modules, 6,292 dependencies cruised, 0 violations** |
| 8 | Frontend Authorization Check | `pnpm --filter frontend authorization:check` | `0` | **PASS** | **All 88 pages covered (87 routes), 5 PASS, 0 FAIL, 0 WARN** |
| 9 | Full Frontend Test Suite | `pnpm --filter frontend test` | `0` | **PASS** | **57 test suites passed / 57 total (360 tests passed / 360 total)** |
| 10 | Monorepo Linter | `pnpm lint` | `0` | **PASS** | `oxlint`: **0 warnings, 0 errors across 2,550 files** |
| 11 | Real Browser E2E Acceptance Suite | `npx playwright test e2e/release-acceptance-journeys.spec.ts --no-deps --workers=1 --reporter=list` | `0` | **PASS** | **9/9 critical browser journeys passed in headless Chromium** |
| 12 | Release Operations & Isolated Local DB Drill | `pnpm security:check-tracked-secrets`, `pnpm deployment:check-env -- --mode=example`, `node --test scripts/deployment/restore-postgres.test.mjs`, and isolated local PostgreSQL 16.4 `backup-postgres.mjs` + `restore-postgres.mjs` drill (`hrms` $\rightarrow$ `hrms_restore_drill`) | `0` | **PASS** | Tracked secret check passed; example env check passed; **8/8** CLI safety guard tests passed; isolated local PostgreSQL 16.4 backup (`1.2M` dump) & restore into `hrms_restore_drill` verified `179/179` tables and exact 1:1 row-count parity |

### 5.2. Test Execution Classification (Independently Verified)

1. **Tests Run & PASSED**:
   - **Shared Permissions (`@project/permissions`)**: **1/1 test suite (`17/17` tests)** passed (`resolver.test.ts`), verifying `employee:edit` implies `employee:update:self` and never implies `employee:update:all` or `employee:view:all`.
   - **Backend Unit, Policy, Multi-Use-Case Integration & Live-DB Tests (`@project/api`)**: **338/338 test suites (`1,373/1,373` tests)** passed, including all 4 live-PostgreSQL transactional rollback and migration integrity suites (`phase6a`, `phase6c`, `phase6e`, `phase6g`), all 5 multi-use-case integration suites (`recruit-to-hire.e2e.spec.ts`, `hire-integration.e2e.spec.ts`, `benefits.e2e.spec.ts`, `expenses.e2e.spec.ts`, `performance-cycle.e2e.spec.ts`), `employee-encryption.spec.ts` + `employee-write.repository.spec.ts` (verifying `create`, `update`, `insertEmployee`, and `updateEmployeeById` encrypt all 5 PII fields with `AES-256-GCM`), and fail-closed payroll tests (`payroll-runs.usecases.spec.ts`, `publish-payslip.usecase.spec.ts`, `get-payslip.usecase.spec.ts`, `list-payslips.usecase.spec.ts`, `payroll-periods.usecases.spec.ts`, `payroll-decision.handler.spec.ts`, `event-outbox.service.spec.ts`).
   - **Frontend Unit & Component Tests (`apps/web`)**: **57/57 test suites (`360/360` tests)** passed, including `employee-create-page.spec.tsx`, `permission-boundary.spec.ts`, `lifecycle.spec.tsx`, and `payslip-queries.spec.tsx` (fail-closed `isProvisional` tests when `notes: null` or `metadata: {}`).
   - **Real Browser E2E Acceptance Suite (`Playwright Chromium`)**: **9/9 critical browser E2E journeys passed** (`apps/web/e2e/release-acceptance-journeys.spec.ts`):
     1. Recruit-to-hire -> offer acceptance and prefilled employee creation
     2. Onboarding task completion and permission boundary
     3. Manager and HR transfer approval stage isolation
     4. Termination and offboarding completion
     5. Archive, restore, and rehire lifecycle isolation
     6. Leave approval and self-approval prevention
     7. Expense submission, approval, and reimbursement
     8. Benefits enrollment and HR approval boundary
     9. Payroll provisional display and fail-closed blocked release controls
2. **Tests Run & FAILED Due to Code Defects**:
   - **0 tests** (After fixing `EmployeeWriteRepository.create`/`update` PII encryption in `employee-write.repository.ts` and `--dbname` URI handling in `scripts/deployment/backup-postgres.mjs`).
3. **Production / Infrastructure Operations Classified as `NOT VERIFIED` (Outside Local Workspace)**:
   - Storage/disk-level encryption at rest (PostgreSQL volume encryption, MinIO/S3 server-side KMS encryption, off-host `.dump` encryption).
   - Live production HTTPS/TLS certificate termination and internal PostgreSQL/Redis TLS (`sslmode=require`, `rediss://`).
   - Target production environment secret injection (`pnpm deployment:check-env` against live production env).
   - Target production/staging PostgreSQL backup-and-restore drill (`postgresql-client` `pg_dump`/`pg_restore` must be installed on the production operator host).
4. **Capabilities Deferred Pending Product Owner Decision (`PRODUCT_DECISION_REQUIRED`)**:
   - **`PD-01`**: Formal multi-step probation evaluation scorecard & statutory extension limits (`PARTIAL`).
   - **`PD-02`**: Automated daily `@Cron` scheduler for future-dated approved transfers; manual HR apply on/after `effectiveDate` is verified (`PARTIAL`).
   - **`PD-03`**: Employee self-service resignation submission & notice-period validation (`PARTIAL`).
   - **`PD-04` (`BLOCKED` for Production Payroll Statutory Release)**: Vietnamese statutory payroll deduction calculation (progressive PIT brackets + BHXH/BHYT/BHTN caps) in `CalculatePayslipService` (currently uses a provisional calculation with `isProvisional: true`, `calculationStatus: "PROVISIONAL_POLICY_UNCONFIRMED"`, and fail-closed `409 Conflict` runtime blocks across all release paths).

---

## 6. Final Release Gate Decision Matrix (By Domain Slice & Environment)

| Release Slice | Verdict | Classification | Scope & Justification |
|---|---|---|---|
| **1. Core HR** (`Identity`, `Organization`, `Employee Core`, `Contracts`, `Documents`, `Recruitment`, `Attendance`, `Scheduling`, `Leave`, `Benefits`, `Expenses`) | **`GO` (Subject to Prod Ops Preflight)** | **`VERIFIED` (Code/Tests/Browser E2E)** / **`NOT VERIFIED` (Live Prod Ops)** | Strict directional permission hierarchy (`employee:edit` does not imply `employee:update:all`), 4-tier organizational scope resolution, `AES-256-GCM` PII column encryption across all write paths, sensitive field masking, canonical 6-status contracts, and UI/API workflows are verified across 338 backend suites, 57 frontend suites, and 9/9 Chromium browser E2E tests. Cutover requires completing the `NOT VERIFIED` production env/TLS/disk-encryption/restore-drill operator checklist in `docs/audit/production-release-checklist.md`. |
| **2. Employee Lifecycle** (`Probation`, `Status Transitions`, `Transfers`, `Immediate & Scheduled Termination`, `Onboarding`, `Offboarding`, `Archive`, `Restore`, `Rehire`, `Purge`) | **`GO` (Core HR-Driven Flows Verified; `PD-01..03` Deferred)** | **`VERIFIED` (Core Flows)** / **`PARTIAL` (`PD-01..03`)** | All lifecycle transitions, stage-isolated transfer approvals/rejections (`manager_approval` vs `hr_approval` vs `approved`), workflow instance scope guards, and boarding checklists are verified end-to-end across API, live PostgreSQL 16.4, and real Chromium browser E2E suites. |
| **3. Payroll Preview** (`HR/Finance/Admin Draft Run Generation, Attendance Snapshot Capture & Provisional Payslip Preview`) | **`GO` (Restricted Internal HR/Finance Preview Only)** | **`VERIFIED`** | HR/Finance/Admin (`payroll:view:all`, `payroll:manage`) can preview provisional calculations labeled `Tạm tính (PD-04)`, while self-service employees (`payroll:view:self`) are blocked from viewing provisional payslips (`ListPayslipsUseCase`, `GetPayslipUseCase`). |
| **4. Payroll Statutory Release** (`Approval`, `Posting`, `Employee Payslip Publication`, `Period Close`, `Outbox Release`, `Final Settlement Release`, `Payment Export`) | **`NO-GO`** | **`BLOCKED` (`PD-04`)** | `isProvisional: true` and `calculationStatus: "PROVISIONAL_POLICY_UNCONFIRMED"` are enforced fail-closed across all backend and frontend paths; approval, posting, publishing, period close, outbox emission, and payment export are blocked with `409 Conflict` (`INVALID_STATUS_TRANSITION`) until `PD-04` statutory rules are formally approved and implemented. |




