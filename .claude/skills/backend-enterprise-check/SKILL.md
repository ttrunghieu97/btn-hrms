---
name: backend-enterprise-check
description: Review or drive backend work against this repo's enterprise NestJS standards. Use when changing API controllers, use-cases, repositories, policies, auth, storage, or DB schema.
---

Apply backend enterprise rules from this repo before calling work done.

## When to use
- NestJS API changes
- Auth, permission, policy, storage, outbox, or repository changes
- Module restructuring
- DB schema or controller contract changes

## Review checklist
1. Enforce layer flow:
   - controller -> use-case -> repository -> mapper
   - no repository imports in controllers
   - one use-case per operation with `execute()`
2. Enforce authorization:
   - every endpoint has exactly one of `@Public()`, `@CheckPolicy(...)`, `@RequirePolicy(...)`, `@RequirePermission(...)`
   - default-deny assumptions preserved
3. Enforce architecture boundaries:
   - no direct DB access outside repositories
   - no cross-context repository imports
   - cross-domain reads go through `src/contracts/` ports
4. Enforce platform patterns:
   - response shape compatible with interceptor envelope
   - domain events staged via outbox inside DB transaction
   - file flows respect two-phase finalize pattern when uploads involved
5. Enforce error/logging patterns:
   - use shared HTTP error helpers and codes
   - use `ContextLogger` where business operation logging matters
6. Enforce DB workflow:
   - normal dev schema change -> `db:push`
   - migrations only when explicitly requested
7. Enforce verification:
   - `npm --prefix apps/api run arch:check`
   - add `npm run client:generate` / `npm run client:verify` if API contract changed
   - run targeted API tests for changed surface

## Guardrails
- Prefer clean enterprise rewrite over patching weak structure.
- Do not preserve bad boundaries for compatibility unless user asks.
- If controller, DTO, route, or response changed, recommend `contract-sync`.
