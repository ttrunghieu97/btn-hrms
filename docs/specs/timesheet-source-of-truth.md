# Spec: Monthly Timesheet Source of Truth

## Objective

Create a monthly timesheet workflow in which HR converts check-in/check-out evidence into the authoritative record of actual working time. The workflow serves HR and Payroll; employees receive a printed/exported work-time sheet to sign outside the system and do not approve or edit timesheets in the application.

The authoritative result is a period in `locked` status. Payroll may consume only this locked result. If an employee disputes the printed sheet, HR or Payroll reopens the period with a mandatory reason, corrects it, and locks it again. Every change must be attributable and preserve before/after values.

### Confirmed business rules

- A payroll/timesheet period is one calendar month: `YYYY-MM`, from the 1st through the final calendar day in `Asia/Ho_Chi_Minh`.
- Check-in/check-out remains raw input evidence, not payroll truth.
- HR creates/reviews/corrects/chốt (locks) the monthly timesheet.
- Employee signature is external to the system and does not block payroll.
- Only HR/Payroll roles with explicit permissions can reopen a locked period.
- Reopening requires a non-empty reason; every correction and transition retains actor, timestamp, reason, and prior/new values.

## Assumptions

1. Existing attendance summaries, attendance adjustments, period-lock records, snapshots, audit logs, and outbox are the foundation; this feature will extend them rather than create a parallel timesheet data model.
2. `locked` means HR-chốt and is the payroll eligibility boundary. The existing later `closed` state may remain a downstream administrative terminal, but it must not delay payroll eligibility.
3. The organization already maps HR and Payroll users to attendance permissions; exact role-to-permission assignment will be audited before implementation.
4. Employee signatures are stored outside the system in v1; no e-signature upload, employee portal action, or signature-status workflow is introduced.

## Current-system observations to validate in Phase 0

- The current workspace and period transition services already expose `open → in_review → locked`, but immutable snapshots are currently created on `closed`, after `payroll_posted`.
- The current batch-save service replaces clock events for a day. That must be audited: a timesheet correction must never delete or overwrite raw check-in/check-out evidence.
- Existing employee-verification endpoints are not employee self-service; they must not be treated as employee signature or payroll eligibility in this scope.

## Lifecycle

```text
CHECK-IN / CHECK-OUT (raw evidence)
             │
             ▼
OPEN ── HR starts review ──> IN_REVIEW ── HR chốt ──> LOCKED (SOT; payroll eligible)
  ▲                               │                              │
  └──── HR/Payroll reopens with mandatory reason ────────────────┘

LOCKED → HR exports/prints actual work-time sheet → employee signs outside system

Optional existing downstream lifecycle: LOCKED → PAYROLL_PROCESSING → PAYROLL_POSTED → CLOSED.
It does not change the fact that LOCKED is the Source of Truth for payroll input.
```

## Functional requirements

### FR-1: Monthly period and generation

- HR can open a `YYYY-MM` period. The system validates the format and calculates the calendar-month boundaries in the configured application timezone.
- The system generates/recomputes timesheet rows from eligible employees' raw attendance evidence, approved leave, approved overtime, work schedules, and already-recorded manual adjustments according to existing domain rules.
- Generation is idempotent: repeating it must not duplicate rows or destroy raw attendance evidence.
- A month may be generated only in `open` or `in_review`; it cannot overwrite a locked period.

### FR-2: HR review and correction

- HR can view, filter, and inspect each employee/day row, the calculated actual time, exceptions, and raw check-in/check-out evidence.
- HR can correct resolved working-time values only while the period is editable (`open` or `in_review`).
- Every correction requires a reason from an approved controlled set plus optional detail. It records actor, request/correlation id, timestamp, before values, after values, and links to the employee/day/period.
- Corrections change the resolved timesheet truth; raw clock events remain readable and unchanged.
- Recalculation never silently overwrites a human correction. It either preserves the explicit adjustment or surfaces a conflict for HR review.

### FR-3: Lock/chốt and payroll boundary

- HR sends a period to `in_review`, then an authorized HR/Payroll actor locks it.
- Locking fails if required calculations/validation are incomplete or unresolved blocking exceptions remain. The exact validator list is established in Phase 0 and covered by tests.
- Locking atomically writes the immutable payroll-consumable snapshot/version, period transition history, audit event, and outbox event.
- Payroll reads only the locked snapshot/version for the selected period; it must reject `open` and `in_review` periods.
- A locked period is read-only in all timesheet correction APIs and UI.

### FR-4: Reopen and re-lock

- Only actors with a dedicated reopen permission may reopen a locked period. The request must include a meaningful reason.
- Reopen changes the period back to an editable state, creates an immutable transition record/event, and invalidates/supersedes the prior payroll snapshot without deleting it.
- Re-lock after corrections creates a new immutable version. Payroll can identify the current authoritative version and prior superseded versions for audit.
- Reopening after a payroll run has been posted requires a separate payroll correction/reconciliation process; this is out of scope for the first timesheet slice and must fail safely instead of editing payroll history.

### FR-5: Export and external signature

- HR can export/print the locked monthly actual-work-time sheet per employee and/or as a selected batch.
- The export identifies employee, period, current timesheet version, totals, lock actor, and lock timestamp.
- The app does not collect employee signatures or expose employee approval actions in this scope.

### FR-6: Authorization and auditability

- View, generate/recompute, correct, review, lock, reopen, export, and payroll-consume are independently permission-checked.
- Controller actions delegate to explicit use cases; controllers do not access repositories directly.
- Audit records use `ContextLogger` and `RequestContextService` with searchable `period`, `employeeId`, `actorUserId`, `timesheetVersion`, `reason`, and `action` fields.
- API responses do not disclose records outside the caller's allowed organization scope.

## Non-functional requirements

- All period-changing and correction operations are transactional and idempotent under retry.
- Timezone handling is explicit (`Asia/Ho_Chi_Minh`) at period boundaries and day resolution.
- The implementation supports re-running generation/recalculation safely for a full monthly period.
- Audit history is append-only; no endpoint can erase raw evidence, adjustment history, snapshots, or transition history.

## Out of scope

- Employee self-service timesheet edits, approval, or in-app acknowledgement.
- Electronic signature capture, uploaded signed documents, and signature workflow.
- New payroll calculation rules, salary formulas, or retroactive payroll correction.
- Rebuilding the existing check-in/check-out capture module before the focused audit identifies a required integration fix.

## API and domain boundaries

New mutations belong in focused UseCase classes with one public `execute()` method and constructor dependency injection. Expected operations:

- `GenerateMonthlyTimesheetUseCase`
- `CorrectTimesheetDayUseCase`
- `ReviewTimesheetPeriodUseCase` (reuse existing transition if compliant)
- `LockTimesheetPeriodUseCase` (refactor existing transition only if required)
- `ReopenLockedTimesheetPeriodUseCase`
- `ExportLockedTimesheetUseCase`
- `GetPayrollTimesheetSnapshotUseCase`

Names may be adjusted to match existing conventions after the Phase 0 audit. The key constraint is that controllers call use cases, and use cases use repository/port abstractions.

## Commands

```bash
# Architecture, lint, API tests, frontend type checking/dependency boundaries, builds
pnpm check:all

# Backend focused test suite while implementing a use case
pnpm --filter @project/api test -- --runInBand <path-to-spec>

# API contract generation and web-client consistency
pnpm client:generate
pnpm client:verify

# API architecture guardrails
pnpm --filter @project/api arch:check
```

## Project structure

```text
apps/api/src/modules/attendance/timekeeping/  period workflow, use cases, DTOs, repositories
apps/api/src/infrastructure/database/schema/attendance/  schema and relations
apps/api/src/modules/payroll/                payroll consumer and contracts
apps/web/src/features/attendance/timesheet-editor/  HR timesheet workspace
apps/web/src/app/(protected)/attendance/management/timesheet/  HR route
docs/specs/                                  approved feature specifications
tasks/                                       implementation plans and task checklists
```

## Code style

Follow the existing constructor-injected use-case pattern and structured context logging:

```ts
@Injectable()
export class ReopenLockedTimesheetPeriodUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly repository: TimesheetPeriodRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ReopenLockedTimesheetPeriodUseCase.name);
  }

  async execute(input: ReopenLockedTimesheetPeriodInput) {
    // validate permission/state/reason, transition transactionally, append audit history
  }
}
```

Use `throwBadRequest`, `throwConflict`, or `throwForbidden` with `ERROR_CODES` and `ERROR_REASONS` for business errors. Do not use generic services for new business operations.

## Testing strategy

- Unit tests: state transitions, permission checks, mandatory reasons, period boundaries, correction precedence, and snapshot versioning.
- Repository/integration tests: transaction atomicity, append-only history, locked-period write rejection, idempotent generation, and scoped queries.
- API/controller tests: authorization and validation contracts for every mutation.
- Frontend tests: locked rows cannot be edited; HR sees correction reason/history and action availability correctly.
- E2E: generated month → correction → review → lock → payroll-readable snapshot → reopen with reason → corrected re-lock.

## Boundaries

### Always

- Preserve raw attendance evidence and append audit history.
- Validate all input at API boundaries and permissions for every mutation.
- Run focused tests during each slice and `pnpm check:all` at checkpoints.
- Regenerate API clients whenever public API contracts change.

### Ask first

- Database schema migration, new permission codes, changing existing payroll consumption semantics, or adding dependencies.
- Altering existing `closed`/payroll-posted behavior after the Phase 0 audit.
- Making the external employee-signature step digital or storing signature data.

### Never

- Let payroll consume open/in-review data.
- Delete/replace raw check-in/check-out data during an HR correction.
- Permit a locked-period change without a reason and append-only audit record.
- Commit secrets, weaken authorization, or silently bypass failed period validation.

## Success criteria

- HR can generate and correct a calendar-month timesheet without modifying raw check-in/check-out evidence.
- A locked period has a versioned immutable snapshot, audit history, and payroll-readable canonical result.
- Locked periods reject edit attempts; HR/Payroll can reopen only with a recorded reason and create a new version upon re-lock.
- Employees have no in-app timesheet approval action.
- Full relevant test coverage, API contract verification, architecture checks, and production builds pass.

## Open questions (not blockers for Phase 0 audit)

- Which unresolved attendance exceptions block locking versus remain warnings?
- Is the printed/exported timesheet required as PDF, XLSX, or both?
- Which exact HR and Payroll roles receive the dedicated reopen and payroll-consume permissions?
