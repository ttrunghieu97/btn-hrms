# ADR-002: Fail-Closed Provisional Payroll Guardrails (`PD-04`) & Responsive DataTable Contract

## Status
Accepted

## Date
2026-10-19

## Context
1. **Payroll Statutory Policy Boundary (`PD-04`)**:
   Under `CLAUDE.md` Section 3 (*"Do not invent hard-coded business policies that could materially harm employee compensation, legal rights, privacy, or employment status. Implement configurable policy boundaries, safe defaults, and explicit exception handling where authoritative requirements are unavailable"*), Vietnamese statutory progressive Personal Income Tax (PIT) and compulsory Social Insurance (BHXH/BHYT/BHTN) deduction formulas require formal legal/finance sign-off before releasing real employee payslips or bank payment batches.
2. **Responsive DataTable Width Contract (`6df1b76`)**:
   In commit `6df1b76`, `DataTable` (`apps/web/src/components/ui/table/data-table.tsx`) was upgraded to a container-query responsive architecture (`rpi-table-scope`, `DataTableCardView` below `600px`, priority column hiding, and `<Table className={cn('w-full', ...)} style={{ minWidth: '100%' }}>`), while the outer `div[data-slot='table-container']` in `table.tsx` retains `relative min-w-full w-max` for horizontal scrolling overflow, and `<Table>` switches to `table-fixed` with explicit `width: table.getTotalSize()` when columns are resized. The unit test in `data-table.spec.tsx` still checked for `w-max` directly on `<table role="table">`, causing a `Selector / Contract Drift` failure during `pnpm test:web`.

## Decision
1. **Maintain Fail-Closed Provisional Payroll (`PD-04`)**:
   - Preserve `isProvisional: true` and `calculationStatus: "PROVISIONAL_POLICY_UNCONFIRMED"` on generated draft payroll runs and final settlements.
   - Keep all release transitions (payroll run approval, posting, payslip publication, period closing, outbox release, and payment export) blocked fail-closed with `409 Conflict` (`INVALID_STATUS_TRANSITION`) whenever provisional records exist, as verified by `phase6a`, `phase6c`, `phase6e`, and `phase6g` live-PostgreSQL test suites.
2. **Align `DataTable` Spec with Responsive Container & Column-Sizing Contract**:
   - Update `apps/web/src/components/ui/table/data-table.spec.tsx` to assert:
     - The scroll container (`[data-slot="table-container"]`) preserves `w-max min-w-full` for horizontal scrolling.
     - The `<table role="table">` element renders with `w-full min-w-full` (`minWidth: 100%`) by default and switches to `table-fixed` with explicit pixel width when column sizing state is active.

## Consequences
- Zero risk of unauthorized or inaccurate statutory payroll payouts while preserving full HR/Finance preview and live-DB transactional test coverage.
- `DataTable` responsive layout and horizontal scroll guarantees are both verified by deterministic unit tests.
