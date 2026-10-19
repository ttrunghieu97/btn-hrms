# Backend HRMS Domain Audit (`@project/api`)

## 1. Executive Summary

This document records the evidence-based audit of all 22 Backend modules in `apps/api/src/modules/` and their corresponding Drizzle schemas in `apps/api/src/infrastructure/database/schema/`.

Each finding is classified using the Master Prompt taxonomy:
- `CONFIRMED_BUG`
- `MISSING_CAPABILITY`
- `INCOMPLETE_IMPLEMENTATION`
- `CONTRACT_MISMATCH`
- `AUTHORIZATION_RISK`
- `DATA_INTEGRITY_RISK`
- `TEST_GAP`
- `PRODUCT_DECISION_REQUIRED`
- `OUT_OF_SCOPE`

---

## 2. Domain-by-Domain Audit Summary

### 2.1. Identity & Access Control (`modules/identity`, `core/security`)
- **Scope**: `users`, `roles`, `permissions`, `user_roles`, `role_permissions`, `user_permissions`, `sessions`, JWT auth, refresh token rotation, RBAC hierarchy (`permissions.registry.ts` + `@project/permissions`), and ABAC Policy Guard (`PolicyGuard` + `ResourceLoaderGuard` + `QueryScopeService`).
- **Key Findings**:
  - **[SEC-01] `CONFIRMED_BUG` / `AUTHORIZATION_RISK` (P0)**: `SecurityRepository.loadAuthSession` (`security.repository.ts`) and `ResourceLoaderRepository` (`resource-loader.repository.ts`) read `employees.departmentId`, which was not populated by `CreateEmployeeUseCase`, `UpdateEmployeeUseCase`, `ApplyTransferUseCase`, or `EmployeeLifecycleService.rehire`. **Status**: **FIXED** (synced `employees.departmentId` across all employee lifecycle mutations and added `LEFT JOIN org_assignments` fallback in `SecurityRepository` and `ResourceLoaderRepository`).
  - **[SEC-02] `CONTRACT_MISMATCH` (P1)**: Shared package `@project/permissions` (`packages/permissions/src/hierarchy/hierarchy.ts`) lacked the `employee:manage -> employee:*` and `offboarding:edit -> offboarding:*` hierarchy chains defined in backend `permissions.registry.ts`. **Status**: **FIXED**.
  - **[SEC-03] `AUTHORIZATION_RISK` / `CONTRACT_MISMATCH` (P0)**: `EmployeePolicies` checked singular `employee:*` while `QueryScopeService.resolveScope(user, "employees")` and DB seed scripts (`seed.ts`, `seed-roles.ts`) used plural `employees:*`. **Status**: **FIXED** (added bidirectional `employee:* <-> employees:*` normalization in `PermissionHierarchyResolver`, `EmployeePolicies`, `PresignedUploadUseCase`, and `PermissionCatalogProvider.tsx`).
  - **[SEC-04] `CONFIRMED_BUG` (P2)**: `AuthRepository.updateUserPasswordHash` did not reset `mustChangePassword: false` after a password change. **Status**: **FIXED**.

### 2.2. Organization (`modules/organization`)
- **Scope**: `companies`, `branches`, `locations`, `departments`, `positions`.
- **Architecture**: `DepartmentsController`, `PositionsController`, `LocationsController`, `DepartmentReaderAdapter`, `PositionReaderAdapter`.
- **Findings**:
  - Domain invariants (circular department prevention, active employee check before department/position deletion, headcount tracking) are properly enforced.
  - **[ORG-01] `TEST_GAP` (P3)**: `LocationsController` / `LocationsUseCases` have lighter unit test coverage than `Departments`.

### 2.3. Workforce / Employee Core & Employee Lifecycle (`modules/workforce`)
- **Scope**: `employees`, `employment_records`, `org_assignments`, `employee_status_history`, `employee_contracts`, `employee_allowances`, `employee_social_insurance`, `employee_documents`, `employee_educations`, `employee_timeline`, `labor_report`, `gps_logs`.
- **Key Findings** (detailed in [`employee-lifecycle-audit.md`](file:///home/hieutt/btn-hrms/docs/audit/employee-lifecycle-audit.md)):
  - **[ELC-02] `CONFIRMED_BUG` / `AUTHORIZATION_RISK` (P0)**: `employees.departmentId`, `currentEmploymentRecordId`, `currentOrgAssignmentId` not synced on create/update/transfer/rehire. **Status**: **FIXED**.
  - **[ELC-03] `CONFIRMED_BUG` (P0)**: `IdentityAdminAdapter.deleteUser` and `EmployeeWriteRepository.hardDeleteEmployee` violated PostgreSQL `ON DELETE RESTRICT` foreign keys (`employee_contracts.employee_id` and `employees.user_id`). **Status**: **FIXED**.
  - **[ELC-04] `DATA_INTEGRITY_RISK` (P1)**: `UpdateEmployeeUseCase` (`PUT /api/v1/employees/:id`) bypassed `assertStatusTransition(currentStatus, status)` when `status` was modified. **Status**: **FIXED**.
  - **[ELC-05] `CONFIRMED_BUG` (P0)**: Future-dated transfer HR approval (`POST /api/v1/employees/:id/transfers/:instanceId/hr-approve`) threw `400 Bad Request: Cannot apply transfer before effective date` because `ApproveTransferUseCase` unconditionally called `ApplyTransferUseCase`. **Status**: **FIXED**.
  - **[ELC-06] `CONFIRMED_BUG` / `AUTHORIZATION_RISK` / `DATA_INTEGRITY_RISK` (P1)**: `ApplyTransferUseCase` used `&&` (`instance.currentState !== "approved" && instance.status !== "active"`), allowing unapproved transfers to be applied and approved transfers to be applied multiple times; ignored `@Param("id")` mismatch; hardcoded `status: "working"` in status history. **Status**: **FIXED**.
  - **[ELC-07] `DATA_INTEGRITY_RISK` (P1)**: `RequestTransferUseCase` omitted `managerEmployeeId` validation and allowed duplicate active transfer workflows instead of throwing `409 Conflict`. **Status**: **FIXED**.
  - **[ELC-08] `INCOMPLETE_IMPLEMENTATION` (P2)**: `CancelTransferUseCase` did not verify `instance.status === "active"` and did not stage `EmployeeTransferCancelledEvent`. **Status**: **FIXED**.
  - **[ELC-09 & ELC-10] `CONFIRMED_BUG` / `DATA_INTEGRITY_RISK` (P1)**: `EmployeeLifecycleService.executeImmediateTermination` did not close `employment_records` (`isCurrent: false`) or `org_assignments` (`isCurrent: false`), and `EmployeeLifecycleService.rehire` / `EmployeeContractsRepository` defaulted to `version: 1` when no current contract existed, violating `uq_employee_contracts_employee_version`. **Status**: **FIXED**.
  - **[ELC-11 & ELC-12] `CONTRACT_MISMATCH` / `AUTHORIZATION_RISK` (P1)**: `TerminateEmployeeDto.lastWorkingDate` lacked `@IsOptional()`; `EmployeeAdminController` used `@Body() dto: any` across 6 endpoints; `rejectTransfer` blocked department managers (`EmployeePolicies.view`); `WorkflowPolicies.viewInstances` blocked HR/Managers from loading employee workflow instances; dead `HireEmployeeUseCase` removed. **Status**: **FIXED**.
  - **[ELC-14] `DATA_INTEGRITY_RISK` (P2)**: `RestoreArchivedEmployeeUseCase` (`POST /api/v1/employees/:id/restore`) and `RehireEmployeeUseCase` (when unarchiving a deleted terminated employee) now restore archived storage files via `storage.restoreOwnerFiles("employee", emp.id)`. **Status**: **FIXED & VERIFIED**.
  - **[ELC-15] `AUTHORIZATION_RISK` (P0)**: `WorkflowInstanceController` (`GET /api/v1/workflow-instances` & `GET /api/v1/workflow-instances/:id`) previously allowed any user with `employee:view*` (including `self` or `department` scope) to list or inspect workflow instances without enforcing employee visibility scope (`EmployeePolicies.view.handle(user, empContext)`) or restricting `subjectType` to employee workflows (`["employee", "employee_transfer"]`). **Status**: **FIXED & VERIFIED** (`ListWorkflowInstancesUseCase`, `GetWorkflowInstanceUseCase`, `WorkflowPolicies.viewInstances`, `PlatformWorkflowEngineRepository`).
  - **[ELC-16] `AUTHORIZATION_RISK` (P0)**: Controllers using `EmployeePolicies.view` without `@Resource(Employee, ...)` (`LaborReportController`, `EmployeeAdminController.checkEmployeeCode/checkUsernameAvailability`, `EmployeeAdminController.managerApproveTransfer/rejectTransfer`, `DepartmentEmployeesController`, `ContractsController`, `DocumentsController`) previously allowed `self` or `department` users to access out-of-scope data, and `QueryScopeService` checked `view/edit` (`all` tier) before `view:department` (`department` tier). **Status**: **FIXED & VERIFIED** (added `EmployeePolicies.viewAll`, `EmployeePolicies.approveTransfer`, `@Resource(Employee, "id")` on all transfer routes, department scope priority in `QueryScopeService`, and `DataScope` enforcement in `DepartmentEmployeesController`, `ContractsController`, and `DocumentsController`).

### 2.4. Recruitment (`modules/recruitment`)
- **Scope**: `requisitions`, `job_postings`, `candidates`, `applications`, `interviews`, `offers`, `pipeline`.
- **Findings**:
  - Offer state machine (`draft -> pending_approval -> approved -> accepted/declined`) and `DecideOfferUseCase` (which transitions `applications.currentStage` to `hired` and stages `CandidateHiredEvent`) are verified by `recruit-to-hire.e2e.spec.ts` and `decide-offer.usecase.spec.ts`.
  - **[REC-01] `TEST_GAP` (P3)**: Requisitions and Postings CRUD use-cases have lighter unit test coverage compared to Offers and Candidates.

### 2.5. Onboarding (`modules/onboarding`) & Offboarding (`modules/offboarding`)
- **Scope**: `boarding_templates`, `boarding_template_items`, `boarding_processes`, `boarding_checklist_items`.
- **Key Findings**:
  - **[ONB-01] `INCOMPLETE_IMPLEMENTATION` / `CONTRACT_MISMATCH` (P1)**: `BoardingProcessController` (`boarding-process.controller.ts`) lacked a `@Post()` endpoint for `CreateOnboardingProcessUseCase`, and `GET /api/v1/onboarding/processes` lacked `employeeId` and `status` filtering. **Status**: **FIXED & VERIFIED**.
  - **[OFB-01] `INCOMPLETE_IMPLEMENTATION` (P2)**: `GET /api/v1/offboarding` (`OffboardingController.findAll`) lacked `employeeId` and `status` filtering. **Status**: **FIXED & VERIFIED**.

### 2.6. Scheduling (`modules/scheduling`) & Attendance (`modules/attendance`)
- **Scope**: `shifts`, `schedules`, `schedule_requests`, `qualifications`, `attendances`, `timekeeping`, `overtime`, `reconciliation`, `attendance_summaries`.
- **Findings**:
  - **[ATT-01] `CONFIRMED_BUG` (P1)**: `TimekeepingController.getReconciliationMismatches` (`GET /api/v1/attendance/reconcile/:id/mismatches`) passed `"MATCH"` to `getReconciliationItems(id, "MATCH")` and then filtered `i.diffType !== "MATCH"`, always returning `[]`. **Status**: **FIXED & VERIFIED**.
  - Preserved uncommitted user improvements in `schedule-request.mapper.ts` and `schedule-requests.repository.ts`.

### 2.7. Leave Management (`modules/leave`)
- **Scope**: `leave_types`, `leave_policies`, `leave_balances`, `leave_requests`, `leave_ledger_entries`, `holidays`.
- **Findings**:
  - Uses double-entry ledger (`leave_ledger_entries`) and transactional balance reservation/deduction across request/approve/cancel/reject flows with unit test coverage.

### 2.8. Payroll, Benefits & Expenses (`modules/payroll`, `modules/benefits`, `modules/expenses`)
- **Scope**: `salary_structures`, `payroll_periods`, `payroll_runs`, `payslips`, `benefit_plans`, `employee_benefits`, `expense_claims`.
- **Findings**:
  - Payroll run orchestration, snapshot lineage, Segregation of Duties (SoD), period locking, and final settlement workflows are verified by both unit tests and live PostgreSQL rollback tests (`phase6a/6c/6e/6g-payroll-integrity.spec.ts` — **4/4 suites, 36/36 tests PASS**).
  - **[PAY-01 / PD-04] `PRODUCT_DECISION_REQUIRED` / `INCOMPLETE_IMPLEMENTATION` (P0 Production Blocker)**: `CalculatePayslipService` (`apps/api/src/modules/payroll/services/calculate-payslip.service.ts`) uses a flat 10% placeholder deduction (`gross * 0.1`) rather than statutory Vietnamese progressive PIT and BHXH/BHYT/BHTN caps. **Marked `BLOCKED` for Production Payroll readiness** in `backend-readiness-matrix.md` pending PO/Finance sign-off on `PD-04`.

### 2.9. Performance (`modules/performance`) & Learning (`modules/learning`)
- **Scope**: `performance_cycles`, `performance_goals`, `performance_reviews`, `courses`, `course_modules`, `course_enrollments`.
- **Findings**:
  - Self/manager review state transitions and course enrollment progress tracking are implemented and verified (`performance-cycle.e2e.spec.ts`).

### 2.10. Platform Engines & Operations (`platform-*`, `tasks`, `asset-management`, `chat`, `analytics`, `storage`, `integration-hub`)
- **Scope**: Workflow engine, approval engine, notifications, tasks, assets, chat, dashboard analytics, audit logs, S3/MinIO storage, webhooks.
- **Findings**:
  - Preserved user's `GetAttendanceStatsUseCase` addition in `modules/analytics/dashboard/`.
  - Transactional outbox (`EventOutboxService`) and storage attachment binding (`ResolveEmployeeAttachmentPlanService` / `ApplyEmployeeAttachmentPlanService`) provide strong consistency guarantees.

