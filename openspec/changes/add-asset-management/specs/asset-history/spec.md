## ADDED Requirements

### Requirement: Append-only asset lifecycle history
The system SHALL record every asset lifecycle event as an immutable, append-only history entry capturing the asset (or asset type for quantity-tracked stock), event kind, quantity delta where applicable, actor, timestamp, and a reference to the originating issue/request/transaction. History entries MUST NOT be updated or deleted.

#### Scenario: Lifecycle actions append history
- **WHEN** an asset is created, received, reserved, issued, returned, transferred, sent to maintenance, or disposed
- **THEN** the system appends a history entry of the corresponding kind and never mutates a prior entry

#### Scenario: History is the source for derived state
- **WHEN** holdings or stock levels are computed
- **THEN** they are derived from the history/transaction log rather than from an independently mutable counter as the source of truth

### Requirement: Asset history is a domain requirement, not only a UI feature
The system SHALL expose an asset's full lifecycle history through `GET /assets/:id/history`, ordered chronologically, so audit and the UI timeline read from a single authoritative log.

#### Scenario: Retrieve an asset's history
- **WHEN** an authorized user requests `GET /assets/:id/history`
- **THEN** the system returns the ordered lifecycle entries (created, received, reserved, issued, returned, transferred, maintenance, disposed) for that asset

#### Scenario: History supports audit reconstruction
- **WHEN** an auditor needs to reconstruct who held an asset and when
- **THEN** the history log alone provides the full sequence of custody and state changes without consulting mutable projections
