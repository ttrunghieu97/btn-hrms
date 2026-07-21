---
name: nestjs-ddd-check
description: Review or drive NestJS backend work against DDD and enterprise architecture rules in this repo. Use for module design, aggregate boundaries, ports/adapters, transactions, and event-driven flows.
---

Apply NestJS DDD discipline before calling backend architecture sound.

## When to use
- New backend module or major refactor
- Cross-context coordination
- Aggregate or transaction boundary questions
- Ports/adapters and event-driven integration work
- Domain logic placement decisions

## DDD checklist
1. Keep domain logic out of controllers and transport DTOs.
2. Application flow belongs in use-cases; infrastructure concerns stay in repository/adapter/infrastructure layers.
3. Respect aggregate and module boundaries:
   - no direct repository reach-through across contexts
   - use contracts/ports for cross-context integration
4. Transaction boundary must be explicit:
   - changes that must commit together stay in one transaction boundary
   - domain events stage inside transaction through outbox
5. Event-driven integration must use outbox/publish-after-commit pattern, not ad-hoc side effects.
6. Repository layer owns persistence details; use-case layer owns orchestration and business decisions.
7. Mappers stay dumb; no hidden business logic in mapper transforms.
8. Shared layer should not accumulate business logic.
9. Refactor toward cleaner boundaries when current structure is weak; do not preserve anti-patterns only for history.

## NestJS-specific checks
- constructor injection only for new use-cases
- one operation per use-case with `execute()`
- module wiring respects context ownership
- guards/policies/decorators handled at controller boundary, not buried in repository logic

## Verification
- Run `npm --prefix backend run arch:check` after architectural changes.
- If contract changes, follow with `contract-sync`.
- If DB shape changes, use repo DB rule: default `db:push` unless migrations explicitly requested.

## Guardrails
- Prefer explicit ports/adapters over convenience imports.
- Prefer enterprise-grade rewrite over layering more workaround code.
- If aggregate ownership is unclear, stop and clarify before coding.
