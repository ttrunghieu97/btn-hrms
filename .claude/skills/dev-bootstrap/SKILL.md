---
name: dev-bootstrap
description: Bring up this HRMS repo locally using existing API/web workflows. Use for first-run setup, smoke checks, or restarting local dev flow.
---

Bootstrap local dev flow with repo scripts.

## Steps
1. Check whether user needs API, web, or both.
2. For API startup, prefer `npm --prefix backend run dev:bootstrap`.
3. For web startup, use `npm --prefix frontend run dev`.
4. For combined startup, run API bootstrap first, then web dev server.
5. Report expected ports and required env assumptions from `CLAUDE.md`.

## Smoke checks
- API should expose app on backend port used by repo env.
- Web should start on port 8080 per `frontend/package.json`.
- If API contract was changed before startup, run `contract-sync` first.

## Guardrails
- Reuse existing scripts only.
- If user needs Docker services, point to repo `docker-compose.yml` and required dependencies.
- Do not claim UI verified unless browser/dev server was actually exercised.
