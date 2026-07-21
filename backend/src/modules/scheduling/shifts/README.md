# Workforce Scheduling API Contract

Base route: `/workforce/schedules`

## Endpoints

### Schedule Templates

- `GET /templates`
  - Query: `page`, `limit`, `search`, `status`
  - Response: paginated schedule templates
- `POST /templates`
  - Body: `code`, `name`, `startTime`, `endTime`, `breakMinutes?`, `overnight?`, `activeWeekdays?`
  - Response: created template
- `PATCH /templates/:id`
  - Body: partial template fields
  - Response: updated template with incremented version
- `POST /templates/:id/archive`
  - Response: archived template (`status=archived`, `isActive=false`)

### Employee Schedule Planning

- `GET /assignments`
  - Query: `page`, `limit`, `employeeId`, `from`, `to`
  - Response: paginated assignment list
- `POST /assignments`
  - Body: `employeeId`, `shiftTemplateId`, `effectiveFrom`, `effectiveTo?`, `locationId?`, `status?`, `note?`
  - Validation:
    - Reject archived/inactive template usage
    - Reject overlapping ranges with error code `SCHEDULE_CONFLICT`
- `PATCH /assignments/:id`
  - Body: partial assignment fields
  - Validation: overlap checks are reapplied
- `POST /assignments/:id/cancel`
  - Body: `cancelFrom`, `reason?`
  - Behavior: sets `status=cancelled`, closes `effectiveTo`, records cancellation metadata

### Publication and Roster Query

- `GET /roster`
  - Query: `from`, `to`, `employeeId?`, `departmentId?`
  - Response:
    - `publication.isPublished`
    - `publication.publishedAt`
    - expanded roster rows (date-expanded from assignment + template)
- `POST /roster/publish`
  - Body: `from`, `to`, `branchId?`, `departmentId?`, `publishedByUserId?`
  - Behavior: upserts publication metadata for scope+period

## Error Contract

- Not found resources: `SCHEDULE_NOT_FOUND`
- Overlap conflicts: `SCHEDULE_CONFLICT`
- Time/validation errors: HTTP 400 with validation message

## Pilot Rollout Notes

1. Start with one department scope to validate effective-range conflict behavior.
2. Seed standard day/night templates and verify roster expansion output against manager expectations.
3. Integrate published roster reads into attendance/payroll consumers only after publication status is stable.
4. Monitor conflict and validation error rates during pilot to refine template standards and assignment workflows.
