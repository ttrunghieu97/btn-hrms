# Backend–Frontend Contract Alignment Specification

## 1. Response & Error Envelope Contracts

### 1.1. Standard Success Envelope (`ResponseInterceptor`)
All `@project/api` endpoints (unless streaming binary exports) return:
```json
{
  "data": { ... },
  "meta": {
    "requestId": "uuid",
    "timestamp": "2026-10-16T00:00:00.000Z",
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  },
  "error": null
}
```
- **Frontend Consumption**:
  - `customFetch` (`apps/web/src/lib/fetcher.ts`) returns the parsed JSON body.
  - Query hooks unwrap `data` via `unwrapData<T>(res)` or `extractList<T>(res)` / `extractPagination(res)` (`apps/web/src/lib/api-extract.ts`).

### 1.2. Standard Error Envelope (`AllExceptionsFilter` + `http-error.ts`)
```json
{
  "data": null,
  "meta": { "requestId": "uuid", "timestamp": "..." },
  "error": {
    "statusCode": 400,
    "code": "INVALID_REQUEST",
    "reason": "INVALID_STATUS_TRANSITION",
    "message": "Cannot transition employee status from terminated to working",
    "details": { "from": "terminated", "to": "working" }
  }
}
```
- Synchronized between Backend and Frontend via `pnpm --filter frontend error-contracts:verify` (`apps/web/src/api/error-contracts.manifest.json`).

---

## 2. Permission Catalog & Hierarchy Contract (`@project/permissions`)

Both `@project/api` and `apps/web` resolve permissions through `@project/permissions` (`packages/permissions/src/hierarchy/hierarchy.ts`) and `PermissionHierarchyResolver` (`apps/api/src/core/security/permissions/permission-hierarchy.resolver.ts`):

- **Employee Core & Lifecycle (`employee:*` & `employees:*` bidirectional normalization)**:
  - Canonical codes in `@project/permissions`: `employee:view`, `employee:view:self`, `employee:view:department`, `employee:view:all`, `employee:view:sensitive`, `employee:create`, `employee:edit`, `employee:update:self`, `employee:update:all`, `employee:manage:sensitive`, `employee:reset-password`, `employee:delete`, `employee:manage`.
  - Strict directional hierarchy expansion (preventing scope escalation):
    - `employee:manage` -> `employee:update:all`, `employee:view:all`, `employee:view:department`, `employee:view:self`, `employee:view`, `employee:create`, `employee:edit`, `employee:delete`, `employee:reset-password`, `files:upload`.
    - `employee:update:all` -> `employee:edit`, `employee:update:self`, `employee:view`, `employee:create`.
    - `employee:edit` -> `employee:update:self`, `employee:view`, `employee:create` (**does NOT imply `employee:update:all` or `employee:view:all`**).
    - `employee:delete` -> `employee:view`.
    - `employee:view:all` -> `employee:view:department` -> `employee:view:self`.
    - `employee:manage:sensitive` -> `employee:view:sensitive`.
  - **4-Tier Organizational Scope Resolution (`QueryScopeService.resolveScope` & `EmployeePolicies.view` / `EmployeePolicies.edit` / `EmployeePolicies.approveTransfer`)**:
    1. `all` tier (`employee:view:all`, `employee:update:all`, `employee:manage`, `sys:all`, `isSuperAdmin`) -> unrestricted across all departments.
    2. `department` tier (`employee:view:department`) -> strictly restricted to `user.departmentId === resource.departmentId` (even when combined with `employee:edit` or `approval:requests:decide`).
    3. `self` tier (`employee:view:self`, `employee:update:self`) -> strictly restricted to `user.employeeId === resource.employeeId` (even when combined with `employee:edit`).
    4. Unscoped legacy `employee:view` / `employee:edit` fallback -> used only when no explicit scope tier (`all` / `department` / `self`) is present.
  - Bidirectional singular/plural normalization (`employee:*` <-> `employees:*`) is enforced in `PermissionHierarchyResolver` (`apps/api`), `EmployeePolicies` (`apps/api`), `GetEmployeeUseCase.hasSensitiveAccess` / `EmployeesController.hasSensitiveAccess` (`apps/api`), `hasPermission` (`apps/web/src/lib/rbac.ts`), and `PermissionCatalogProvider.tsx` (`apps/web/src/features/permissions/PermissionCatalogProvider.tsx`).
- **Offboarding (`offboarding:*`)**:
  - `offboarding:edit` -> `offboarding:view`, `offboarding:clearance:{it,hr,finance,manager,security}`, `offboarding:exit-interview`, `offboarding:complete`.
- **Workflow Instances (`workflow-instances:view` & Scoped Employee Workflow Access)**:
  - `WorkflowPolicies.viewInstances` (`apps/api/src/modules/platform-workflow-engine/policies/workflow.policy.ts`) requires either global workflow access (`workflow-instances:view` / `sys:all`) or employee workflow/decision authority (`employee:edit`, `employee:update:all`, `employee:manage`, `employee:manage:sensitive`, or `approval:requests:decide`); read-only `employee:view*` alone is denied (`403 Forbidden`).
  - Both `ListWorkflowInstancesUseCase` and `GetWorkflowInstanceUseCase` invoke `WorkflowPolicies.viewInstances.handle(user)` directly and, for non-global workflow viewers, require `subjectId`, restrict `subjectType` to `["employee", "employee_transfer"]`, and verify `EmployeePolicies.view.handle(user, empContext)` against the employee's department/self scope.

---

## 2A. Canonical Employee Status Contract

- **Persisted Database & API Contract (`employee_status_enum` & `EMPLOYEE_STATUS_VALUES`)**:
  - Canonical 6-value lowercase enum: `["working", "probation", "terminated", "leave", "suspended", "retired"]`.
  - Enforced across `CreateEmployeeDto` (`["working", "probation"]` at creation), `UpdateEmployeeDto`, `ChangeEmployeeStatusDto`, `BulkStatusDto`, `EmployeeQueryDto`, `EmployeeReadRepository.findPaginated`, `EMPLOYEE_STATUS_TRANSITIONS` (`employee-lifecycle-state-machine.ts`), and Frontend `employeeStatusSchema` (`apps/web/src/features/employees/schemas/employee-form-schema.ts`).
- **Allowed Transitions (`EMPLOYEE_STATUS_TRANSITIONS` & `getAllowedTransitions`)**:
  - `probation` -> `["working", "terminated"]`
  - `working` -> `["leave", "suspended", "retired", "terminated"]`
  - `leave` -> `["working", "terminated"]`
  - `suspended` -> `["working", "terminated"]`
  - `retired` -> `[]` (terminal)
  - `terminated` -> `[]` (terminal; rehire uses dedicated `POST /api/v1/employees/:id/rehire`)
- **Frontend Display & Legacy String Normalization (`getSmartStatus` & `getEmployeeStatusLabel`)**:
  - All API requests and responses use the canonical lowercase enum (`working`, `probation`, `terminated`, `leave`, `suspended`, `retired`).
  - Display-only helpers in `apps/web/src/features/employees/utils/status-styles.ts` and `employee-display.ts` normalize any legacy uppercase code at the UI rendering boundary without mutating form or API state:
    - `ACTIVE` / `working` -> `working` (`"Đang làm việc"`)
    - `PROBATION` / `probation` -> `probation` (`"Thử việc"`)
    - `ON_LEAVE` / `LEAVE` / `leave` -> `leave` (`"Nghỉ phép / Tạm nghỉ"`)
    - `SUSPENDED` / `suspended` -> `suspended` (`"Đình chỉ"`)
    - `RETIRED` / `retired` -> `retired` (`"Nghỉ hưu"`)
    - `TERMINATED` / `RESIGNED` / `INACTIVE` / `terminated` -> `terminated` (`"Đã nghỉ việc"`)
    - `deletedAt != null` (separate archive dimension) -> `archived` badge (`"Đã lưu trữ"`).

---

## 3. Verified Endpoint & Frontend Hook Alignment Matrix (Phase 4)

### 3.1. Employee Core & Lifecycle (`apps/web/src/features/employees/`)

| Capability | Backend Endpoint (`@project/api`) | Backend Guard / Policy | Frontend Client / Hook | UI Surface & State Guard | Alignment Status |
|---|---|---|---|---|---|
| **List Employees** | `GET /api/v1/employees` | `EmployeePolicies.view` + `QueryScopeService.resolveScope(user, "employees")` | `employeesControllerFindAll` / `useEmployeesListQuery` | `EmployeeListingPage` (`status`, `departmentId`, `search`, `includeDeleted` filters) | `VERIFIED` |
| **Get Employee Detail** | `GET /api/v1/employees/:id` | `@Resource(Employee, "id")` + `EmployeePolicies.view` (masks sensitive fields unless `employee:view:sensitive` / `employee:manage:sensitive`) | `employeesControllerFindOne` / `useEmployeeQuery(id)` | `EmployeeDetailPage` (`employee-detail-page.tsx`) | `VERIFIED` |
| **Create Employee (Direct or From Offer)** | `POST /api/v1/employees` | `EmployeePolicies.create` (`employee:create` / `employee:manage`) | `employeesControllerCreate` / `useCreateEmployeeMutation` | `EmployeeCreatePage` (`/employees/new`, supports `?fromOfferId=...&fullName=...&email=...&phone=...&startDate=...` prefill) | `VERIFIED` |
| **Update Employee Profile** | `PUT /api/v1/employees/:id` | `@Resource(Employee, "id")` + `EmployeePolicies.edit` (enforces 4-tier scope + `assertStatusTransition`) | `employeesControllerUpdate` / `useUpdateEmployeeMutation` | `EmployeeEditPage` (`/employees/[id]/edit`) | `VERIFIED` |
| **Change Lifecycle Status (incl. Probation Confirmation)** | `PUT /api/v1/employees/:id/change-status` | `@Resource(Employee, "id")` + `EmployeePolicies.edit` | `useChangeEmployeeStatusMutation` (`employee-queries.ts`) | `ChangeEmployeeStatusDialog` (`change-employee-status-dialog.tsx`), only offers `employee.allowedTransitions` | `VERIFIED` |
| **Immediate Termination** | `PUT /api/v1/employees/:id/terminate` | `@Resource(Employee, "id")` + `EmployeePolicies.edit` | `terminateEmployee` (`employee-lifecycle.ts`) | `TerminateEmployeeDialog` (`terminate-employee-dialog.tsx`), `lastWorkingDate` optional | `VERIFIED` |
| **Schedule Termination** | `POST /api/v1/employees/:id/schedule-termination` | `@Resource(Employee, "id")` + `EmployeePolicies.terminate` (`employee:manage` / `employee:manage:sensitive`) | `scheduleEmployeeTermination` (`employee-lifecycle.ts`) | `TerminateEmployeeDialog` (`terminate-employee-dialog.tsx`), `'scheduled'` mode disabled unless `canScheduleTerminate`, requires `effectiveDate > today` | `VERIFIED` |
| **Cancel Scheduled Termination** | `DELETE /api/v1/employees/:id/scheduled-termination` | `@Resource(Employee, "id")` + `EmployeePolicies.terminate` (`employee:manage` / `employee:manage:sensitive`) | `useCancelScheduledTerminationMutation` (`employee-queries.ts`) | `EmployeeLifecycleWorkflowHero` (`employee-lifecycle-workflow-hero.tsx`) when active scheduled termination exists and `canScheduleTerminate` | `VERIFIED` |
| **Rehire Terminated Employee** | `POST /api/v1/employees/:id/rehire` | `@Resource(Employee, "id")` + `EmployeePolicies.manage` (`employee:manage`) | `useRehireEmployeeMutation` (`employee-queries.ts`) | `RehireEmployeeDialog` (`rehire-employee-dialog.tsx`), visible only when `status === 'terminated'` and `canManage` | `VERIFIED` |
| **Request Internal Transfer** | `POST /api/v1/employees/:id/transfers` | `@Resource(Employee, "id")` + `EmployeePolicies.manage` (`employee:manage`) | `useRequestTransferMutation` (`employee-queries.ts`) | `RequestTransferDialog` (`request-transfer-dialog.tsx`), visible when `status in ['working', 'probation']`, no active transfer, and `canManage` | `VERIFIED` |
| **Manager Approve Transfer** | `POST /api/v1/employees/:id/transfers/:instanceId/manager-approve` | `@Resource(Employee, "id")` + `EmployeePolicies.approveTransfer` (requires `employee:edit`, `employee:update:all`, `employee:manage`, or `approval:requests:decide` + non-self + dept scope) | `useApproveTransferMutation({ stage: 'manager' })` | `EmployeeLifecycleWorkflowHero` when `currentState === 'manager_approval'` and `canApproveManagerTransfer` (`canManage \|\| ((canEdit \|\| hasPermission('approval:requests:decide')) && !isSelfEmployee)`) | `VERIFIED` |
| **HR Approve Transfer** | `POST /api/v1/employees/:id/transfers/:instanceId/hr-approve` | `@Resource(Employee, "id")` + `EmployeePolicies.manage` (`employee:manage`) | `useApproveTransferMutation({ stage: 'hr' })` | `EmployeeLifecycleWorkflowHero` when `currentState === 'hr_approval'` and `canManage` | `VERIFIED` |
| **Reject Transfer** | `POST /api/v1/employees/:id/transfers/:instanceId/reject` | `@Resource(Employee, "id")` + `EmployeePolicies.approveTransfer` (`RejectTransferUseCase` requires `currentState in ['manager_approval', 'hr_approval']` and enforces `employee:manage` at `hr_approval` stage) | `useRejectTransferMutation` | `EmployeeLifecycleWorkflowHero` (`manager_approval` with `canApproveManagerTransfer`, or `hr_approval` with `canManage`) | `VERIFIED` |
| **Apply Approved Future Transfer** | `POST /api/v1/employees/:id/transfers/:instanceId/apply` | `@Resource(Employee, "id")` + `EmployeePolicies.manage` (`employee:manage`) | `useApplyTransferMutation` | `EmployeeLifecycleWorkflowHero` when `currentState === 'approved'` and `canManage` | `VERIFIED` |
| **Cancel Active Transfer** | `POST /api/v1/employees/:id/transfers/:instanceId/cancel` | `@Resource(Employee, "id")` + `EmployeePolicies.manage` (`employee:manage`) | `useCancelTransferMutation` | `EmployeeLifecycleWorkflowHero` when `currentState in ['manager_approval', 'hr_approval', 'approved']` and `canManage` | `VERIFIED` |
| **Archive Employee (Soft Delete)** | `DELETE /api/v1/employees/:id` | `@Resource(Employee, "id")` + `EmployeePolicies.delete` | `useRemoveEmployeeMutation` (`employeeAdminControllerRemove`) | `EmployeeDetailPage` & `CellAction` (`!employee.deletedAt && canDelete`) | `VERIFIED` |
| **Restore Archived Employee** | `POST /api/v1/employees/:id/restore` | `@Resource(Employee, "id")` + `EmployeePolicies.manage` | `useRestoreEmployeeMutation` (`employeeAdminControllerRestore`) | `EmployeeDetailPage` & `CellAction` (`employee.deletedAt && employee.status !== 'terminated' && canManage`) | `VERIFIED` |
| **Purge Archived Employee** | `DELETE /api/v1/employees/:id/purge` | `@Resource(Employee, "id")` + `EmployeePolicies.purge` (`sys:all` / SuperAdmin) | `usePurgeEmployeeMutation` (`employeeAdminControllerPurge`) | `EmployeeDetailPage` & `CellAction` (`employee.deletedAt && canPurge`) | `VERIFIED` |
| **Bulk Status / Bulk Archive** | `POST /api/v1/employees/bulk/{status,archive}` | `EmployeePolicies.manage` | `useBulkChangeStatusMutation`, `useBulkRemoveEmployeesMutation` | `EmployeeTable` bulk action bar (reports per-item partial success/failure) | `VERIFIED` |
| **Status History & Unified Timeline** | `GET /api/v1/employees/:id/status-history`, `GET /api/v1/employees/:employeeId/timeline` | `@Resource(Employee, ...)` + `EmployeePolicies.view` | `useEmployeeStatusHistoryQuery`, `useEmployeeTimelineQuery` | `EmployeeDetailPage` Timeline & History tabs | `VERIFIED` |

### 3.2. Recruitment, Onboarding, Offboarding, Attendance, Leave, Benefits, Expenses & Payroll

| Feature | Backend Endpoints | Frontend Client / Hook | Alignment Notes | Status |
|---|---|---|---|---|
| **Recruitment Requisitions, Postings, Candidates, Pipeline, Interviews, Offers** | `/api/v1/recruitment/{requisitions,postings,candidates,pipeline,interviews,offers}` | Orval hooks in `apps/web/src/features/recruitment/api/{queries,mutations}.ts` | `useDecideOffer` invalidates both `offerKeys.all()` and `applicationKeys.all()`. `OffersPanel` links `pending_approval` offers to `/approvals` and `accepted` offers to `/employees/new?fromOfferId=...`. | `VERIFIED` |
| **Onboarding Templates & Processes** | `GET/POST/PUT/DELETE /api/v1/onboarding/templates`, `GET/POST /api/v1/onboarding/processes`, `GET /api/v1/onboarding/processes/:id`, `POST /api/v1/onboarding/processes/:id/items/:itemId/{complete,skip,reopen}` | `apps/web/src/features/onboarding/api/{onboarding,processes,queries,mutations}.ts` | `listOnboardingProcesses` forwards `page`, `limit`, `status`, and `employeeId`; `OnboardingProcessesView` provides status faceted filter and manual process creation dialog (`useCreateOnboardingProcess`, gated on `canEdit`); `OnboardingProcessDetailView` unwraps `{ data }` via `unwrapData` and gates task actions on `canEdit`. | `VERIFIED` |
| **Offboarding Processes & Clearance** | `GET/POST /api/v1/offboarding`, `GET /api/v1/offboarding/:id`, `POST /api/v1/offboarding/:id/tasks`, `PATCH /api/v1/offboarding/tasks/:itemId/{complete,reopen,skip}`, `POST /api/v1/offboarding/:id/{exit-interview,complete,cancel}` | `apps/web/src/features/offboarding/api/offboarding-client.ts` & `queries/index.ts` | Uses `customFetch`; forwards `status` and `employeeId` query parameters to `GET /api/v1/offboarding`. | `VERIFIED` |
| **Attendance & Reconciliation** | `/api/v1/attendance/{check-in,check-out,periods,reconcile,adjustments,gps-logs}` | `apps/web/src/features/attendance/` | `AttendanceLayout` exposes `/attendance/management`, `/attendance/summary`, `/attendance/history`, `/attendance/gps-logs`, and `/attendance/analytics` according to user permissions. | `VERIFIED` |
| **Leave Management** | `/api/v1/leave/{requests,balances,types,policies,holidays,approval-inbox}` | `apps/web/src/features/leave/` | `LeaveRequestsPageClient` defaults employee selection for immediate balance display; `LeaveRequestsTable` and `LeaveRequestDetailDialog` enforce `!isSelfRequest` on quick/detail approval actions. | `VERIFIED` |
| **Benefits Plans & Enrollments** | `GET/POST /api/v1/benefits/plans`, `POST /api/v1/benefits/plans/:id/publish`, `GET/POST /api/v1/benefits/enrollments`, `POST /api/v1/benefits/enrollments/:id/{approve,cancel}` | `apps/web/src/features/benefits/api/{benefits,queries,mutations}.ts` | `ListEnrollmentsUseCase` returns `effectiveFrom` and `enrolledAt`; `BenefitEnrollmentsView` resolves employee/plan names, provides status filtering and enrollment dialog (`useEnrollEmployee`), and gates Approve/Cancel on `benefits:manage`. | `VERIFIED` |
| **Expenses Claims & Items** | `GET/POST /api/v1/expenses/claims`, `GET /api/v1/expenses/claims/:id`, `POST /api/v1/expenses/claims/:id/{submit,approve,reject,reimburse}`, `POST /api/v1/expenses/items` | `apps/web/src/features/expenses/api/{expenses,queries,mutations}.ts` | `GetClaimUseCase` returns `description`, `createdAt`, and `items`; `ListClaimsUseCase` returns `description` and `createdAt`; `ExpenseClaimsView` and `ExpenseClaimDetailDialog` gate Approve/Reject on `expenses:manage && !isSelfClaim` and Reimburse on `expenses:manage`. | `VERIFIED` |
| **Payroll (Provisional — `PD-04`)** | `/api/v1/payroll/{salary-structures,periods,runs,payslips}` | `apps/web/src/features/payroll/` | `GeneratePayrollRunUseCase`, `CalculateFinalSettlementUseCase`, `PayrollMapper`, and `PayslipMapper` expose `isProvisional: true` and `calculationStatus: "PROVISIONAL_POLICY_UNCONFIRMED"`. `ApprovePayrollRunUseCase`, `PostPayrollRunUseCase`, and `PublishPayslipUseCase` reject approval, posting, and publishing with `400 Bad Request` (`INVALID_STATE`) when `isProvisional === true`. `PayrollLayout` and `PayslipDetailPageClient` prominently display the `PD-04` Provisional Calculation Warning. | `PROVISIONAL / BLOCKED (PD-04)` |
