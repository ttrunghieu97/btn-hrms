# Phase 8 Full-Stack Browser E2E Verification Report (`btn-hrms`)

## 1. Executive Summary & Realism Guarantees

Phase 8 verified the entire `btn-hrms` application end-to-end in a real headless Chromium browser (`@playwright/test`) against the live NestJS backend (`@project/api`), seeded PostgreSQL database (`apps/api/src/infrastructure/database/seed.ts`), and Next.js frontend (`frontend`).

### Non-Negotiable E2E Realism Controls Enforced

| Realism Control | Implementation (`apps/web/e2e/`) | Status |
| :--- | :--- | :---: |
| **Zero Network Mocking** | All E2E specs communicate with the live NestJS API (`/api/v1/*`) and PostgreSQL database; zero `page.route()` stubs or mock API servers are used. | `VERIFIED` |
| **Zero Unhandled Runtime or 5xx Errors** | `attachRuntimeErrorTracker` in `apps/web/e2e/fixtures.ts` attaches `page.on("pageerror")` and `page.on("response")` (`status >= 500` on `/api/`) to every test context (`page`, `adminPage`, `managerPage`, `employeePage`) and asserts zero errors in teardown. | `VERIFIED` |
| **Zero Hard-Coded Sleeps** | Zero `page.waitForTimeout()` calls exist in `apps/web/e2e/`; all synchronization uses Playwright web-first assertions (`await expect(...).toBeVisible()`, `toHaveURL()`, `waitForResponse()`). | `VERIFIED` |
| **Multi-Role `storageState` Isolation** | `apps/web/e2e/auth.setup.ts` authenticates 3 seeded personas (`admin`, `manager`, `employee`) via the real `/auth/sign-in` UI and persists `access_token`, `refresh_token`, and `session_perms` cookies into `playwright/.auth/*.json`. | `VERIFIED` |
| **Full Suite Deterministic Execution** | **17/17 Playwright E2E tests pass (`0` failures, `40.5s` total runtime)** via `pnpm test:e2e`. | `PASS` |

---

## 2. E2E Slice Verification Matrix (`E2E-0` – `E2E-5`)

| Slice ID | Spec File | Roles Exercised | Core Workflows & Invariants Verified | Tests | Status |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **E2E-0** | `auth.setup.ts`<br>`smoke.spec.ts` | Visitor, `admin`, `manager`, `employee`, `probation.emp` | Multi-role UI login setup (`playwright/.auth/{admin,manager,employee}.json`), unauthenticated `/auth/sign-in` rendering, `storageState` persistence across full page reload (`page.reload()`), and complete UI sign-in -> reload -> sign-out lifecycle (`probation.emp`). | `6/6` | `PASS` |
| **E2E-1** | `e2e-1-rbac-scope-isolation.spec.ts` | `admin`, `employee` | **VS-1 / VS-2 / VS-4 Verification**: HR Admin views live metrics on `/overview` & `/workspace/hr` (`Tổng nhân sự >= 4`, Engineering department distribution) and creates/views Notification Templates on `/account/notifications`; Standard Employee is redirected to `/unauthorized` on `/workspace/hr` and `/administration`, does not see the `Mẫu thông báo` tab, and is strictly self-scoped on `/performance/goals` & `/performance/reviews` (`403 Forbidden` on cross-employee review submission). | `2/2` | `PASS` |
| **E2E-2** | `e2e-2-workforce-lifecycle-ess.spec.ts` | `admin`, `employee` | **Workforce Lifecycle & ESS**: HR Admin views decrypted employee PII and active contract details (`HDLD-2026-STD01`, `25.000.000`) on `/employees/[id]` with zero raw AES-GCM ciphertext leakage, and executes Probation Evaluation (`Gia hạn` -> `2026-07-15`) for `EMP-PROB-01`; Standard Employee updates emergency contact phone on `/account/profile` across reload and submits a self-service resignation request (`POST /api/v1/my/resignation-requests`), followed by HR cancellation to preserve repeatable state. | `2/2` | `PASS` |
| **E2E-3** | `e2e-3-attendance-leave-approvals.spec.ts` | `employee`, `manager`, `admin` | **VS-3 Verification**: Standard Employee submits a leave request on `/leave/requests`, Department Manager approves it from the Approval Inbox (`Hộp thư duyệt đơn`), and Employee sees `Đã duyệt` status + updated `Đang chờ duyệt` counter; Employee views `/attendance` and submits a shift change request on `/schedule/my-schedule` (`POST /api/v1/workforce/schedules/schedule-requests`), which HR Admin approves on `/schedule/requests`. | `3/3` | `PASS` |
| **E2E-4** | `e2e-4-payroll-pd04-guard.spec.ts` | `admin` | **Payroll & `PD-04` Fail-Closed Guard**: HR Admin opens/creates payroll run for `PP-2026-10` on `/payroll/runs`, calculates provisional payslips (`POST /api/v1/payroll/runs/:id/generate`), and verifies `PROVISIONAL_POLICY_UNCONFIRMED` badges, warning banners, and disabled `Phê duyệt bảng lương` / `Công bố phiếu lương` buttons across `/payroll/runs/[id]` and `/payroll/payslips/[id]`; verifies `409 Conflict` when attempting to close `PP-2026-10` via `/payroll/periods` UI and `409 Conflict` (`BIZ_004_PAYROLL_POLICY_UNCONFIRMED`) on direct payslip publication. | `2/2` | `PASS` |
| **E2E-5** | `e2e-5-onboarding-tasks-regression.spec.ts` | `admin` | **Onboarding, Tasks & Cross-Domain Regression**: HR Admin creates an Onboarding Template on `/onboarding?tab=templates`, initiates an Onboarding Process, and completes checklist items to `1/1 mục đã hoàn thành`; creates a Task Template on `/tasks?tab=templates`, instantiates a Task (`POST /api/v1/tasks/templates/:id/instantiate`), toggles checklist completion in `TaskDetailSheet` (`PATCH /api/v1/tasks/:id`), and verifies Kanban board rendering; verifies `/offboarding`, `/learning/courses`, and `/organization/departments` render live data cleanly. | `3/3` | `PASS` |

---

## 3. Real Full-Stack Bugs Uncovered & Remediated During Phase 8

Running genuine browser flows against the live backend and database uncovered **13 real full-stack integration defects** that unit tests with mocks could not catch. All 13 were fixed at the root cause:

1. **CSRF Loopback Origin Alias Rejection (`apps/api/src/core/security/guards/jwt-auth.guard.ts`, `apps/api/src/modules/identity/auth/auth.controller.ts`, `apps/api/src/modules/identity/auth/use-cases/logout.usecase.ts`)**:
   - *Symptom*: Cookie-authenticated state-changing requests (`POST`, `PATCH`, `DELETE`) failed with `403 Forbidden` (`CSRF_ORIGIN_MISMATCH`) when `Origin: http://localhost:8080` was proxied to `Host: 127.0.0.1:3001`.
   - *Fix*: Normalized loopback aliases (`localhost:<port>` <-> `127.0.0.1:<port>`) in the CSRF origin allowlist.
2. **Post-Login `session_perms` Cookie Race Condition (`apps/web/src/stores/auth-store.ts`)**:
   - *Symptom*: `signIn()` fired `fetch("/api/auth/permission-session", { method: "POST" })` without `await`, causing Next.js Edge Middleware to evaluate protected route permissions before the encrypted `session_perms` cookie was set.
   - *Fix*: Awaited `fetch("/api/auth/permission-session", { method: "POST" })` concurrently with `usersControllerGetMe()` inside `signIn()` before resolving navigation.
3. **Drizzle JSONB Containment SQL Operator Bug (`apps/api/src/modules/platform-workflow-engine/repositories/platform-workflow-engine.repository.ts`)**:
   - *Symptom*: Background SLA scheduler failed every 60s because `step.config::jsonb @> '{"approverRole": ...}'` ran against `text` column `step_instances.sla_action` instead of joining `workflow_definitions.steps`.
   - *Fix*: Joined `workflowDefinitions` and queried `(${schema.workflowDefinitions.steps})::jsonb @> ${JSON.stringify([{ id: step.stepId, approverRole }])}::jsonb`.
4. **HR Workspace Paginated Envelope Unwrapping (`apps/web/src/features/workspace/api/workspace-api.ts`, `apps/web/src/lib/api-extract.ts`)**:
   - *Symptom*: `/workspace/hr` displayed `0` total employees because `extractList` did not unwrap `{ data: { rows: [...], total } }` envelopes returned by `/api/v1/employees`.
   - *Fix*: Updated `workspace-api.ts` and `extractList` to unwrap `rows` and `meta.total` / `data.total`.
5. **Performance Reviews Empty List Without `cycleId` (`apps/api/src/modules/performance/use-cases/list-reviews.usecase.ts`, `apps/api/src/modules/performance/repositories/review-assignment.repository.ts`)**:
   - *Symptom*: `/performance/reviews` rendered empty when no `cycleId` query parameter was passed.
   - *Fix*: Made `cycleId` optional in `findByCycleWithNames`, ordered results by `createdAt DESC`, and mapped flat `employeeName`, `reviewerName`, and `cycleName` fields for the frontend table.
6. **ESS Resignation & Probation Extension Payload Mismatches (`apps/web/src/features/profile/queries/profile-queries.ts`, `apps/web/src/features/employees/api/employee-lifecycle.ts`)**:
   - *Symptom*: Resignation dialog sent `{ proposedLastDay }` instead of `{ requestedLastWorkingDate }` (`400 Bad Request`), and Probation Evaluation dialog sent `{ newEndDate }` instead of `{ newProbationEndDate }`.
   - *Fix*: Aligned frontend request mappers with backend DTO contracts (`SubmitResignationDto`, `EvaluateProbationDto`).
7. **Leave Approval Inbox Outbox Delay & ID Resolution (`apps/api/src/modules/leave/requests/use-cases/create-leave-request.usecase.ts`, `apps/api/src/integration/leave-approval/leave-approval.gateway.ts`)**:
   - *Symptom*: Newly submitted leave requests did not immediately appear in `/api/v1/approval/inbox` until the background outbox cron ran, and approving via `/api/v1/leave-requests/:id/approve` failed when passed a `leaveRequestId` instead of an `approvalRequestId`.
   - *Fix*: Triggered `outboxDispatcher.dispatchOnce()` best-effort after leave creation and resolved `leaveRequestId -> approvalRequestId` via `LeaveApprovalLinkRepository` in `LeaveApprovalGateway`.
8. **Schedule Request Self-Service Policy & Employee Resolution (`apps/api/src/core/security/policies/workforce.policy.ts`, `apps/api/src/modules/scheduling/requests/schedule-requests.controller.ts`)**:
   - *Symptom*: Standard employees had `schedule:view:self` + `attendance:request:self` in `seed.ts`, whereas `SchedulePolicies.requestSelf` only checked `schedule:request:self`.
   - *Fix*: Allowed `attendance:request:self` in `SchedulePolicies.requestSelf` and auto-populated `employeeId` from `req.user.employeeId` in `ScheduleRequestsController.create`.
9. **Payroll Period Edit DTO Validation & Status Field (`apps/web/src/features/payroll/components/payroll-period-dialog.tsx`)**:
   - *Symptom*: Editing a payroll period sent `year`, `month`, and `attendancePeriodId` in `PATCH /api/v1/payroll/periods/:id`, triggering `400 Bad Request` (`forbidNonWhitelisted`), and the dialog lacked a `status` selector to close periods.
   - *Fix*: Sent only `UpdatePayrollPeriodDto`-whitelisted fields on `PATCH` and added the `Trạng thái kỳ lương` (`draft` / `open` / `closed`) selector when editing.
10. **Unhandled Promise Rejection on `409 Conflict` in Payroll Mutations (`apps/web/src/features/payroll/components/payroll-periods-page-client.tsx`, `apps/web/src/features/payroll/components/payroll-runs-page-client.tsx`)**:
    - *Symptom*: `await updateMutation.mutateAsync(...)` was not wrapped in `try/catch`, causing expected `409 Conflict` (`PD-04`) responses to bubble up as uncaught `pageerror` exceptions.
    - *Fix*: Added `try/catch` blocks around `mutateAsync` calls (error toasts are already handled by mutation `onError` callbacks).
11. **NestJS Route Registration Order Shadowing `GET /api/v1/tasks/templates` (`apps/api/src/modules/tasks/tasks-domain.module.ts`)**:
    - *Symptom*: `TasksModule` (`@Controller("tasks")` with `@Get(":id")`) was imported before `TaskTemplatesModule` (`@Controller("tasks/templates")`), causing `GET /api/v1/tasks/templates` to match `TasksController.findById("templates")` and fail `ParseUUIDPipe` with `400 Bad Request`.
    - *Fix*: Registered `TaskTemplatesModule` before `TasksModule` in `TasksDomainModule`.
12. **Task Template Instantiation Empty Body Crash (`apps/api/src/modules/tasks/task-templates/use-cases/instantiate-task-template.usecase.ts`)**:
    - *Symptom*: `POST /api/v1/tasks/templates/:id/instantiate` with no request body caused `req.body` (`overrides`) to be `undefined`, throwing `TypeError: Cannot read properties of undefined (reading 'title')` (`500 Internal Server Error`).
    - *Fix*: Defaulted `const safeOverrides = overrides ?? {}` and normalized checklist item shapes (`{ text, done }`).
13. **Task Template Checklist DTO Shape & Workflow Action Null Guard (`apps/web/src/features/tasks/components/task-templates-view.tsx`, `apps/web/src/features/tasks/components/task-workflow-actions.tsx`)**:
    - *Symptom*: `TaskTemplatesView` sent `{ title, completed }` instead of `{ text, done }` required by `CreateTaskTemplateDto` (`400 Bad Request`), and `TaskWorkflowActions` called `getActionUiConfig(null)` on initial render before any transition button was clicked (`TypeError` in `TaskDetailSheet`).
    - *Fix*: Updated `TaskTemplatesView` to send `{ text, done: false }` and guarded `getActionUiConfig` in `TaskWorkflowActions` when `pendingTransition` is `null`.

---

## 4. Reproducible Execution Commands

```bash
# 1. Seed deterministic multi-role personas and HRMS domain fixtures
pnpm --filter @project/api db:seed

# 2. Run the full Playwright E2E suite (17 tests across 6 spec files)
pnpm test:e2e

# 3. Run the complete monorepo release gate
pnpm check:all
```
