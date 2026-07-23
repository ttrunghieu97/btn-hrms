## Context

The exit half of the employee lifecycle is unbuilt. Termination today is `terminate-employee.usecase.ts` (and the scheduled variant driven by `platform-workflow-engine`) staging `EmployeeTerminatedEvent` on the outbox; five subscribers react independently — identity (`access-control/handlers/employee-lifecycle.handler.ts`) revokes sessions + deactivates, asset-management flags open holdings, leave cancels pending requests, attendance and payroll are log-only stubs. There is no orchestrator, no clearance gate, and no final settlement.

The schema is already latent for offboarding, which shapes this design:
- Tables are named generically `boarding_*` (`boarding_templates`, `boarding_template_items`, `boarding_processes`, `boarding_checklist_items`) with a `boarding_type_enum = [onboarding, offboarding]` discriminator, plus an `exit_interviews` table that only offboarding uses.
- `boarding_process_status_enum = [pending, in_progress, completed, cancelled, terminated]`; `checklist_item_status_enum = [pending, in_progress, completed, skipped]`.
- The `TemplateType` DTO already lists `"offboarding"`; `asset-holdings-reader.port.ts` documents offboarding as its intended consumer.

But the code does not honor this: `OnboardingModule` owns the tables, and `onboarding-process.repository.ts` hardcodes `type="onboarding"` in `findActiveByEmployeeId`, so no offboarding process can be created or queried. `offboarding` is not in the `AGENTS.md` domain list. `employee_status_enum = [working, probation, terminated, leave, suspended, retired]` — there is no `pending_offboarding`/`archived`/`rehired`.

Constraint (`AGENTS.md`): one module owns each aggregate; cross-context access via `src/contracts` ports only; domain events cross-context, staged via outbox inside the transaction; one auth strategy per endpoint.

## Goals / Non-Goals

**Goals:**
- Make the `boarding_*` aggregate serve both flows through one owner, honoring the `type` discriminator the schema already defines.
- Auto-start a `type=offboarding` process on `EmployeeTerminatedEvent`, idempotently.
- Add departmental clearance sign-off that gates process completion.
- Wire exit interviews to the process via the existing `exit_interviews` table.
- Hand off to payroll for final settlement on completion (event + correlation link), without computing amounts in offboarding.
- Keep the existing `onboarding/templates` API and behavior working.

**Non-Goals:**
- Changing `employee_status_enum` or the workforce termination state machine (no `pending_offboarding`/`archived`/`rehired`). Offboarding lifecycle lives on `boarding_processes.status`.
- Computing settlement figures (salary/leave payout/deductions/tax) — that stays in payroll.
- Rewriting the five existing `EmployeeTerminatedEvent` subscribers; they keep reacting as-is. The offboarding subscriber is additive.
- Building a template editor UI beyond what onboarding already has.

## Decisions

### Decision 1: Rename `OnboardingModule` → `BoardingModule` as the single aggregate owner; `onboarding` and `offboarding` are thin orchestration modules on top.

The `boarding_*` tables are one aggregate keyed by a `type` discriminator. `AGENTS.md` mandates a single owner per aggregate, so two modules must not both write these tables. `BoardingModule` owns all `boarding_*` persistence + `exit_interviews` and exports type-parameterized use-cases (`CreateBoardingProcessUseCase(type)`, process/checklist readers). `onboarding` becomes a thin wrapper preserving its `onboarding/templates` routes and onboarding-typed seed; `offboarding` is a new orchestration module that drives the aggregate exclusively through `BoardingModule`'s exported use-cases and owns only offboarding-specific tables.

- **Why not** a standalone `offboarding` module with its own `offboarding_processes`/`offboarding_tasks` tables (the first-draft proposal): duplicates a schema the authors deliberately made dual-type, orphans `exit_interviews`, and splits one aggregate across two owners — a direct `AGENTS.md` violation.
- **Why not** leave everything in `OnboardingModule` and just add offboarding routes there: a module literally named onboarding owning the termination-triggered exit flow is misleading and blocks clean policy/permission separation.
- **Trade-off**: a rename touches imports/registration across the app and the exported use-case signature (`type` param) — a mechanical but repo-wide BREAKING (internal) change. Mitigated by keeping the public `onboarding/templates` HTTP surface unchanged.

### Decision 2: De-hardcode `type` in the process repository.

`onboarding-process.repository.ts:81` hardcodes `type="onboarding"` in `findActiveByEmployeeId`. Generalize the repo to take `type` on create/find so both flows share one code path. Onboarding callers pass `"onboarding"`; the offboarding subscriber passes `"offboarding"`. This is the minimal change that unlocks the latent schema.

### Decision 3: Offboarding auto-start is an idempotent `EmployeeTerminatedEvent` subscriber, mirroring existing consumers.

Add `offboarding/subscribers/employee-terminated.subscriber.ts` following the exact shape of the asset and identity handlers: `OnModuleInit` + `eventBus.on`, guarded by `EventIdempotencyRepository(consumerId, eventId)`, all work inside a transaction with outbox staging. It resolves the active offboarding template and calls the exported `CreateBoardingProcessUseCase("offboarding", …)`.

- **Why not** call offboarding creation directly from `terminate-employee.usecase.ts`: that couples workforce to offboarding and breaks the event-driven boundary the other four consumers already respect. The event already exists and is the seam.
- **Payload sufficiency**: `EmployeeTerminatedPayload = { employeeId, terminatedByUserId, effectiveDate, reason }` — enough to start a process and set the target date. Other data (department for clearance seeding) comes via existing `employee-reader`/`department-reader` contract ports.

### Decision 4: Clearance is offboarding-owned state that gates completion in the use-case layer.

New `offboarding_clearances` (process_id, department, decision `pending|approved|rejected`, decided_by, note, decided_at). Seeded per required department when the process starts. `CompleteProcessUseCase` enforces the gate: all required clearances `approved` AND all mandatory checklist items done, else reject.

- **Why not** model each clearance through `platform-approval-engine`: clearance is a simple per-department sign-off, not a multi-step approval chain. Keep it as owned state for the default flow, and route through `platform-approval-engine` (via an `integration/offboarding-approval` handler mirroring `leave-approval`) only if a department later needs a real approval chain. This keeps the common path light while leaving the escalation seam open.
- **Auth**: one clearance policy per department; the deciding endpoint checks the department's policy so IT cannot sign HR's clearance (one auth strategy per endpoint, per `AGENTS.md`).

### Decision 5: Final settlement is a hand-off, not a calculation.

On completion, stage `offboarding.completed` on the outbox (inside the completion tx) and insert an idempotent `offboarding_settlement_links` (process_id, employee_id, status `pending|processing|settled|failed`). Payroll's existing terminated-subscriber stub becomes the consumer that computes the settlement and reports status back. Offboarding stores only the correlation.

- **Why**: payroll owns compensation data and rules; duplicating settlement math in offboarding would split a second aggregate. The link table lets a process surface "settlement outstanding" without reading payroll internals.

### Decision 6: Schema placement + migration via Drizzle push.

Add `offboarding_clearances` and `offboarding_settlement_links` to the existing `onboarding` schema group (which already holds the shared `boarding_*` + `exit_interviews`), or a new `offboarding` group re-exporting from it — decided at implementation by what keeps relations cleanest. Apply via the repo's standard `db:push` (dev stage, per `db-flow`). No destructive migration: only additive tables; no change to `employee_status_enum` or `boarding_*`.

### Decision 7: Frontend mirrors onboarding, expanded for process detail.

New `apps/web/src/features/offboarding` + `app/(protected)/offboarding` routes: list, process detail (checklist timeline), clearance board, settlement + audit timeline. Onboarding today is templates-only; offboarding needs a process-detail view onboarding lacks, so this extends rather than copies. Regenerate the API client after backend routes land (`client:generate` + `client:verify`).

## Risks / Trade-offs

- **Repo-wide rename blast radius** → Do the `OnboardingModule`→`BoardingModule` rename as an isolated first commit, run `arch:check` + typecheck + tests before layering offboarding on top; keep the `onboarding/templates` HTTP contract byte-identical so the web client needs no change from the rename alone.
- **Shared aggregate coupling** → onboarding and offboarding now share one repo/use-case path; an offboarding-driven change could regress onboarding. Mitigate with tests that assert `type` isolation (offboarding list never returns onboarding processes and vice versa) and keep type-specific logic in the thin modules, not the shared aggregate.
- **Auto-start on every termination may be noisy** (e.g. probation-day exits) → seed from the active template only, log-and-skip when no template exists, and make the subscriber idempotent so reprocessing is safe. Whether some termination reasons should skip offboarding is an open question below.
- **Clearance gate could strand a process** if a department never signs off → completion reports outstanding clearances; add reporting/notification so stuck processes are visible. A force-complete (with elevated policy + audit) can be added if operationally needed.
- **Settlement round-trip depends on payroll implementing the consumer** → until payroll computes settlement, links stay `pending`; the process still completes (settlement shown outstanding), so offboarding is not blocked on payroll delivery.
- **Idempotency across two events** (`EmployeeTerminatedEvent` in, `offboarding.completed` out) → both guarded by `EventIdempotencyRepository`; settlement link creation keyed by process_id to prevent duplicates on retry.

## Migration Plan

1. Rename `OnboardingModule` → `BoardingModule`; move `boarding_*` + `exit_interviews` ownership; update app-root registration + imports. Verify `arch:check`, typecheck, existing onboarding tests, unchanged `onboarding/templates` responses.
2. De-hardcode `type` in the process repository + generalize the exported create use-case; onboarding callers pass `"onboarding"`.
3. Add `offboarding_clearances` + `offboarding_settlement_links` tables; `db:push`.
4. Build `OffboardingModule`: subscriber, process/clearance/exit-interview/complete use-cases, controller, DTOs, policies; register in app root.
5. Add offboarding events + settlement hand-off; wire payroll consumer (or leave link `pending` if deferred).
6. Frontend feature + routes; `client:generate` + `client:verify` + web typecheck.
7. Full `lint` + `build` + `arch:check`; manual smoke: terminate → process auto-created → clearances → exit interview → complete blocked until cleared → complete → `offboarding.completed` + settlement link → asset open-holdings still flagged.

**Rollback**: additive-only. Un-register `OffboardingModule` and drop the two new tables to disable offboarding; the `BoardingModule` rename is behavior-preserving for onboarding and can stay.

## Open Questions

- Should certain termination reasons (e.g. failed-probation, immediate-for-cause) skip auto-start or use a lighter template? Default: always start from the active template.
- Is a force-complete path (elevated policy + audit) needed for stuck clearances at launch, or deferred?
- Does clearance need the full `platform-approval-engine` chain for any department at launch, or is owned-state sign-off sufficient for v1 (approval-engine seam left open)?
- New `offboarding` schema group vs. extending the `onboarding` group — resolve at implementation by relation cleanliness.
