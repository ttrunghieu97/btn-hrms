# Repository Architecture Reconnaissance (`btn-hrms`)

## 1. Monorepo & Workspace Structure

- **Workspace & Package Manager**: `pnpm` (`pnpm-workspace.yaml`) + Turborepo (`turbo.json`), Node.js `>=20`, TypeScript `5.9.3`.
- **Apps**:
  - [`apps/api`](file:///home/hieutt/btn-hrms/apps/api/package.json) (`@project/api`): NestJS 11 REST & WebSocket backend (`/api` global prefix, port `3001`), Drizzle ORM (`0.45.1`) over PostgreSQL (`pg`), Redis (`ioredis`), BullMQ, Socket.IO, Casl/Policy-based ABAC + RBAC.
  - [`apps/web`](file:///home/hieutt/btn-hrms/apps/web/package.json) (`frontend`): Next.js 16 (`16.1.6`) App Router with React 19, TanStack Query v5, Orval-generated OpenAPI client (`src/api/generated/`), Tailwind CSS v4, Radix UI / Shadcn components, Zod + React Hook Form.
- **Shared Packages**:
  - [`packages/permissions`](file:///home/hieutt/btn-hrms/packages/permissions/src/index.ts) (`@project/permissions`): Shared permission constants (`PERMISSIONS`), wildcard matcher (`hasPermission`, `hasAnyPermission`, `hasAllPermissions`), and permission hierarchy resolver (`resolvePermissions`).
  - [`packages/shared`](file:///home/hieutt/btn-hrms/packages/shared) (`@project/shared`): Shared utilities/types across workspaces.
  - [`packages/contracts`](file:///home/hieutt/btn-hrms/packages/contracts) (`@project/contracts`): Shared contract artifacts.

---

## 2. Backend Architecture (`@project/api`)

### 2.1. Layered Module Structure & Architectural Governance
- **Strict Layering**: Enforced by [`apps/api/scripts/architecture-check.ts`](file:///home/hieutt/btn-hrms/apps/api/scripts/architecture-check.ts) (`pnpm --filter @project/api arch:check`) and [`apps/api/.dependency-cruiser.cjs`](file:///home/hieutt/btn-hrms/apps/api/.dependency-cruiser.cjs):
  - **Controllers (`*.controller.ts`)**: Route handling, Swagger metadata, `@CheckPolicy(...)` / `@RequirePermissions(...)`, `@Resource(...)`, `@AuditLog(...)`. Must only inject UseCases (no direct repository or `drizzle-orm` imports).
  - **UseCases (`use-cases/*.usecase.ts`)**: Single-responsibility application command/query handlers with a single `execute()` method and constructor DI.
  - **Domain & Application Services (`domain/`, `services/`)**: Pure domain invariants (`EmployeeLifecyclePolicy`, state transition matrices) and cross-step domain coordination (`EmployeeLifecycleService`).
  - **Repositories (`repositories/*.repository.ts`)**: Encapsulate Drizzle ORM queries and transactions (`AppDatabase`).
- **Global Pipeline** ([`apps/api/src/app/app.module.ts`](file:///home/hieutt/btn-hrms/apps/api/src/app/app.module.ts)):
  - **Guards** (`APP_GUARD` execution order):
    1. `ThrottlerGuard`: Rate limiting.
    2. `JwtAuthGuard` ([`jwt-auth.guard.ts`](file:///home/hieutt/btn-hrms/apps/api/src/core/security/guards/jwt-auth.guard.ts)): Validates Bearer JWT or `access_token` cookie, loads session + permissions + department context via `SecurityRepository.loadAuthSession`, populates `RequestContextService`.
    3. `PermissionsGuard` ([`permissions.guard.ts`](file:///home/hieutt/btn-hrms/apps/api/src/core/security/guards/permissions.guard.ts)): Evaluates `@RequirePermissions(...)` with hierarchy expansion.
    4. `ResourceLoaderGuard` ([`resource-loader.guard.ts`](file:///home/hieutt/btn-hrms/apps/api/src/core/security/guards/resource-loader.guard.ts)): Preloads target entity specified by `@Resource(EntityClass, paramName)` into `req.resource`.
    5. `PolicyGuard` ([`policy.guard.ts`](file:///home/hieutt/btn-hrms/apps/api/src/core/security/guards/policy.guard.ts)): Evaluates ABAC policy handlers decorated via `@CheckPolicy(...)` against `(user, resource)`.
  - **Interceptors** (`APP_INTERCEPTOR`):
    - `RequestIdInterceptor`, `LoggingInterceptor`, `ResponseInterceptor` (normalizes responses to `{ data, meta, error: null }`), `AuditLogInterceptor` (persists `@AuditLog` mutations via `SecurityRepository.createAuditLog`).
  - **Exception Handling** (`APP_FILTER`):
    - `AllExceptionsFilter` ([`all-exceptions.filter.ts`](file:///home/hieutt/btn-hrms/apps/api/src/core/filters/all-exceptions.filter.ts)): Normalizes exceptions using [`http-error.ts`](file:///home/hieutt/btn-hrms/apps/api/src/shared/utils/http-error.ts) (`throwBadRequest`, `throwConflict`, `throwForbidden`, `throwNotFound`, `throwUnprocessable`) with structured `ERROR_CODES` and `ERROR_REASONS`.

### 2.2. Database, Transactions & Event Outbox
- **ORM & Schema**: Drizzle ORM configured via [`apps/api/drizzle.config.ts`](file:///home/hieutt/btn-hrms/apps/api/drizzle.config.ts) with 22 modular schema domains under [`apps/api/src/infrastructure/database/schema/`](file:///home/hieutt/btn-hrms/apps/api/src/infrastructure/database/schema/index.ts) and SQL migrations under `apps/api/drizzle/`.
- **Transactions**: Managed via [`TransactionRunner`](file:///home/hieutt/btn-hrms/apps/api/src/infrastructure/database/transaction-runner.service.ts) or repository `.transaction(tx => ...)` helpers.
- **Transactional Outbox & Events**:
  - [`EventOutboxService`](file:///home/hieutt/btn-hrms/apps/api/src/infrastructure/events/event-outbox.service.ts) stages domain events (`outbox_events` table) within the active database transaction (`tx`).
  - `OutboxProcessorJob` polls pending outbox records and dispatches them via `EventBusService` (`@nestjs/event-emitter`) and BullMQ queues.

### 2.3. Workflow, Approval & Notification Engines
- **`platform-workflow-engine`**: State-machine workflow definitions (`workflow_definitions`), instances (`workflow_instances`), transition logs (`workflow_transitions`), and tasks (`workflow_tasks`). Bootstrapped via `WorkflowBootstrapService` for `employee_transfer` and `employee_termination`.
- **`platform-approval-engine`**: Multi-step approval policies (`approval_policies`), requests (`approval_requests`), steps, and delegations.
- **`platform-notifications`**: Multi-channel notifications (`in_app`, `email`, `webhook`) with template rendering and BullMQ worker processing.

---

## 3. Frontend Architecture (`apps/web`)

- **Routing**: Next.js 16 App Router under `apps/web/src/app/`:
  - `(auth)/login`: Authentication flow.
  - `(dashboard)/`: Protected HRMS workspace routes (`employees`, `recruitment`, `onboarding`, `offboarding`, `departments`, `positions`, `contracts`, `attendance`, `schedules`, `leaves`, `overtime`, `payroll`, `benefits`, `expenses`, `performance`, `learning`, `assets`, `tasks`, `chat`, `analytics`, `settings`, `self-service`).
- **API Layer**:
  - Generated OpenAPI hooks & schemas in `apps/web/src/api/generated/` via `orval.config.ts`.
  - Custom HTTP client [`customFetch`](file:///home/hieutt/btn-hrms/apps/web/src/lib/api/custom-fetch.ts) with automatic 401 token refresh (`refreshAccessTokenSingleFlight`) and envelope unwrapping (`unwrapApiData`).
- **Authorization Layer**:
  - Route/action access matrix in [`apps/web/src/features/authorization/config/routes.ts`](file:///home/hieutt/btn-hrms/apps/web/src/features/authorization/config/routes.ts), enforced by Next.js middleware (`src/proxy.ts`), `<RequirePermission>`, and `usePermissions()` hook.
  - Validated statically by [`apps/web/scripts/validate-authorization.mjs`](file:///home/hieutt/btn-hrms/apps/web/scripts/validate-authorization.mjs) (`pnpm --filter frontend authorization:check`).

---

## 4. Quality Gates & Verification Scripts

| Gate | Command | Purpose |
|---|---|---|
| Lint | `pnpm lint` | ESLint across workspaces |
| Backend Architecture Check | `pnpm --filter @project/api arch:check` | Enforces controller/use-case/repo boundaries and Drizzle isolation |
| Frontend Typecheck | `pnpm --filter frontend typecheck` | Next.js route typegen + `tsc --noEmit` |
| Frontend Dependency Cruise | `pnpm --filter frontend depcruise` | Enforces feature module import boundaries |
| Frontend Authorization Check | `pnpm --filter frontend authorization:check` | Verifies route permission definitions and error contract sync |
| Backend Unit Tests | `pnpm test:api` | Jest unit & spec suites in `apps/api` |
| Full Quality Suite | `pnpm check:all` | Runs lint, arch:check, typecheck, depcruise, and authorization:check |

---

## 5. Preserved Uncommitted Workspace State

At reconnaissance time, the working tree contained uncommitted user modifications across 15 tracked files and 2 untracked paths (in `analytics/dashboard`, `scheduling/requests`, `workforce/employees`, `features/employees`, and `features/recruitment`). All user changes have been preserved and incorporated into the audit and remediation plan.
