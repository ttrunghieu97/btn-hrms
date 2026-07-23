## ADDED Requirements

### Requirement: Manage asset types
The system SHALL allow an authorized user to create, edit, and retire asset types, each with a name, unique code, and a `isTrackable` flag that determines whether assets of the type are tracked as serialized units or as a quantity stock.

#### Scenario: Create a serialized asset type
- **WHEN** an authorized user creates an asset type with a unique code and `isTrackable = true`
- **THEN** the system persists the type and subsequent assets of this type are managed as individual serialized units

#### Scenario: Create a quantity-tracked asset type
- **WHEN** an authorized user creates an asset type with a unique code and `isTrackable = false`
- **THEN** the system persists the type and assets of this type are managed as a quantity stock level

#### Scenario: Reject duplicate type code
- **WHEN** a user creates an asset type with a code that already exists on a non-deleted type
- **THEN** the system rejects the request with a validation error and creates nothing

### Requirement: Register serialized assets
The system SHALL allow an authorized user to register an individual asset under a serialized asset type, with a unique code and optional serial number, starting in status `available`.

#### Scenario: Register an available asset
- **WHEN** an authorized user registers an asset under a serialized type with a unique asset code
- **THEN** the system persists it with status `available`

#### Scenario: Reject duplicate asset code
- **WHEN** a user registers an asset with a code already used by a non-deleted asset
- **THEN** the system rejects the request with a validation error

### Requirement: Asset status lifecycle
The system SHALL track each serialized asset through the states `available`, `assigned`, `maintenance`, `retired`, and `lost`, and SHALL treat `retired` and `lost` as terminal for issuance purposes.

#### Scenario: Retired asset cannot be issued
- **WHEN** a user attempts to issue an asset whose status is `retired` or `lost`
- **THEN** the system rejects the issuance and leaves the asset unchanged

#### Scenario: Move asset to maintenance
- **WHEN** an authorized user sets an `available` asset to `maintenance`
- **THEN** the system updates the status and excludes the asset from issuance until it returns to `available`
