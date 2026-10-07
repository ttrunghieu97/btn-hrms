# Implementation Tasks

## 1. Schema & Module Scaffold

- [x] 1.1 Add Drizzle tables to `src/infrastructure/database/schema`: `job_requisitions`, `job_postings`, `candidates`, `applications`, `application_stage_events`, `interview_scorecards`, `offers` (with enums for each status/stage)
- [x] 1.2 Run `pnpm --filter @project/api db:push` and verify tables/enums created
- [x] 1.3 Scaffold `apps/api/src/modules/recruitment` with sub-modules `requisitions`, `postings`, `candidates`, `applications`, `offers`, plus shared `domain/events`
- [x] 1.4 Create `RecruitmentModule` and register it in the app root module
- [x] 1.5 Register recruitment domain actions/permissions in the auth policy system

## 2. Requisitions (recruitment-requisitions)

- [x] 2.1 DTOs + mapper for job requisition
- [x] 2.2 Repository with Drizzle queries (create, get, list, update-status)
- [x] 2.3 Create-requisition use-case (status `draft`, headcount ≥ 1 validation)
- [x] 2.4 Edit-requisition use-case (allowed only in `draft`)
- [x] 2.5 Submit-for-approval use-case (create approval request, set `pending_approval`)
- [x] 2.6 Close-requisition use-case (terminal `closed`/`rejected` handling)
- [x] 2.7 Controller with one auth decorator per endpoint + Swagger
- [x] 2.8 Unit tests for status transitions and validation

## 3. Postings (recruitment-postings)

- [x] 3.1 DTOs + mapper for job posting
- [x] 3.2 Repository (create, get, list, update-status)
- [x] 3.3 Publish-posting use-case (only from `approved` requisition, start `open`)
- [x] 3.4 Lifecycle use-case (`open ↔ paused`, `→ closed` terminal)
- [x] 3.5 Controller + Swagger + auth
- [x] 3.6 Unit tests for publish guard and lifecycle transitions

## 4. Candidates (recruitment-candidates)

- [x] 4.1 DTOs + mapper for candidate and application
- [x] 4.2 Repository with email normalization + dedupe lookup
- [x] 4.3 Submit-application use-case (reuse-or-create candidate, `open`-posting guard, start `applied`, block duplicate active application)
- [x] 4.4 CV/document attach via temp-upload → `StorageService.finalizeUpload()` after commit
- [x] 4.5 Controller + Swagger + auth
- [x] 4.6 Unit tests for dedupe, duplicate-application block, and finalize-on-commit behavior

## 5. Pipeline (recruitment-pipeline)

- [x] 5.1 Wire application transitions to `platform-workflow-engine` (allowed-transition check)
- [x] 5.2 Advance-stage use-case updating `current_stage` + appending immutable stage event (actor, from, to, timestamp, note)
- [x] 5.3 Reject/withdraw use-case (terminal from any active stage)
- [x] 5.4 Interview scorecard use-case (only in `interview` stage; per interviewer)
- [x] 5.5 Read endpoints: application detail with stage history and scorecards
- [x] 5.6 Controller + Swagger + auth
- [x] 5.7 Unit tests for disallowed transitions, append-only history, scorecard stage guard

## 6. Offers (recruitment-offers)

- [x] 6.1 DTOs + mapper for offer
- [x] 6.2 Repository (create, get, update-status)
- [x] 6.3 Draft-offer use-case (only when application is in `offer` stage)
- [x] 6.4 Submit-offer-for-approval use-case (approval engine, `pending_approval`)
- [x] 6.5 Record-decision use-case: accept → offer `accepted` + application `hired`; decline → offer `declined` + application `rejected`
- [x] 6.6 Stage `recruitment.candidate.hired` event in outbox inside acceptance transaction
- [x] 6.7 Controller + Swagger + auth
- [x] 6.8 Unit tests for stage guards, decision effects, and outbox staging

## 7. Approval Integration (recruitment-approval)

- [x] 7.1 Create `src/integration/recruitment-approval` mirroring `leave-approval`/`payroll-approval`
- [x] 7.2 Approval policy resolver(s) for requisition and offer subjects
- [x] 7.3 Decision handler service updating requisition/offer status from engine decisions
- [x] 7.4 Inbox/trace wiring + listener/gateway
- [x] 7.5 Integration module registered and tested

## 8. Cross-context Contract

- [x] 8.1 Define `recruitment.candidate.hired` port + payload in `src/contracts` (candidate/offer IDs + minimal snapshot)
- [x] 8.2 Ensure publishing tolerates no registered subscriber (onboarding not yet built)
- [x] 8.3 Document the payload as the stable hand-off contract

## 9. Frontend

- [x] 9.1 Run `pnpm client:generate` to regenerate the API client
- [x] 9.2 Create `apps/web/src/features/recruitment` (queries/service/components) following existing feature conventions
- [x] 9.3 Add `app/(protected)/recruitment` routes and layout
- [x] 9.4 Build views: requisitions list/detail, postings, candidate pipeline board, offer management

## 10. Verification

- [x] 10.1 `pnpm --filter @project/api arch:check` passes (recruitment context registered + boundary-clean; 2 pre-existing attendance/payroll violations are unrelated to this change)
- [x] 10.2 `pnpm --filter @project/api test` for recruitment use-cases and integration (28 tests, 5 suites pass)
- [x] 10.3 `pnpm client:verify` and web `typecheck` (both pass)
- [x] 10.4 `pnpm lint` (recruitment API + FE: 0 errors) and recruitment `tsc --noEmit` clean
- [ ] 10.5 Manual smoke of full funnel: requisition → approve → post → apply → advance → offer → accept → hire event (requires seeded approval policies + running stack; not executed in this environment)
