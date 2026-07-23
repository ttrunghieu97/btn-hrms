## Context

`recruitment` is a declared-but-unbuilt domain in `AGENTS.md`. Today the employee lifecycle starts at `workforce` with no upstream system of record for hiring. This change adds the recruitment context as the top of the funnel (`recruitment → onboarding → workforce`).

The repo is single-tenant, dev-stage, NestJS + Drizzle + PostgreSQL, with a strict Controller → UseCase → Repository → Mapper layering and pragmatic DDD boundaries (`AGENTS.md`). Three platform engines already exist and are mature: `platform-approval-engine`, `platform-workflow-engine`, `platform-notifications`. Cross-context communication goes through `src/contracts` ports and domain events via the outbox, never foreign repositories. There are working integration precedents at `src/integration/leave-approval` and `src/integration/payroll-approval` that wire a domain to the approval engine.

## Goals / Non-Goals

**Goals:**
- Model the hiring funnel: requisition → posting → candidate/application → staged pipeline → offer → hire hand-off.
- Reuse `platform-approval-engine` for requisition and offer approvals via a `src/integration/recruitment-approval` handler mirroring the leave/payroll precedent.
- Reuse `platform-workflow-engine` to drive the multi-stage application pipeline, `storage` for CVs, `platform-notifications` for stage/decision alerts.
- Emit `recruitment.candidate.hired` as an outbound domain event (staged in the outbox) so onboarding/workforce consume it through a `src/contracts` port.
- Keep the recruitment context the sole owner of its aggregates; expose reads to other contexts only via contracts.

**Non-Goals:**
- Onboarding and workforce provisioning logic (only the hand-off event is in scope).
- External job-board syndication (LinkedIn/Indeed), resume parsing/AI screening, candidate self-service portal — future changes.
- Offer letter e-signature and compensation-planning integration.
- Multi-tenant abstractions (single-tenant per `AGENTS.md`).

## Decisions

**1. New bounded context `apps/api/src/modules/recruitment`, not an extension of `workforce`.**
Recruitment owns candidates/applications/offers as its own aggregates with distinct lifecycles and approval flows. Rationale: keeps write rules and pipeline state out of `workforce`; hand-off is a one-way event. Alternative (fold into workforce) rejected — it would blur ownership and bloat the largest existing feature.

**2. Sub-module split inside the context, mirroring `workforce`'s internal layout.**
Split into `requisitions`, `postings`, `candidates`, `applications` (pipeline), `offers`, each with its own controller/use-cases/repositories/mappers/dto, plus a shared `domain/events`. Rationale: matches the five capability specs 1:1 and the established `workforce` structure. Alternative (one flat module) rejected — poor cohesion at this size.

**3. Reuse `platform-approval-engine` via `src/integration/recruitment-approval`.**
Requisition approval and offer approval both route through the approval engine using a policy resolver + decision handler, exactly like `leave-approval`/`payroll-approval` (`approval-inbox`, `*-approval-policy.resolver`, `*-decision.handler.service`). Rationale: proven pattern, no new approval infra. Alternative (bespoke approval state on recruitment tables) rejected — duplicates the engine and its audit trail.

**4. Application pipeline stages driven by `platform-workflow-engine`; recruitment stores the current stage + an append-only stage-event log.**
The workflow engine orchestrates allowed transitions; recruitment persists `applications.current_stage` and `application_stage_events` (immutable transition history with actor, from/to, timestamp, note). Rationale: transition rules live in one engine; recruitment keeps an auditable local projection for queries. Alternative (encode transitions as ad-hoc enum checks in use-cases) rejected — scatters workflow rules.

**5. CV/attachment handling uses the existing temp-upload → finalize pattern.**
Candidate documents follow `StorageService.finalizeUpload()` after DB commit, with `PendingFinalizeService` retry — same as `employee-documents`. No new storage abstraction.

**6. Hire hand-off is an outbound domain event through a contract port, not a direct call.**
On offer acceptance, the offer use-case stages `recruitment.candidate.hired` in the outbox inside the transaction; `EventOutboxDispatcherService` publishes after commit. A new port in `src/contracts` defines the payload consumed by onboarding/workforce. Rationale: matches the cross-context rule in `AGENTS.md`. Alternative (recruitment calling a workforce use-case) rejected — violates context boundaries.

**7. Candidate dedupe by normalized email at the candidate aggregate, unique per candidate (not per application).**
A person can apply to multiple postings; one `candidate` row, many `applications`. Rationale: prevents duplicate profiles while allowing re-application.

**8. Schema via `db:push` (dev-stage default).**
New tables: `job_requisitions`, `job_postings`, `candidates`, `applications`, `application_stage_events`, `interview_scorecards`, `offers`. No migration files unless a `db:migrate` workflow is requested (`AGENTS.md`).

**9. Auth: one policy/permission per action, registered in the auth layer.**
Each endpoint gets exactly one of `@RequirePolicy`/`@RequirePermission`/`@CheckPolicy`; no stacked decorators. New recruitment domain actions (`recruitment:requisition.create`, `.approve`, `candidate.read`, `offer.decide`, etc.) registered with the policy system.

## Risks / Trade-offs

- **Pipeline rules split across workflow-engine and recruitment projection** → Keep the workflow engine the single source of allowed transitions; recruitment only records what already happened. Guard writes to `application_stage_events` behind the use-case that consults the engine.
- **Two approval flows (requisition + offer) on one integration** → Model them as distinct approval subjects/policies within `recruitment-approval` so inbox/trace stay unambiguous; follow the payroll-approval multi-subject shape if present.
- **Hire event consumed by not-yet-built onboarding** → Define the contract port and event now, but the consumer is optional; publishing must not fail if no subscriber exists. Document the payload as the stable contract.
- **Candidate PII (CVs, contact info)** → Store attachments through `storage` with access behind auth policies; never echo candidate PII in logs; use key-name references. Restrict candidate reads to recruitment policies.
- **arch:check violations from cross-context access** → Route all workforce/onboarding interaction through `src/contracts`; run `pnpm --filter @project/api arch:check` before finishing.

## Migration Plan

1. Add Drizzle tables to `src/infrastructure/database/schema`; `pnpm --filter @project/api db:push`.
2. Build the `recruitment` module sub-modules; register `RecruitmentModule` in the app root.
3. Add `src/integration/recruitment-approval` wiring to the approval engine.
4. Add the `recruitment.candidate.hired` contract port + outbox event.
5. Regenerate the web client (`pnpm client:generate`) and build the `recruitment` frontend feature/routes.
6. Verify: `arch:check`, API tests, `client:verify`, typecheck.

Rollback: recruitment is additive and isolated. Unregister `RecruitmentModule` and drop the new tables; no existing context depends on recruitment writes (only the optional hire-event consumer).

## Open Questions

- Should requisition approval and offer approval share one approval policy definition or use two separate policies? (Leaning two, resolved during `recruitment-approval` wiring.)
- Are interview stages fixed (`applied/screening/interview/offer/hired/...`) or configurable per posting in v1? (Proposed: fixed enum in v1, configurable deferred.)
- Does the hire event carry the offer snapshot (comp, start date) or just candidate + offer IDs for onboarding to resolve? (Proposed: IDs + minimal snapshot; confirm with onboarding scope.)
