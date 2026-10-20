# Full-Stack Playwright E2E Test Suite (`btn-hrms`)

## Running the E2E Suite

```bash
# Run the complete E2E suite from repository root (auto-starts API on :3001 and Web on :8080)
pnpm test:e2e
```

## Architecture & Realism Rules
- **Multi-Role Authentication (`auth.setup.ts`)**: Seeds deterministic `storageState` sessions for `admin` (`admin@hrms.local`), `manager` (`manager.eng@hrms.local`), and `employee` (`employee.std@hrms.local`).
- **Zero-5xx & Zero-PageError Fixture (`fixtures.ts`)**: Attaches listeners to every browser context (`adminPage`, `managerPage`, `employeePage`) that fail tests immediately on any uncaught browser exception (`pageerror`) or unexpected `HTTP >= 500` response on `/api/`.
- **Real Backend & Database**: All tests execute against the live NestJS API (`@project/api`), PostgreSQL database, and Next.js (`frontend`) server with zero `page.route()` mocks or `waitForTimeout()` sleeps.

## Spec Inventory
- `smoke.spec.ts`: Unauthenticated guard redirect and multi-role (`admin`, `manager`, `employee`) session persistence across reload.
- `e2e-1-rbac-scope-isolation.spec.ts`: HR Workspace live headcount metrics (`VS-1`), Notification Templates RBAC & CRUD (`VS-2`), `/administration` route guard, and Performance self-scope isolation (`VS-4`).
- `e2e-2-workforce-lifecycle-ess.spec.ts`: Employee profile & contract PII decryption verification, probation evaluation extension, ESS `/account/profile` contact update, and self-service resignation + HR cancellation (`VS-5`).
- `e2e-3-attendance-leave-approvals.spec.ts`: Employee leave request submission, Manager Approval Inbox approval & balance sync, Attendance live views, and Schedule shift change request + HR approval (`VS-3`).
- `e2e-4-payroll-pd04-guard.spec.ts`: Payroll run creation, provisional payslip calculation (`PROVISIONAL_POLICY_UNCONFIRMED`), and `PD-04` fail-closed guard (`409 Conflict`) on period close and settlement endpoints.
- `e2e-5-onboarding-tasks-regression.spec.ts`: Onboarding template & workflow checklist completion, Task Template creation & instantiation (`VS-5`), task checklist progress & Kanban board, and cross-module regression checks.
