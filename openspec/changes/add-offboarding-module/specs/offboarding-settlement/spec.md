## ADDED Requirements

### Requirement: Emit completion and hand off to payroll

On offboarding completion the system SHALL emit an `offboarding.completed` domain event via the transactional outbox (staged inside the completion transaction) and SHALL create an `offboarding_settlement_links` record correlating the process to a payroll final-settlement. Offboarding MUST NOT compute settlement amounts — payroll owns the calculation.

#### Scenario: Completion emits event and settlement link

- **WHEN** an offboarding process is completed (all clearances approved, mandatory items done)
- **THEN** the system stages `offboarding.completed` on the outbox and creates an `offboarding_settlement_links` row referencing the process and employee with status `pending`

#### Scenario: Offboarding does not calculate amounts

- **WHEN** the settlement hand-off is created
- **THEN** the offboarding context stores only the correlation/link, and no salary, leave payout, or deduction figures are computed in the offboarding module

### Requirement: Settlement link status tracking

The `offboarding_settlement_links` record SHALL track the downstream settlement state (`pending → processing → settled | failed`) as reported back by payroll, so an offboarding process can surface whether final settlement is outstanding.

#### Scenario: Payroll reports settlement done

- **WHEN** payroll signals the final settlement is complete for a linked process
- **THEN** the settlement link status becomes `settled`

#### Scenario: Surface outstanding settlement

- **WHEN** a completed offboarding process has a settlement link not yet `settled`
- **THEN** the process detail reports final settlement as outstanding

### Requirement: Idempotent hand-off

The settlement hand-off SHALL be idempotent so re-completion or event redelivery does not create duplicate settlement links for the same process.

#### Scenario: No duplicate settlement link

- **WHEN** completion is retried or `offboarding.completed` is redelivered for a process that already has a settlement link
- **THEN** the system does not create a second `offboarding_settlement_links` row for that process
