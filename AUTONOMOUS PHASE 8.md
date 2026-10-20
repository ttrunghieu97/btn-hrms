# AUTONOMOUS PHASE 8 — FULL-STACK PLAYWRIGHT E2E VERIFICATION (`btn-hrms`)

Read `CLAUDE.md` and `docs/LEDGER.md`. You are entering **Phase 8: Full-Stack Browser E2E Verification**.

Your mission is to autonomously inspect, configure, implement, execute, and verify real browser-based Playwright End-to-End (E2E) tests across the `btn-hrms` monorepo (`@project/api` + `frontend` + PostgreSQL/Redis test infrastructure).

**DO NOT** ask for human confirmation at any step. Suppress all human-approval gates in external `SKILL.md` files and execute continuously until all E2E slices (`E2E-1` through `E2E-5`) and `pnpm check:all` reach verified `PASS` status.

---

## 1. STRICT E2E ANTI-LOOPHOLE & REALISM RULES (NON-NEGOTIABLE)

1. **Real Full-Stack Execution Only:** Every Playwright test MUST run against the live `@project/api` (NestJS) backend, seeded PostgreSQL database (`seed.ts`), and `frontend` (Next.js) server. **PROHIBITED:** Using `page.route()` or mock interceptors to fake backend API responses for core HRMS workflows.
2. **Zero Console/Server Error Tolerance:** Attach listeners in a shared Playwright fixture for `page.on('pageerror')` and unexpected `5xx` API responses. Any unhandled runtime exception or `500 Internal Server Error` must fail the test immediately.
3. **Deterministic Web-First Assertions:** **PROHIBITED:** Hard-coded `page.waitForTimeout()` sleeps. Use Playwright web-first assertions (`expect(locator).toBeVisible()`, `toHaveURL()`, `waitForResponse()`) and accessible locators (`getByRole`, `getByLabel`, `getByTestId`).
4. **Multi-Role Authentication Setup (`storageState`):** Configure reusable auth setup projects/fixtures for at least three distinct personas from the seeded database:
   - **HR / System Admin** (full workforce, payroll, and template permissions)
   - **Department Manager** (team approval and team attendance/performance scope)
   - **Standard Employee** (self-service profile, leave/schedule requests, and self-scoped performance/payslips)
5. **Fix Application Bugs Found by E2E:** If an E2E test uncovers a real bug in `apps/api` or `apps/web` (broken contract, CORS/cookie issue, hydration error, RBAC mismatch, or broken form submission), fix the underlying application code, add/update unit tests if needed, and re-run the E2E suite.

---

## 2. REQUIRED E2E VERTICAL SLICES (`E2E-1` .. `E2E-5`)

Track and execute these slices sequentially in `docs/LEDGER.md`, committing atomically after each slice passes:

### `E2E-0` — E2E Infrastructure, Auth Fixtures & Server Orchestration

- Inspect existing Playwright config (`playwright.config.ts` or workspace equivalent). Create or harden it if incomplete.
- Verify database migration and deterministic seeding (`seed.ts`) before E2E runs.
- Configure `webServer` (or pre-test orchestration) so `@project/api` and `frontend` run reliably in headless CI/local mode.
- Implement multi-role auth setup (`storageState`) and verify login/logout/session persistence.

### `E2E-1` — RBAC, Route Guards & Scope Isolation (`VS-1`, `VS-2`, `VS-4` Verification)

- Verify **HR Admin** can load `/workspace/hr` with live backend metrics (zero mock fallbacks) and access the Templates tab in `/notifications`.
- Verify **Standard Employee** is blocked/hidden from the `/notifications` Templates tab, restricted from `/administration` routes, and isolated to self-scope on `/performance` (cannot view or mutate another employee's review via UI or direct page navigation).

### `E2E-2` — Workforce Lifecycle & Employee Self-Service

- As **HR Admin**: Navigate to `/employees`, create/hire a new employee or inspect a seeded employee on `/employees/[id]`, verify contract/profile tabs load decrypted fields properly, and execute a lifecycle action (probation evaluation or transfer).
- As **Standard Employee**: Navigate to `/profile`, update allowed self-service profile details, submit a resignation or lifecycle request, and verify persistence after page reload.

### `E2E-3` — Attendance, Shift Requests & Leave Approval Workflow (`VS-3` Verification)

- As **Standard Employee**: Submit a leave request (`/leave`) or schedule/attendance exception request (`/attendance` or `/shifts`).
- As **Manager / HR**: Open `/approvals` (or module approval inbox), review and approve the pending request, and verify the status transitions to approved and attendance/leave widgets reflect the change.

### `E2E-4` — Payroll Run & `PD-04` Fail-Closed Guard Verification

- As **HR Admin**: Navigate to `/payroll`, open or create a payroll period/run, trigger provisional payslip calculation, and verify provisional status (`isProvisional`) is rendered in the UI.
- Attempt restricted settlement actions (approve/post payroll run, publish final payslips, close period, or export bank file) and verify the system enforces the **`PD-04` Fail-Closed Guard** (`409 Conflict` / `PROVISIONAL_POLICY_UNCONFIRMED`) with clear user-facing feedback rather than silently succeeding or crashing.

### `E2E-5` — Onboarding, Task Templates & Full Regression Gate

- Verify `/onboarding` and `/tasks` (including task templates and board/list views) load and execute status transitions end-to-end.
- Run the complete Playwright suite (`pnpm test:e2e` or workspace command) followed by `pnpm check:all` (`lint`, `arch:check`, `depcruise`, `authorization:check`, `client:verify`, `typecheck`, `test:api`, `test:web`, `build`).
- Document E2E architecture, executed specs, and results in `docs/testing/e2e-verification-report.md` and update `docs/LEDGER.md`.

---

## 3. EXECUTION LOOP

Follow the mandatory loop for every slice:
`IMPLEMENT E2E SPEC -> RUN PLAYWRIGHT HEADLESS -> INSPECT TRACES/LOGS ON FAILURE -> FIX APP OR TEST -> RE-VERIFY -> COMMIT ATOMICALLY -> UPDATE docs/LEDGER.md`

Begin immediately with `E2E-0`.
