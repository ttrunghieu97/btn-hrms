## ADDED Requirements

### Requirement: Termination-triggered offboarding start

The system SHALL start an offboarding process when an employee is terminated, by consuming `EmployeeTerminatedEvent` and creating a `type=offboarding` boarding process from the active offboarding template. Consumption MUST be idempotent per `(consumerId, eventId)` so redelivery does not create duplicate processes.

#### Scenario: Terminated employee gets an offboarding process

- **WHEN** `EmployeeTerminatedEvent` is delivered for an employee who has no active offboarding process
- **THEN** the system creates a `type=offboarding` boarding process for that employee, seeded from the active offboarding template's items, with status `pending`

#### Scenario: Duplicate termination event is ignored

- **WHEN** the same `EmployeeTerminatedEvent` (same `eventId`) is delivered more than once
- **THEN** the system processes it at most once and does not create a second offboarding process

#### Scenario: No active offboarding template

- **WHEN** `EmployeeTerminatedEvent` is delivered but no active offboarding template exists
- **THEN** the system logs the gap and does not create a process, without throwing out of the subscriber

### Requirement: Offboarding process lifecycle

An offboarding process SHALL track its state on `boarding_processes.status` (`pending → in_progress → completed`, with `cancelled`/`terminated` terminal states) and MUST NOT change `employee_status_enum`. Employee status remains governed by the workforce context.

#### Scenario: Process advances as work begins

- **WHEN** the first checklist item of a `pending` offboarding process is completed
- **THEN** the process status becomes `in_progress`

#### Scenario: Offboarding does not mutate employee status

- **WHEN** an offboarding process is created, advanced, or completed
- **THEN** the employee's `employee_status_enum` value is left unchanged by the offboarding context

### Requirement: Offboarding checklist items

The system SHALL seed offboarding checklist items from the template (covering at minimum asset return, access revocation, knowledge transfer, exit interview, and final settlement) and SHALL allow an authorized actor to complete or skip each item, recording who completed it and when.

#### Scenario: Complete a checklist item

- **WHEN** an authorized actor marks a checklist item complete
- **THEN** the item's status becomes `completed` and `completed_by_user_id` + `completed_at` are recorded

#### Scenario: Mandatory item cannot be skipped

- **WHEN** an actor attempts to skip a checklist item flagged mandatory
- **THEN** the system rejects the skip and the item stays open

### Requirement: Offboarding process read APIs

The system SHALL expose endpoints to list offboarding processes and fetch a single process with its checklist items, clearances, and exit-interview reference, guarded by offboarding view policies.

#### Scenario: List offboarding processes

- **WHEN** an authorized actor requests the offboarding process list
- **THEN** the system returns offboarding-typed processes only (not onboarding processes) with summary status

#### Scenario: Fetch process detail

- **WHEN** an authorized actor requests a process by id
- **THEN** the system returns the process with its checklist items, clearance sign-offs, and any exit-interview reference
