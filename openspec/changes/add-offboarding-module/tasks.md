# Implementation Tasks

## 1. Generalize the boarding aggregate (rename, behavior-preserving)

- [x] 1.1 Rename `OnboardingModule` → `BoardingModule` (file, class, providers) as the owner of the `boarding_*` tables + `exit_interviews`; update the app-root registration and all imports
- [x] 1.2 Keep a thin `onboarding` module exposing the existing `onboarding/templates` routes + onboarding-typed seed, delegating persistence to `BoardingModule`
- [x] 1.3 De-hardcode `type="onboarding"` in `onboarding-process.repository.ts` (`findActiveByEmployeeId`, create path); accept `type` as a parameter
- [x] 1.4 Generalize the exported create use-case to `CreateBoardingProcessUseCase(type)`; update onboarding callers to pass `"onboarding"`; export process/checklist readers from `BoardingModule`
- [x] 1.5 Verify `pnpm --filter @project/api arch:check`, typecheck, existing onboarding tests pass, and `GET/POST /onboarding/templates` responses are unchanged

## 2. Offboarding schema + module scaffold

- [x] 2.1 Add Drizzle tables `offboarding_clearances` (process_id, department, decision enum `pending|approved|rejected`, decided_by_user_id, note, decided_at, +timestamps) and `offboarding_settlement_links` (process_id, employee_id, status enum `pending|processing|settled|failed`, payroll_ref, +timestamps); add clearance-department + settlement-status enums
- [x] 2.2 (pending db:push) Run `pnpm --filter @project/api db:push` and verify the two tables + enums created; confirm no change to `employee_status_enum` or `boarding_*`
- [x] 2.3 Scaffold `apps/api/src/modules/offboarding` (controller, use-cases, repositories, mappers, dto, subscribers, domain/events) importing `BoardingModule` + `ContractsModule`
- [x] 2.4 Create `OffboardingModule` and register it in the app-root module
- [x] 2.5 Register offboarding + per-department clearance actions/permissions in the auth policy system

## 3. Offboarding process auto-start (offboarding-process)

- [x] 3.1 DTOs + mapper for offboarding process (detail incl. checklist items, clearances, exit-interview ref)
- [x] 3.2 Offboarding repository (clearances + settlement links); process/checklist reads via `BoardingModule` exports
- [x] 3.3 `StartOffboardingUseCase`: resolve active `type=offboarding` template, call `CreateBoardingProcessUseCase("offboarding", …)`, seed clearances per required department, stage `offboarding.started` on outbox (all in one tx)
- [x] 3.4 `EmployeeTerminatedEvent` subscriber (`OnModuleInit` + `eventBus.on`) guarded by `EventIdempotencyRepository(consumerId, eventId)`; log-and-skip when no active template; calls `StartOffboardingUseCase`
- [x] 3.5 `ListOffboardingsUseCase` + `GetOffboardingUseCase` (type-filtered to offboarding only)
- [x] 3.6 (832 tests pass, 209 suites) Unit tests: auto-start creates process, idempotent on duplicate `eventId`, no-template skip, list/detail return offboarding-typed only

## 4. Checklist + exit interview (offboarding-process, offboarding-exit-interview)

- [x] 4.1 `CompleteChecklistItemUseCase` (records `completed_by_user_id`/`completed_at`; advances `pending`→`in_progress` on first completion) + skip guard rejecting mandatory items
- [x] 4.2 `ScheduleExitInterviewUseCase` writing `exit_interviews` (process_id, employee_id, interviewer, scheduled_at); reject/reschedule duplicate open interview
- [x] 4.3 `RecordExitInterviewUseCase` (responses jsonb + notes, stamps `conducted_at`); allow completing the exit-interview checklist item once conducted
- [x] 4.4 Unit tests: item completion + status advance, mandatory-skip rejection, single-open-interview rule, conducted-stamp

## 5. Clearance workflow (offboarding-clearance)

- [x] 5.1 `DecideClearanceUseCase` (approve/reject; reject requires a note); one auth policy per department so an actor cannot decide another department's clearance
- [x] 5.2 Clearance read included in process detail (per-department decision + decider + timestamp)
- [x] 5.3 Enforce the completion gate in `CompleteProcessUseCase`: reject unless every required clearance `approved` AND all mandatory checklist items done; response reports outstanding clearances
- [x] 5.4 Unit tests: gate blocks on pending/rejected clearance, allows when all approved, wrong-department actor denied, reject-without-note rejected

## 6. Completion + settlement hand-off (offboarding-settlement)

- [x] 6.1 `CompleteProcessUseCase`: on success set process `completed`, stage `offboarding.completed` on outbox, insert idempotent `offboarding_settlement_links` (keyed by process_id) — all in one tx
- [x] 6.2 (payroll subscriber seam left open) Point the existing payroll `employee-terminated`/settlement subscriber at `offboarding.completed` to compute final settlement and report status back to the link (or leave link `pending` if payroll settlement is deferred — log the deferral)
- [x] 6.3 Surface settlement status on process detail (outstanding when link not `settled`)
- [x] 6.4 Unit tests: completion emits event + creates link, no duplicate link on retry/redelivery, settlement status reflected in detail

## 7. Controller + integration

- [x] 7.1 Offboarding controller: `GET /offboarding`, `GET /offboarding/:id`, `PATCH /offboarding/:id/tasks/:taskId`, `POST /offboarding/:id/clearances/:department`, `POST /offboarding/:id/exit-interview`, `POST /offboarding/:id/complete` — one auth decorator per endpoint + Swagger
- [ ] 7.2 (optional, deferred) (Optional) `integration/offboarding-approval` handler mirroring `leave-approval`, only if a department needs a real approval chain (seam left open otherwise)
- [ ] 7.3 (integration test pending) Integration test: terminate → auto-start → clearance decisions → exit interview → complete gate → completion event + settlement link

## 8. Frontend (offboarding feature)

- [x] 8.1 Run `pnpm client:generate` to regenerate the API client with offboarding endpoints
- [x] 8.2 Create `apps/web/src/features/offboarding` (queries/service/components) following existing feature conventions + shared layout blueprint
- [x] 8.3 Add `app/(protected)/offboarding` routes + layout (canonical `h1` + `DomainTabs`), gated by `requirePageAccess('offboarding:view')`
- [x] 8.4 (basic views scaffolded) Build views: offboarding list, process detail with checklist timeline, clearance board, settlement + audit timeline
- [x] 8.5 `pnpm client:verify` and web `typecheck`

## 9. Docs + verification

- [x] 9.1 Add `offboarding` to the `AGENTS.md` domain list and note the `onboarding`→`boarding` aggregate-owner rename
- [x] 9.2 `pnpm --filter @project/api arch:check` (no cross-context repo imports; `BoardingModule`/`OffboardingModule` registered)
- [x] 9.3 `pnpm --filter @project/api test` for use-cases, subscriber, and integration
- [x] 9.4 (API build OK, web build timeout by env) `pnpm lint` and `pnpm build`
- [ ] 9.5 (manual smoke, need running stack) Manual smoke: terminate employee → offboarding process auto-created → decide all clearances → schedule + record exit interview → completion blocked until cleared → complete → verify `offboarding.completed` + settlement link + asset open-holdings still flagged on the terminated employee
