## ADDED Requirements

### Requirement: Draft offer for candidate in offer stage
The system SHALL allow drafting an offer only for an application whose `current_stage` is `offer`. An offer SHALL capture compensation, start date, and expiry, and start in `draft` status.

#### Scenario: Draft an offer
- **WHEN** an authorized user drafts an offer for an application in the `offer` stage
- **THEN** the system creates the offer with status `draft`

#### Scenario: Block offer outside offer stage
- **WHEN** a user attempts to draft an offer for an application not in the `offer` stage
- **THEN** the system rejects the request and creates no offer

### Requirement: Route offer through approval engine
The system SHALL route a submitted offer through the platform approval engine and set its status to `pending_approval` until a decision is recorded.

#### Scenario: Submit offer for approval
- **WHEN** an authorized user submits a `draft` offer
- **THEN** the system creates an approval request via the approval engine and sets status to `pending_approval`

#### Scenario: Approval decision updates offer
- **WHEN** the approval engine records an approve or reject decision for an offer
- **THEN** the system sets the offer status to `approved` or `rejected` accordingly

### Requirement: Record candidate decision on approved offer
The system SHALL allow recording candidate acceptance or decline only for an `approved` offer.

#### Scenario: Candidate accepts offer
- **WHEN** an authorized user records acceptance of an `approved` offer
- **THEN** the system sets the offer status to `accepted` and advances the application to `hired`

#### Scenario: Candidate declines offer
- **WHEN** an authorized user records a decline of an `approved` offer
- **THEN** the system sets the offer status to `declined` and the application to `rejected`

### Requirement: Emit hire hand-off event on acceptance
On offer acceptance, the system SHALL stage a `recruitment.candidate.hired` domain event in the transactional outbox for onboarding and workforce to consume through a contract port. Publishing SHALL not fail when no subscriber is present.

#### Scenario: Hire event staged in outbox
- **WHEN** an offer is accepted within a transaction
- **THEN** the system stages a `recruitment.candidate.hired` event in the outbox before commit and it is published after commit

#### Scenario: No subscriber does not break acceptance
- **WHEN** the hire event is published and no consumer is registered
- **THEN** the offer acceptance still succeeds and the event is retained per outbox policy
