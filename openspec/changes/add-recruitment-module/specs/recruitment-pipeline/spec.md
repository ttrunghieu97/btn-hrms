## ADDED Requirements

### Requirement: Advance application through pipeline stages
The system SHALL move an application through the stages `applied → screening → interview → offer → hired`, with terminal outcomes `rejected` and `withdrawn` reachable from any active stage. Allowed transitions SHALL be governed by the platform workflow engine.

#### Scenario: Advance to the next stage
- **WHEN** an authorized user advances an application from `screening` to `interview` and the workflow engine permits it
- **THEN** the system updates `current_stage` to `interview`

#### Scenario: Reject a disallowed transition
- **WHEN** a user attempts a transition the workflow engine does not permit (for example `applied → hired`)
- **THEN** the system rejects the transition and leaves `current_stage` unchanged

#### Scenario: Reject or withdraw from active stage
- **WHEN** an authorized user rejects, or a candidate withdraws, an application in any active stage
- **THEN** the system sets the stage to `rejected` or `withdrawn` and treats it as terminal

### Requirement: Record immutable stage-transition history
The system SHALL append an immutable stage event for every transition, capturing actor, from-stage, to-stage, timestamp, and optional note.

#### Scenario: Transition writes a stage event
- **WHEN** an application transitions between stages
- **THEN** the system appends a stage event with actor, from-stage, to-stage, and timestamp

#### Scenario: History is append-only
- **WHEN** a stage event has been written
- **THEN** the system does not allow updating or deleting it

### Requirement: Capture interview scorecards
The system SHALL allow recording a scorecard (rating and feedback) per interviewer for an application at the `interview` stage.

#### Scenario: Submit a scorecard
- **WHEN** an authorized interviewer submits a rating and feedback for an application in the `interview` stage
- **THEN** the system persists the scorecard linked to the application and interviewer

#### Scenario: Block scorecard outside interview stage
- **WHEN** a scorecard is submitted for an application not in the `interview` stage
- **THEN** the system rejects the submission
