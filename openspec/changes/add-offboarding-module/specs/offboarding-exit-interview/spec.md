## ADDED Requirements

### Requirement: Schedule an exit interview

The system SHALL allow an authorized actor to schedule an exit interview against an offboarding process, persisted in the existing `exit_interviews` table (linked by `process_id` and `employee_id`), recording the interviewer and a scheduled time.

#### Scenario: Schedule interview for a process

- **WHEN** an authorized actor schedules an exit interview for an offboarding process
- **THEN** an `exit_interviews` row is created with the process id, employee id, interviewer, and scheduled time

#### Scenario: Only one open exit interview per process

- **WHEN** an actor schedules an exit interview for a process that already has an unconducted one
- **THEN** the system rejects the duplicate or reschedules the existing record rather than creating a second

### Requirement: Record exit-interview outcome

The system SHALL allow recording the exit-interview outcome — structured `responses` (jsonb) and free-text notes — and MUST stamp `conducted_at` when the interview is recorded as done.

#### Scenario: Record responses

- **WHEN** the interviewer submits responses and notes for a scheduled exit interview
- **THEN** the record stores the responses and notes and sets `conducted_at`

#### Scenario: Exit interview as a checklist item

- **WHEN** the exit-interview checklist item exists and its interview is recorded conducted
- **THEN** the corresponding checklist item can be completed
