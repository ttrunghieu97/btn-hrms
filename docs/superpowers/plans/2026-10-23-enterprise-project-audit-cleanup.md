# Enterprise Monorepo Audit & YAGNI Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all stray repo artifacts, duplicate/personal scripts, dead source files, test-only modules, and unused NPM dependencies across the `btn-hrms` monorepo, and enforce automated orphan-file gates in `arch:check` and `depcruise`.

**Architecture:** We execute the cleanup in 6 self-contained, verifiable tasks: (1) root/repo artifact & config purge + `.gitignore` hardening, (2) `package.json` script standardization, (3) `apps/api` dead & test-only module purge, (4) `apps/web` dead UI primitives, platform subtrees, feature components & MSW/test helper purge, (5) unused NPM dependency removal & `pnpm-lock.yaml` sync, and (6) automated orphan-file governance gates in `apps/web/.dependency-cruiser.cjs` and `apps/api/scripts/check-arch-all.mjs`.

**Tech Stack:** pnpm workspaces, NestJS 12 (`@project/api`), Next.js 16 (`frontend`), TypeScript 6 / `tsrs`, `oxlint`, `dependency-cruiser`, Jest 30.

**Spec:** `docs/superpowers/specs/2026-10-23-enterprise-project-audit-cleanup-design.md`

## Global Constraints

- Preserve all active uncommitted feature/fix changes in the working tree (`apps/api/src/shared/utils/cookie-csrf.util.ts`, `apps/web/src/lib/env.server.ts`, `apps/web/src/app/(protected)/admin/layout.tsx`, `apps/web/src/features/attendance/timesheet-editor/**`, etc.).
- Do not modify database schemas (`apps/api/src/infrastructure/database/schema/**`), migrations (`apps/api/drizzle/**`), or generated client files (`apps/web/src/api/generated/**`).
- Preserve all production deployment & security scripts in `scripts/deployment/` and `scripts/security/`.
- Preserve `apps/web/src/shared/authorization/route-registry/routes.ts` (consumed by `apps/web/scripts/validate-authorization.mjs` and `apps/web/src/proxy.ts`).
- Preserve `sharp` in `apps/web/package.json` and `@nestjs/platform-socket.io` in `apps/api/package.json`.

## Review Focus

- Next.js App Router special entry files (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `global-error.tsx`, `route.ts`, `instrumentation.ts`, `proxy.ts`) must not be flagged as orphans by `dependency-cruiser`.
- NestJS runtime entrypoints (`src/main.ts`, `src/app/main.ts`), CLI scripts (`src/scripts/*.ts`), database seeds/reset (`src/infrastructure/database/{seed,seed-roles,reset}.ts`), and Drizzle schema files (`src/infrastructure/database/schema/**`) must not be flagged as orphans by `apps/api/scripts/check-orphan-files.mjs`.
- Shared unit test files (`apps/api/src/shared/dto/pagination.dto.spec.ts`, `apps/api/src/shared/observability/observability.spec.ts`, `apps/api/src/core/security/permissions/permissions.registry.spec.ts`, `apps/web/src/features/employees/components/employee-create-page.spec.tsx`) must continue testing live production code after dead imports/describes are trimmed.
- Barrel files (`apps/web/src/components/platform/index.ts`, `apps/web/src/shared/authorization/index.ts`, `apps/web/src/features/workspace/index.ts`, `apps/web/src/features/attendance/index.ts`, `apps/web/src/features/authorization/index.ts`, `apps/web/src/features/uploads/index.ts`) must not re-export deleted modules.
- Internal scripts calling renamed/removed `package.json` scripts (such as `apps/api/package.json` `check` calling `pnpm lint:check`) must be updated to call the canonical script (`pnpm lint`).

---

### Task 1: Purge Repo-Level Stray Artifacts, Personal Scripts & Orphan Configs

**Files:**
- Delete: `apps/api/apps/web/openapi.json`
- Delete: `apps/api/openapi.json`
- Delete: `apps/api/parse_xlsx.js`
- Delete: `apps/api/start.sh`
- Delete: `scripts/dev/idle-watchdog.sh`
- Delete: `apps/api/src/infrastructure/database/check-encoding.sql`
- Delete: `apps/api/storage/reports/BÁO CÁO TÌNH HÌNH SD LAO ĐỘNG 2026.docx`
- Delete: `apps/api/knip.json`
- Delete: `apps/api/skills-lock.json`
- Delete: `apps/web/skills-lock.json`
- Delete: `apps/web/.vercelignore`
- Delete: `.playwright-mcp/` (directory)
- Delete: `apps/web/test-results/` (directory)
- Modify: `.gitignore`

**Interfaces:**
- Consumes: none
- Produces: clean repository root and `.gitignore` rules blocking `apps/api/storage/` and `apps/api/openapi.json`.

- [ ] **Step 1: Delete stray OpenAPI files, personal scripts, sample `.docx`, and orphan config files**

Run:
```bash
rm -rf apps/api/apps apps/api/openapi.json apps/api/parse_xlsx.js apps/api/start.sh scripts/dev/idle-watchdog.sh apps/api/src/infrastructure/database/check-encoding.sql apps/api/storage apps/api/knip.json apps/api/skills-lock.json apps/web/skills-lock.json apps/web/.vercelignore .playwright-mcp apps/web/test-results
```

- [ ] **Step 2: Harden `.gitignore` to prevent re-committing runtime storage and duplicate OpenAPI dumps**

Append to `.gitignore` under `# App-local generated temp files`:
```gitignore
apps/api/openapi.json
apps/api/apps/
apps/api/storage/
```

- [ ] **Step 3: Verify no deleted files remain and `security:check-tracked-secrets` passes**

Run: `pnpm security:check-tracked-secrets && pnpm deployment:check-env --mode=example`
Expected: PASS (exit code 0).

---

### Task 2: Standardize `package.json` Scripts Across Root, API, and Web

**Files:**
- Modify: `package.json:15-26`
- Modify: `apps/api/package.json:26-49`
- Modify: `apps/web/package.json:5-15`

**Interfaces:**
- Consumes: none
- Produces: canonical script definitions in `package.json`, `apps/api/package.json`, and `apps/web/package.json`.

- [ ] **Step 1: Remove duplicate and personal SSH scripts from root `package.json`**

In `package.json`, remove:
- `"deploy:vps"`
- `"deploy:vps:build"`
- `"lint:check"`

- [ ] **Step 2: Remove duplicate and dead seed scripts from `apps/api/package.json`**

In `apps/api/package.json`:
- Remove `"start:dev"`, `"lint:check"`, `"test:unit"`, and `"db:seed:xlsx"`.
- Update `"check"` from `"pnpm lint:check && pnpm arch:check && pnpm typecheck"` to `"pnpm lint && pnpm arch:check && pnpm typecheck"`.

- [ ] **Step 3: Remove duplicate script and template author metadata from `apps/web/package.json`**

In `apps/web/package.json`:
- Remove `"author": { "name": "Kiran", "url": "https://github.com/Kiranism" }`.
- Remove `"lint:arch": "pnpm depcruise"`.

- [ ] **Step 4: Verify canonical scripts execute cleanly**

Run: `pnpm lint`
Expected: PASS (exit code 0).

---

### Task 3: Purge Dead Code and Test-Only Modules in `apps/api`

**Files:**
- Delete: `apps/api/src/core/events/events/certificate-expired.event.ts`
- Delete: `apps/api/src/core/events/events/payroll-financial-publication-completed.event.ts`
- Delete: `apps/api/src/modules/workforce/domain/events/department-moved.event.ts`
- Delete: `apps/api/src/infrastructure/database/seed-employees.ts`
- Delete: `apps/api/src/infrastructure/database/seed-xlsx.ts`
- Delete: `apps/api/src/modules/onboarding/infrastructure/seeds/seed-onboarding-templates.ts`
- Delete: `apps/api/src/modules/identity/auth/use-cases/auth-usecase-base.ts`
- Delete: `apps/api/src/shared/workflow/` (entire directory: 10 files)
- Delete: `apps/api/src/shared/observability/structured-logger.ts`
- Delete: `apps/api/src/shared/logging/logger-redaction.spec.ts`
- Delete: `apps/api/src/shared/dto/base-query.dto.ts`
- Delete: `apps/api/src/modules/identity/access-control/domain/permission-code.ts`
- Delete: `apps/api/src/modules/identity/access-control/domain/permission-code.spec.ts`
- Delete: `apps/api/src/modules/identity/access-control/use-cases/get-effective-access.usecase.ts`
- Delete: `apps/api/src/modules/identity/access-control/use-cases/get-effective-access.usecase.spec.ts`
- Delete: `apps/api/src/modules/identity/permissions/dto/permission-query.dto.ts`
- Delete: `apps/api/src/modules/identity/permissions/dto/permission-query.dto.spec.ts`
- Delete: `apps/api/src/modules/organization/departments/use-cases/move-department-with-event.usecase.ts`
- Delete: `apps/api/src/modules/organization/departments/use-cases/department-hierarchy.invariant.spec.ts`
- Delete: `apps/api/src/modules/workforce/application/use-cases/workforce-outbox-migration.spec.ts`
- Modify: `apps/api/src/core/security/permissions/permissions.registry.spec.ts`
- Modify: `apps/api/src/shared/dto/pagination.dto.spec.ts`
- Modify: `apps/api/src/shared/observability/observability.spec.ts`

**Interfaces:**
- Consumes: none
- Produces: zero unreferenced or test-only `.ts` files in `apps/api/src`.

- [ ] **Step 1: Delete dead and test-only files in `apps/api/src`**

Run:
```bash
rm -rf \
  apps/api/src/core/events/events/certificate-expired.event.ts \
  apps/api/src/core/events/events/payroll-financial-publication-completed.event.ts \
  apps/api/src/modules/workforce/domain/events/department-moved.event.ts \
  apps/api/src/infrastructure/database/seed-employees.ts \
  apps/api/src/infrastructure/database/seed-xlsx.ts \
  apps/api/src/modules/onboarding/infrastructure/seeds \
  apps/api/src/modules/identity/auth/use-cases/auth-usecase-base.ts \
  apps/api/src/shared/workflow \
  apps/api/src/shared/observability/structured-logger.ts \
  apps/api/src/shared/logging/logger-redaction.spec.ts \
  apps/api/src/shared/dto/base-query.dto.ts \
  apps/api/src/modules/identity/access-control/domain/permission-code.ts \
  apps/api/src/modules/identity/access-control/domain/permission-code.spec.ts \
  apps/api/src/modules/identity/access-control/use-cases/get-effective-access.usecase.ts \
  apps/api/src/modules/identity/access-control/use-cases/get-effective-access.usecase.spec.ts \
  apps/api/src/modules/identity/permissions/dto/permission-query.dto.ts \
  apps/api/src/modules/identity/permissions/dto/permission-query.dto.spec.ts \
  apps/api/src/modules/organization/departments/use-cases/move-department-with-event.usecase.ts \
  apps/api/src/modules/organization/departments/use-cases/department-hierarchy.invariant.spec.ts \
  apps/api/src/modules/workforce/application/use-cases/workforce-outbox-migration.spec.ts
```

- [ ] **Step 2: Trim dead imports/assertions in shared API test files**

1. In `apps/api/src/core/security/permissions/permissions.registry.spec.ts`: remove `import { parsePermissionCode } from '../../../modules/identity/access-control/domain/permission-code';` and replace `parsePermissionCode(permission.code)` in `'contains parseable catalog entries'` with inline splitting (`const [domain, action, scope] = permission.code.split(':');`) so catalog format validation remains intact without the dead file.
2. In `apps/api/src/shared/dto/pagination.dto.spec.ts`: remove `import { BaseQueryDto } from "./base-query.dto";` and remove the `it("keeps full query surface on base query DTOs", ...)` test block.
3. In `apps/api/src/shared/observability/observability.spec.ts`: remove `import { StructuredLogger } from "./structured-logger";` and remove `describe("StructuredLogger", ...)`, keeping `describe("TraceMiddleware", ...)`.

- [ ] **Step 3: Verify API typecheck, lint, arch:check, and unit tests pass**

Run: `pnpm --filter @project/api check && pnpm --filter @project/api test -- src/core/security/permissions/permissions.registry.spec.ts src/shared/dto/pagination.dto.spec.ts src/shared/observability/observability.spec.ts`
Expected: PASS.

---

### Task 4: Purge Unused UI Primitives, Platform Subtrees, Dead Features & Test Helpers in `apps/web`

**Files:**
- Delete: `apps/web/src/components/ui/{accordion,aspect-ratio,collapsible,context-menu,drawer,hover-card,input-otp,kbd,menubar,navigation-menu,pagination,resizable,toggle,toggle-group}.tsx`
- Delete: `apps/web/src/components/auth/permission-gate.tsx` and `apps/web/src/components/auth/permission-gate.spec.tsx`
- Delete: `apps/web/src/components/errors/unauthorized-card.tsx`, `apps/web/src/components/errors/unauthorized-dialog.tsx`, `apps/web/src/components/errors/__tests__/error-presentation.components.spec.ts`
- Delete: `apps/web/src/components/workflow/index.ts`
- Delete: `apps/web/src/components/platform/dashboard-intelligence/` (entire directory)
- Delete: `apps/web/src/components/platform/search/` (entire directory)
- Delete: `apps/web/src/components/platform/workflow-timeline/` (entire directory)
- Delete: `apps/web/src/components/platform/widget-registry.ts` and `apps/web/src/components/platform/__tests__/widget-registry.spec.ts`
- Delete: `apps/web/src/shared/authorization/components/` (entire directory)
- Delete: `apps/web/src/shared/authorization/services/` (entire directory)
- Delete: `apps/web/src/shared/authorization/__tests__/components.adapter.spec.ts`
- Delete: `apps/web/src/shared/authorization/__tests__/authorization.service.spec.ts`
- Delete: `apps/web/src/features/authorization/guards/route-access.ts` and `apps/web/src/features/authorization/__tests__/route-access.spec.ts`
- Delete: `apps/web/src/features/attendance/components/presence-columns.tsx` and `apps/web/src/features/attendance/components/presence-management.tsx`
- Delete: `apps/web/src/features/attendance/my-attendance/` (entire directory)
- Delete: `apps/web/src/features/attendance/timesheet-editor/utils.ts`
- Delete: `apps/web/src/features/dashboard/widgets/{compliance-status-card,team-attendance-card,team-leave-card}.tsx`
- Delete: `apps/web/src/features/payroll/components/payroll-nav.tsx`
- Delete: `apps/web/src/features/schedule/api/queries.ts`
- Delete: `apps/web/src/features/settings/components/config-card.tsx`
- Delete: `apps/web/src/features/uploads/hooks/use-temp-upload-field.ts` and `apps/web/src/features/uploads/hooks/use-temp-upload-field.spec.ts`
- Delete: `apps/web/src/features/workspace/api/index.ts`
- Delete: `apps/web/src/features/workspace/components/{admin-quick-actions,admin-security-overview,admin-system-health,quick-actions,today-status,workspace-header}.tsx`
- Delete: `apps/web/src/locales/vi/public-pages.ts`
- Delete: `apps/web/src/test/msw/` (entire directory)
- Delete: `apps/web/src/test/utils/` (entire directory)
- Delete: `apps/web/src/test/factories/{benefits,leave,offboarding,onboarding,performance}.factory.ts`
- Modify: `apps/web/src/components/platform/index.ts`
- Modify: `apps/web/src/shared/authorization/index.ts`
- Modify: `apps/web/src/features/authorization/index.ts`
- Modify: `apps/web/src/features/attendance/index.ts`
- Modify: `apps/web/src/features/uploads/index.ts`
- Modify: `apps/web/src/features/workspace/index.ts`
- Modify: `apps/web/src/features/employees/components/employee-create-page.spec.tsx`

**Interfaces:**
- Consumes: none
- Produces: clean `apps/web/src` barrel files and zero dead/test-only source files.

- [ ] **Step 1: Delete unused `shadcn/ui` primitives, platform subtrees, dead feature components, and unused test helpers**

Run:
```bash
rm -rf \
  apps/web/src/components/ui/accordion.tsx \
  apps/web/src/components/ui/aspect-ratio.tsx \
  apps/web/src/components/ui/collapsible.tsx \
  apps/web/src/components/ui/context-menu.tsx \
  apps/web/src/components/ui/drawer.tsx \
  apps/web/src/components/ui/hover-card.tsx \
  apps/web/src/components/ui/input-otp.tsx \
  apps/web/src/components/ui/kbd.tsx \
  apps/web/src/components/ui/menubar.tsx \
  apps/web/src/components/ui/navigation-menu.tsx \
  apps/web/src/components/ui/pagination.tsx \
  apps/web/src/components/ui/resizable.tsx \
  apps/web/src/components/ui/toggle.tsx \
  apps/web/src/components/ui/toggle-group.tsx \
  apps/web/src/components/auth/permission-gate.tsx \
  apps/web/src/components/auth/permission-gate.spec.tsx \
  apps/web/src/components/errors/unauthorized-card.tsx \
  apps/web/src/components/errors/unauthorized-dialog.tsx \
  apps/web/src/components/errors/__tests__/error-presentation.components.spec.ts \
  apps/web/src/components/workflow/index.ts \
  apps/web/src/components/platform/dashboard-intelligence \
  apps/web/src/components/platform/search \
  apps/web/src/components/platform/workflow-timeline \
  apps/web/src/components/platform/widget-registry.ts \
  apps/web/src/components/platform/__tests__/widget-registry.spec.ts \
  apps/web/src/shared/authorization/components \
  apps/web/src/shared/authorization/services \
  apps/web/src/shared/authorization/__tests__/components.adapter.spec.ts \
  apps/web/src/shared/authorization/__tests__/authorization.service.spec.ts \
  apps/web/src/features/authorization/guards/route-access.ts \
  apps/web/src/features/authorization/__tests__/route-access.spec.ts \
  apps/web/src/features/attendance/components/presence-columns.tsx \
  apps/web/src/features/attendance/components/presence-management.tsx \
  apps/web/src/features/attendance/my-attendance \
  apps/web/src/features/attendance/timesheet-editor/utils.ts \
  apps/web/src/features/dashboard/widgets/compliance-status-card.tsx \
  apps/web/src/features/dashboard/widgets/team-attendance-card.tsx \
  apps/web/src/features/dashboard/widgets/team-leave-card.tsx \
  apps/web/src/features/payroll/components/payroll-nav.tsx \
  apps/web/src/features/schedule/api/queries.ts \
  apps/web/src/features/settings/components/config-card.tsx \
  apps/web/src/features/uploads/hooks/use-temp-upload-field.ts \
  apps/web/src/features/uploads/hooks/use-temp-upload-field.spec.ts \
  apps/web/src/features/workspace/api/index.ts \
  apps/web/src/features/workspace/components/admin-quick-actions.tsx \
  apps/web/src/features/workspace/components/admin-security-overview.tsx \
  apps/web/src/features/workspace/components/admin-system-health.tsx \
  apps/web/src/features/workspace/components/quick-actions.tsx \
  apps/web/src/features/workspace/components/today-status.tsx \
  apps/web/src/features/workspace/components/workspace-header.tsx \
  apps/web/src/locales/vi/public-pages.ts \
  apps/web/src/test/msw \
  apps/web/src/test/utils \
  apps/web/src/test/factories/benefits.factory.ts \
  apps/web/src/test/factories/leave.factory.ts \
  apps/web/src/test/factories/offboarding.factory.ts \
  apps/web/src/test/factories/onboarding.factory.ts \
  apps/web/src/test/factories/performance.factory.ts
```

- [ ] **Step 2: Clean up barrel `index.ts` exports and mock references in `apps/web/src`**

1. `apps/web/src/components/platform/index.ts`: remove re-exports of `./workflow-timeline`, `./dashboard-intelligence`, `./search`, and `./widget-registry`.
2. `apps/web/src/shared/authorization/index.ts`: remove re-exports of `./services/authorization.service`, `./components/CanAccessRoute`, `./components/ResourceGuard`, and `./components/ActionGuard`.
3. `apps/web/src/features/authorization/index.ts`: remove `export { requireRouteAccess } from './guards/route-access';`.
4. `apps/web/src/features/attendance/index.ts`: remove `export { MyAttendanceView } from './my-attendance/my-attendance-view';` (or if `features/attendance/index.ts` becomes empty or only has live exports, keep only live exports).
5. `apps/web/src/features/uploads/index.ts`: remove `export { useTempUploadField } from './hooks/use-temp-upload-field';` and remove `jest.mock('@/features/uploads/hooks/use-temp-upload-field', ...)` from `apps/web/src/features/employees/components/employee-create-page.spec.tsx`.
6. `apps/web/src/features/workspace/index.ts`: remove re-exports of `WorkspaceHeader`, `TodayStatus`, `QuickActions`, `AdminSystemHealth`, `AdminSecurityOverview`, `AdminQuickActions`.

- [ ] **Step 3: Verify Frontend lint, typecheck, authorization:check, and unit tests pass**

Run: `pnpm --filter frontend lint && pnpm --filter frontend typecheck && pnpm --filter frontend authorization:check`
Expected: PASS.

---

### Task 5: Prune Unused NPM Dependencies & Synchronize `pnpm-lock.yaml`

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: cleaned source trees from Tasks 3 and 4
- Produces: pruned `apps/api/package.json`, `apps/web/package.json`, and updated `pnpm-lock.yaml`.

- [ ] **Step 1: Verify zero remaining imports of target packages and remove them from `apps/api/package.json` and `apps/web/package.json`**

1. In `apps/api/package.json`, remove from `dependencies`:
   - `@nestjs/bullmq`
   - `cache-manager-ioredis-yet`
   - `kafkajs`
2. In `apps/web/package.json`, remove from `dependencies` (after confirming 0 imports in `apps/web/src`):
   - `@radix-ui/react-accordion`
   - `@radix-ui/react-aspect-ratio`
   - `@radix-ui/react-collapsible`
   - `@radix-ui/react-context-menu`
   - `@radix-ui/react-hover-card`
   - `@radix-ui/react-label`
   - `@radix-ui/react-menubar`
   - `@radix-ui/react-navigation-menu`
   - `@radix-ui/react-separator`
   - `@radix-ui/react-toast`
   - `@radix-ui/react-toggle`
   - `@radix-ui/react-toggle-group`
   - `dotenv`
   - `input-otp`
   - `ioredis`
   - `react-resizable-panels`
   - `tailwindcss-animate`
   - `vaul`
   And remove from `devDependencies`:
   - `msw`

- [ ] **Step 2: Run `pnpm install` to synchronize `pnpm-lock.yaml`**

Run: `pnpm install`
Expected: Lockfile updated cleanly with exit code 0.

---

### Task 6: Add Automated Orphan-File Governance Gates to `depcruise` & `arch:check`

**Files:**
- Modify: `apps/web/.dependency-cruiser.cjs`
- Create: `apps/api/scripts/check-orphan-files.mjs`
- Modify: `apps/api/scripts/check-arch-all.mjs`

**Interfaces:**
- Consumes: cleaned `apps/web/src` and `apps/api/src`
- Produces:
  - `no-orphans` rule in `apps/web/.dependency-cruiser.cjs`
  - `apps/api/scripts/check-orphan-files.mjs` wired into `CHECKS` in `apps/api/scripts/check-arch-all.mjs`.

- [ ] **Step 1: Add `no-orphans` rule to `apps/web/.dependency-cruiser.cjs`**

Add to `forbidden` array in `apps/web/.dependency-cruiser.cjs`:
```javascript
    {
      name: 'no-orphans',
      severity: 'error',
      comment: 'Orphan module detected. Every source file must be reachable from an application entrypoint or test.',
      from: {
        orphan: true,
        pathNot: [
          '(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$',
          '\\.d\\.ts$',
          '(^|/)tsconfig\\.json$',
          '^src/app/.*(page|layout|loading|error|not-found|global-error|route|template|default)\\.(ts|tsx)$',
          '^src/(instrumentation|proxy|middleware)\\.(ts|tsx)$',
          '^src/api/generated/',
          '\\.(spec|test)\\.(ts|tsx)$'
        ]
      },
      to: {}
    }
```
And sweep any remaining transitively orphaned files in `apps/web/src` flagged by `pnpm --filter frontend depcruise`.

- [ ] **Step 2: Create `apps/api/scripts/check-orphan-files.mjs` and wire it into `apps/api/scripts/check-arch-all.mjs`**

Create `apps/api/scripts/check-orphan-files.mjs` that traverses `apps/api/src/**/*.ts`, resolves relative and `@/` imports starting from valid entrypoints (`src/main.ts`, `src/app/main.ts`, `src/scripts/*.ts`, `src/infrastructure/database/{seed,seed-roles,reset}.ts`, `src/infrastructure/database/schema/**`, and `*.spec.ts` / `*.e2e-spec.ts`), and exits with code 1 if any `.ts` file has zero incoming imports or is unreachable from production entrypoints. Add `{ name: "Orphan Files", cmd: "node", args: ["./scripts/check-orphan-files.mjs"], severity: "fail" }` to `CHECKS` in `apps/api/scripts/check-arch-all.mjs`.

- [ ] **Step 3: Run the complete audit & verification suite**

Run:
1. `pnpm lint`
2. `pnpm --filter @project/api arch:check`
3. `pnpm --filter frontend typecheck`
4. `pnpm --filter frontend depcruise`
5. `pnpm --filter frontend authorization:check`
6. `pnpm test`
7. `pnpm build`

Expected: All 7 gates PASS with 0 errors.
