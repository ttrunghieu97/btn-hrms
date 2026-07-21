## ADDED Requirements

### Requirement: Stock level is a projection of the transaction log
The system SHALL treat the stock quantity for each quantity-tracked asset type (`isTrackable = false`) as a projection derived from the append-only transaction log, updated within the same transaction as the stock-changing action, and SHALL never allow the projected stock to become negative. The stored quantity is a cached projection, not an independently authoritative counter, and MUST be reconcilable by recomputation from the log.

#### Scenario: Receive stock into inventory
- **WHEN** an authorized user records a receipt of N units for a quantity-tracked type
- **THEN** the system appends a `receive` transaction and updates the projected stock by N in the same transaction

#### Scenario: Reject issuance beyond available stock
- **WHEN** an issuance would reduce a type's projected stock below zero
- **THEN** the system rejects the issuance and appends no transaction

#### Scenario: Stock reconciles to the log
- **WHEN** the projected stock for a type is recomputed from its transaction log
- **THEN** the recomputed value equals the stored projection

### Requirement: Append-only inventory transaction log
The system SHALL record every stock-changing action (`receive`, `issue`, `return`, `adjust`) as an immutable inventory transaction capturing the asset type or asset, quantity delta, actor, timestamp, and an optional reference to the originating assignment or request.

#### Scenario: Issue writes a transaction
- **WHEN** an asset is issued to an employee
- **THEN** the system appends an `issue` transaction with a negative quantity delta (quantity-tracked) or a unit reference (serialized) and never mutates prior transactions

#### Scenario: Return writes a transaction
- **WHEN** an issued asset is returned
- **THEN** the system appends a `return` transaction with the restoring quantity delta or unit reference

### Requirement: Low-stock signal
The system SHALL emit a low-stock notification when a quantity-tracked type's stock level crosses at or below its configured reorder threshold.

#### Scenario: Crossing the reorder threshold notifies
- **WHEN** an issuance reduces a type's stock level to a value at or below its reorder threshold
- **THEN** the system sends a low-stock notification via the notifications platform

#### Scenario: No threshold configured does not notify
- **WHEN** a type has no reorder threshold configured and its stock decreases
- **THEN** the system does not emit a low-stock notification
