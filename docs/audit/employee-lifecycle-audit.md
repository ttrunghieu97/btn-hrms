# Employee Core & Employee Lifecycle Deep-Dive Audit

## 1. Scope & Audited Source Files

- **Controllers**:
  - [`employees.controller.ts`](file:///home/hieutt/btn-hrms/apps/api/src/modules/workforce/employees/employees.controller.ts) (`GET /api/v1/employees`, `GET /api/v1/employees/me`, `GET /api/v1/employees/:id`, `POST /api/v1/employees`, `PUT /api/v1/employees/:id`)
  - [`employee-admin.controller.ts`](file:///home/hieutt/btn-hrms/apps/api/src/modules/workforce/employees/employee-admin.controller.ts) (`GET /api/v1/employees/check-code`, `GET /api/v1/employees/check-username`, `GET /api/v1/employees/:id/status-history`, `PUT /api/v1/employees/:id/change-status`, `PUT /api/v1/employees/:id/terminate`, `DELETE /api/v1/employees/:id`, `POST /api/v1/employees/:id/restore`, `POST /api/v1/employees/:id/rehire`, `DELETE /api/v1/employees/:id/purge`, `POST /api/v1/employees/:id/schedule-termination`, `DELETE /api/v1/employees/:id/scheduled-termination`, `POST /api/v1/employees/:id/transfers`, `POST /api/v1/employees/:id/transfers/:instanceId/{manager-approve,hr-approve,reject,cancel,apply}`, `POST /api/v1/employees/bulk/{status,archive}`, `PUT /api/v1/employees/:id/reset-password`)
  - [`department-employees.controller.ts`](file:///home/hieutt/btn-hrms/apps/api/src/modules/workforce/employees/department-employees.controller.ts)
  - [`employee-education.controller.ts`](file:///home/hieutt/btn-hrms/apps/api/src/modules/workforce/employees/employee-education.controller.ts)
- **Domain & Lifecycle Services**:
  - [`employee-lifecycle.service.ts`](file:///home/hieutt/btn-hrms/apps/api/src/modules/workforce/employees/services/employee-lifecycle.service.ts)
  - [`employee-lifecycle-state-machine.ts`](file:///home/hieutt/btn-hrms/apps/api/src/modules/workforce/employees/services/employee-lifecycle-state-machine.ts)
  - [`status-transitions.ts`](file:///home/hieutt/btn-hrms/apps/api/src/modules/workforce/employees/domain/status-transitions.ts)
  - [`employee-hierarchy.guard.ts`](file:///home/hieutt/btn-hrms/apps/api/src/modules/workforce/employees/domain/employee-hierarchy.guard.ts)
- **UseCases**:
  - `CreateEmployeeUseCase`, `UpdateEmployeeUseCase`, `GetEmployeeUseCase`, `GetEmployeeByUserUseCase`, `ListEmployeesUseCase`, `ChangeEmployeeStatusUseCase`, `TerminateEmployeeUseCase`, `ScheduleTerminationUseCase`, `CancelScheduledTerminationUseCase`, `ExecuteScheduledTerminationsUseCase`, `RehireEmployeeUseCase`, `DeleteEmployeeUseCase`, `RestoreArchivedEmployeeUseCase`, `RestoreEmployeeUseCase`, `PurgeEmployeeUseCase`, `RequestTransferUseCase`, `ApproveTransferUseCase`, `RejectTransferUseCase`, `ApplyTransferUseCase`, `CancelTransferUseCase`, `BulkChangeStatusUseCase`, `BulkArchiveUseCase`, `ResetEmployeePasswordUseCase`, `ListEmployeeStatusHistoryUseCase`.
- **Database Schema**:
  - [`apps/api/src/infrastructure/database/schema/workforce/tables.ts`](file:///home/hieutt/btn-hrms/apps/api/src/infrastructure/database/schema/workforce/tables.ts) & [`enums.ts`](file:///home/hieutt/btn-hrms/apps/api/src/infrastructure/database/schema/workforce/enums.ts) (`employees`, `employment_records`, `org_assignments`, `employee_contracts`, `employee_status_history`, `employee_educations`, `employee_documents`, `employee_certifications`).

---

## 2. Independent State Dimensions (Normalized Model)

The HRMS codebase separates Employee Lifecycle into **6 distinct, orthogonal state dimensions** rather than overloading a single status column:

| Dimension | Storage Location | Actual Allowed Values | Meaning |
|---|---|---|---|
| **1. Recruitment / Application Stage** | `applications.currentStage` & `offers.status` | Stage: `'applied' \| 'screening' \| 'interview' \| 'offer' \| 'hired' \| 'rejected' \| 'withdrawn'`. Offer: `'draft' \| 'pending_approval' \| 'approved' \| 'rejected' \| 'sent' \| 'accepted' \| 'declined' \| 'expired'` | Pre-hire recruitment pipeline and offer decision state (`DecideOfferUseCase`). |
| **2. Employment Status (`EmployeeStatus`)** | `employees.status` (`employee_status_enum`) | `'probation' \| 'working' \| 'leave' \| 'suspended' \| 'retired' \| 'terminated'` | Active vs non-active vs terminal employment status of the employee profile (`status-transitions.ts`). |
| **3. Archive / Soft-Delete State** | `employees.deletedAt` | `null` (Active/Visible) \| ` timestamp` (Archived) | Soft-delete/archive state (`DeleteEmployeeUseCase`, `BulkArchiveUseCase`, `RestoreArchivedEmployeeUseCase`, `PurgeEmployeeUseCase`). |
| **4. Employment Period & Org Assignment Slice** | `employment_records.isCurrent` & `org_assignments.isCurrent` | `true` (Current slice) \| `false` (Historical slice) | Effective-dated employment stints (original hire vs rehire) and organizational placements (`departmentId`, `managerEmployeeId`, `jobTitle`). |
| **5. Onboarding / Offboarding Process State** | `boarding_processes.status` (`type: 'ONBOARDING' \| 'OFFBOARDING'`) | Onboarding: `'IN_PROGRESS' \| 'COMPLETED' \| 'CANCELLED'`. Offboarding: `'INITIATED' \| 'IN_PROGRESS' \| 'CLEARANCE_PENDING' \| 'COMPLETED' \| 'CANCELLED'` | Operational checklist progress for new hires and departing employees. |
| **6. Lifecycle Workflow Instance State** | `workflow_instances` (`workflowType: 'employee_transfer' \| 'employee_termination'`) | Transfer `currentState`: `'draft' \| 'manager_approval' \| 'hr_approval' \| 'approved' \| 'completed' \| 'rejected' \| 'cancelled'`. Scheduled Termination `currentState`: `'scheduled' \| 'completed' \| 'cancelled'`. (`status: 'active' \| 'completed' \| 'cancelled' \| 'rejected'`) | Multi-step approval/scheduling state for internal transfers and future-dated terminations. |

---

## 3. End-to-End Lifecycle Stage Verification (Phase 3)

### 3.1. Stage 1 — Accepted Offer → Employee Creation
- **Implemented Flow**:
  1. `POST /api/v1/recruitment/offers/:id/decision` (`DecideOfferUseCase` with `{ decision: "accept" }`) verifies `offer.status === "approved"`, updates the offer to `"accepted"`, transitions `applications.currentStage` to `"hired"`, appends a stage event, and stages `CandidateHiredEvent` (`recruitment.candidate.hired.v1`) in the transactional outbox.
  2. In the Frontend (`apps/web/src/features/recruitment/components/offers-view.tsx:156-171`), accepted offers render the **"Tạo hồ sơ nhân viên"** action linking to `/employees/new?fromOfferId=...&fullName=...&email=...&phone=...&startDate=...`.
  3. `EmployeeCreatePage` (`apps/web/src/features/employees/components/employee-create-page.tsx:111-139`) pre-fills the candidate's name, email, phone, and start date, and submits `POST /api/v1/employees` (`CreateEmployeeUseCase`).
  4. `CreateEmployeeUseCase` atomically creates the `users` account, `employees` row (syncing `departmentId`, `currentEmploymentRecordId`, `currentOrgAssignmentId`), `employment_records` (`isCurrent = true`), `org_assignments` (`isCurrent = true, assignmentType = 'primary'`), `employee_contracts` (`version = 1, isCurrent = true`), and `employee_status_history`, and stages `EmployeeCreatedEvent` + `EmployeeHiredEvent` (which triggers automatic Onboarding process creation if an active template exists).
  - *Note*: `CandidateHiredRegistrationService` (`candidate-hire-intake.port.ts`) is an optional background hook explicitly left unbound unless automated zero-touch employee provisioning is configured.

### 3.2. Stage 2 — Probation → Confirmation (or Termination)
- **Implemented Flow**:
  - `PUT /api/v1/employees/:id/change-status` (`ChangeEmployeeStatusUseCase` -> `EmployeeLifecycleService.changeStatus`) validates `assertStatusTransition(emp.status, dto.status)` via `EMPLOYEE_STATUS_TRANSITIONS`:
    - `probation -> working | leave | suspended | terminated`
    - `working -> leave | suspended | retired | terminated`
    - `leave -> working | suspended | retired | terminated`
    - `suspended -> working | terminated`
    - `retired -> []` (terminal)
    - `terminated -> []` (terminal; must use `POST /api/v1/employees/:id/rehire` for a new employment cycle)
  - When transitioning `probation -> working`, `EmployeeLifecycleService.changeStatus` automatically updates `employmentRecords.confirmedAt = todayDateString()` on the active `employment_records` row, inserts `employee_status_history`, and stages `EmployeeStatusChangedEvent`.

### 3.3. Stage 3 — Internal Transfer (`Request → Manager Approval → HR Approval → Application`)
- **Implemented Flow**:
  - **Request**: `POST /api/v1/employees/:id/transfers` (`RequestTransferUseCase`) verifies `assertLifecycleOperation("transfer", emp)` (`status` in `['working', 'probation']` and `!deletedAt`), validates target org references (`departmentId`, `positionId`, `managerEmployeeId`) and hierarchy cycle freedom (`EmployeeHierarchyGuard.validateNoCycles`), checks that no active `employee_transfer` workflow instance already exists for the employee (`409 Conflict`), starts the `employee_transfer` workflow, transitions `draft -> manager_approval`, and stages `EmployeeTransferRequestedEvent`.
  - **Manager Approval**: `POST /api/v1/employees/:id/transfers/:instanceId/manager-approve` (`ApproveTransferUseCase` with `stage = "manager"`) verifies the actor is a super-admin, HR manager (`employee:manage`), direct manager (`currentOrgAssignment.managerEmployeeId`), or same-department manager (`employee:view:department`), transitions `manager_approval -> hr_approval`, and stages `EmployeeTransferApprovedEvent`.
  - **HR Approval**: `POST /api/v1/employees/:id/transfers/:instanceId/hr-approve` (`ApproveTransferUseCase` with `stage = "hr"`):
    - Transitions `hr_approval -> approved` and stages `EmployeeTransferApprovedEvent`.
    - If `effectiveDate <= today`, immediately invokes `ApplyTransferUseCase.execute(instanceId, false, employeeId)` and marks the workflow `completed`.
    - If `effectiveDate > today`, keeps `status = "active"` and `currentState = "approved"` so it can be applied on/after `effectiveDate`.
  - **Application**: `POST /api/v1/employees/:id/transfers/:instanceId/apply` (`ApplyTransferUseCase`) verifies `expectedEmployeeId === instance.subjectId`, `instance.currentState === "approved" && instance.status === "active"`, and `effectiveDate <= today`. Inside a transaction, it closes the previous primary `org_assignments` row (`isCurrent = false, effectiveTo = effectiveDate`), inserts the new primary `org_assignments` row (`isCurrent = true, effectiveFrom = effectiveDate`), updates `employees.departmentId` and `employees.currentOrgAssignmentId`, records `employee_status_history` with the employee's actual status, marks the workflow `completed`, and stages `EmployeeTransferAppliedEvent`.
  - **Reject / Cancel**: `POST /api/v1/employees/:id/transfers/:instanceId/reject` (`RejectTransferUseCase`) and `POST /api/v1/employees/:id/transfers/:instanceId/cancel` (`CancelTransferUseCase`, stages `EmployeeTransferCancelledEvent`).

### 3.4. Stage 4 — Immediate & Scheduled Termination → Offboarding
- **Immediate Termination**:
  - `PUT /api/v1/employees/:id/terminate` (`TerminateEmployeeUseCase` -> `EmployeeLifecycleService.executeImmediateTermination`) verifies the employee is not already terminated or archived, updates `employees.status = "terminated"`, sets `endDate`, `lastWorkingDate`, and clears `currentEmploymentRecordId` & `currentOrgAssignmentId`.
  - Closes active `employment_records` (`isCurrent = false, endDate`), active `org_assignments` (`isCurrent = false, effectiveTo`), and active `employee_contracts` (`isCurrent = false, status = "terminated"`).
  - Deactivates the linked `users` account and revokes all refresh tokens (`IdentityAdminPort.deactivateUserAndRevokeSessions`).
  - Stages `EmployeeTerminatedEvent`, which triggers `OffboardingEventListener` to initiate an Offboarding process (`INITIATED`) if not already present.
- **Scheduled Termination**:
  - `POST /api/v1/employees/:id/schedule-termination` (`ScheduleTerminationUseCase`) validates `effectiveDate > today`, rejects duplicate active `employee_termination` workflows (`409 Conflict`), creates an `employee_termination` workflow instance (`currentState = "scheduled", status = "active"`), and stages `EmployeeTerminationScheduledEvent`.
  - `DELETE /api/v1/employees/:id/scheduled-termination` (`CancelScheduledTerminationUseCase`) cancels the active scheduled termination workflow and stages `EmployeeTerminationCancelledEvent`.
  - `TerminationSchedulerJob` (`@Cron("5 0 * * *")`) runs `ExecuteScheduledTerminationsUseCase`, which executes due scheduled terminations (`effectiveDate <= today`) using the exact same transactional termination + identity deactivation + outbox event flow and marks the workflow `completed`.

### 3.5. Stage 5 — Archive, Restore, Rehire & Purge
- **Archive (Soft-Delete)**:
  - `DELETE /api/v1/employees/:id` (`DeleteEmployeeUseCase`) and `POST /api/v1/employees/bulk/archive` (`BulkArchiveUseCase`) set `employees.deletedAt = new Date()` and archive all employee-owned storage files (`storage.archiveOwnerFiles("employee", employee.id)`).
- **Restore from Archive**:
  - `POST /api/v1/employees/:id/restore` (`RestoreArchivedEmployeeUseCase`) verifies `employee.deletedAt != null` and `employee.status !== "terminated"` (terminated employees cannot be restored directly and must use Rehire), clears `deletedAt = null`, logs `"Restored from archive"` in `employee_status_history`, and restores archived storage files (`storage.restoreOwnerFiles("employee", employee.id)`).
- **Rehire**:
  - `POST /api/v1/employees/:id/rehire` (`RehireEmployeeUseCase` -> `EmployeeLifecycleService.rehire`) requires `emp.status === "terminated"`, validates org references and manager hierarchy cycles, unarchives the employee if `deletedAt` was set (and restores archived storage files), closes any lingering `isCurrent = true` employment/org/contract rows, creates a new `employment_records` row (`isCurrent = true`), creates a new primary `org_assignments` row (`isCurrent = true`), creates a new `employee_contracts` row with `version = MAX(version) + 1`, updates `employees` (`status = dto.status ?? "working"`, `departmentId`, `currentEmploymentRecordId`, `currentOrgAssignmentId`), reactivates the `users` account (`identityAdmin.reactivateUser`), and stages `EmployeeRehiredEvent`.
- **Purge (Hard Delete)**:
  - `DELETE /api/v1/employees/:id/purge` (`PurgeEmployeeUseCase`, restricted to `EmployeePolicies.purge` = SuperAdmin / `sys:all`) requires `employee.deletedAt != null`, enforces the retention window (`PURGE_RETENTION_DAYS`, default 90 days), purges storage files, and deletes `employee_contracts` -> `employees` -> `users` inside a transaction without FK constraint violations.

---

## 4. Summary of All Remediated Employee Core & Lifecycle Findings (`ELC-01` to `ELC-14`)

| ID | Category | Severity | Description & Root Cause | Status |
|---|---|---|---|---|
| `ELC-01` | `AUTHORIZATION_RISK` | **P1** | `packages/permissions/src/hierarchy/hierarchy.ts` and `apps/api/src/core/security/permissions/permissions.registry.ts` lacked full `employee:*` and `offboarding:edit` hierarchy edges. | **FIXED & VERIFIED** |
| `ELC-02` | `AUTHORIZATION_RISK` / `CONFIRMED_BUG` | **P0** | `SecurityRepository` and `ResourceLoaderRepository` read `employees.departmentId` without falling back to `org_assignments.departmentId`, and `CreateEmployeeUseCase`/`ApplyTransferUseCase` did not sync `employees.departmentId`. | **FIXED & VERIFIED** |
| `ELC-03` | `CONFIRMED_BUG` | **P0** | `PurgeEmployeeUseCase` / `IdentityAdminAdapter.deleteUser` and `EmployeeWriteRepository.hardDeleteEmployee` violated `ON DELETE RESTRICT` FK constraints (`employee_contracts -> employees -> users`). | **FIXED & VERIFIED** |
| `ELC-04` | `DATA_INTEGRITY_RISK` | **P1** | `UpdateEmployeeUseCase` (`PUT /api/v1/employees/:id`) allowed status changes without checking `assertStatusTransition(currentStatus, status)`. | **FIXED & VERIFIED** |
| `ELC-05` | `CONFIRMED_BUG` | **P0** | `ApproveTransferUseCase` (`stage = "hr"`) unconditionally called `ApplyTransferUseCase.execute` with `skipFutureCheck = false`, causing all future-dated transfer HR approvals to fail with `400 Bad Request`. | **FIXED & VERIFIED** |
| `ELC-06` | `CONFIRMED_BUG` / `DATA_INTEGRITY_RISK` | **P1** | `ApplyTransferUseCase` used `&&` instead of `||` on its state guard, did not verify `expectedEmployeeId === instance.subjectId`, did not sync `employees.departmentId` & `currentOrgAssignmentId`, and hardcoded `"working"` status in history. | **FIXED & VERIFIED** |
| `ELC-07` | `DATA_INTEGRITY_RISK` | **P1** | `RequestTransferUseCase` did not validate `managerEmployeeId` existence or reject duplicate active transfer workflows (`409 Conflict`). | **FIXED & VERIFIED** |
| `ELC-08` | `INCOMPLETE_IMPLEMENTATION` | **P2** | `CancelTransferUseCase` did not check `instance.status === "active"` or stage `EmployeeTransferCancelledEvent`. | **FIXED & VERIFIED** |
| `ELC-09` | `DATA_INTEGRITY_RISK` | **P1** | `EmployeeLifecycleService.executeImmediateTermination` did not close active `employment_records` and `org_assignments` (`isCurrent = false`) or clear current pointer IDs on `employees`. | **FIXED & VERIFIED** |
| `ELC-10` | `CONFIRMED_BUG` | **P1** | `EmployeeLifecycleService.rehire` and `EmployeeContractsRepository.create`/`amend` defaulted contract `version` to `1` when no current contract existed, violating `uq_employee_contracts_employee_version`. | **FIXED & VERIFIED** |
| `ELC-11` | `CONTRACT_MISMATCH` | **P1** | `TerminateEmployeeDto.lastWorkingDate` lacked `@IsOptional()`, and `EmployeeAdminController` used untyped `@Body() dto: any` on 6 endpoints. | **FIXED & VERIFIED** |
| `ELC-12` | `AUTHORIZATION_RISK` | **P1** | `EmployeeAdminController.rejectTransfer` required `EmployeePolicies.manage` (blocking department managers from rejecting transfers at `manager_approval`), and `WorkflowPolicies.viewInstances` blocked HR/Managers from loading employee workflow instances on Employee Detail. | **FIXED & VERIFIED** |
| `ELC-13` | `AUTHORIZATION_RISK` / `CONTRACT_MISMATCH` | **P0** | `EmployeePolicies` checked singular `employee:*` while `QueryScopeService.resolveScope(user, "employees")` and `seed.ts`/`PermissionCatalogProvider.tsx` used plural `employees:*`, causing non-superadmin users with only one form to fail authorization. Fixed via bidirectional `employee:* <-> employees:*` normalization in `@project/permissions`, `PermissionHierarchyResolver`, `EmployeePolicies`, and `PermissionCatalogProvider.tsx`. | **FIXED & VERIFIED** |
| `ELC-14` | `DATA_INTEGRITY_RISK` | **P2** | `RestoreArchivedEmployeeUseCase` and `RehireEmployeeUseCase` (when unarchiving a deleted terminated employee) did not restore archived storage files (`storage.restoreOwnerFiles("employee", emp.id)`), unlike `DeleteEmployeeUseCase` which archived them. | **FIXED & VERIFIED** |
| `ELC-15` | `AUTHORIZATION_RISK` | **P0** | `WorkflowInstanceController` (`GET /api/v1/workflow-instances` & `GET /api/v1/workflow-instances/:id`) did not enforce employee visibility scope (`EmployeePolicies.view.handle(user, empContext)`) or restrict `subjectType` to `["employee", "employee_transfer"]` for non-global workflow viewers. | **FIXED & VERIFIED** |
| `ELC-16` | `AUTHORIZATION_RISK` | **P0** | Out-of-scope employee leaks on endpoints using `EmployeePolicies.view` without `@Resource(Employee, ...)` (`LaborReportController`, `check-code`, `check-username`, `managerApproveTransfer`, `rejectTransfer`, `DepartmentEmployeesController`, `ContractsController`, `DocumentsController`) and `QueryScopeService` checking `edit` before `view:department`. Fixed via `EmployeePolicies.viewAll`, `EmployeePolicies.approveTransfer`, `@Resource(Employee, "id")`, department scope priority in `QueryScopeService`, and `DataScope` checks. | **FIXED & VERIFIED** |

