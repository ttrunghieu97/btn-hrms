## ADDED Requirements

### Requirement: Create asset request
The system SHALL allow an employee to create an asset request with one or more item lines (asset type + quantity ≥ 1 + optional note) and an overall reason. A new request SHALL start in status `draft`.

#### Scenario: Create a draft request
- **WHEN** an employee submits a request with at least one item line of quantity ≥ 1
- **THEN** the system persists the request with status `draft` and returns its identifier

#### Scenario: Reject empty or invalid request
- **WHEN** an employee submits a request with no item lines or an item quantity below 1
- **THEN** the system rejects the request with a validation error and creates nothing

### Requirement: Edit draft request
The system SHALL allow editing an asset request only while it is in `draft` status.

#### Scenario: Edit blocked after submission
- **WHEN** a user attempts to edit a request that is `pending_approval`, `approved`, `rejected`, or `cancelled`
- **THEN** the system rejects the edit and leaves the request unchanged

### Requirement: Submit request for approval
The system SHALL route a submitted asset request through the platform approval engine and set its status to `pending_approval`.

#### Scenario: Submit draft for approval
- **WHEN** an employee submits a `draft` request
- **THEN** the system creates an approval request via the approval engine and sets status to `pending_approval`

#### Scenario: Approval decision updates status
- **WHEN** the approval engine records an approve or reject decision for the request
- **THEN** the system sets the request status to `approved` or `rejected` and notifies the requester

### Requirement: Cancel request
The system SHALL allow the requester or an authorized admin to cancel a request that is not yet fulfilled, and SHALL treat `cancelled` and `rejected` as terminal.

#### Scenario: Cancel a pending request
- **WHEN** the requester cancels a `draft` or `pending_approval` request
- **THEN** the system sets status to `cancelled` and withdraws any open approval request

### Requirement: Fulfil approved request via issuance
The system SHALL allow issuance only against an `approved` request (or via direct issuance), and SHALL mark request items as fulfilled as they are issued.

#### Scenario: Issue against approved request
- **WHEN** an authorized user issues the items of an `approved` request
- **THEN** the system records the assignments and marks the corresponding request items fulfilled
