---
name: frontend-enterprise-check
description: Review or drive frontend work against this repo's enterprise Next.js standards. Use when changing pages, feature modules, TanStack Query/Form flows, generated client usage, or app UI behavior.
---

Apply frontend enterprise rules from this repo before calling work done.

## When to use
- Next.js page or feature changes
- Query/mutation/form refactors
- API integration changes
- Generated client or shared type changes
- UI flows that need browser verification

## Review checklist
1. Enforce feature structure:
   - feature code stays under `src/features/<domain>/`
   - server state in TanStack Query
   - UI/form state only in Zustand
2. Enforce API client pattern:
   - use generated client from `src/api/generated/`
   - use `customFetch` transport behavior indirectly, not ad-hoc fetch rewrites
   - unwrap envelopes with helpers from `src/lib/api-extract.ts`
   - never hand-edit generated client files
3. Enforce query conventions:
   - spread `queryPolicyPresets[...]`
   - use query key factories
   - follow optimistic update pattern: cancel -> snapshot -> patch -> rollback -> invalidate
4. Enforce validation/form conventions:
   - use TanStack Form + Zod for form validation
5. Enforce contract discipline:
   - if backend contract changed, run `contract-sync`
   - then run `npm run client:verify` or web `typecheck`
6. Enforce verification:
   - run `npm --prefix frontend run typecheck`
   - for UI changes, start dev server and verify golden path plus nearby regressions

## Guardrails
- Keep logic in domain features, not scattered under app layer.
- Prefer generated types and existing helpers over ad-hoc parsing.
- Do not claim UI validated unless dev server/browser path was actually exercised.
