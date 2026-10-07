## ADDED Requirements

### Requirement: Publish posting from approved requisition
The system SHALL allow creating a job posting only from a requisition in `approved` status. A posting SHALL carry a description, requirements, and open/close dates, and SHALL start in `open` status.

#### Scenario: Publish from approved requisition
- **WHEN** an authorized user publishes a posting referencing an `approved` requisition
- **THEN** the system creates the posting with status `open`

#### Scenario: Block publishing from non-approved requisition
- **WHEN** a user attempts to publish a posting from a requisition that is not `approved`
- **THEN** the system rejects the request and creates no posting

### Requirement: Manage posting lifecycle
The system SHALL support posting statuses `open`, `paused`, and `closed`, and SHALL allow transitions `open ↔ paused` and `open/paused → closed`. `closed` SHALL be terminal.

#### Scenario: Pause and reopen a posting
- **WHEN** an authorized user pauses an `open` posting and later reopens it
- **THEN** the system sets status to `paused` then back to `open`

#### Scenario: Closing is terminal
- **WHEN** an authorized user closes a posting
- **THEN** the system sets status to `closed` and rejects any later status change

### Requirement: Prevent applications to non-open postings
The system SHALL only accept new applications for postings in `open` status.

#### Scenario: Reject application to closed posting
- **WHEN** a candidate application is submitted to a `paused` or `closed` posting
- **THEN** the system rejects the application
