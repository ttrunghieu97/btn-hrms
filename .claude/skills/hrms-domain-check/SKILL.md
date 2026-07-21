---
name: hrms-domain-check
description: Review or drive HRMS changes against correct business boundaries for this enterprise single-company system. Use when changing employee, org, attendance, payroll, recruitment, onboarding, or permission-heavy flows.
---

Apply HRMS domain rules before calling business changes correct.

## When to use
- Employee lifecycle changes
- Department, position, org chart, reporting line changes
- Attendance, payroll, scheduling, onboarding, recruitment flow changes
- Cross-module HR business rules
- Permission or policy decisions tied to HR actions

## Domain checklist
1. Keep bounded contexts clean:
   - `identity` handles auth and identity concerns
   - `workforce` handles employee, org structure, department, position concerns
   - `attendance`, `payroll`, `scheduling`, `recruitment`, `onboarding`, `performance`, `training`, `benefits`, `expenses` keep their own rules
2. Do not leak business rules across contexts by importing foreign repositories directly.
3. Cross-context reads/writes should go through contracts, adapters, domain events, or explicit application flows.
4. Preserve single-company assumption:
   - no tenant abstractions
   - no SaaS-style tenant scoping unless user explicitly asks
5. Check lifecycle consistency:
   - employee create/update/deactivate impacts role, permissions, org assignment, onboarding/offboarding, and downstream records where applicable
6. Check approval/notification implications when changing HR actions that affect workflow or people state.
7. Check permission semantics at business level:
   - sensitive HR actions should map to explicit policy/permission boundaries
8. Prefer explicit enterprise workflows over hidden side effects or weak legacy shortcuts.

## Verification
- Confirm changed rule belongs to correct domain module.
- If multiple modules touched, verify boundary is intentional and uses approved integration path.
- If API surface changed, recommend `backend-enterprise-check` and `contract-sync`.

## Guardrails
- This product is single-tenant for one Vietnamese company.
- Do not introduce generic HR SaaS abstractions without request.
- If business ownership of rule is unclear, stop and clarify before implementation.
