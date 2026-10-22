# Phase 0 — Repository Reconnaissance & Audit (`btn-hrms`)

## 1. Executive Summary

`btn-hrms` is an enterprise multi-module Human Resource Management System (HRMS) built as a TypeScript monorepo managed with `pnpm` (`pnpm@10.10.0`) and `turbo` (`turbo@2.9.6`). The repository pairs a modular NestJS 11 + Drizzle ORM + PostgreSQL 16 + Redis/BullMQ + MinIO backend (`apps/api`, `@project/api`) with a Next.js 16 App Router + React 19 + Tailwind CSS v4 frontend (`apps/web`, `frontend`).

Rather than a greenfield skeleton, the application already implements **68 route definitions** across **22 domain modules**, backed by an Orval-generated OpenAPI client (`src/api/generated/`), server-driven sidebar navigation (`GET /api/v1/navigation`), fine-grained RBAC (`<Module>:<Action>:<Scope>`), and an automated verification suite (`depcruise`, `authorization:check`, Vitest unit tests, and Playwright E2E tests).

However, a systematic audit across all 22 modules revealed specific **last-mile functional, UX, and navigation gaps** that prevent several secondary and enterprise modules from feeling cohesive and production-complete:
- **Dead / no-op interactive buttons** in `/admin/settings` (`FeatureFlagsCard`, `SecurityConfigCard`, `ObservabilityConfigCard`) and `/admin/integrations` (`onConfigure={() => {}}` and mocked `setTimeout` health test).
- **Hidden administrative routes**: `/admin/integrations` (which hosts the real Webhook Subscriptions CRUD UI) and `/admin/settings` exist in the route registry and sidebar command search, but are absent from the `AdministrationLayout` domain tab bar (`/administration/*`).
- **Broken cross-module navigation link**: `/recruitment/offers` links to `/approvals` (`404 Not Found`) instead of `/administration/approval`.
- **Raw UUID text inputs & raw UUID table columns**:
  - Recruitment (`CreateRequisitionDialog` asks for a raw `departmentId` UUID; `PublishPostingDialog` asks for a raw `requisitionId` UUID).
  - Performance (`Assign Reviewer` dialog in `reviews-view.tsx` asks for raw `employeeId` and `reviewerId` UUIDs).
  - Asset Management (`inventory-view.tsx`, `requests-view.tsx`, and `issues-view.tsx` render raw `assetTypeId`, `requesterEmployeeId`, and `employeeId` UUIDs instead of resolving human-readable names and SKUs).
- **Unwired backend capabilities in Talent, Learning, Benefits, and Recruitment**:
  - `performance/components/goals-view.tsx` hardcodes `'—'` in the goal description column instead of rendering `row.description`.
  - `recruitment/components/candidates-view.tsx` can filter and advance candidates by `postingId`, but lacks a dialog to submit a new candidate application (`POST /api/v1/recruitment/applications`) or upload a CV (`POST /api/v1/recruitment/applications/:id/cv`).
  - `learning` views omit `estimatedHours` when creating a course, lack a "My Enrollments" (`GET /api/v1/learning/enrollments`) & course completion trigger (`POST /api/v1/learning/enrollments/:id/complete`), and lack UI dialogs for issuing/viewing/renewing/revoking employee certifications (`POST /api/v1/learning/certifications/issue`, `GET /api/v1/learning/certifications/employee/:employeeId`).
  - `benefits` views omit `employerContribution`, `employeeContribution`, and `description` inputs when creating a benefit plan, and lack a dependent registration flow (`POST /api/v1/benefits/dependents`).
- **Missing client-side RBAC action gating** on admin/HR mutation controls in `learning`, `benefits`, and `performance` views (causing standard employees to see management buttons that fail with `403 Forbidden` upon submission).

---

## 2. Repository Structure & Technology Stack

### 2.1 Monorepo Layout
| Path | Package / Purpose |
| --- | --- |
| `apps/api` | `@project/api` — NestJS 11 REST + WebSocket API (`port 3001`), Drizzle ORM, BullMQ workers, Swagger/OpenAPI spec generator |
| `apps/web` | `frontend` — Next.js 16.3.8 App Router (`port 8080`), React 19.3.0, Tailwind CSS v4, TanStack Query v5, Orval client |
| `packages/*` | Shared workspace configuration and tooling |
| `docs/` | Architecture Decision Records (`docs/adr/`), specs (`docs/specs/`), ledger (`docs/LEDGER.md`), and verification reports |

### 2.2 Frontend Stack (`apps/web/package.json`)
- **Framework**: Next.js `16.3.8` (App Router, React Compiler enabled, Turbopack dev server) + React `19.3.0`
- **Language**: TypeScript `6.0.3` (strict mode)
- **Styling & Theme System**: Tailwind CSS v4 (`@tailwindcss/postcss` `4.3.2`) + CSS custom properties in `oklch()` color space (`coral` default theme, `slate` theme, `contrast` theme, plus light/dark mode via `next-themes`)
- **UI Primitives**: Radix UI primitives wrapped in `src/components/ui/*` (shadcn/ui New York style), Lucide icons (`lucide-react`), Tabler icons (`@tabler/icons-react`), `cmdk` command palette, `vaul` drawers, `sonner` toasts
- **State & Data Fetching**:
  - Server/Async State: `@tanstack/react-query` `5.99.2` with centralized key factories (`src/lib/query-keys.ts`) and stale-time presets (`src/lib/query-client.ts`)
  - URL Query State: `nuqs` `2.9.0` for shareable filters, tabs, pagination, and search params
  - Client UI State: `zustand` `5.0.12` (sidebar, chat/layout stores)
  - Forms & Validation: `react-hook-form` `7.72.1` + `zod` `4.3.6` + `@hookform/resolvers`
- **Data Tables & Visualization**: `@tanstack/react-table` `8.21.3`, `recharts` `2.15.4`, `@dnd-kit/*` for Kanban/drag-and-drop workflows
- **API Integration**: Orval `8.8.0` generated fetchers (`src/api/generated/*`) backed by `customFetch` (`src/lib/fetcher.ts`) with automatic JWT cookie/header forwarding, token refresh on `401`, and `X-Request-Id` tracing.

---

## 3. Architectural & Quality Gate Invariants

The repository enforces strict automated governance checks that **must pass (`0 errors`)** on every change:

1. **Module Boundary Enforcement (`pnpm --filter frontend depcruise` / `.dependency-cruiser.cjs`)**:
   - `no-circular`: Zero circular dependencies across `src/`.
   - `shared-purity`: `src/shared/`, `src/lib/`, `src/components/ui/`, and `src/hooks/` must **never** import from `src/features/`.
   - `no-imports-to-app`: `src/features/`, `src/shared/`, `src/lib/`, and `src/components/` must **never** import from `src/app/`.
   - `feature-boundary-violation`: A feature in `src/features/<A>/` must **never** reach into internal files of `src/features/<B>/...`; cross-feature imports must strictly go through the barrel `src/features/<B>/index.ts`.
2. **Route & Authorization Parity (`pnpm --filter frontend authorization:check` / `scripts/validate-authorization.mjs`)**:
   - Every `page.tsx` under `src/app/(protected)` must have a matching route definition in `src/shared/authorization/route-registry/routes.ts`.
   - Every static route in `routes.ts` must have a matching `page.tsx`.
   - Every route with a `nav` property must specify `title`, `icon`, and `group`.
3. **Generated Code Immutability**:
   - Files under `src/api/generated/` are generated from the backend OpenAPI spec via `pnpm api:generate` and must never be hand-edited.

---

## 4. Authentication, Authorization, & Navigation Architecture

### 4.1 Authentication & Session Flow
- **Proxy Middleware (`apps/web/src/proxy.ts`)**:
  - Intercepts requests at the edge before rendering.
  - Validates the `access_token` cookie (checking JWT `exp` claim with a 10-second buffer) or falls back to `refresh_token` via `/api/v1/auth/refresh`.
  - Redirects unauthenticated requests on protected routes to `/auth/sign-in?callbackUrl=...`.
  - Redirects authenticated users away from `/auth/*` to `/workspace` and normalizes legacy URLs (`/dashboard/*`, `/leaves/*`, `/departments/*`, etc.).
- **Client Fetcher (`apps/web/src/lib/fetcher.ts`)**:
  - Injects `Authorization: Bearer <token>`, `X-Request-Id`, and `Idempotency-Key` (on POST/PATCH/DELETE).
  - Performs single-flight token refresh on `401 Unauthorized` responses.

### 4.2 Role & Permission Model
- **System Roles**: `ADMIN`, `HR_ADMIN`, `MANAGER`, `EMPLOYEE` (plus custom dynamic RBAC roles managed in `/administration/roles`).
- **Permission Format**: `<Module>:<Action>:<Scope>` (e.g., `Employee:view:all`, `Payroll:approve:all`, `learning:manage:all`, `benefits:manage:all`, `performance:manage:all`).
- **Frontend Gating (`apps/web/src/shared/authorization/`)**:
  - Route-level access is declared in `src/shared/authorization/route-registry/routes.ts` (`auth: { anyPermissions, allPermissions, roles }`) and enforced by `<RequireRouteAccess>` in `src/app/(protected)/layout.tsx`.
  - Action-level access is checked via `usePermissions()` (`hasPermission`, `hasAnyPermission`, `hasRole`).

### 4.3 Hybrid Server + Client Navigation
- **Primary Navigation (`GET /api/v1/navigation`)**:
  - `NavSetupService` and `NavService` in `@project/api` build a permission-filtered navigation tree grouped into 5 top-level workspaces:
    1. `workspace` (`Bàn làm việc` — `/workspace`, `/workspace/hr`, `/tasks`, `/chat`, `/account/notifications`)
    2. `time_attendance` (`Chấm công & Nghỉ phép` — `/attendance/*`, `/schedule/*`, `/leave/*`)
    3. `workforce` (`Hồ sơ & Tổ chức` — `/employees/*`, `/organization/*`, `/onboarding`, `/offboarding`)
    4. `compensation` (`Lương & Phúc lợi` — `/payroll/*`, `/expenses`, `/benefits`)
    5. `talent` (`Tuyển dụng & Phát triển` — `/recruitment/*`, `/performance/*`, `/learning/*`, `/assets/*`)
    6. `administration` (Client-enriched & RBAC-gated — `/administration/*`, `/admin/*`, `/monitoring/*`)
- **Contextual Domain Navigation (`<DomainHeader>`)**:
  - Domain layouts (`attendance`, `schedule`, `leave`, `employees`, `organization`, `payroll`, `recruitment`, `performance`, `learning`, `assets`, `administration`, `monitoring`) render horizontal tab bars for fast switching within a domain.

---

## 5. Module-by-Module Audit Findings

| Domain Module | Backend Support (`@project/api`) | Frontend Implementation (`apps/web`) | Audit Status & Identified Gaps |
| --- | --- | --- | --- |
| **Auth & Session** (`/auth/*`) | Login, refresh, logout, forgot/reset password, change password, session list/revoke | Sign-in, forgot-password, reset-password, active sessions card in `/account/profile` | **Complete & Verified** (covered by `e2e/auth-rbac.spec.ts`) |
| **Workspace & Executive HR** (`/workspace`, `/workspace/hr`, `/activity`) | Dashboard summary, workforce health KPIs, headcount/turnover, audit/activity feed | Personal Bento hub (`WorkspaceHub`), Executive HR dashboard (`HrDashboardView`), Activity feed (`ActivityFeedView`) | **Complete & Verified** (`e2e/workspace-notifications.spec.ts`) |
| **Account & Notifications** (`/account/profile`, `/account/notifications`) | Self-profile update, emergency contacts, resignation request, notifications CRUD, preferences & templates | Profile sheet, contact edit dialog, self-resignation dialog, notification center + preferences + templates | **Complete & Verified** (`e2e/workspace-notifications.spec.ts`, `e2e/workforce-lifecycle.spec.ts`) |
| **Employees & Lifecycle** (`/employees/*`) | CRUD, status transitions, probation evaluation, rehire, transfers, contracts, documents, social insurance, education, timeline | Data table with Quick-Peek drawer, full 360° profile page, contract/document managers, probation/transfer/termination dialogs | **Complete & Verified** (`e2e/workforce-lifecycle.spec.ts`) |
| **Organization** (`/organization/*`) | Departments tree/list, org chart, positions CRUD | Department list, interactive org chart, positions directory & dialogs | **Complete & Verified** |
| **Onboarding & Offboarding** (`/onboarding/*`, `/offboarding/*`) | Templates, processes, task progress, offboarding initiation, exit interview, asset return, final settlement | Templates & processes views, process detail checklists, offboarding detail workflow | **Complete & Verified** (`e2e/onboarding-tasks.spec.ts`) |
| **Attendance & Timekeeping** (`/attendance/*`) | Web check-in/out with camera + GPS, monthly grid, history, management, summary, analytics, timesheet editor, overtime | Camera + lunch duty check-in flow, monthly attendance, history, manager review, timesheet matrix, GPS logs | **Complete & Verified** |
| **Schedule & Shifts** (`/schedule/*`) | Shift definitions, roster matrix, my schedule, shift swap / overtime requests | Calendar view, shift management, roster matrix, my schedule + request dialog | **Complete & Verified** (`e2e/attendance-leave-payroll.spec.ts`) |
| **Leave Management** (`/leave/*`) | Leave requests CRUD, workflow trace timeline, approval inbox, balances, policies | Requests table + trace timeline dialog, approval inbox, balance cards, policy management | **Complete & Verified** (`e2e/attendance-leave-payroll.spec.ts`) |
| **Payroll** (`/payroll/*`) | Dashboard, periods, payroll runs (calc, review, lock, mark-paid, export), payslips, salary structures | Payroll dashboard, period manager, run detail with provisional badge & workflow hero, payslips, salary structures | **Complete & Verified** (`e2e/attendance-leave-payroll.spec.ts`) |
| **Expenses** (`/expenses`) | Expense claims CRUD, submit, approve, reject, reimburse | `ExpensesView` with status filters, create dialog, submit/approve/reject/reimburse actions | **Complete & Functional** |
| **Benefits** (`/benefits/*`) | Benefit plans CRUD & publish, employee enrollments & terminate, dependent registration (`POST /benefits/dependents`) | `PlansView` and `EnrollmentsView` | **Partial Gaps**: `PlansView` create dialog omits employer/employee contribution & description fields; missing `benefits:manage` permission check on admin buttons; `EnrollmentsView` lacks dependent management (`POST /api/v1/benefits/dependents`). |
| **Recruitment** (`/recruitment/*`) | Requisitions, job postings, candidate applications (+ CV upload), interviews, offers | 5 tab views (`requisitions`, `postings`, `candidates`, `interviews`, `offers`) | **UX & Functional Gaps**: (1) `offers-view.tsx` links to `/approvals` (`404`) instead of `/administration/approval`; (2) `requisitions-view.tsx` requires typing raw `departmentId` UUID and lacks status filter UI; (3) `postings-view.tsx` requires typing raw `requisitionId` UUID; (4) `candidates-view.tsx` lacks "Add Candidate Application" (`POST /recruitment/applications`) and CV attachment dialog. |
| **Performance** (`/performance/*`) | Review cycles, reviews (assign, self-review, manager-review, calibrate, acknowledge), goals (create, progress, approve) | `CyclesView`, `ReviewsView`, `GoalsView` | **UX & Bug Gaps**: (1) `goals-view.tsx` hardcodes `'—'` in the Description cell instead of `row.description`; (2) `reviews-view.tsx` "Assign Reviewer" dialog requires typing raw `employeeId` and `reviewerId` UUIDs instead of employee selectors; (3) Missing `performance:manage` RBAC gating on admin actions. |
| **Learning** (`/learning/*`) | Courses, enrollments, complete enrollment, assignments, certifications (create, issue, employee certs, renew, revoke), learning paths (create, assign, complete) | `CoursesView`, `CertificationsView`, `PathsView` | **Functional Gaps**: (1) `CoursesView` omits `estimatedHours` in create dialog and lacks a "My Enrollments" view + "Complete Course" action; (2) `CertificationsView` only lists/creates definitions — cannot issue or view/renew/revoke employee certificates; (3) `PathsView` lacks path assignment/completion actions; (4) Missing `learning:manage` RBAC gating on admin buttons. |
| **Asset Management** (`/assets/*`) | Asset catalog, inventory stock (receive/adjust), asset requests (submit/approve/allocate), asset issues (return) | `CatalogView`, `InventoryView`, `RequestsView`, `IssuesView` | **UX Gaps**: (1) `InventoryView`, `RequestsView`, and `IssuesView` render raw `assetTypeId` and `employeeId` UUIDs instead of resolving names from catalog/employee queries; (2) `InventoryView` lacks a top-level "Nhập kho thiết bị" button to receive stock for newly created catalog items; (3) `RequestsView` lacks a status filter `<Select>`. |
| **Tasks & Chat** (`/tasks`, `/chat`) | Tasks CRUD & board/list views; WebSocket/REST chat rooms & direct messages | `TaskListingPage` + sheets; `ChatViewPage` messenger | **Complete & Verified** (`e2e/onboarding-tasks.spec.ts`) |
| **Administration, Integrations & Settings** (`/administration/*`, `/admin/*`, `/monitoring/*`) | Users, RBAC roles/permissions, unified approval inbox, dynamic workflows, audit logs, webhook subscriptions (`integration-hub`), system health & queues | `administration/*` views, `WebhookSubscriptionsSection` in `/admin/integrations`, `/admin/settings`, `/monitoring/*` | **Navigation & Dead-Control Gaps**: (1) `/admin/integrations` and `/admin/settings` are missing from `AdministrationLayout` tabs; (2) `FeatureFlagsCard`, `SecurityConfigCard`, and `ObservabilityConfigCard` in `/admin/settings` have dead "Save" buttons with no `onClick`; (3) `/admin/integrations` has `onConfigure={() => {}}` and a fake `setTimeout` test handler. |

---

## 6. Integration Strategy & Guardrails

1. **Preserve Core Contracts**: Keep all existing routes, query keys, E2E test selectors/copy, and module boundaries intact.
2. **Eliminate Raw UUID Entry & Display**: Reuse `@/features/employees` (`employeesQueryOptions`, `useDepartmentsQuery`) and domain catalog queries (`requisitionsQueryOptions`, `assetCatalogQueryOptions`) to provide human-readable `<Select>` pickers and lookup maps, while preserving manual fallback input where appropriate.
3. **Wire Real Backend Endpoints**: Connect existing `@project/api` endpoints for Recruitment applications, Learning enrollments/certifications/paths, and Benefits dependents/contributions using `customFetch` and TanStack Query invalidation.
4. **Eliminate Dead Buttons & Broken Links**: Connect `/admin/settings` and `/admin/integrations` controls to persisted state / real health checks & configuration dialogs, fix `/approvals` $\rightarrow$ `/administration/approval`, and surface Integrations & Settings in the Administration tab bar.
