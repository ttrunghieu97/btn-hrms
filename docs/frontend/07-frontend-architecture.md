# Phase 5 — Frontend Architecture (`btn-hrms`)

## 1. Directory & Module Boundary Architecture

`apps/web/src` follows a **Strict Feature-Sliced Architecture** enforced at build/CI time by `dependency-cruiser` (`.dependency-cruiser.cjs`):

```
apps/web/src/
├── api/
│   └── generated/            # Orval-generated OpenAPI client & DTO models (READ-ONLY)
├── app/                      # Next.js 16 App Router thin route entrypoints & layouts
│   ├── (protected)/          # Authenticated routes wrapped by AppSidebar + RequireRouteAccess
│   ├── auth/                 # Public authentication screens (/auth/sign-in, etc.)
│   └── unauthorized/         # 403 fallback route
├── components/               # Shared pure UI & layout components
│   ├── layout/               # AppSidebar, Header, DomainHeader, Section, PageContainer
│   └── ui/                   # Radix + Tailwind primitives (Button, Dialog, Select, Table, etc.)
├── config/                   # Static navigation & module rollout configuration
├── features/                 # Domain modules (isolated behind public index.ts barrels)
│   ├── activity/
│   ├── administration/
│   ├── asset-management/
│   ├── attendance/
│   ├── auth/
│   ├── benefits/
│   ├── chat/
│   ├── employees/
│   ├── expenses/
│   ├── integrations/
│   ├── learning/
│   ├── leave/
│   ├── monitoring/
│   ├── notifications/
│   ├── offboarding/
│   ├── onboarding/
│   ├── organization/
│   ├── payroll/
│   ├── performance/
│   ├── profile/
│   ├── recruitment/
│   ├── schedule/
│   ├── settings/
│   ├── shifts/
│   ├── tasks/
│   └── workspace/
├── hooks/                    # Global hooks (use-nav, use-mobile, use-debounce)
├── lib/                      # Core infrastructure (fetcher, query-client, api-extract, app-copy)
├── shared/                   # Cross-cutting authorization & route registry
│   └── authorization/        # Route registry (routes.ts), RequireRouteAccess, usePermissions
└── styles/                   # Tailwind v4 CSS & oklch theme definitions
```

### 1.1 Architectural Rules (`depcruise`)
1. **Thin App Router Pages**: Files in `src/app/**/page.tsx` only parse search/route params and render a feature view imported from `@/features/<domain>`.
2. **Feature Encapsulation**: Every feature exposes its public surface exclusively through `src/features/<domain>/index.ts`. Cross-feature imports (e.g., `recruitment` or `asset-management` using `employeesQueryOptions` or `useDepartmentsQuery` from `@/features/employees`) **must** import from `@/features/employees` (the barrel), never from `@/features/employees/api/...` directly.
3. **Shared Layer Purity**: `src/shared/`, `src/lib/`, `src/components/`, and `src/hooks/` must never import from `src/features/` or `src/app/`.

---

## 2. State Management Strategy

| State Category | Technology | Architectural Pattern |
| --- | --- | --- |
| **Server / Domain State** | `@tanstack/react-query` v5 | Centralized `queryOptions` factories (`*QueryOptions`) with structured keys (`createKeyFactory` in `src/lib/query-keys.ts`) and domain stale-time presets (`queryPolicyPresets`). Mutations invalidate affected query keys and surface feedback via `sonner` (`toast.success` / `toast.error`). |
| **URL / Filter State** | `nuqs` (`useQueryStates`) | Search terms, status filters, active tabs, and pagination parameters are stored in the URL query string (`?q=...&status=...`) so views are bookmarkable and shareable. |
| **Global UI State** | `zustand` + `localStorage` | Ephemeral layout state (sidebar collapse, chat drawer) and persisted client admin preferences. |
| **Form State** | `react-hook-form` + `zod` / controlled Dialog state | Dialog forms validate required fields, numeric bounds, and enum values before invoking mutations, disabling submit buttons while `isPending` is true. |

---

## 3. API Layer & Error Handling Architecture

1. **Unified Fetcher (`src/lib/fetcher.ts`)**:
   - All Orval-generated clients and domain `customFetch` calls route through `src/lib/fetcher.ts`.
   - Automatically attaches `Authorization: Bearer <access_token>`, `X-Request-Id` (UUIDv4 for end-to-end distributed tracing with `ContextLogger` in `@project/api`), and `Idempotency-Key` on state-mutating requests.
   - Automatically unwraps `{ data, meta }` response envelopes via `unwrapData`, `extractList`, and `extractPagination` (`src/lib/api-extract.ts`).
2. **Resilience & Error Recovery**:
   - Every data view handles 4 explicit states: **Loading** (skeleton/spinner), **Empty** (contextual zero-data guidance), **Error** (destructive alert card or inline retry banner), and **Success**.
   - On `401 Unauthorized`, `customFetch` executes a single-flight `/api/v1/auth/refresh` rotation before retrying the original request.
