## ADDED Requirements

### Requirement: Create candidate profile with dedupe by email
The system SHALL maintain one candidate profile per normalized email address. When an application arrives for an email that already has a candidate, the system SHALL reuse the existing candidate rather than creating a duplicate.

#### Scenario: New candidate created
- **WHEN** an application is submitted with an email that has no existing candidate
- **THEN** the system creates a new candidate profile and links the application to it

#### Scenario: Existing candidate reused
- **WHEN** an application is submitted with an email that already matches a candidate (case/whitespace-insensitive)
- **THEN** the system links the new application to the existing candidate and creates no duplicate profile

### Requirement: Submit application against a posting
The system SHALL create an application linking a candidate to an `open` posting, starting the application at the initial pipeline stage.

#### Scenario: Application created at initial stage
- **WHEN** a candidate applies to an `open` posting
- **THEN** the system creates an application at the `applied` stage linked to the candidate and posting

#### Scenario: Prevent duplicate active application to same posting
- **WHEN** a candidate applies to a posting for which they already have an active (non-terminal) application
- **THEN** the system rejects the duplicate application

### Requirement: Attach CV and documents to candidate
The system SHALL allow attaching CVs and documents to a candidate using the temp-upload then finalize-after-commit pattern.

#### Scenario: Attach a CV
- **WHEN** an authorized user finalizes an uploaded CV token against a candidate after the application is persisted
- **THEN** the system associates the stored file with the candidate

#### Scenario: Upload token not finalized on failure
- **WHEN** the application transaction fails before commit
- **THEN** the system does not finalize the uploaded file and leaves no dangling association
