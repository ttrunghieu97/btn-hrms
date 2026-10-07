## Execution Rules

### General & Safety
- State assumptions. Unsure → ask.
- Multiple meanings → present options.
- Simpler path → say so.
- Confused → stop, name it, ask.
- Touch only required lines. No adjacent cleanup unless caused by change.
- Match style. Remove imports/vars/fns made unused.
- Mention unrelated dead code; do not delete.
- Every changed line traces to req.

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