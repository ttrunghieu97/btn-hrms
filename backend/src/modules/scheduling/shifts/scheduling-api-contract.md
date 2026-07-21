## Workforce Scheduling API Contract

### Schedule Templates
- `GET /workforce/schedules/templates`: List templates
- `POST /workforce/schedules/templates`: Create template
- `PATCH /workforce/schedules/templates/:id`: Update template
- `POST /workforce/schedules/templates/:id/archive`: Archive template

### Employee Assignments
- `GET /workforce/schedules/assignments`: List assignments
- `POST /workforce/schedules/assignments`: Create assignment (with overlap checks)
- `PATCH /workforce/schedules/assignments/:id`: Update assignment
- `POST /workforce/schedules/assignments/:id/cancel`: Cancel assignment (closes range)

### Roster and Publication
- `GET /workforce/schedules/roster`: Query expanded roster entries by date range
- `POST /workforce/schedules/roster/publish`: Publish a roster period

## Rollout Notes for Downstream Consumers
- **Attendance Integration**: Use `GET /workforce/schedules/roster` to fetch planned schedules for work-hour classification.
- **Payroll Integration**: Published rosters provide a stable signal for shift-based pay rules.
- **Data Migration**: Baseline templates should be seeded before pilot go-live.
