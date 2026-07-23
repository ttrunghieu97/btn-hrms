# Shared Query DTO Guidelines

Use the smallest shared DTO that matches the endpoint contract.

## Base Classes

- `PagedQueryDto`
  Use when the endpoint only needs `page` and `limit`.

- `SearchableQueryDto`
  Use when the endpoint needs `page`, `limit`, and free-text `search`.

- `SortableQueryDto`
  Use when the endpoint also needs `sort`.

- `ExpandableQueryDto`
  Use when the endpoint also needs `include`.

- `FieldSelectableQueryDto`
  Use when the endpoint also needs `fields`.

- `BaseQueryDto`
  Compatibility bundle. Prefer narrower DTOs for new endpoints.

## Pagination Rules

- `page` is validated globally with `PaginationPageField()`.
- `limit` is validated and clamped globally with `PaginationLimitField()`.
- Default max `limit` is `100` (`PAGINATION_MAX_LIMIT` constant).
- Endpoint-specific caps should override `limit` locally:
  Example: `@PaginationLimitField(50, 30)`.

## Search Rules

- Canonical free-text field name is `search`.
- Do not introduce new `q` fields.
- If legacy compatibility is required, keep `q` only as a deprecated alias and expose a `getNormalizedSearch()` helper.

## Design Rules

- Prefer inheritance from the narrowest DTO over repeating decorators.
- Keep endpoint-specific overrides explicit on the child DTO.
- Add DTO-level tests when introducing transforms, aliases, or custom pagination caps.
