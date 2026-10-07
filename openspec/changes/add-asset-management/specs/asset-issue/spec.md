## ADDED Requirements

### Requirement: Asset issue is the aggregate root of a hand-out transaction
The system SHALL model each hand-out as an `AssetIssue` aggregate — a business transaction owning its item lines, attachments (signed handover), issuer, receiver, optional originating request/approval link, and lifecycle events. An `asset_assignments` row SHALL represent only the current holding state of a line and MUST NOT be treated as the transaction of record.

#### Scenario: Issue owns its lines and attachments
- **WHEN** an authorized user hands out one or more assets to an employee
- **THEN** the system creates one `AssetIssue` with its item lines, records issuer and receiver, links any signed-handover attachment, and appends an `issued` lifecycle event

#### Scenario: Assignment is derived holding state, not the record
- **WHEN** an issue line is created for a serialized asset
- **THEN** the system reflects the current holder as derived from the open issue line, and mutations happen through issue-lifecycle operations, never by editing an assignment row directly

### Requirement: Issue from an approved request
The system SHALL create an `AssetIssue` against an `approved` request, marking request items fulfilled, within a single transaction.

#### Scenario: Issue a serialized asset from a request
- **WHEN** an authorized user issues an available serialized asset against an approved request
- **THEN** the system creates the issue with the linked `requestId`, sets the asset status to `assigned`, appends `issued` history, marks the request item fulfilled, and stages an `asset.assigned` domain event

#### Scenario: Issue a quantity-tracked item from a request
- **WHEN** an authorized user issues N units of a quantity-tracked type against an approved request
- **THEN** the system creates the issue line for N units, decrements the projected stock, appends `issued` history, and stages an `asset.assigned` event

### Requirement: Direct issue without a request
The system SHALL allow an authorized admin/HR user to create an `AssetIssue` directly on management order, with a null `requestId`, recorded identically to a request-based issue apart from the missing request link.

#### Scenario: Direct issue on management order
- **WHEN** an authorized admin issues an asset directly to an employee with no linked request
- **THEN** the system creates the issue with a null `requestId`, adjusts holding/stock, and stages an `asset.assigned` event exactly as for request-based issuance

#### Scenario: Direct issue still enforces availability
- **WHEN** an admin attempts a direct issue of a retired/lost serialized asset or beyond available stock
- **THEN** the system rejects the issue and writes no history

### Requirement: Signed handover as an issue attachment
The system SHALL treat a signed handover document as an attachment of the `AssetIssue`, uploaded via temp-upload → finalize after commit, with no separate handover aggregate.

#### Scenario: Attach signed handover to an issue
- **WHEN** an authorized user completes an issue and attaches a signed handover file
- **THEN** the system finalizes the file after commit and links it to the issue

#### Scenario: Issue without attachment is valid
- **WHEN** an authorized user completes an issue without attaching a document
- **THEN** the system records the issue and holding without requiring a file

### Requirement: Return / reclaim against an issue
The system SHALL record the return of issued items against their `AssetIssue`, restoring holding/stock and appending history, within a single transaction.

#### Scenario: Return a serialized asset
- **WHEN** an authorized user records the return of an assigned serialized asset with a condition note
- **THEN** the system closes the issue line, sets asset status to `available` (or `maintenance` if flagged), appends `returned` history, and stages an `asset.returned` event

#### Scenario: Return quantity-tracked units
- **WHEN** an authorized user records the return of N units of a quantity-tracked issue line
- **THEN** the system increments the projected stock, appends `returned` history, and stages an `asset.returned` event; partial-quantity returns are supported

### Requirement: Prompt return on employee termination
The system SHALL, on receiving an employee-termination signal, identify open issue lines for that employee and flag them for return.

#### Scenario: Termination flags open holdings
- **WHEN** an `employee.terminated` event is received for an employee with open issue lines
- **THEN** the system flags those lines for return and notifies the responsible asset administrator, processed idempotently by event identifier
