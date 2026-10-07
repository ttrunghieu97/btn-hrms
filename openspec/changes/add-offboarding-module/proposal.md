## Why

The employee lifecycle is asymmetric: `recruitment → onboarding → workforce` is built, but the exit half is not. Termination is a single `terminate-employee` use-case that stages `EmployeeTerminatedEvent` and lets five independent subscribers react (identity deactivates, asset flags open holdings, leave cancels pending requests, attendance/payroll log-only stubs). Nothing orchestrates the exit: there is no clearance sign-off, no exit-interview flow wired to a process, and no final settlement — the payroll subscriber is a stub. The schema is already latent for this (`boarding_*` tables carry a `type` enum of `onboarding|offboarding`, an `exit_interviews` table exists, the `TemplateType` DTO already lists `"offboarding"`, and `asset-holdings-reader.port` names offboarding as its intended consumer), but no module owns the offboarding flow and the process repository hardcodes `type="onboarding"`. This change closes the lifecycle and turns the scattered termination reactions into an auditable, gated process.

## What Changes

- **Generalize the boarding aggregate**: rename `OnboardingModule` → `BoardingModule` as the single owner of the shared `boarding_*` tables + `exit_interviews`. Remove the hardcoded `type="onboarding"` in `onboarding-process.repository.ts` so processes are created/queried by `type` (onboarding | offboarding). Template + process + checklist + exit-interview persistence lives here; both flows consume it. **BREAKING** (internal): module/provider rename + exported use-case signature gains a `type` parameter.
- **`onboarding` becomes a thin orchestration module** over `BoardingModule` (onboarding-typed template seed + view), preserving existing `onboarding/templates` routes and behavior.
- **New `offboarding` orchestration module** under `apps/api/src/modules/offboarding`, following Controller → UseCase → Repository → Mapper layering. It owns offboarding-specific state only and drives the boarding aggregate through `BoardingModule`'s exported use-cases (no direct foreign-repo access).
- **Termination-triggered auto-start**: an idempotent subscriber to `EmployeeTerminatedEvent` starts a `type=offboarding` boarding process from the active offboarding template, seeding checklist items (asset return, access revocation, knowledge transfer, exit interview, final settlement). Employee status stays governed by workforce; offboarding lifecycle is tracked on `boarding_processes.status`.
- **Departmental clearance**: new `offboarding_clearances` records sign-off per department (IT, HR, Finance, Manager, Security). A process cannot complete until all required clearances are approved.
- **Exit interview**: schedule/record against the existing `exit_interviews` table via the boarding aggregate.
- **Final settlement hand-off**: on offboarding completion, emit `offboarding.completed` and record an `offboarding_settlement_links` row that hands off to payroll for final settlement (payroll owns the calculation; offboarding only triggers and links).
- **Reuse** `platform-notifications` for clearance/assignment notifications and `platform-approval-engine` where a clearance needs an approve/reject decision routed; expose offboarding events via `src/contracts` ports for cross-context reads.
- **Frontend**: new `apps/web/src/features/offboarding` feature + `app/(protected)/offboarding` routes (list, process detail with checklist timeline, clearance board, settlement + audit timeline); regenerate the API client.
- Add `offboarding` (and rename `onboarding`→`boarding` owner note) to the `AGENTS.md` domain list.

## Capabilities

### New Capabilities
- `offboarding-process`: Termination-triggered offboarding process (a `type=offboarding` boarding process) with checklist lifecycle, auto-start subscriber, and process CRUD/read APIs.
- `offboarding-clearance`: Per-department clearance sign-off (IT/HR/Finance/Manager/Security) that gates process completion.
- `offboarding-exit-interview`: Schedule and record exit interviews against a process, reusing the existing `exit_interviews` table.
- `offboarding-settlement`: On completion, hand off to payroll for final settlement via an event + settlement link (offboarding triggers and correlates; payroll computes).

### Modified Capabilities
<!-- No spec files exist under openspec/specs/ yet, so there are no requirement deltas to record. The onboarding→boarding generalization is an internal structural change captured in design.md, not a spec-level behavior change to an existing capability spec. -->

## Impact

- **New code**: `apps/api/src/modules/offboarding/**` (controller, use-cases, repositories, mappers, DTOs, subscriber, domain events); `apps/api/src/integration/offboarding-approval/**` if clearance routes through the approval engine.
- **Refactored code**: `OnboardingModule`→`BoardingModule` rename; `onboarding-process.repository.ts` de-hardcode `type`; `create-onboarding-process.usecase.ts` generalized to `CreateBoardingProcessUseCase(type)`; thin `onboarding` wrapper module retained.
- **Schema**: new tables `offboarding_clearances`, `offboarding_settlement_links` in `src/infrastructure/database/schema` (new `offboarding` schema group or under `onboarding`/`boarding`); reuse `boarding_templates`, `boarding_template_items`, `boarding_processes`, `boarding_checklist_items`, `exit_interviews`. No change to `employee_status_enum`.
- **Events**: consume `EmployeeTerminatedEvent`; emit `offboarding.started` / `offboarding.completed` via outbox inside the transaction.
- **Contracts**: consume `asset-holdings-reader.port` (already declared) and employee/department reader ports; optionally expose an offboarding-status read port.
- **Reused platforms**: `platform-notifications`, `platform-approval-engine`, `platform-workflow-engine` (already used by scheduled termination).
- **Auth**: new policies/permissions for offboarding + clearance actions.
- **Frontend**: `apps/web/src/features/offboarding` + `app/(protected)/offboarding` routes; regenerated client.
- **Module registration**: register `BoardingModule` (renamed) + `OffboardingModule` in the app root; pass `arch:check`.
