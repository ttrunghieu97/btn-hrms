# AGENTS.md
Repo guide. Keep brief, correct, clean.

Primary Objective:
Maximize architecture quality, maintainability, consistency, security, correctness, and enterprise readiness. During development stage, breaking internal refactors are preferred over preserving flawed architecture.

## Project Context
Enterprise HRMS for one Vietnamese company. Single-tenant, dev-stage, not prod. Prefer correctness, maintainability, clean boundaries. Weak architecture → clean rebuild OK.

## Operating Rules
- Single-tenant only. No tenant abstraction unless asked.
- Dev-stage. Prioritize clean, maintainable, enterprise-grade architecture over backward compatibility.
- No git worktree. No EnterWorktree tool. Work directly on current branch.
- Follow pragmatic enterprise-grade principles, not enterprise-pattern maximalism.
- Fix root cause. No symptom hacks.
- Clean replace/refactor OK when architecture is wrong.
- Minimum code. No speculative features, abstractions, or impossible-case handling.
- No temp shims, duplicate paths, silent fallbacks, or compat hacks without concrete ops reason.
- Breaking internal/API changes are acceptable during dev-stage; update callers, tests, and generated clients immediately.
- DB default: `db:push`. Use `db:migrate` only if requested or production-required.
- Drizzle migration files (`backend/drizzle/`) are **not generated** unless a `db:migrate` workflow is actively in use.
- Edit env files directly when needed. Do not create extra `env.example` / `.env.example` files unless explicitly requested.

## Commands
Root: `pnpm dev` (FE+BE), `dev:api`, `dev:web`, `build`, `lint`, `test`, `client:generate`, `client:verify`.
API (`backend`): `pnpm --filter @project/api dev`, `dev:bootstrap`, `test`, `test:watch`, `test:cov`, `test:e2e`, `db:push`, `db:generate`, `db:migrate`, `db:seed`, `db:reset`, `openapi:json <out>`, `arch:check`.
Web (`frontend`): `pnpm --filter frontend dev`, `lint`, `client:generate`, `typecheck`.

## Backend Architecture (`backend/src`)
Layer stack:
1. `Controller` - HTTP routing, Swagger, auth decorators; delegates to one use-case.
2. `UseCase` - one operation, `execute()`, constructor DI, owns business flow and tx boundary.
3. `Repository` - Drizzle queries, row mapping, optional tx participation; no business decisions.
4. `Mapper` - persistence model ↔ application/response DTO; no validation, auth, enrichment, or business rules. Simple one-to-one mapping may stay inline when a mapper adds no clarity.

Key dirs: `src/app` root module/guards/interceptors; `src/modules` domains; `src/core` security/policies/events; `src/infrastructure` DB/redis/security/storage; `src/shared` stable cross-domain DTOs/interceptors/filters/utils/constants; `src/contracts` ports/ACLs/adapters.
Domains: `identity`, `workforce`, `attendance`, `payroll`, `scheduling`, `tasks`, `analytics`, `recruitment`, `asset-management`, `onboarding`, `offboarding`, `performance`, `training`, `benefits`, `expenses`, `hr-helpdesk`, `platform-notifications`, `platform-workflow-engine`, `platform-approval-engine`, `integration-hub`.
Note: `OnboardingModule` renamed to `BoardingModule` as the single aggregate owner of `boarding_*` tables + `exit_interviews`; `onboarding` and `offboarding` are thin orchestration modules on top.

DDD discipline:
- Apply pragmatic DDD boundaries, not full DDD ceremony.
- Domain ownership must be explicit: one module/context owns each aggregate and its write rules.
- UseCases are application services: orchestrate one business operation, enforce business invariants, own transaction boundary.
- Repositories are persistence adapters only; no business decisions or cross-context orchestration.
- Cross-context reads/writes go through `src/contracts` ports/adapters, never foreign repositories.
- Domain events are for cross-context side effects or async workflows only; stage via outbox inside the transaction.
- Do not introduce CQRS, event sourcing, abstract aggregate base classes, or rich domain models unless the current problem requires them.

Auth:
- Every endpoint has exactly one auth strategy: `@Public()`, `@CheckPolicy(handler)`, `@RequirePolicy({ domain, action })`, or `@RequirePermission([...])`.
- Never stack authorization decorators.
- No decorator → denied by `AuthorizationGuard`.
- Guard order: throttle → JWT → authorization.
- Permission checks belong in auth layer or UseCase, never DTO/mapper/repository.

Responses:
- `TransformInterceptor` wraps into `{ data, meta: { requestId, timestamp, ...pagination }, error: null }`.
- Handlers return plain objects; interceptor normalizes `rows`, `items`, `data`, etc.
- List endpoints reuse shared pagination/filter/sort contracts when possible.

Events/jobs:
- Use domain events only for cross-module side effects or async workflows.
- Do not replace direct synchronous business flow with events/queues unnecessarily.
- Background jobs orchestrate async workflows only; no request-path logic moved to queues without reason.
- Domain events use outbox. Stage inside tx: `EventOutboxService.stage(event, tx)`.
- `EventOutboxDispatcherService` publishes after commit.
- Cross-context integration uses `src/contracts` ports; inject token, not foreign repo.

DB/storage:
- Drizzle + PostgreSQL. Schema: `src/infrastructure/database/schema/tables.ts`. Config: `backend/drizzle.config.ts`.
- Uploads: temp upload → `StorageService.finalizeUpload()` after DB commit.
- S3-compatible; MinIO dev. `PendingFinalizeService` queues file tokens for retry.

Architecture checks:
- `pnpm --filter @project/api arch:check` enforces no direct DB outside repos, no cross-context repo imports, all contexts registered.
- Run before major module restructuring.

## Frontend Architecture (`frontend/src`)
> **Architecture Vision:**
> *The architecture exists to reduce cognitive load, accelerate delivery, and preserve quality as the system grows.*
> *This statement is not an aspiration—it is validated through architecture audits, automated enforcement, and measurable engineering metrics.*

### Current Maturity
Current level: L3 (Enforced)
Roadmap to L4:
- [x] Vision & Principles established
- [x] Blueprint validated on Attendance & Schedule
- [x] Audit 1 (Routing & Navigation) and Audit 2 (Module/Dependency) completed
- [x] Hardening (ESLint, dependency-cruiser, CI gates)
- [x] Metrics & Freeze v1.0 (Frozen)

Feature-sliced layout: `app/` pages; `features/<domain>/{api,queries,schemas,hooks,store,utils}`; `lib/` shared utilities; `api/generated/` orval output (do not edit).

### Feature Module Structure
Each sub-feature module under `features/<domain>/` must adhere to the following blueprint structure:
```text
features/<domain>/<feature-name>/
    api/              # API clients, React Query queries/mutations
    components/       # UI components local to this feature
    hooks/            # React hooks local to this feature
    lib/              # Local utilities and business helpers
    types/            # Local type definitions
    <feature>-view.tsx# Root container component of the feature
    index.ts          # Public API facade (barrel export)
```
- **Rule for Import:** Always import from the feature's entry point (`index.ts`) using barrel imports. Never import internal files of another feature directly.
  - *Correct:* `import { AttendanceHistoryView } from '@/features/attendance/history';`
  - *Incorrect:* `import { AttendanceHistoryView } from '@/features/attendance/history/history-view';`

### Routing Principles
- **URL represents a navigable resource or feature:** Use sub-routes for different features, resources, layout contexts, and permission scopes.
  - *Correct:* `/attendance/history`, `/attendance/analytics`, `/organization/departments`, `/payroll/runs`
  - *Incorrect:* `/attendance?tab=history`, `/attendance?tab=analytics`
- **Query Parameter represents State/Filter:** Use query parameters to represent the state of the current resource, including filtering, searching, sorting, pagination, and view modes.
  - *Correct:* `/employees?status=active`, `/employees?department=hr`, `/employees?page=2`, `/employees?search=john`, `/employees?sort=name`, `/employees?view=grid`
  - *Incorrect:* `/employees/active` (since it is the same entity/table schema, only status filter changes)

API client:
- Generated fetchers: `src/api/generated`.
- Transport: `customFetch` in `src/lib/fetcher.ts`; returns `{ data, status, headers }`.
- Unwrap envelopes via `src/lib/api-extract.ts`.
- API contract changed → run `pnpm client:generate` from root.
- Components/hooks must not call generated API clients directly; wrap inside feature `api/` or `queries/`.
- Auth boundary code such as `stores/auth-store.ts` may call generated auth/session clients directly when it owns token/session lifecycle.

TanStack Query/state:
- Server state: TanStack Query, never Zustand.
- UI/form state: Zustand.
- Validation: TanStack Form + Zod.
- Use `queryPolicyPresets['<domain>']` or `'static'`.
- Use key factories from `createKeyFactory('domain')`.
- Optimistic update: cancel → snapshot → patch → rollback on error → invalidate on settle.

## Boundaries
Transactions:
- Transaction boundary lives in UseCase layer.
- Repositories accept optional tx param.
- Do not start nested transactions inside repositories.
- One business operation = one transaction boundary; keep DB tx short.
- External IO (S3/email/webhook) happens outside DB tx when possible.

Validation:
- Controllers validate transport shape only.
- DTO/Zod/class-validator schemas validate syntax/shape, not DB-dependent business rules.
- Authorization and ownership invariants belong in auth/use-case layer, not validation schemas.
- Business invariants belong in UseCases/domain.

Repositories:
- Query persistence layer, map DB rows, and participate in tx.
- No workflow orchestration across repositories.
- No events, notifications, external IO, or side effects beyond persistence.
- No business decisions, authorization checks, HTTP/request context, or cross-module repo imports.

Cross-domain reads:
- Add port in `src/contracts`, adapter impl, inject token.
- No direct foreign repository/service imports across modules.

## Naming

- UseCase classes: `<Action><Entity>UseCase`.
- Repository classes: `<Entity>Repository`.
- Controllers: `<Entity>Controller`.
- DTOs: request `<Action><Entity>RequestDto`; response `<Entity>ResponseDto`.
- Policy handlers: `<Action><Entity>PolicyHandler`.
- Query keys: `<domain>Keys`.
- Zod schemas: `<entity><Action>Schema`.

## Testing

- Define success criteria before coding; verify after.
- Bugfix → reproduce with failing regression test, then pass.
- Validation → invalid-input tests, then pass.
- Refactor → tests pass before and after.
- UseCase tests are primary.
- Repository tests only for complex queries/tx behavior.
- E2E tests only for critical flows.
- Prefer realistic fakes for internal deps; mock external boundaries only when needed.

## Security

- Never trust client-provided IDs, scopes, roles, permissions, or ownership claims.
- No raw SQL string interpolation.
- Store timestamps in UTC; convert timezone only at presentation boundaries.
- Sensitive ops should emit auditable events/logs when infra exists.
- Validate all external input at boundary; trust internal typed flow.
- Do not log secrets, tokens, credentials, or PII beyond explicit business need.

## Performance

- Optimize only after measurable issue.
- Prefer readability over micro-optimizations.
- Avoid caching unless justified by observed cost or product requirement.
- Prefer duplication over premature abstraction; abstract after repeated stable pattern.

## Forbidden Patterns

- Fat controllers.
- Business logic in mappers, DTOs, schemas, or repositories.
- Direct DB access outside repositories.
- Cross-module repository imports.
- Silent try/catch swallowing.
- Direct fetch calls outside feature `api/`.
- Zustand for server state.
- Shared `utils` dumping ground; prefer feature-local code unless stable cross-domain reuse is proven.
- Generic service layers (`UserService`, `PayrollService`) that bypass explicit UseCases.
- `console.log` in application code.
- Noisy informational logs in hot paths.
- Broad barrel exports that hide deps or create circular imports.
- Unexplained `any`, `unknown`, or unsafe casts.
- New API versioning beyond the existing `/api/v1` prefix unless explicitly required.
- Hexagonal/CQRS/event-sourcing/generic-repository/multi-tenant prep unless asked.

## Execution Rules

- State assumptions. Unsure → ask.
- Multiple meanings → present options.
- Simpler path → say so.
- Confused → stop, name it, ask.
- Touch only required lines. No adjacent cleanup unless caused by change.
- Match style. Remove imports/vars/fns made unused.
- Mention unrelated dead code; do not delete.
- Every changed line traces to req.
- New endpoint: controller → use-case only; no repo imports in controllers.
- Business operations belong in explicit UseCase classes, not generic Services.
- New use-case: one file, one `execute()`, constructor DI only.
- Prefer composition over abstract service/use-case inheritance.
- Errors: `throwBadRequest`, `throwConflict`, `throwForbidden` from `shared/utils/http-error` with `ERROR_CODES` + `ERROR_REASONS`.
- Logging: `ContextLogger` + `RequestContextService`; structured logs with searchable fields.
