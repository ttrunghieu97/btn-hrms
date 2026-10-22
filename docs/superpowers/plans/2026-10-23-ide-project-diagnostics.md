# IDE Project Diagnostics & Test Type-Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate all false-positive and real diagnostics in Zed IDE's Project Diagnostics panel while bringing all `apps/web` and `apps/api` test suites under strict `tsconfig.json` typechecking.

**Architecture:** Unify test files (`*.spec.ts`, `*.spec.tsx`, `test/**/*.ts`) into `apps/web/tsconfig.json` and `apps/api/tsconfig.json` (while preserving `apps/api/tsconfig.build.json` exclusions for production builds), configure `.zed/settings.json` for the monorepo (`vtsls` workspace `tsdk`, disable `eslint` LSP, silence Tailwind v4 `suggestCanonicalClasses`), and fix all 42 underlying TypeScript errors across source and test files.

**Tech Stack:** TypeScript 6.0.3 / `tsrs` (TS 7.1-dev), Next.js 16, NestJS 12, Drizzle ORM, TanStack Query v5, Jest 30, Zed IDE (`vtsls`, `tailwindcss-language-server`).

**Spec:** `docs/superpowers/specs/2026-10-23-ide-project-diagnostics-design.md`

## Global Constraints

- Touch only required lines; no adjacent cleanup unless caused by change (`AGENTS.md`).
- Never add new dependencies, change DB schema, or modify API contracts (`AGENTS.md`).
- Never edit generated code (`src/lib/generated/`, `src/api/generated/`) (`AGENTS.md`).
- Zero errors required across `pnpm check` (`oxlint`, `arch:check`, `tsrs --noEmit`), `tsc --noEmit` (TS 6.0.3), and Jest unit tests for all modified spec files.

## Review Focus

- Production build isolation in `@project/api`: moving `"rootDir": "./src"` to `apps/api/tsconfig.build.json` must ensure `pnpm --filter @project/api build` still emits `dist/main.js` (not `dist/src/main.js`).
- Test-only invalid state inputs in board specs (`board-intent.spec.ts`, `board-validation.spec.ts`): `makeTask` helper must allow arbitrary string `status` values for negative runtime tests without weakening production `Task` types.
- `UserFormSheet` test fixture (`user-form-sheet.spec.tsx`): `sampleUser` must strictly satisfy `UserResponseDto` without extraneous properties.
- Leave mutation test variables (`lifecycle.spec.tsx`, `mutations.spec.tsx`): `useCancelLeaveRequest` must receive `{ id: 'leave-1' }` matching `LeaveManagementControllerCancelMutationVariables`.
- Zed IDE LSP settings (`.zed/settings.json`): `eslint` language server must be disabled for TS/JS buffers while keeping `vtsls` and `tailwindcss-language-server` active.

---

### Task 1: Configure Zed IDE LSP & TypeScript Project Boundaries

**Files:**
- Modify: `.zed/settings.json`
- Modify: `apps/web/tsconfig.json`
- Modify: `apps/api/tsconfig.json`
- Modify: `apps/api/tsconfig.build.json`

**Interfaces:**
- Consumes: `@project/tsconfig/nest.json`, `@project/tsconfig/next.json`
- Produces: Unified `tsconfig.json` coverage for `src/**/*` and test files in both `apps/web` and `apps/api`, while keeping `apps/api/tsconfig.build.json` scoped to `rootDir: "./src"`.

- [ ] **Step 1: Update `.zed/settings.json` to configure `vtsls`, `tailwindcss-language-server`, and disable `eslint` LSP**

```json
{
  "languages": {
    "TypeScript": {
      "language_servers": ["vtsls", "!eslint", "..."]
    },
    "TSX": {
      "language_servers": ["vtsls", "tailwindcss-language-server", "!eslint", "..."]
    },
    "JavaScript": {
      "language_servers": ["vtsls", "!eslint", "..."]
    }
  },
  "lsp": {
    "vtsls": {
      "settings": {
        "typescript": {
          "tsdk": "apps/web/node_modules/typescript/lib"
        },
        "vtsls": {
          "autoUseWorkspaceTsdk": true
        }
      }
    },
    "tailwindcss-language-server": {
      "settings": {
        "tailwindCSS": {
          "lint": {
            "suggestCanonicalClasses": "ignore"
          }
        }
      }
    }
  }
}
```

- [ ] **Step 2: Remove test exclusions from `apps/web/tsconfig.json`**

Update `"exclude"` in `apps/web/tsconfig.json` from `["node_modules", "**/__tests__/**", "**/*.spec.*", "**/*.test.*"]` to `["node_modules"]`.

- [ ] **Step 3: Update `apps/api/tsconfig.json` and `apps/api/tsconfig.build.json` to include `test/**/*.ts` and `drizzle.config.ts` in IDE/typecheck while keeping `rootDir: "./src"` in `tsconfig.build.json`**

In `apps/api/tsconfig.json`: remove `"rootDir": "./src"`, set `"include": ["src/**/*", "test/**/*.ts", "drizzle.config.ts"]`, and `"exclude": ["node_modules", "dist"]`.
In `apps/api/tsconfig.build.json`: add `"compilerOptions": { "rootDir": "./src" }`.

- [ ] **Step 4: Run `pnpm typecheck` to observe the newly exposed test type errors**

Run: `pnpm typecheck`
Expected: FAIL with the 39 previously hidden test type errors across `apps/web` and `apps/api/test/e2e`.

---

### Task 2: Fix Source & E2E TypeScript Diagnostics in `apps/api` and `apps/web`

**Files:**
- Modify: `apps/web/src/features/employees/queries/employee-queries.ts:57-84,879-911`
- Modify: `apps/api/test/e2e/helpers/test-app.ts:1-35,55-83`
- Modify: `apps/api/test/e2e/attendance.e2e-spec.ts:1-12`
- Modify: `apps/api/test/e2e/auth.e2e-spec.ts:1-10,45-50`
- Modify: `apps/api/test/e2e/authorization.e2e-spec.ts:1-13`
- Modify: `apps/api/test/e2e/employee-lifecycle.e2e-spec.ts:1-12`
- Modify: `apps/api/test/e2e/leave.e2e-spec.ts:1-13`

**Interfaces:**
- Consumes: `ScheduleTerminationResponse` from `apps/web/src/features/employees/api/employee-lifecycle.ts`; `PostgresJsDatabase` from `drizzle-orm/postgres-js`.
- Produces: `export type E2eDatabase = PostgresJsDatabase<typeof schema>` in `apps/api/test/e2e/helpers/test-app.ts`; strongly typed `useScheduleTerminationMutation` and `useCancelScheduledTerminationMutation` in `apps/web/src/features/employees/queries/employee-queries.ts`.

- [ ] **Step 1: Type `useScheduleTerminationMutation` and `useCancelScheduledTerminationMutation` in `apps/web/src/features/employees/queries/employee-queries.ts`**

Import `type ScheduleTerminationResponse` from `../api/employee-lifecycle`. Update `useScheduleTerminationMutation` `options` to `UseMutationOptions<ScheduleTerminationResponse, Error, { id: string; data: ScheduleTerminationRequest }>` and `useCancelScheduledTerminationMutation` `options` to `UseMutationOptions<{ success: boolean }, Error, string>`.

- [ ] **Step 2: Export `E2eDatabase` in `apps/api/test/e2e/helpers/test-app.ts` and replace `db: typeof schema` across all 6 e2e test files**

In `apps/api/test/e2e/helpers/test-app.ts`:
```ts
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
export type E2eDatabase = PostgresJsDatabase<typeof schema>;
```
Update `getDb`, `seedAdmin`, `seedRegularUser`, and `cleanupUser` signatures in `test-app.ts` to use `E2eDatabase`, and update `ctx.db?: E2eDatabase` in `attendance.e2e-spec.ts`, `auth.e2e-spec.ts`, `authorization.e2e-spec.ts`, `employee-lifecycle.e2e-spec.ts`, and `leave.e2e-spec.ts`. In `auth.e2e-spec.ts:45`, normalize `const refreshCookie = loginRes.headers["set-cookie"] ?? [];`.

- [ ] **Step 3: Verify `@project/api` typecheck and production build**

Run: `pnpm --filter @project/api typecheck && pnpm --filter @project/api build && test -f apps/api/dist/main.js`
Expected: PASS with exit code 0 and `apps/api/dist/main.js` present.

---

### Task 3: Fix All 26 TypeScript Diagnostics in `apps/web` Test Files

**Files:**
- Modify: `apps/web/src/features/attendance/timesheet-editor/components/detail-sheet.spec.ts:67-80,130-146,182-220,387`
- Modify: `apps/web/src/features/attendance/timesheet-editor/components/timesheet-benchmark.spec.tsx:63-77`
- Modify: `apps/web/src/features/attendance/queries/attendance-queries.spec.tsx:168-170,184-186,205-207`
- Modify: `apps/web/src/features/leave/api/lifecycle.spec.tsx:58,81`
- Modify: `apps/web/src/features/leave/api/mutations.spec.tsx:67,87`
- Modify: `apps/web/src/features/tasks/components/board/__tests__/board-intent.spec.ts:15-17`
- Modify: `apps/web/src/features/tasks/components/board/__tests__/board-validation.spec.ts:10-16,66,85`
- Modify: `apps/web/src/features/users/components/user-form-sheet.spec.tsx:91-100`

**Interfaces:**
- Consumes: `TimesheetWorkspaceRecord`, `TimesheetWorkspaceEmployee` (`apps/web/src/features/attendance/timesheet-editor/types.ts`); `CreateLeaveRequestDto`, `LeaveManagementControllerCancelMutationVariables`, `UserResponseDto` (`apps/web/src/api/generated/model`).
- Produces: Zero TypeScript diagnostics across `apps/web` source and test suites.

- [ ] **Step 1: Fix attendance spec fixtures in `detail-sheet.spec.ts`, `timesheet-benchmark.spec.tsx`, and `attendance-queries.spec.tsx`**

- In `detail-sheet.spec.ts`: populate required nullable fields (`checkIn: null`, `checkOut: null`, `personalBreakMinutes: 0`, `lunchDutyMinutes: 0`, `nightShiftDutyCount: 0`, `waterBoothDutyCount: 0`) on `TimesheetWorkspaceRecord` literals (lines 67, 130, 191, 206); populate `completionRate: 100, lateCount: 0, leaveCount: 0, absentCount: 0, otMinutes: 120, workedMinutes: 960, verificationStatus: 'draft'` on `TimesheetWorkspaceEmployee` (line 182); pass `undefined` as 3rd argument to `computeMonthStats(records, '2026-10', undefined)` at line 387.
- In `timesheet-benchmark.spec.tsx`: add `completionRate: 100, lateCount: 0, leaveCount: 0, absentCount: 0, otMinutes: 0, workedMinutes: 10560` to each employee object in `buildDataset`.
- In `attendance-queries.spec.tsx`: change `session: 'MORNING', type: 'CHECK_IN'` to `session: 'morning', type: 'checkin'` at lines 169, 185, 206.

- [ ] **Step 2: Fix leave, task board, and user form spec types in `lifecycle.spec.tsx`, `mutations.spec.tsx`, `board-intent.spec.ts`, `board-validation.spec.ts`, and `user-form-sheet.spec.tsx`**

- In `lifecycle.spec.tsx` and `mutations.spec.tsx`: add `startSession: 'FULL_DAY', endSession: 'FULL_DAY', totalUnits: 1` to `useCreateLeaveRequest` test payload, and change `result.current.mutate({ data: { id: 'leave-1' } })` to `result.current.mutate({ id: 'leave-1' })` for `useCancelLeaveRequest`.
- In `board-intent.spec.ts` and `board-validation.spec.ts`: change `makeTask` parameter type to `Omit<Partial<Task>, 'status'> & { id: string; status: string }`, remove the duplicate `status: 'created'` default in `board-validation.spec.ts:13`, and include `firstName: 'A', lastName: 'User', employeeCode: 'EMP001'` on `assignee` fixtures at lines 66 and 85 of `board-validation.spec.ts`.
- In `user-form-sheet.spec.tsx`: remove `employeeId: 'emp-101'` from `sampleUser` (or align with `UserResponseDto` properties).

- [ ] **Step 3: Run full verification across typecheck, lint, arch:check, and unit tests**

Run:
```bash
pnpm check && pnpm --filter frontend test -- detail-sheet.spec.ts attendance-queries.spec.tsx lifecycle.spec.tsx mutations.spec.tsx board-intent.spec.ts board-validation.spec.ts user-form-sheet.spec.tsx
```
Expected: PASS with 0 lint/arch/type errors and all 7 Jest test suites passing.
