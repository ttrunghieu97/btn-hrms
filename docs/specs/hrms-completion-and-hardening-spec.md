# Specification: Enterprise HRMS Completion, RBAC Hardening & Operational Readiness (`btn-hrms`)

## 1. Objective

Deliver a production-ready, security-hardened, fully verified implementation of the `btn-hrms` enterprise Human Resource Management System across its NestJS backend (`@project/api`), Next.js 16 App Router frontend (`frontend`), and shared RBAC package (`@project/permissions`).

### Target Users
- **Employees (ESS)**: View/update personal profile, submit leave/overtime/schedule/expense/resignation requests, complete onboarding/offboarding tasks, track performance goals, and manage notification preferences.
- **Department Managers (MSS)**: Review department attendance, schedules, leave/overtime approvals, transfer approvals, and team performance reviews within their organizational scope.
- **HR Specialists & HR Managers**: Manage organization structure, recruitment/ATS, employee lifecycle (hire, probation evaluation, transfer, promotion, termination, rehire), contracts/addendums, onboarding/offboarding templates, and provisional payroll runs.
- **System Administrators**: Configure roles, permission matrices, approval workflows, task templates, notification templates, webhooks, and audit logs.

---

## 2. DDD Strategic Domain Map & Bounded Context Contracts

### 2.1 Subdomain Classification & Ubiquitous Language
- **Core Domains**:
  1. **Identity & Access Control (`iam`, `@project/permissions`)**: Canonical permission codes (`<module>:<action>[:<scope>]`), 4-tier scope hierarchy (`all > company > department > self`), and fail-closed policy evaluation (`PolicyService`).
  2. **Workforce Lifecycle (`workforce/employees`, `organization`, `contracts`)**: Canonical employee states (`onboarding`, `probation`, `active`, `on_leave`, `notice_period`, `terminated`, `archived`) and contract lifecycle (`draft`, `pending_approval`, `active`, `expired`, `terminated`, `cancelled`), with field-level `AES-256-GCM` encryption on PII columns.
  3. **Attendance, Timekeeping & Scheduling (`attendance`, `scheduling`)**: Shifts, shift assignments, schedule requests, attendance logs/exceptions, overtime requests, and locked attendance periods.
  4. **Payroll & Settlement (`payroll`)**: Payroll periods, salary structures, payroll runs, payslips, and final settlements governed by Segregation of Duties (SoD) and fail-closed provisional calculation guards (`PD-04`).
- **Supporting Domains**:
  - **Leave Management (`leave`)**, **Onboarding & Offboarding (`onboarding`, `offboarding`)**, **Task Management (`tasks`)**, **Recruitment/ATS (`recruitment`)**, **Performance (`performance`)**, **Learning (`learning`)**, **Benefits (`benefits`)**, **Expenses (`expenses`)**, **Assets (`assets`)**.
- **Generic Domains**:
  - **Approval Workflows (`approvals`)**, **Platform Notifications (`platform-notifications`)**, **Integration Hub / Webhooks (`integration-hub`)**, **Analytics & Reporting (`analytics`)**, **Audit Trail (`audit`)**.

### 2.2 Upstream / Downstream Context Contracts
- `Identity / Permissions` (Upstream) $\rightarrow$ All API Controllers & Frontend Routes (Downstream): Every `@RequirePermission` or `@CheckPolicy` decorator MUST reference a valid permission defined in `@project/permissions`. Ad-hoc permission strings not registered in `@project/permissions` are strictly prohibited.
- `Workforce / Attendance / Leave` (Upstream) $\rightarrow$ `Payroll` (Downstream): Payroll run generation consumes immutable attendance period snapshots and active compensation structures via explicit ACLs/repositories without cyclic module imports.

---

## 3. Commands

```bash
# Infrastructure
pnpm infra:up

# Fast Quality Gate (Per Vertical Slice)
pnpm lint
pnpm --filter @project/api arch:check
pnpm --filter @project/api typecheck && pnpm --filter frontend typecheck
pnpm --filter frontend depcruise && pnpm --filter frontend authorization:check
pnpm client:verify

# Combined Check
pnpm check

# Targeted & Full Tests
pnpm test:api
pnpm test:web

# Full Milestone / Release Gate
pnpm check:all
```

---

## 4. Project Structure

```text
apps/api/src/
  core/             -> Security policies, guards, permissions registry, domain events
  infrastructure/   -> Drizzle database schemas (23 domains), migrations, seed, Redis, storage
  modules/          -> 21 bounded-context feature modules (controllers, use-cases, repositories)
  shared/           -> HTTP error utilities, interceptors, observability, pipes
apps/web/src/
  app/              -> Next.js App Router pages ((auth) and (protected) routes)
  components/       -> Shared UI primitives (shadcn/ui, DataTable, error boundaries, auth gates)
  features/         -> 23 domain feature modules (api hooks, components, schemas, tables)
  lib/              -> Fetcher, permission resolver, error taxonomy, generated client
  shared/           -> Route registry and frontend authorization adapters
packages/
  permissions/      -> Canonical RBAC permission catalog & scope hierarchy resolver
docs/
  LEDGER.md         -> Live autonomous execution state & verification ledger
  specs/            -> System specifications
  adr/              -> Architecture Decision Records
  plans/            -> Vertical slice implementation plans
  security/         -> Threat model & AppSec audit report
  testing/          -> Verification & test coverage report
  runbooks/         -> Deployment, backup/restore & operational runbooks
```

---

## 5. Code Style & Architectural Invariants

1. **Controller $\rightarrow$ UseCase Only**: Controllers never import Drizzle repositories or perform raw state mutations. Every business operation lives in an explicit UseCase class with a single `execute()` method and constructor DI.
2. **Error Handling**: Use `throwBadRequest`, `throwConflict`, `throwForbidden`, `throwNotFound` from `shared/utils/http-error` with canonical `ERROR_CODES` and `ERROR_REASONS`.
3. **RBAC Enforcement**: Always validate permissions against `@project/permissions` constants (`Permissions.*`) and `hasPermission()` / `PolicyService` so `sys:all` and scope hierarchies (`all > company > department > self`) resolve deterministically.
4. **Frontend Completeness**: Every user-facing view must use real TanStack Query hooks and cover Empty, Loading/Skeleton, Error, Permission-Denied, and Happy-Path states.

---

## 6. Testing Strategy

- **Unit & Use-Case Tests (`apps/api/src/**/*.spec.ts`)**: Jest with SWC covering domain policies, use-case business invariants, RBAC/IDOR boundaries, and cron schedulers.
- **Live PostgreSQL Integration Tests (`apps/api/src/core/security/guards/phase6*.spec.ts`)**: Transactional rollback tests verifying DB constraints, optimistic locking, and payroll SoD invariants against PostgreSQL 16.
- **Frontend Unit & Component Tests (`apps/web/src/**/*.spec.ts(x)`)**: Jest + React Testing Library verifying UI components, table interactions, permission gates, query mappers, and route authorization.

---

## 7. Boundaries

- **Always**: Run `pnpm check` and targeted tests before committing each vertical slice; maintain `docs/LEDGER.md`.
- **Autonomous Override**: Record architectural assumptions in `docs/adr/` and `docs/LEDGER.md` without halting for routine human confirmation.
- **Never**: Edit generated client files directly, weaken or skip legitimate tests, commit secrets, or invent unauthorized statutory payroll deduction rates (`PD-04`).

---

## 8. Success Criteria

1. `DataTable` component unit tests (`data-table.spec.tsx`) and `/workspace/hr` live data dashboard pass all functional and UX state requirements.
2. `PlatformNotificationsController` and `NotificationsPage` use canonical `@project/permissions` codes (`notifications:manage:all`, `notifications:view:self`) with full unit test coverage.
3. `ScheduleRequestsController` and `DashboardController.getAttendanceStats` enforce strict permission & organizational scope boundaries without leaking cross-employee or company-wide data to self-scoped users.
4. `PerformanceController` & goal/review use-cases enforce strict self-scope isolation for non-managers (`!hasPermission(user, Permissions.PERFORMANCE_MANAGE)`), and `seed.ts` seeds the complete `@project/permissions` catalog.
5. All recently added workforce lifecycle and task-template use-cases have passing `.spec.ts` unit test suites.
6. `pnpm check:all` passes with exit code `0` across the entire monorepo.
