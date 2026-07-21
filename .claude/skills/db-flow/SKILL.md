---
name: db-flow
description: Guide or run standard Drizzle database workflow for this repo. Use for schema changes, resets, seeding, and migration-path decisions.
---

Use repo-standard DB flow.

## Default rule
This repo defaults to `db:push` for normal development. Use migration authoring only when user explicitly asks or when preparing production-style migration flow.

## Steps
1. Identify intent:
   - Schema update in dev -> `npm --prefix backend run db:push`
   - Generate migration files -> `npm --prefix backend run db:generate` then `npm --prefix backend run db:migrate`
   - Reset local DB -> `npm --prefix backend run db:reset`
   - Seed only -> `npm --prefix backend run db:seed`
   - Prep DB for dev startup -> `npm --prefix backend run db:prepare`
2. Before destructive DB action, confirm with user if data loss possible.
3. After schema-affecting changes, recommend `contract-sync` only if API contract also changed.

## Guardrails
- Follow `CLAUDE.md` DB rule: default `db:push`.
- Treat `db:drop` / `db:reset` as destructive.
- Do not invent migration flow when simple push is enough.
