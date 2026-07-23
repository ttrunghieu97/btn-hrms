## Why

`workforce` is currently the front of the employee lifecycle — there is no system of record for how a person becomes an employee. Hiring is tracked outside the platform (spreadsheets, email), so requisition approvals, candidate pipelines, interview outcomes, and offers are invisible to HR and unauditable. `recruitment` is a declared-but-unbuilt domain in `AGENTS.md` and is the natural top of the funnel: `recruitment` → `onboarding` → `workforce`. Building it now closes the biggest gap in the lifecycle and reuses platform engines that are already mature.

## What Changes

- Add a new `recruitment` domain context under `apps/api/src/modules/recruitment` following the existing Controller → UseCase → Repository → Mapper layering.
- **Job requisitions**: create/edit a hiring request (department, position, headcount, budget band, justification); submit for approval; track lifecycle (`draft → pending_approval → approved → rejected → closed`).
- **Job postings**: publish an approved requisition as an internal posting with description, requirements, and open/close dates; track status (`open → paused → closed`).
- **Candidates**: capture candidate profile and application against a posting; attach CV/documents via `storage` (temp upload → finalize after commit); dedupe by email.
- **Interview pipeline**: move an application through configurable stages (`applied → screening → interview → offer → hired/rejected/withdrawn`); record stage transitions, interview scheduling references, and scorecards/feedback per stage.
- **Offers**: draft an offer for a candidate in the offer stage; route through `platform-approval-engine`; on acceptance emit a domain event that hands off to onboarding/workforce.
- Reuse **`platform-approval-engine`** for requisition approval and offer approval via a `src/integration/recruitment-approval` handler (same shape as `leave-approval` / `payroll-approval`).
- Reuse **`platform-workflow-engine`** to drive the multi-stage application pipeline.
- Reuse **`platform-notifications`** for stage-change and decision notifications; **`storage`** for CV/attachments.
- Expose an outbound domain event (`recruitment.candidate.hired`) on offer acceptance so `onboarding`/`workforce` can consume it through `src/contracts` ports — no foreign repository access.
- Add Drizzle tables to `src/infrastructure/database/schema` and regenerate the web API client (`client:generate`).

## Capabilities

### New Capabilities
- `recruitment-requisitions`: Create, edit, and approve hiring requisitions; lifecycle and headcount tracking.
- `recruitment-postings`: Publish approved requisitions as job postings and manage their open/close lifecycle.
- `recruitment-candidates`: Candidate profiles and applications against postings, with CV/document attachments and dedupe.
- `recruitment-pipeline`: Stage-based application pipeline with transitions, interview scheduling references, and scorecards.
- `recruitment-offers`: Offer drafting, approval routing, acceptance/decline, and hire hand-off event.

### Modified Capabilities
<!-- No existing capability spec files under openspec/specs/ (this is the repo's first change). Onboarding/workforce consume the hire event via a new outbound contract, but their existing requirements do not change. -->

## Impact

- **New code**: `apps/api/src/modules/recruitment/**` (controllers, use-cases, repositories, mappers, DTOs, domain events); `apps/api/src/integration/recruitment-approval/**`.
- **Schema**: new tables (`job_requisitions`, `job_postings`, `candidates`, `applications`, `application_stage_events`, `interview_scorecards`, `offers`) in `src/infrastructure/database/schema`; applied via `db:push`.
- **Contracts**: new outbound port/event `recruitment.candidate.hired` in `src/contracts` for onboarding/workforce hand-off.
- **Reused platforms**: `platform-approval-engine`, `platform-workflow-engine`, `platform-notifications`, `storage`.
- **Auth**: new policies/permissions for recruitment actions registered in the auth layer.
- **Frontend**: new `apps/web/src/features/recruitment` feature and `app/(protected)/recruitment` routes; regenerated API client.
- **Module registration**: register `RecruitmentModule` in the app root and pass `arch:check`.
