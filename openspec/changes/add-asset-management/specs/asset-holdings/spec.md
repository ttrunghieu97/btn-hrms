## ADDED Requirements

### Requirement: Asset holdings is a derived read model
Asset Holdings is a read model derived from the issuance lifecycle (issue / return / transfer / dispose) and MUST NOT become an aggregate or independently mutable state. The system SHALL compute holdings from open issue lines and SHALL NOT expose any operation that mutates holdings directly.

#### Scenario: Holdings computed from open issue lines
- **WHEN** a client requests an employee's current holdings
- **THEN** the system returns the set of open (not-yet-returned) issue lines, computed from issuance history, with no separately stored holdings state

#### Scenario: No direct holdings mutation
- **WHEN** any caller attempts to set or edit holdings directly
- **THEN** no such operation exists; holdings change only as a consequence of issue/return/transfer/dispose lifecycle operations

### Requirement: Expose holdings via a contract read-model port
The system SHALL expose holdings through an `AssetHoldingsReaderPort` in `src/contracts` that returns a read-model DTO (`AssetHoldingDto`), never an asset-domain entity. Other contexts (workforce, offboarding) SHALL read holdings only through this port.

#### Scenario: Port returns a read model, not an entity
- **WHEN** the workforce employee-detail view requests holdings via the port
- **THEN** the system returns `AssetHoldingDto` fields (assetId, assetTag, assetTypeName, serialNumber, issuedAt, expectedReturnAt, status) and does not expose `Asset`, `AssetIssue`, or assignment entities

#### Scenario: No foreign repository access
- **WHEN** a non-asset context needs holdings data
- **THEN** it obtains the data through the injected `AssetHoldingsReaderPort` token and never imports asset repositories

### Requirement: Remove the legacy workforce equipment-handover feature
The system SHALL remove the standalone `employee_equipment_handovers` tables, module code, and UI, since asset-management is the sole owner of asset issuance and handover records. This is a clean removal appropriate to the pre-production stage; no data migration is provided.

#### Scenario: Legacy handover endpoint no longer exists
- **WHEN** a client calls the former `PUT /employees/:id/equipment-handover` endpoint
- **THEN** the endpoint is not found because the feature has been removed

#### Scenario: Employee detail shows holdings from the asset context
- **WHEN** an HR user opens an employee detail page
- **THEN** the equipment/holdings section is populated from `AssetHoldingsReaderPort`, not from a workforce-owned handover table
