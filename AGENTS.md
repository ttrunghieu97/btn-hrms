## Execution Rules

### General & Safety
- State assumptions. Unsure → ask.
- Multiple meanings → present options.
- Simpler path → say so.
- Confused → stop, name it, ask.
- Touch only required lines. No adjacent cleanup unless caused by change.
- Match style. Remove imports/vars/fns made unused.
- Delete dead code (unused functions, imports, variables, unreachable code). Dev stage — clean up aggressively.
- Every changed line traces to req.

### Refactoring Boundaries
- Refactor ONLY in files already touched for a fix. Never open a new file just to refactor.
- Refactor must be measurably better (split function >50 LOC, rename ambiguous vars, simplify nested if/else >3 levels). If unsure it's better → don't refactor.
- Every changed line must trace to a specific violation or dead code removal. No "while I'm here" edits.

### Backend Architecture (@project/api)
- New endpoint: controller → use-case only; no repo imports in controllers.
- Business operations belong in explicit UseCase classes, not generic Services.
- New use-case: one file, one `execute()`, constructor DI only.
- Prefer composition over abstract service/use-case inheritance.
- Errors: `throwBadRequest`, `throwConflict`, `throwForbidden` from `shared/utils/http-error` with `ERROR_CODES` + `ERROR_REASONS`.
- Logging: `ContextLogger` + `RequestContextService`; structured logs with searchable fields.
- Database: Explicit transactions for multi-entity writes; no raw state mutation in controllers.

### Frontend Standards (web)
- Styling: Vanilla CSS / Tailwind (if defined) matching design system; fluid responsive layouts.
- State & API: Use generated OpenAPI client hooks; strong types only (no `any`).
- User Experience: Accessible (WCAG), interactive hover/active states, visual hierarchy, no placeholder text/broken images.

### Verification & Quality Gates
- Always run typecheck/lint (`pnpm check:api` / `pnpm check`) before declaring task completion.
- Bug fixes require verifying root cause log/trace before editing code.

### Audit & Cleanup
- Audit commands (run in order): `pnpm lint` → `pnpm --filter @project/api arch:check` → `pnpm --filter frontend typecheck` → `pnpm --filter frontend depcruise` → `pnpm --filter frontend authorization:check`.
- Fix order: ARCH → LINT → TYPE → DEPCRUISE → AUTH (earlier fixes may resolve later ones).
- Verify all with `pnpm check:all` after fixes. Loop max 3 times if errors remain.
- Never add new dependencies, change DB schema, or modify API contracts during audit.
- Never edit generated code (`src/lib/generated/`, `src/api/generated/`) — fix source or config instead.