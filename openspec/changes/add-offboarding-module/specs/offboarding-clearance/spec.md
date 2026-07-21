## ADDED Requirements

### Requirement: Departmental clearance records

The system SHALL track clearance sign-off for an offboarding process per department (IT, HR, Finance, Manager, Security) in an `offboarding_clearances` record. Each clearance SHALL capture department, decision (`pending | approved | rejected`), the deciding user, an optional note, and a decision timestamp.

#### Scenario: Clearances seeded with the process

- **WHEN** an offboarding process is created
- **THEN** a clearance record is created per required department with decision `pending`

#### Scenario: Department approves clearance

- **WHEN** an authorized actor for a department approves its clearance
- **THEN** that clearance decision becomes `approved` with the deciding user and timestamp recorded

#### Scenario: Department rejects clearance with reason

- **WHEN** an actor rejects a clearance
- **THEN** the decision becomes `rejected`, a note is required and stored, and the process cannot complete

### Requirement: Clearance gates process completion

The system SHALL prevent an offboarding process from being marked `completed` until every required clearance is `approved`. Completion attempts before that MUST be rejected.

#### Scenario: Completion blocked by pending clearance

- **WHEN** an actor attempts to complete a process while any required clearance is `pending` or `rejected`
- **THEN** the system rejects the completion and reports which clearances are outstanding

#### Scenario: Completion allowed when all cleared

- **WHEN** all required clearances are `approved` and all mandatory checklist items are complete
- **THEN** the process may be completed

### Requirement: Clearance authorization

The system SHALL restrict each department's clearance decision to actors holding the corresponding offboarding clearance policy, so one department cannot sign off on another's behalf.

#### Scenario: Wrong-department actor is denied

- **WHEN** an actor without a department's clearance policy attempts to decide that department's clearance
- **THEN** the system denies the action
