## Why

The company issues equipment and supplies to employees (order → approve → hand out), but there is no system of record for it. Two half-measures already exist and pull in different directions: `asset_types`/`assets`/`asset_assignments` tables sit in the schema with relations defined but **no module wired** (declared-but-unbuilt), while `employee_equipment_handovers` in `workforce` is a running feature that only stores signed handover *documents* (free-text items, attached PDF) with no catalog, inventory, or approval. There is no single source of truth for what assets exist, how many are in stock, or who currently holds what. Because the project is pre-production (dev stage) with no data to preserve, this change does it **cleanly in one pass**: build the `asset-management` context on the existing asset schema as the sole owner, and **remove the legacy workforce handover feature entirely** rather than bridging two systems.

## What Changes

- Add a new `asset-management` bounded context under `apps/api/src/modules/asset-management`, following the Controller → UseCase → Repository → Mapper layering, owning the existing `asset_types`/`assets`/`asset_assignments` tables.
- **Asset catalog & inventory**: manage asset types; support both *serialized* assets (per-unit, serial-tracked — `asset_types.isTrackable = true`) and *quantity-tracked* consumables (stock as a projection of the transaction log — `isTrackable = false`). Warn on depletion.
- **Asset request**: an employee submits a request for equipment/supplies (items + quantity + reason); route through `platform-approval-engine` (mirroring `leave-approval`/`payroll-approval`); lifecycle `draft → pending_approval → approved → rejected → cancelled`.
- **Asset issue as the aggregate root**: a hand-out is an `AssetIssue` business transaction owning its item lines, attachments (signed handover), issuer/receiver, optional request/approval link, and lifecycle events. `asset_assignments` is only the current holding *state* of a line, never the transaction of record.
- **Direct issue (no request)**: an authorized admin/HR creates an `AssetIssue` directly on management order (null `requestId`), recorded identically apart from the missing request link.
- **Return** against an issue restores holding/stock and appends history; partial-quantity returns supported.
- **Asset history**: an append-only lifecycle log (created/received/reserved/issued/returned/transferred/maintenance/disposed) is the authoritative source; **holdings and stock are projections derived from it**, not independently mutable state. Exposed via `GET /assets/:id/history`.
- **Handover as issue attachment**: the signed handover document becomes an attachment of the `AssetIssue` (temp-upload → finalize), not a separate aggregate.
- **Remove the legacy workforce handover feature**: delete the `employee_equipment_handovers`/`employee_equipment_handover_items` tables, the `workforce/employees` handover module code (repository, use-case, DTOs, controller endpoint), and its frontend section — clean removal, no data migration (dev stage).
- **Termination hook**: on `employee.terminated`, flag/prompt return of assets the employee still holds (via subscriber, not foreign repo).
- Reuse **`platform-approval-engine`** (request approval), **`platform-notifications`** (request decision + low-stock alerts), **`storage`** (handover/attachment evidence).
- Expose cross-context reads only through an `AssetHoldingsReaderPort` in `src/contracts` returning a read-model DTO (`AssetHoldingDto`), never an asset entity; add `asset-management` to the domain list in `AGENTS.md`.
- Regenerate the web API client and add an `apps/web/src/features/asset-management` feature with `app/(protected)/assets` routes.

## Capabilities

### New Capabilities
- `asset-catalog`: Manage asset types and individual assets (serialized) or stock-tracked consumables; catalog CRUD and per-type trackability.
- `asset-inventory`: Stock as a projection of the append-only transaction log for quantity-tracked types, reconcilable by recomputation, with low-stock signals.
- `asset-request`: Employee requests for equipment/supplies, routed through the approval engine, with request lifecycle and item lines.
- `asset-issue`: The `AssetIssue` aggregate root — issue (from approved request or direct management order), signed-handover attachment, and return/reclaim; assignment is derived holding state only.
- `asset-history`: Append-only asset lifecycle log as the authoritative source of custody/state changes; `GET /assets/:id/history`; the basis for derived holdings and stock.
- `asset-holdings`: Holdings as a derived read model (MUST NOT be an aggregate or independently mutable), the `AssetHoldingsReaderPort` returning `AssetHoldingDto` for cross-context reads, and removal of the legacy workforce handover feature.

### Modified Capabilities
<!-- No existing capability spec files under openspec/specs/ (repo has no baselined specs yet). The legacy workforce equipment-handover behavior is removed; its replacement is captured in the new asset-holdings capability. No existing spec file to delta. -->

## Impact

- **New code**: `apps/api/src/modules/asset-management/**` (controllers, use-cases, repositories, mappers, DTOs, domain events, subscribers); `apps/api/src/integration/asset-approval/**` (approval-engine wiring).
- **Schema**: reuse existing `asset_types`/`assets`/`asset_assignments` (+`asset_status_enum`) in `schema/onboarding` — relocate the schema group ownership to asset-management; ADD `asset_issues`, `asset_issue_items`, `asset_history` (append-only lifecycle log), `asset_stock_levels` (projection), `asset_requests`, `asset_request_items`, and request/history/transaction enums. Applied via `db:push`.
- **Contracts**: new `AssetHoldingsReaderPort` returning `AssetHoldingDto` read model (workforce employee-detail + offboarding read who-holds-what); `asset.assigned`/`asset.returned` outbound events for the termination-return hook and notifications.
- **Workforce (removal)**: delete `employee_equipment_handovers`/`employee_equipment_handover_items` tables + relations; remove `EmployeeEquipmentRepository`, `UpsertEmployeeEquipmentHandoverUseCase`, its DTOs, the `PUT /employees/:id/equipment-handover` endpoint, the `equipmentHandovers` field on the employee response, and the query-builder `handovers` relation. Employee detail reads holdings via the contract port instead.
- **Reused platforms**: `platform-approval-engine`, `platform-notifications`, `storage`.
- **Auth**: new policies/permissions for asset actions (`asset:type.manage`, `asset:request.create`, `asset:request.approve`, `asset:issue`, `asset:return`, `asset:read`) registered in the auth layer.
- **Frontend**: new `apps/web/src/features/asset-management` feature + `app/(protected)/assets` routes (incl. asset history timeline); **remove** the employee equipment-handover section/components/hook in `features/employees`; regenerated API client.
- **Docs**: add `asset-management` to `AGENTS.md` domain list.
- **Module registration**: register `AssetManagementModule` + `AssetApprovalIntegrationModule` in the app root; pass `arch:check`.
