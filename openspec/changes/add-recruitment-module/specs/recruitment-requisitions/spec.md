## ADDED Requirements

### Requirement: Create job requisition
The system SHALL allow an authorized HR user to create a job requisition specifying department, position, headcount, budget band, and justification. A new requisition SHALL start in `draft` status.

#### Scenario: Create a draft requisition
- **WHEN** an authorized user submits a requisition with department, position, headcount ≥ 1, and justification
- **THEN** the system persists it with status `draft` and returns its identifier

#### Scenario: Reject invalid headcount
- **WHEN** a user submits a requisition with headcount less than 1
- **THEN** the system rejects the request with a validation error and creates nothing

### Requirement: Edit draft requisition
The system SHALL allow editing a requisition only while it is in `draft` status.

#### Scenario: Edit allowed in draft
- **WHEN** an authorized user edits a requisition in `draft`
- **THEN** the system applies the changes

#### Scenario: Edit blocked after submission
- **WHEN** a user attempts to edit a requisition that is `pending_approval`, `approved`, `rejected`, or `closed`
- **THEN** the system rejects the edit and leaves the requisition unchanged

### Requirement: Submit requisition for approval
The system SHALL route a submitted requisition through the platform approval engine and set its status to `pending_approval`.

#### Scenario: Submit draft for approval
- **WHEN** an authorized user submits a `draft` requisition
- **THEN** the system creates an approval request via the approval engine and sets status to `pending_approval`

#### Scenario: Approval decision updates status
- **WHEN** the approval engine records an approve or reject decision for a requisition
- **THEN** the system sets the requisition status to `approved` or `rejected` accordingly

### Requirement: Close requisition
The system SHALL allow an authorized user to close a requisition, and SHALL treat `closed` and `rejected` as terminal states.

#### Scenario: Close an approved requisition
- **WHEN** an authorized user closes an `approved` requisition
- **THEN** the system sets status to `closed` and blocks further posting creation from it
