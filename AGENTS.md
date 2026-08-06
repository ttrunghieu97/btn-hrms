## Execution Rules

- State assumptions. Unsure → ask.
- Multiple meanings → present options.
- Simpler path → say so.
- Confused → stop, name it, ask.
- Touch only required lines. No adjacent cleanup unless caused by change.
- Match style. Remove imports/vars/fns made unused.
- Mention unrelated dead code; do not delete.
- Every changed line traces to req.
- New endpoint: controller → use-case only; no repo imports in controllers.
- Business operations belong in explicit UseCase classes, not generic Services.
- New use-case: one file, one `execute()`, constructor DI only.
- Prefer composition over abstract service/use-case inheritance.
- Errors: `throwBadRequest`, `throwConflict`, `throwForbidden` from `shared/utils/http-error` with `ERROR_CODES` + `ERROR_REASONS`.
- Logging: `ContextLogger` + `RequestContextService`; structured logs with searchable fields.
