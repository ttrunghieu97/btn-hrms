---
name: contract-sync
description: Regenerate and verify API contract artifacts after backend Swagger/OpenAPI changes. Use when API DTOs, controllers, routes, or response shapes change.
---

Sync backend OpenAPI with generated web client.

## When to use
- API controller/DTO/response changes
- Route/path/query/body schema changes
- User asks to regenerate client or verify contract drift

## Steps
1. Run `npm run client:generate` from repo root.
2. Run `npm run client:verify` from repo root.
3. If verification fails, inspect generated diff and impacted API/web types.
4. Report generated files and any follow-up typecheck or query breakages.

## Guardrails
- Use root scripts first; they already chain API OpenAPI generation and web client generation.
- Do not hand-edit generated files unless user explicitly asks.
- If backend contract changed but user did not ask to keep generated artifacts, still report that client regen was required.
